/**
 * Produção + backup no Google Drive.
 *
 * Para cada cliente (quem negocia, paga ou manda arquivo):
 *   Drive › "Radar de Vendas - Clientes" › "Nome - telefone"
 *      ├─ Imagens · Vídeos · Documentos e PDFs · Áudios · Pagamentos e Recibos
 *      └─ "Resumo do projeto - Nome" (Google Docs, refeito quando a conversa avança)
 * Tudo que o cliente manda no WhatsApp vai para a pasta certa; recibos do sistema e
 * comprovantes do Asaas vão para "Pagamentos e Recibos". Depois do pagamento o cliente
 * entra no painel de Produção com o mesmo resumo e as tarefas.
 */
import { admin } from './supabase/admin';
import { structured } from './ai';
import { evo } from './evolution';
import { transcript } from './prompts';
import { brl, appBase } from './util';
import { driveReady, ensureRoot, folder, upload, updateDoc, exists, safeName } from './drive';

const db = () => admin();

export const SUBFOLDERS: Record<string, string> = {
  image: 'Imagens',
  video: 'Vídeos',
  document: 'Documentos e PDFs',
  audio: 'Áudios',
  pagamentos: 'Pagamentos e Recibos',
};

import { PRODUCTION_STEPS } from './production-steps';
export { PRODUCTION_STEPS };

const MEDIA = ['image', 'video', 'document', 'audio'];

function appUrl() {
  return appBase();
}

/* ---------------- pastas ---------------- */

/** Cria (ou confere) a pasta do cliente com as subpastas. */
export async function ensureClientFolder(lead: any) {
  if (lead.drive_folder_id && lead.drive_subfolders && (await exists(lead.drive_folder_id))) return { id: lead.drive_folder_id as string, url: lead.drive_folder_url as string, subs: lead.drive_subfolders as Record<string, string> };
  const root = await ensureRoot();
  const name = safeName(`${lead.name || 'Cliente'}${lead.whatsapp ? ' - ' + lead.whatsapp : ''}`);
  const f = await folder(name, root.id);
  const subs: Record<string, string> = {};
  for (const [k, label] of Object.entries(SUBFOLDERS)) subs[k] = (await folder(label, f.id)).id;
  await db().from('leads').update({ drive_folder_id: f.id, drive_folder_url: f.url, drive_subfolders: subs, drive_error: null, doc_dirty: true }).eq('id', lead.id);
  // se a pasta foi recriada, os arquivos voltam a ser enviados
  if (lead.drive_folder_id && lead.drive_folder_id !== f.id) {
    await db().from('messages').update({ drive_file_id: null, drive_url: null, drive_tries: 0 }).eq('lead_id', lead.id);
    await db().from('payments').update({ receipt_drive_url: null, asaas_drive_url: null, drive_tries: 0 }).eq('lead_id', lead.id);
  }
  return { id: f.id, url: f.url, subs };
}

/** Quem ganha pasta: quem está negociando, pagou, está em produção ou mandou arquivo. */
export async function createPendingFolders(limit = 5) {
  const out: string[] = [];
  const { data: a } = await db().from('leads').select('*').is('drive_folder_id', null).or('production_status.not.is.null,stage.in.(negociando,pix,pago)').limit(limit);
  const { data: media } = await db().from('messages').select('lead_id').is('drive_file_id', null).eq('direction', 'in').in('kind', MEDIA).lt('drive_tries', 3).limit(50);
  const ids = Array.from(new Set((media || []).map((m: any) => m.lead_id))).filter((id) => !(a || []).some((l: any) => l.id === id));
  const { data: b } = ids.length ? await db().from('leads').select('*').in('id', ids).is('drive_folder_id', null).limit(limit) : { data: [] as any[] };
  for (const lead of [...(a || []), ...(b || [])].slice(0, limit)) {
    try {
      await ensureClientFolder(lead);
      out.push(lead.name);
    } catch (e: any) {
      await db().from('leads').update({ drive_error: String(e?.message || e).slice(0, 300) }).eq('id', lead.id);
      throw e;
    }
  }
  return out;
}

/* ---------------- arquivos do WhatsApp ---------------- */

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/3gpp': '3gp',
  'audio/ogg': 'ogg',
  'audio/ogg; codecs=opus': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'application/pdf': 'pdf',
};

function fileNameFor(m: any, mime: string) {
  const when = new Date(m.created_at).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(/[: ]/g, '-').slice(0, 16);
  const original = m.meta?.file ? safeName(String(m.meta.file)) : '';
  if (original) return `${when} - ${original}`;
  const ext = EXT[mime] || EXT[mime.split(';')[0]] || mime.split('/')[1]?.split(';')[0] || 'bin';
  const label = { image: 'imagem', video: 'video', audio: 'audio', document: 'documento' }[m.kind as string] || 'arquivo';
  return `${when} - ${label}.${ext}`;
}

/** Copia para o Drive as imagens, vídeos, PDFs e áudios que os clientes mandaram. */
export async function syncMedia(limit = 8) {
  const { data: pend } = await db().from('messages').select('*').is('drive_file_id', null).eq('direction', 'in').in('kind', MEDIA).lt('drive_tries', 3).order('created_at').limit(limit);
  let n = 0;
  for (const m of pend || []) {
    try {
      const { data: lead } = await db().from('leads').select('*').eq('id', m.lead_id).maybeSingle();
      if (!lead) continue;
      const f = await ensureClientFolder(lead);
      const { data: num } = await db().from('whatsapp_numbers').select('instance_name').eq('id', m.number_id || lead.number_id).maybeSingle();
      if (!num || !m.wa_message_id) throw new Error('sem número ou id da mensagem para baixar o arquivo');
      const r: any = await evo.media(num.instance_name, m.wa_message_id);
      const b64 = r?.base64 || r?.data?.base64;
      if (!b64) throw new Error('o WhatsApp não devolveu o arquivo (pode ter expirado)');
      const mime = String(r?.mimetype || r?.mimeType || m.meta?.mime || 'application/octet-stream');
      const kind = m.kind === 'document' && /^image\//.test(mime) ? 'image' : m.kind === 'document' && /^video\//.test(mime) ? 'video' : m.kind;
      const up = await upload(fileNameFor(m, mime), mime, Buffer.from(String(b64).replace(/^data:[^,]+,/, ''), 'base64'), f.subs[kind] || f.id);
      await db().from('messages').update({ drive_file_id: up.id, drive_url: up.url }).eq('id', m.id);
      n++;
    } catch (e: any) {
      await db().from('messages').update({ drive_tries: (m.drive_tries || 0) + 1 }).eq('id', m.id);
      if ((m.drive_tries || 0) + 1 >= 3) await db().from('leads').update({ drive_error: 'Arquivo não copiado para o Drive: ' + String(e?.message || e).slice(0, 200) }).eq('id', m.lead_id);
    }
  }
  return n;
}

/* ---------------- recibos e comprovantes ---------------- */

export async function syncPayments(limit = 3) {
  const { data: pays } = await db().from('payments').select('*, leads(*)').eq('status', 'pago').lt('drive_tries', 3).or('and(receipt_path.not.is.null,receipt_drive_url.is.null),and(asaas_receipt_url.not.is.null,asaas_drive_url.is.null)').limit(limit);
  let n = 0;
  for (const p of pays || []) {
    const lead = p.leads;
    if (!lead) continue;
    try {
      const f = await ensureClientFolder(lead);
      const day = new Date(p.paid_at || p.created_at).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
      const patch: any = {};
      if (p.receipt_path && !p.receipt_drive_url) {
        const { data: file, error } = await db().storage.from('recibos').download(p.receipt_path);
        if (error || !file) throw new Error('recibo não encontrado no armazenamento');
        const up = await upload(`${day} - Recibo ${p.receipt_number || ''} - ${safeName(lead.name)}.pdf`, 'application/pdf', Buffer.from(await file.arrayBuffer()), f.subs.pagamentos);
        patch.receipt_drive_url = up.url;
      }
      if (p.asaas_receipt_url && !p.asaas_drive_url) {
        let up;
        try {
          const { urlToPdf } = await import('./receipt');
          up = await upload(`${day} - Comprovante Asaas - ${brl(p.amount)}.pdf`, 'application/pdf', await urlToPdf(p.asaas_receipt_url), f.subs.pagamentos);
        } catch {
          // sem Browserless: guarda um documento com o link do comprovante
          const html = `<h2>Comprovante de pagamento (Asaas)</h2><p>Cliente: ${esc(lead.name)}</p><p>Valor: ${brl(p.amount)} · Pago em ${day}</p><p><a href="${p.asaas_receipt_url}">${p.asaas_receipt_url}</a></p>`;
          up = await upload(`${day} - Comprovante Asaas - ${brl(p.amount)}`, 'text/html', Buffer.from(html), f.subs.pagamentos, true);
        }
        patch.asaas_drive_url = up.url;
      }
      await db().from('payments').update(patch).eq('id', p.id);
      n++;
    } catch {
      await db().from('payments').update({ drive_tries: (p.drive_tries || 0) + 1 }).eq('id', p.id);
    }
  }
  return n;
}

/* ---------------- resumo do projeto ---------------- */

const list = { type: 'array', items: { type: 'string' } };
const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    visao_geral: { type: 'string', description: '3 a 5 frases: quem é o cliente, o que contratou e em que pé está.' },
    servico_contratado: { type: 'string', description: 'Serviço(s) fechados ou em negociação, com o que está incluso.' },
    valores_pagamentos: { type: 'string', description: 'Valor combinado, forma e situação do pagamento (só o que aparece nos dados).' },
    combinado: { ...list, description: 'Tudo o que foi combinado com o cliente.' },
    promessas: { ...list, description: 'O que NÓS prometemos (prazos, ajustes, bônus, entregas).' },
    expectativas: { ...list, description: 'O que o cliente espera de nós, nas palavras dele.' },
    prazos: { ...list, description: 'Prazos e datas citados. Se ninguém falou de prazo, diga "Prazo não combinado na conversa".' },
    briefing: { ...list, description: 'Briefing do projeto: nome no site, cores, serviços a destacar, estilo, referências, textos, redes, domínio etc.' },
    obrigacoes_cliente: { ...list, description: 'O que o cliente precisa mandar/fazer (logo, fotos, textos, acessos, aprovação).' },
    obrigacoes_equipe: { ...list, description: 'O que a equipe precisa entregar.' },
    pendencias: { ...list, description: 'O que ainda falta para começar ou terminar.' },
    tarefas: { ...list, description: 'Lista de tarefas de produção, em ordem, curtas e práticas (verbo no início).' },
    observacoes: { ...list, description: 'Cuidados, preferências, objeções e riscos.' },
    historico: { type: 'string', description: 'Resumo cronológico da conversa em 1 parágrafo.' },
  },
  required: ['visao_geral', 'servico_contratado', 'valores_pagamentos', 'combinado', 'promessas', 'expectativas', 'prazos', 'briefing', 'obrigacoes_cliente', 'obrigacoes_equipe', 'pendencias', 'tarefas', 'observacoes', 'historico'],
};

function esc(s: any) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function ul(items: string[] | undefined) {
  const xs = (items || []).filter(Boolean);
  return xs.length ? `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p><i>Nada registrado.</i></p>';
}

export function summaryHtml(lead: any, s: any, files: any[], pays: any[]) {
  const conv = `${appUrl()}/conversas?lead=${lead.id}`;
  const fileRows = files.length
    ? `<ul>${files.map((f) => `<li>${esc(new Date(f.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))} · ${esc({ image: 'Imagem', video: 'Vídeo', audio: 'Áudio', document: 'Documento' }[f.kind as string] || f.kind)}${f.drive_url ? ` · <a href="${f.drive_url}">abrir</a>` : ''}${f.body && !/^\[/.test(f.body) ? ` · ${esc(String(f.body).slice(0, 80))}` : ''}</li>`).join('')}</ul>`
    : '<p><i>Nenhum arquivo recebido ainda.</i></p>';
  const payRows = pays.length
    ? `<ul>${pays.map((p) => `<li>${esc(brl(p.amount))} · ${esc(p.status)}${p.paid_at ? ' em ' + esc(new Date(p.paid_at).toLocaleDateString('pt-BR')) : ''}${p.receipt_drive_url ? ` · <a href="${p.receipt_drive_url}">recibo</a>` : ''}${p.asaas_drive_url ? ` · <a href="${p.asaas_drive_url}">comprovante Asaas</a>` : ''}</li>`).join('')}</ul>`
    : '<p><i>Nenhum pagamento registrado.</i></p>';
  const stepLabel = PRODUCTION_STEPS.find((x) => x[0] === lead.production_status)?.[1] || 'Em negociação';
  return `<html><head><meta charset="utf-8"></head><body style="font-family:Arial">
<h1>Resumo do projeto — ${esc(lead.name)}</h1>
<p><b>Situação:</b> ${esc(stepLabel)} · <b>Atualizado em:</b> ${esc(new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))}</p>
<p><b>WhatsApp:</b> ${esc(lead.whatsapp || '')} · <b>Ramo:</b> ${esc(lead.niche || '—')} · <b>Cidade:</b> ${esc(lead.city || '—')}${lead.cpf_cnpj ? ` · <b>CPF/CNPJ:</b> ${esc(lead.cpf_cnpj)}` : ''}</p>
<p><a href="${conv}">Abrir a conversa completa no painel</a>${lead.drive_folder_url ? ` · <a href="${lead.drive_folder_url}">Pasta do cliente no Drive</a>` : ''}</p>
<h2>Visão geral</h2><p>${esc(s.visao_geral)}</p>
<h2>Serviço contratado</h2><p>${esc(s.servico_contratado)}</p>
<h2>Valores e pagamentos</h2><p>${esc(s.valores_pagamentos)}</p>${payRows}
<h2>O que foi combinado</h2>${ul(s.combinado)}
<h2>O que prometemos</h2>${ul(s.promessas)}
<h2>O que o cliente espera de nós</h2>${ul(s.expectativas)}
<h2>Prazos</h2>${ul(s.prazos)}
<h2>Briefing do projeto</h2>${ul(s.briefing)}
<h2>Obrigações do cliente</h2>${ul(s.obrigacoes_cliente)}
<h2>Obrigações da equipe</h2>${ul(s.obrigacoes_equipe)}
<h2>Pendências</h2>${ul(s.pendencias)}
<h2>Tarefas de produção</h2>${ul(s.tarefas)}
<h2>Observações e cuidados</h2>${ul(s.observacoes)}
<h2>Arquivos enviados pelo cliente</h2>${fileRows}
<h2>Histórico da conversa</h2><p>${esc(s.historico)}</p>
</body></html>`;
}

/** Texto do resumo para o painel de Produção. */
export function summaryText(s: any) {
  const sec = (t: string, xs?: string[]) => ((xs || []).filter(Boolean).length ? `\n${t}\n${(xs || []).filter(Boolean).map((x) => `• ${x}`).join('\n')}\n` : '');
  return `${s.visao_geral}\n\nSERVIÇO: ${s.servico_contratado}\nVALORES: ${s.valores_pagamentos}\n${sec('COMBINADO', s.combinado)}${sec('PROMETEMOS', s.promessas)}${sec('O CLIENTE ESPERA', s.expectativas)}${sec('PRAZOS', s.prazos)}${sec('BRIEFING', s.briefing)}${sec('CLIENTE PRECISA', s.obrigacoes_cliente)}${sec('EQUIPE PRECISA', s.obrigacoes_equipe)}${sec('PENDÊNCIAS', s.pendencias)}${sec('CUIDADOS', s.observacoes)}`.trim();
}

/**
 * Refaz o resumo completo (IA, modelo melhor, 1 chamada) e o Google Docs do cliente.
 * As tarefas já marcadas como feitas continuam marcadas.
 */
export async function refreshProject(leadId: string) {
  const { data: lead } = await db().from('leads').select('*').eq('id', leadId).maybeSingle();
  if (!lead) throw new Error('Cliente não encontrado');
  const [{ data: msgs }, { data: pays }, { data: svcs }] = await Promise.all([
    db().from('messages').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(250),
    db().from('payments').select('*').eq('lead_id', leadId).order('created_at'),
    db().from('services').select('slug,name,description').eq('active', true),
  ]);
  const history = (msgs || []).reverse();
  const files = history.filter((m: any) => m.direction === 'in' && MEDIA.includes(m.kind));
  const svc = (svcs || []).find((x: any) => x.slug === lead.deal_service);
  const s: any = await structured(
    `Você é gerente de projetos de uma agência que faz sites e serviços digitais. Monte o RESUMO COMPLETO do projeto deste cliente para a equipe de produção, a partir da conversa de WhatsApp e dos dados.
Regras: seja fiel ao que foi dito; NÃO invente valores, prazos, promessas ou entregas. Se algo não foi combinado, diga isso. Use as palavras do cliente quando ajudar. Português do Brasil, frases curtas e práticas.`,
    `DADOS DO CLIENTE
Nome: ${lead.name} · WhatsApp: ${lead.whatsapp || '—'} · Ramo: ${lead.niche || '—'} · Cidade: ${lead.city || '—'}
Etapa: ${lead.stage} · Serviço: ${svc ? `${svc.name} (${svc.description || ''})` : lead.deal_service || '—'} · Valor combinado: ${lead.deal_price ? brl(lead.deal_price) : '—'} · Valor pago: ${lead.paid_amount ? brl(lead.paid_amount) : '—'}
Memória da conversa: ${JSON.stringify(lead.memory || {})}
Dores: ${(lead.pains || []).join('; ') || '—'} · Objeções: ${(lead.objections || []).join('; ') || '—'}
Prévia do site: ${lead.preview_slug ? `${appUrl()}/previa/${lead.preview_slug}` : 'não'}
Pagamentos: ${(pays || []).map((p: any) => `${brl(p.amount)} ${p.status}${p.paid_at ? ' em ' + new Date(p.paid_at).toLocaleDateString('pt-BR') : ''}`).join('; ') || 'nenhum'}
Arquivos que o cliente mandou: ${files.length}
Anotações da equipe: ${lead.production_notes || '—'}

CONVERSA
${transcript(history).slice(-60000)}`,
    'resumo_do_projeto',
    SUMMARY_SCHEMA,
    3000,
    { task: 'resumo_projeto', tier: 'smart', leadId },
  );

  // tarefas: mantém as que já foram feitas
  const old: any[] = Array.isArray(lead.project_tasks) ? lead.project_tasks : [];
  const done = new Set(old.filter((t) => t.done).map((t) => String(t.title).toLowerCase()));
  const manual = old.filter((t) => t.manual);
  const tasks = [...(s.tarefas || []).map((t: string) => ({ title: t, done: done.has(String(t).toLowerCase()) })), ...manual];

  const patch: any = { project_summary: summaryText(s), project_tasks: tasks, project_summary_at: new Date().toISOString(), doc_dirty: false };
  if (await driveReady()) {
    try {
      const f = await ensureClientFolder(lead);
      const fresh = { ...lead, drive_folder_url: f.url };
      const html = summaryHtml(fresh, s, files, pays || []);
      let doc = lead.drive_doc_id && (await exists(lead.drive_doc_id)) ? await updateDoc(lead.drive_doc_id, html) : null;
      if (!doc) doc = await upload(`Resumo do projeto - ${safeName(lead.name)}`, 'text/html', Buffer.from(html), f.id, true);
      patch.drive_doc_id = doc.id;
      patch.drive_doc_url = doc.url;
      patch.drive_error = null;
    } catch (e: any) {
      patch.drive_error = 'Resumo não foi para o Drive: ' + String(e?.message || e).slice(0, 200);
    }
  }
  await db().from('leads').update(patch).eq('id', leadId);
  return patch;
}

/** Resumos pendentes: depois do pagamento, quando o cliente manda algo novo ou a equipe pede. No máximo a cada 30 min por cliente. */
export async function refreshDirtyProjects(limit = 1) {
  const since = new Date(Date.now() - 30 * 60_000).toISOString();
  const { data } = await db().from('leads').select('id').eq('doc_dirty', true).not('production_status', 'is', null).or(`project_summary_at.is.null,project_summary_at.lt.${since}`).limit(limit);
  for (const l of data || []) await refreshProject(l.id);
  return (data || []).length;
}

/** Pagou: entra na fila da Produção e o resumo é montado. Silencioso se a migração 016 ainda não rodou. */
export async function startProduction(leadId: string) {
  const { data: lead } = await db().from('leads').select('*').eq('id', leadId).maybeSingle();
  if (!lead || lead.production_status) return;
  await db()
    .from('leads')
    .update({ production_status: 'fila', production_started_at: new Date().toISOString(), doc_dirty: true })
    .eq('id', leadId)
    .then(() => {}, () => {});
}

/** Um ciclo do robô: pastas, arquivos, recibos e resumos. */
export async function driveCycle() {
  const ready = await driveReady();
  const r: any = { folders: 0, files: 0, payments: 0, docs: 0 };
  if (ready) {
    r.folders = (await createPendingFolders(5)).length;
    r.files = await syncMedia(8);
    r.payments = await syncPayments(3);
  }
  r.docs = await refreshDirtyProjects(1);
  return r;
}
