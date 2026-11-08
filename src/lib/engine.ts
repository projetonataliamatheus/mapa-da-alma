/**
 * Motor de vendas: tudo que acontece com um lead passa por aqui.
 * Usado pelo robô (worker), pelos webhooks e pela API do painel.
 */
import { precoUpgrade } from './mapa-alma/upgrade';
import { nomeProprio } from './mapa-alma/nome';
import { modoAtual, followUpGrazi, segundaOfertaValida, calcVagas, fraseVagas, fechamentoGraziOn } from './mapa-alma/modos';
import { isolateLinks } from './links';
import { packsFor } from './packs-server';
import { campaignOf } from './campaigns';
import { inService, nextCommercialStart } from './hours';
import { isProspect } from './prompts';
import { admin } from './supabase/admin';
import { getSettings, Settings } from './settings';
import { notaRitmo, semDesculpaPorDemora } from './ritmo';
import { valoresInvalidos, valoresCitados, semSaudacao } from './valor';
import { evo, typingMs, phoneJid } from './evolution';
import { startProduction } from './production';
import { audioAllowed, sendVoice, voiceConfigured, momentScript, momentOn, sendMoment } from './voice';
import { structured, bubbles, REPLY_SCHEMA, ReplyResult, MESSAGE_SCHEMA, SALE_SCHEMA, SUMMARY_SCHEMA, PLAYBOOK_SCHEMA } from './ai';
import { salesSystem, transcript, WRITING_RULES, leadBlock, servicesBlock, greetingLine, stripGreeting, memoryBlock, greetingWord } from './prompts';
import { ensureCustomer, createPixCharge, cleanDocument, criarPixDireto } from './asaas';
import { linkForLead } from './checkout';
import { generatePreview, examplesFor, previewUrl, colorFrom } from './preview';
import { fichaDoMapa, dataDoTexto, nomeDoTexto } from './mapa-alma/leitura';
import { dataISO, urlMapa } from './mapa-alma/servico';
import { detectGender } from './gender';
import { currentActor } from './actor';
import { transcribe } from './transcribe';
import { waKey } from './phone';
import { markUsed, creditWins } from './knowledge';
import { gather, getBrains, brainsBlock, masterBlock, withMaster, situationBlock, exMeta, markExamplesUsed, creditRealWins, Intel } from './intel';
import { brl, rand, norm, spNow, appBase } from './util';

const db = () => admin();

export const STAGE_RANK: Record<string, number> = { novo: 0, abordado: 1, respondeu: 2, interessado: 3, negociando: 4, pix: 5, pago: 6, sem: 1, remarketing: 1 };

export async function logEvent(lead_id: string | null, type: string, channel: string, text: string, meta: any = {}) {
  // membro da equipe que fez a ação (vazio = IA/robô)
  const a = currentActor();
  const row: any = { lead_id, type, channel, text, meta: a ? { ...meta, actor: a } : meta };
  if (a) Object.assign(row, { actor_id: a.id, actor_name: a.name });
  const { error } = await db().from('lead_events').insert(row);
  // banco sem as colunas novas ainda: grava sem elas (o nome fica no meta)
  if (error && a) await db().from('lead_events').insert({ lead_id, type, channel, text, meta: row.meta });
}

export function withSteps(current: string[] | null, ...add: string[]) {
  return Array.from(new Set([...(current || []), ...add.filter(Boolean)]));
}

/** Nicho de aprendizado deste sistema: o Mapa da Alma tem um só negócio, então as vendas confirmadas alimentam o mesmo playbook. */
export const NICHO_MAPA = 'Mapa da Alma';

/* ---------------- contexto da IA ---------------- */

/** Conversa quente ou em negociação: vale usar o modelo mais caprichado. */
/** o cliente pediu a mesma coisa 2 vezes ou mais desde a última resposta (ou cobrou algo): caso para o modelo mais inteligente */
export function insistent(history: any[]) {
  const ins = history.filter((m) => m.direction === 'in').slice(-6).map((m) => String(m.transcript || m.body || '').toLowerCase().trim()).filter((t) => t.length > 2);
  if (ins.some((t) => /\b(kd|cad[eê]|n[aã]o (me )?(mandou|chegou|enviou)|nada ainda|esqueceu|e a[ií]\??$|t[oô] esperando|ainda n[aã]o)\b/.test(t))) return true;
  for (let i = 0; i < ins.length; i++) for (let j = i + 1; j < ins.length; j++) if (similar(ins[i], ins[j]) > 0.6) return true;
  return false;
}

export function needsSmarter(r: any) {
  const u = r?.understanding;
  if (!u) return false;
  return Number(u.confidence ?? 100) < 60 || (u.intents || []).some((x: string) => ['cobrando_algo_prometido', 'repetiu_pedido', 'reclamacao_ou_irritado'].includes(x)) || ['impaciente', 'irritado'].includes(u.mood);
}

/** o entendimento da IA (pelo contexto) também dispara a prévia, além das palavras-chave */
export function previewByUnderstanding(r: any, _hasPreview = false) {
  const u = r?.understanding;
  if (!u) return false;
  const it: string[] = u.intents || [];
  const pr: string[] = u.promises || [];
  if (pr.includes('enviar_previa') || pr.includes('ajustar_previa')) return true;
  if (it.includes('quer_ver_previa') || it.includes('quer_mudar_previa')) return true;
  // cobrou algo e o que estava prometido era a prévia
  return it.includes('cobrando_algo_prometido') && /pr[eé]via|link|site|vers[aã]o|modelo|cor|layout/i.test(`${u.client_meant} ${u.refers_to || ''}`);
}

export function isHot(lead: any, settings: any) {
  return (lead.temperature || 0) >= (settings.temp?.hot || 65) || ['negociando', 'pix'].includes(lead.stage);
}

/** Quantas mensagens recentes vão inteiras para a IA (o resto vem pela ficha e pelo resumo). */
/** Quantas mensagens o cliente já mandou DEPOIS de comprar (para ir despedindo aos poucos e gastar o mínimo). */
export async function mensagensPosVenda(lead: any): Promise<number> {
  if (lead?.stage !== 'pago' || !lead.paid_at) return 0;
  const { count } = await db().from('messages').select('id', { count: 'exact', head: true }).eq('lead_id', lead.id).eq('direction', 'in').gte('created_at', new Date(Math.max(new Date(lead.paid_at).getTime(), Date.now() - 48 * 3600_000)).toISOString());
  return count || 0;
}
/** Espera extra (segundos) antes de responder a quem já comprou e continua conversando: a partir da 4ª mensagem vai demorando mais. */
export function esperaPosVenda(n: number): number {
  if (n < 4) return 0;
  return Math.min(2400, 25 * Math.pow(2, n - 4)); // 25s, 50s, 100s, 200s, 400s, 800s… no máximo 40 min
}
const PERSONA_NOTE = `

SOBRE VOCÊ (só quando a pessoa PERGUNTAR; nunca puxe esse assunto sozinha, nem mencione): você é brasileira, mora no Brasil, e se dedica por inteiro ao trabalho espiritual (numerologia, astrologia e tarô), que é a sua profissão e a sua missão de vida. Atende só pelo WhatsApp. Se perguntarem quem é a Naty, onde mora, de que país é ou o que faz, responda isso com naturalidade, em 1 ou 2 frases, sem inventar detalhes pessoais (cidade, idade, família, endereço): se insistirem nesses detalhes, diga com carinho que prefere guardar a vida pessoal e volte para o mapa da pessoa. Para quem escreve em espanhol, diga também que é brasileira e atende em espanhol com carinho.`;
const NOTA_SEM_PREVIA = `

NESTA ETAPA VOCÊ NÃO ENVIA "prévia", "vista previa" nem link do mapa: o sistema manda sozinho só as pirâmides, e o mapa completo vai depois do pagamento. NUNCA diga "te mando a prévia", "aqui está o link do seu mapa" nem "já te envio o enlace". Se o cliente perguntar onde está a prévia/o link, seja honesta: explique que você vai mostrando as partes do mapa dele aqui na conversa e que o mapa completo, com link e PDF, é liberado assim que ele confirmar. NUNCA peça de novo o nome completo e a data de nascimento se já constam na ficha. Se o cliente mandar nome completo e data (mesmo com ano de 2 dígitos, ex.: "14/12/46" = 14/12/1946; REGRA DO ANO DE 2 DÍGITOS: 00 a 26 = 2000 a 2026, 27 a 99 = 1927 a 1999; aceite espaços como "14 /12/46"), ACEITE e registre em memory.mapa_nome_completo e memory.mapa_nascimento (DD/MM/AAAA) na mesma resposta: nunca peça de novo.`;
function notaPosVenda(n: number, es: boolean) {
  if (n < 1) return '';
  let t = `\n\nPÓS-VENDA (o cliente JÁ COMPROU; esta é a mensagem ${n} dele depois da compra): economize. Responda curto, em NO MÁXIMO 1 balão, sem abrir assuntos novos, sem perguntas que puxem mais conversa e sem oferecer mais nada, a menos que ele peça para comprar algo.`;
  if (n >= 4) t += ` A agenda está corrida: despeça-se aos poucos, com carinho (ex.: "hoje estou com muitos atendimentos, qualquer dúvida do seu mapa me chama 💜").`;
  if (n >= 8) t += ` Já é muita conversa: encerre de forma carinhosa e breve (uma frase), agradecendo e dizendo que o mapa responde a maior parte das dúvidas, e que você volta a olhar com calma quando puder.`;
  return t;
}
const HISTORY_MSGS = 14; // padrão; o valor real vem de Custos › Economia da IA (budget.history_msgs)

/** Modelo mais inteligente (e caro) só na reta final: negociação, Pix ou lead muito quente (80+). */
export function needsSmart(lead: any, settings: any) {
  if (lead?.stage === 'pago') return false; // pós-venda: sempre o modelo mais econômico
  // economia: Sonnet só nas etapas escolhidas em Custos (padrão: negociando e pix); o resto vai no Haiku
  const st = settings?.budget?.smart_stages;
  return (Array.isArray(st) ? st : ['negociando', 'pix']).includes(lead.stage);
}

async function activeServices() {
  const { data } = await db().from('services').select('*').eq('active', true).order('sort');
  // serviço entra se tiver pelo menos um plano ligado com preço (Vitalício, Anual ou Mensal)
  return (data || []).filter((s: any) => (s.plan_once !== false && s.max_price) || (s.plan_annual && s.annual_price) || ((s.plan_monthly ?? s.monthly_price != null) && s.monthly_price));
}

/** Menor preço que a IA pode oferecer sem pedir aprovação. */
export function floorFor(lead: any, services: any[]) {
  const svc = services.find((s) => s.slug === lead.deal_service) || services[0];
  if (!svc || !svc.max_price || svc.plan_once === false) return null;
  const steps = (svc.price_steps || []).map(Number).filter(Boolean).sort((a: number, b: number) => b - a);
  const min = Number(svc.min_price || steps[steps.length - 1] || svc.max_price);
  if (lead.approved_price) return Math.max(min, Number(lead.approved_price));
  const approval = svc.approval_from ? Number(svc.approval_from) : null;
  const allowed = steps.filter((v: number) => (approval ? v > approval : true));
  return allowed.length ? allowed[allowed.length - 1] : Number(svc.max_price);
}

async function loadContext(lead: any, lastText: string) {
  const [settings, services, approachRes, playbookRes, objectionsRes, kb, brains, examples] = await Promise.all([
    getSettings(db()),
    activeServices(),
    db().from('approaches').select('*').eq('slug', lead.approach_slug || 'calma').maybeSingle(),
    db().from('playbooks').select('content').eq('niche', lead.niche || NICHO_MAPA).maybeSingle(),
    db().from('objections').select('*').eq('niche', lead.niche || NICHO_MAPA).order('wins', { ascending: false }).limit(8),
    gather(`${lastText} ${(lead.objections || []).slice(-2).join(' ')}`, {
      stage: lead.stage,
      niche: lead.niche,
      kinds: lead.stage === 'pix' ? ['fechamento', 'objecao'] : lead.stage === 'negociando' ? ['objecao', 'fechamento', 'resposta'] : ['resposta', 'objecao'],
    }),
    getBrains(),
    examplesFor(lead.niche).catch(() => []),
  ]);
  // packs de artes no Canva do ramo do cliente (a IA oferece como complemento)
  const packs: any[] = []; // Mapa da Alma: sem packs de artes
  return {
    examples: settings.previews?.send_examples === false ? [] : examples,
    packs,
    previewUrl: lead.mapa_slug || lead.preview_slug ? (await import('./mapa-alma/servico')).urlMapa(lead.mapa_slug || lead.preview_slug, '', lead.idioma) : null,
    settings,
    services,
    approach: approachRes.data,
    playbook: playbookRes.data?.content || null,
    objections: objectionsRes.data || [],
    kb,
    brains: brainsBlock(brains),
    master: masterBlock(brains.master),
    situation: situationBlock(kb),
  };
}

/* ---------------- envio ---------------- */

/**
 * Número que vai enviar. A conversa fica SEMPRE no número dela: se ele estiver desconectado, não manda
 * por outro chip (o cliente receberia de um número que não conhece); espera reconectar.
 * Só usa outro número quando a conversa ainda não tem número ou o dela foi removido do painel.
 */
export async function connectedNumber(preferredId?: string | null) {
  if (preferredId) {
    const { data } = await db().from('whatsapp_numbers').select('*').eq('id', preferredId).maybeSingle();
    if (data && data.status === 'conectado') return data;
    if (data) return null;
  }
  const { data } = await db().from('whatsapp_numbers').select('*').eq('status', 'conectado').order('sent_today').limit(10);
  // o chip de Recuperação é só para recuperar vendas do site: nunca entra no rodízio normal
  return (data || []).find((n: any) => !n.recuperacao) || null;
}

/** Formato que a Evolution usa para "responder" uma mensagem específica (aparece citada no WhatsApp do cliente). */
export function quotedFor(lead: any, q?: { wa_id?: string | null; body?: string; dir?: string } | null) {
  if (!q?.wa_id) return undefined;
  return { key: { id: q.wa_id, remoteJid: `${String(lead.whatsapp || '').replace(/\D/g, '')}@s.whatsapp.net`, fromMe: q.dir === 'out' }, message: { conversation: String(q.body || '').slice(0, 500) } };
}

/** Marca o id como enviado pelo próprio sistema (o aviso de "mensagem enviada" que volta do WhatsApp não vira mensagem da equipe pelo celular). */
export function markSentByUs(waId?: string | null) {
  if (!waId) return;
  sentByUs.add(waId);
  setTimeout(() => sentByUs.delete(waId), 120_000);
}

/** Ids das mensagens que o próprio sistema enviou (para não confundir com mensagens da equipe pelo celular). */
const sentByUs = new Set<string>();

/** Envia uma mensagem e registra no histórico (com a temperatura e a etapa do momento, para medir o efeito depois). */
/* ---------------- envios extras da consulta (pirâmides escolhidas, simpatia, apresentação) ---------------- */

/** Manda o link só com as pirâmides escolhidas (1 a 3). Precisa do mapa já calculado na conversa. */
export async function enviarPiramides(number: any, lead: any, so0: string[], author: 'ai' | 'human' = 'ai', por?: string) {
  const slug = lead.mapa_slug || lead.preview_slug;
  if (!slug) throw new Error('Esta conversa ainda não tem mapa: gere o mapa (nome completo + data) primeiro.');
  const { linkPiramides } = await import('./mapa-alma/servico');
  const { pirValidas, NOME_PIR } = await import('./mapa-alma/mapa/piramides');
  const so = pirValidas(so0).slice(0, 3);
  if (!so.length) throw new Error('Escolha de 1 a 3 pirâmides.');
  // prévia com bloqueios ligada (e mapa ainda não pago): o link é o do mapa inteiro com cadeados e contador; as pirâmides enviadas ficam abertas lá
  let url = await linkPiramides(slug, so);
  try {
    const { data: mp } = await db().from('mapas').select('slug,tipo,liberado').eq('slug', slug).maybeSingle();
    const { previaCfg } = await import('./mapa-alma/previa');
    if (mp && !mp.liberado && mp.tipo !== 'casal' && (await previaCfg()).ativo) {
      const { linkMapa } = await import('./mapa-alma/servico');
      url = linkMapa({ slug, idioma: lead.idioma }) + '#piramides';
      const ja0: string[] = Array.isArray(lead.memory?.piramides_enviadas) ? lead.memory.piramides_enviadas : [];
      lead.memory = { ...(lead.memory || {}), piramides_enviadas: [...new Set([...ja0, ...so])] };
      await db().from('leads').update({ memory: lead.memory }).eq('id', lead.id).then(() => {}, () => {});
    }
  } catch { /* mantém o link das pirâmides */ }
  const nomes = so.map((x) => NOME_PIR[x]);
  const txt = `${so.length === 1 ? `Aqui está a ${nomes[0]} do seu nome` : `Aqui estão ${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]} do seu nome`} 🔺\nOs números em vermelho são os bloqueios que te contei:\n${url}`;
  await sendAndRecord(number, lead, txt, author, true);
  const ja: string[] = Array.isArray(lead.memory?.piramides_enviadas) ? lead.memory.piramides_enviadas : [];
  const mem = { ...(lead.memory || {}), piramides_enviadas: [...new Set([...ja, ...so])] };
  lead.memory = mem;
  await db().from('leads').update({ memory: mem }).eq('id', lead.id).then(() => {}, () => {});
  await logEvent(lead.id, 'piramides_enviadas', author === 'ai' ? 'ai' : 'acc', `${por ? por + ' mandou' : 'IA mandou'} para ${lead.name}: ${nomes.join(', ')}`);
  return url;
}

/** Manda uma simpatia/oração da biblioteca. */
export async function enviarSimpatia(number: any, lead: any, cod: string | number, author: 'ai' | 'human' = 'ai', por?: string) {
  const { simpatiaPorCodigo, textoSimpatia, textoSimpatiaES, contarEnvio } = await import('./mapa-alma/simpatias/servico');
  const sp = await simpatiaPorCodigo(cod);
  if (!sp) throw new Error('Simpatia não encontrada ou desativada.');
  await sendAndRecord(number, lead, lead?.idioma === 'es' ? await textoSimpatiaES(sp) : textoSimpatia(sp), author, true);
  await contarEnvio(sp.id);
  const ja: number[] = Array.isArray(lead.memory?.simpatias_enviadas) ? lead.memory.simpatias_enviadas : [];
  const mem = { ...(lead.memory || {}), simpatias_enviadas: [...new Set([...ja, sp.codigo])] };
  lead.memory = mem;
  await db().from('leads').update({ memory: mem }).eq('id', lead.id).then(() => {}, () => {});
  await logEvent(lead.id, 'simpatia_enviada', author === 'ai' ? 'ai' : 'acc', `${por ? por + ' mandou' : 'IA mandou'} a simpatia "${sp.titulo}" para ${lead.name}`);
}

/** Manda a imagem de apresentação do Mapa da Alma (mockup + todos os temas). Uma vez por conversa, salvo pela equipe. */
export async function enviarApresentacao(number: any, lead: any, author: 'ai' | 'human' = 'ai', por?: string) {
  const s: any = await getSettings(db());
  const es = lead?.idioma === 'es';
  const url = String((es ? s.mapa_marca?.apresentacao_url_es : s.mapa_marca?.apresentacao_url) || '').trim() || (es ? '' : `${appBase()}/apresentacao-mapa.jpg`);
  if (!url) throw new Error('Falta a imagem de apresentação em ESPANHOL (menu Gerador de mapa › Aparência).');
  const { enviarMidia, baixarArquivo } = await import('./mapa-alma/midia');
  const f = await baixarArquivo(url).catch((e) => { throw new Error('Não consegui abrir a imagem de apresentação: ' + e.message); });
  await enviarMidia(number, lead, { tipo: 'imagem', b64: f.b64, mime: f.mime || 'image/jpeg', nome: 'mapa-da-alma.jpg', body: es ? '[imagen de presentación del Mapa del Alma]' : '[imagem de apresentação do Mapa da Alma]', author, meta: { url } });
  const mem = { ...(lead.memory || {}), apresentacao_em: Date.now() };
  lead.memory = mem;
  await db().from('leads').update({ memory: mem }).eq('id', lead.id).then(() => {}, () => {});
  await logEvent(lead.id, 'apresentacao_enviada', author === 'ai' ? 'ai' : 'acc', `${por ? por + ' mandou' : 'IA mandou'} a imagem de apresentação do mapa para ${lead.name}`);
}

/** Modo Grazi: quantas pessoas a IA já atendeu hoje (horário de Brasília), sem contar esta conversa. */
async function atendidasHoje(exceto: string): Promise<number> {
  try {
    const desde = new Date(Date.now() - spNow().minutes * 60_000);
    desde.setSeconds(0, 0);
    const ids = new Set<string>();
    let from = 0;
    for (;;) {
      const { data } = await db().from('messages').select('lead_id').eq('direction', 'out').eq('author', 'ai').gte('created_at', desde.toISOString()).range(from, from + 999);
      for (const r of data || []) if (r.lead_id && r.lead_id !== exceto) ids.add(r.lead_id);
      if (!data || data.length < 1000) break;
      from += 1000;
    }
    return ids.size;
  } catch {
    return 0;
  }
}

export async function sendAndRecord(number: any, lead: any, text: string, author: 'ai' | 'human' | 'system', typing = true, meta: any = {}) {
  // pausa definitiva: só a equipe fala com este contato (confere no banco, não na cópia em memória)
  if (author !== 'human') {
    const { data: cur } = await db().from('leads').select('*').eq('id', lead.id).maybeSingle();
    if (cur?.ai_locked) return null;
  }
  // a IA às vezes devolve a lista de balões como texto ([\"...\"]): desembrulha antes de enviar
  if (author !== 'human' && /^\s*\[\s*"[\s\S]*"\s*\]\s*$/.test(text)) {
    try { const arr = JSON.parse(text); if (Array.isArray(arr) && arr.every((x) => typeof x === 'string')) text = arr.join('\n\n'); } catch {}
  }
  // links sempre isolados: frase com 👇, o link sozinho na linha de baixo e o resto depois de uma linha em branco
  if (author !== 'human' && lead?.idioma === 'es') {
    try {
      const { traduzirMensagem } = await import('./i18n');
      const { contaES, contaPT } = await import('./internacional');
      // TRAVA DE IDIOMA: contato em espanhol nunca recebe português (nem misturado). Traduz, confere de novo e, se ainda sobrar português, não envia.
      const semLinks = (t: string) => t.replace(/https?:\/\/\S+/g, '').trim();
      const temPT = (t: string) => /\b(voc[êe]s?|n[ãa]o|entendo|quando|tamb[ée]m|obrigad[oa]|ent[ãa]o|pra|muito|ainda|poss[ií]vel|fazer|nossa|minha|seu|pessoa|quer|bem|ficar)\b|[ãõç]/i.test(semLinks(t)) || (contaPT(semLinks(t)) > 0 && contaES(semLinks(t)) === 0);
      const precisa = (t: string) => semLinks(t).length >= 8 && (contaES(t) === 0 || temPT(t));
      if (precisa(text)) {
        text = await traduzirMensagem(text);
        for (let t = 1; t <= 2 && temPT(text); t++) text = await traduzirMensagem(text + '\u200b'.repeat(t));
        if (temPT(text)) {
          await logEvent(lead.id, 'idioma_bloqueado', 'warn', `Bloqueei uma resposta da IA para ${lead.name}: saiu em português para um contato em espanhol. Responda você ou peça para a IA tentar de novo.`);
          return null;
        }
      }
    } catch {}
  }
  if (author !== 'human') text = isolateLinks(text);
  const r: any = await evo.sendText(number.instance_name, lead.whatsapp, text, typing ? typingMs(text) : 0, quotedFor(lead, meta?.quoted));
  const waId = r?.key?.id || null;
  if (waId) {
    sentByUs.add(waId);
    setTimeout(() => sentByUs.delete(waId), 120_000);
  }
  const m = { temp: lead.temperature ?? 0, stage: lead.stage, ...meta };
  // mensagem da equipe: guarda quem mandou (aparece no balão)
  const by = author === 'human' ? currentActor() : null;
  await db().from('messages').insert({ lead_id: lead.id, number_id: number.id, direction: 'out', author, body: text, wa_message_id: waId, meta: by ? { ...(m || {}), by: by.name, by_id: by.id } : m });
  return waId;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Semelhança entre duas frases (0 a 1), pelas palavras em comum. */
export function similar(a: string, b: string) {
  const w = (t: string) => new Set(norm(t).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((x) => x.length > 2));
  const A = w(a);
  const B = w(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((x) => B.has(x) && inter++);
  return inter / Math.min(A.size, B.size) * (Math.min(A.size, B.size) / Math.max(A.size, B.size)) ** 0.25;
}

/** Último envio de cada número (anti-bloqueio: nunca dispara mensagens coladas). */
const lastSend = new Map<string, number>();
async function numberGap(numberId: string, gap: { min: number; max: number }) {
  const need = rand(Math.max(1, gap.min), Math.max(gap.min, gap.max)) * 1000;
  const since = Date.now() - (lastSend.get(numberId) || 0);
  if (since < need) await wait(need - since);
  lastSend.set(numberId, Date.now());
}

/** Mantém o "digitando…" aparecendo no celular do cliente durante todo o tempo (o WhatsApp apaga sozinho após alguns segundos). */
const ABRINDO_MAPA = [
  '{nome}, que nome lindo. Vou abrir o seu mapa agora, com calma. Me dá só uns minutinhos que estou calculando os números do seu nome e olhando o céu do dia em que você nasceu 🌙',
  'Recebi, {nome}. Já vou fazer o seu estudo: cada letra do seu nome tem um número, e a sua data mostra o seu signo e os seus ciclos. Só uns minutinhos que já te conto ✨',
  'Perfeito, {nome}. Hoje tá bem corrido por aqui, muita gente chamando, mas vou olhar o seu mapa com todo carinho. Me dá uns minutinhos 🙏',
  'Obrigada, {nome}. Vou abrir o seu mapa agora e somar as vibrações do seu nome. Tô com algumas pessoas na fila, mas já já volto com o que eu encontrar 🔮',
  'Que bom, {nome}. Deixa eu olhar com calma o que os seus números contam. Só uns minutinhos, tá? ✨',
]

/** Consulta ao mapa: quanto tempo a "consultora" leva para olhar o mapa e voltar (2 a 4 min). */
const tempoConsulta = () => (120 + Math.floor(Math.random() * 120)) * 1000;
/** Pode consultar de novo? (no máximo 6 consultas por conversa, com pelo menos 6 min entre elas) */
const podeConsultar = (mem: any) => (Number(mem?.consultas) || 0) < 6 && Date.now() - (Number(mem?.ultima_consulta) || 0) > 6 * 60_000;

/** Prepara a consulta ao vivo: acha nome + data (memória ou mensagens), avisa que está abrindo o mapa e devolve a ficha. */
async function prepararLeitura(number: any, lead: any, history: any[], settings: any): Promise<{ ficha: string; nova: boolean } | null> {
  const mem: any = lead.memory || {};
  if (/casal/i.test(String(mem.mapa_tipo || '')) && !mem.mapa_nome_2) return null;
  const textos = history.filter((m) => m.direction === 'in').slice(-8).map((m) => String(m.transcript || m.body || ''));
  const iData = textos.map((t) => !!dataDoTexto(t)).lastIndexOf(true);
  const nasc = dataISO(mem.mapa_nascimento) || (iData >= 0 ? dataDoTexto(textos[iData]) : null);
  // nome: da memória, ou da mesma mensagem da data, ou da mensagem logo antes/depois dela
  const perto = iData >= 0 ? [textos[iData], textos[iData - 1], textos[iData + 1]].filter(Boolean) as string[] : [];
  let nome = String(mem.mapa_nome_completo || '').trim() || perto.map(nomeDoTexto).find(Boolean) || '';
  if (!nasc || nome.split(/\s+/).length < 2) return null;
  nome = nomeProprio(nome);
  if (!mem.site) await import('./site-origem').then((x) => x.atribuirSite(lead, { nome, nascimentoISO: nasc })).catch(() => {});
  const ficha = fichaDoMapa(nome, nasc, new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10));
  const nova = !mem.leitura_iniciada;
  if (nova) {
    const novaMem = { ...(lead.memory || mem), mapa_nome_completo: nome, mapa_nascimento: nasc.split('-').reverse().join('/'), leitura_iniciada: Date.now() };
    lead.memory = novaMem;
    await db().from('leads').update({ memory: novaMem }).eq('id', lead.id).then(() => {}, () => {});
    const primeiro = String(mem.nome_cliente || nome).split(' ')[0];
    // o mapa é gerado e gravado já agora (prévia, ligada a esta conversa): a equipe vê no Gerador e o link fica pronto
    try {
      const { criarMapa } = await import('./mapa-alma/servico');
      const casal = /casal/i.test(String(mem.mapa_tipo || '')) && mem.mapa_nome_2 && dataISO(mem.mapa_nascimento_2);
      const mp = await criarMapa({ leadId: lead.id, tipo: casal ? 'casal' : 'pessoal', nome, nascimento: nasc, nome2: casal ? mem.mapa_nome_2 : null, nascimento2: casal ? mem.mapa_nascimento_2 : null, by: 'ia' });
      lead.mapa_slug = mp.slug;
      await logEvent(lead.id, 'mapa_gerado', 'ai', `Mapa de ${nome} gerado sozinho na conversa (base da consulta)`, { slug: mp.slug });
    } catch (e: any) {
      await logEvent(lead.id, 'mapa_erro', 'warn', `Não consegui gravar o mapa de ${nome}: ${e?.message || e}`);
    }
    // explicação curta e persuasiva do Mapa + "vou abrir o seu mapa" (Modo Grazi: só o aviso curto)
    if (modoAtual(settings) === 'grazi') {
      const msg = ABRINDO_MAPA[Math.floor(Math.random() * ABRINDO_MAPA.length)].replace('{nome}', primeiro);
      await sendAndRecord(number, lead, msg, 'ai', settings.typing !== false);
    } else if (history.some((m: any) => m.direction === 'out' && /(o mapa|mapa pessoal) (é feito|funciona|é um estudo|é um guia)|estudo (aprofundado|completo)|manual (exclusivo|passo a passo)|guia particular/i.test(String(m.transcript || m.body || '')))) {
      // o Mapa já foi explicado (por áudio do fluxo ou mensagem): só avisa que está abrindo, sem repetir a explicação
      const msg = ABRINDO_MAPA[Math.floor(Math.random() * ABRINDO_MAPA.length)].replace('{nome}', primeiro);
      await sendAndRecord(number, lead, msg, 'ai', settings.typing !== false);
    } else {
      const { EXPLICA_MAPA } = await import('./mapa-alma/roteiro');
      const usadas: number[] = Array.isArray(mem.explicacoes) ? mem.explicacoes : [];
      const livres = EXPLICA_MAPA.map((_, i) => i).filter((i) => !usadas.includes(i));
      const k = (livres.length ? livres : EXPLICA_MAPA.map((_, i) => i))[Math.floor(Math.random() * (livres.length || EXPLICA_MAPA.length))];
      await sendBubbles(number, lead, EXPLICA_MAPA[k].map((t) => t.replace('{nome}', primeiro)), 'ai', settings.typing !== false);
    }
    // o "estudo" leva uns minutos, como numa consulta de verdade: a leitura volta sozinha depois
    const ate = Date.now() + tempoConsulta();
    const mem2 = { ...novaMem, consulta_pendente: { tema: 'leitura inicial', ate }, ultima_consulta: Date.now(), consultas: (Number(mem.consultas) || 0) + 1 };
    lead.memory = mem2;
    lead.steps = withSteps(lead.steps, 'talk', 'interest', 'dados');
    await db().from('leads').update({ memory: mem2, steps: lead.steps, reply_due_at: new Date(ate).toISOString() }).eq('id', lead.id).then(() => {}, () => {});
  }
  return { ficha, nova };
}

async function showTyping(number: any, phone: string, ms: number) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const slice = Math.min(4000, end - Date.now());
    // não espera a Evolution: o tempo é controlado aqui
    evo.presence(number.instance_name, phone, 'composing', slice).catch(() => {});
    await wait(slice);
  }
}

/**
 * Manda de 1 a 3 balões como uma pessoa: "digitando…" pelo tempo real de escrever cada um,
 * pausa entre os balões e intervalo mínimo entre mensagens do mesmo número (anti-bloqueio).
 */
export async function sendBubbles(number: any, lead: any, parts: string[], author: 'ai' | 'human' | 'system', typing: boolean, metaLast: any = {}, metaEach: any = {}, stopIf?: () => Promise<boolean>) {
  const st: any = await getSettings(db());
  const n = parts.length;
  for (let i = 0; i < n; i++) {
    if (i > 0) await wait(rand(st.bubble_gap?.min ?? 2, st.bubble_gap?.max ?? 5) * 1000);
    // o cliente mandou mensagem no meio: para aqui, como uma pessoa faria (a próxima resposta considera tudo)
    if (i > 0 && stopIf && (await stopIf().catch(() => false))) return;
    await numberGap(number.id, st.send_gap || { min: 4, max: 10 });
    if (typing && lead.whatsapp) {
      // às vezes começa a digitar, para um pouco (pensando) e volta
      if (parts[i].length > 60 && Math.random() < 0.25) {
        await showTyping(number, lead.whatsapp, rand(1500, 3000));
        evo.presence(number.instance_name, lead.whatsapp, 'paused', 1000).catch(() => {});
        await wait(rand(1200, 2500));
      }
      await showTyping(number, lead.whatsapp, typingMs(parts[i], st.typing_speed));
    }
    await sendAndRecord(number, lead, parts[i], author, false, { ...metaEach, ...(n > 1 ? { part: i, parts: n } : {}), ...(i === n - 1 ? metaLast : {}) });
    lastSend.set(number.id, Date.now());
  }
}

/** Guarda na mensagem quais técnicas, casos e mensagens campeãs inspiraram a resposta. */
async function kbMeta(kb: Intel, used?: number[]) {
  const ids = await markUsed((used || []).map(Number));
  await markExamplesUsed(kb).catch(() => {});
  const list = kb.insights.filter((i: any) => ids.includes(Number(i.id))).map((i: any) => ({ id: i.id, title: i.title, kind: i.kind, doc: i.doc_name }));
  return { ...(list.length ? { kb: list } : {}), ...exMeta(kb) };
}

/** 1 em cada 4 aberturas/follow-ups sai sem exemplos, para descobrir jeitos novos que vendam mais. */
const explore = () => Math.random() < 0.25;

/* ---------------- escolha da abordagem (teste A/B) ---------------- */

export async function chooseApproach(settings: Settings) {
  const { data } = await db().from('approaches').select('*').eq('active', true);
  const list = data || [];
  if (!list.length) return null;
  let weights: number[];
  if (settings.ab_auto) {
    // mais envios para quem converte mais, mas sempre explorando um pouco
    weights = list.map((a: any) => {
      const conv = (a.sales + 1) / (a.sends + 20);
      const resp = (a.replies + 1) / (a.sends + 10);
      return conv * 3 + resp * 0.5 + 0.02;
    });
  } else {
    weights = list.map((a: any) => Math.max(0, a.weight));
  }
  const total = weights.reduce((x, y) => x + y, 0) || 1;
  let r = Math.random() * total;
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}

async function bumpApproach(slug: string | null, field: 'sends' | 'replies' | 'sales') {
  if (!slug) return;
  const { data } = await db().from('approaches').select('id,' + field).eq('slug', slug).maybeSingle();
  if (data) await db().from('approaches').update({ [field]: (data as any)[field] + 1 }).eq('id', (data as any).id);
}

/* ---------------- primeira mensagem e follow-up ---------------- */

export async function writeOpening(lead: any, approach: any, settings: Settings) {
  const fresh = explore();
  const [services, brains, kb] = await Promise.all([
    activeServices(),
    getBrains(),
    gather(`abertura primeira mensagem ${lead.site_status === 'nenhum' ? 'negócio sem site' : ''}`, { stage: 'novo', niche: lead.niche, kinds: ['abertura'], nInsights: 4, nChunks: 0, nCases: 0, nSnippets: fresh ? 0 : 3 }),
  ]);
  const system = `Você é ${settings.assistant_name}, de ${settings.company_name}, e vai mandar a PRIMEIRA mensagem no WhatsApp para um negócio que nunca falou conosco.
Objetivo único desta mensagem: fazer a pessoa responder. Não venda ainda.
${WRITING_RULES}
- Primeiro contato: 1 ou 2 balões. Ex. de jeito: ["Oi, pessoal da Clínica X! Tudo certo por aí?", "Vi vocês no Google e fiquei com uma dúvida rápida… vocês atendem agendamento pelo WhatsApp mesmo?"].
- Cumprimente pelo nome (se for "Clínica X", use o nome do negócio). Diga que viu a ficha no Google quando fizer sentido.
- Não fale de preço, não mande link, não se apresente com textão, não diga que vende sites ainda. Varie a escrita: nunca use frases prontas iguais.
Estilo: ${approach?.name || 'Calma'} — ${approach?.description || ''}
Exemplo do estilo (não copie): ${approach?.opening_example || ''}
Serviços que vendemos (contexto): ${services.map((s: any) => s.name).join(', ')}
${fresh ? '- Desta vez, teste um ângulo diferente do comum (curiosidade, elogio sincero à ficha, pergunta sobre a rotina).' : ''}

${brainsBlock(brains)}

${situationBlock(kb)}`;
  const r = await structured<{ messages: string[]; techniques_used?: number[] }>(withMaster(brains.master, system), `Cliente:\n${leadBlock(lead)}\n\nEscreva a mensagem.`, 'primeira_mensagem', MESSAGE_SCHEMA, 500, { task: 'abertura', leadId: lead.id });
  return { parts: bubbles(r, 2), meta: await kbMeta(kb, r.techniques_used) };
}

export async function writeFollowUp(lead: any, approach: any, settings: Settings, history: any[], attempt: number, reactivation = false) {
  const lastOut = [...history].reverse().find((m) => m.direction === 'out')?.body || '';
  const fresh = explore();
  const [brains, kb] = await Promise.all([
    getBrains(),
    gather(`follow-up retomada ${lastOut}`, { stage: reactivation ? 'remarketing' : 'abordado', niche: lead.niche, kinds: ['follow_up'], nInsights: 4, nChunks: 0, nCases: 0, nSnippets: fresh ? 0 : 3 }),
  ]);
  const system = `Você é ${settings.assistant_name}, de ${settings.company_name}. ${reactivation ? 'Este cliente pediu para conversar mais pra frente e a data chegou. Retome a conversa com leveza, lembrando do que ele disse.' : `O cliente não respondeu. Esta é a tentativa de follow-up número ${attempt}.`}
${WRITING_RULES}
- 1 balão curto (no máximo 2). Não repita nenhuma mensagem anterior. NUNCA se apresente de novo nem repita o nome da empresa: a pessoa já sabe quem você é. Leve, educado e direto (ex.: "Oii, bom dia! Você ainda tem interesse no nosso trabalho ou posso encerrar o atendimento?").
- Sem cobrança, sem culpa, sem "você não me respondeu". Nunca pergunte se já pagou nem ofereça o link de novo: retome pelo projeto dele ou por algo útil, com leveza. Pareça alguém tranquilo, nunca desesperado.
Estilo: ${approach?.name || 'Calma'} — ${approach?.description || ''}. Exemplo (não copie): ${approach?.followup_example || ''}
${followUpGrazi(settings, await db().from('services').select('*').eq('active', true).then((r: any) => r.data || [], () => []))}
${fechamentoGraziOn(settings) && lead.memory?.ultimato_em ? `FECHAMENTO GRAZI: o cliente recebeu o "posso passar a sua vaga pra próxima pessoa?" e não respondeu. Este follow-up é curto, firme e gentil (1 balão), sem "oi, tudo bem?" e sem pedir desculpas: diga que, como não teve retorno, a vaga de hoje foi para a próxima pessoa da fila, e que se ela ainda quiser é só responder aqui que você vê se consegue encaixar. Nada de insistir mais.` : ''}

${brainsBlock(brains)}

${situationBlock(kb)}`;
  const r = await structured<{ messages: string[]; techniques_used?: number[] }>(withMaster(brains.master, system), `Cliente:\n${leadBlock(lead)}\n\nConversa até agora:\n${transcript(history)}\n\nEscreva a mensagem.`, 'follow_up', MESSAGE_SCHEMA, 500, { task: 'follow_up', leadId: lead.id });
  // Modo Grazi: este follow-up é a segunda oferta (vale 24 horas a partir de agora)
  if (modoAtual(settings) === 'grazi' && !reactivation) {
    const mg = { ...(lead.memory || {}), segunda_oferta_em: Date.now() };
    lead.memory = mg;
    await db().from('leads').update({ memory: mg, modo_venda: 'grazi' }).eq('id', lead.id).then(() => {}, () => {});
  }
  return { parts: bubbles(r, 2), meta: await kbMeta(kb, r.techniques_used) };
}

/**
 * REAQUECIMENTO: quem estava quase comprando (interessado/negociando/pix) e sumiu volta a ser chamado UMA vez, com ajuda de verdade:
 * retoma a dor que a pessoa contou, dá uma dica prática e rápida, e deixa a vontade do mapa inteiro nascer sozinha (sem cara de cobrança).
 */
export async function writeReaquecimento(lead: any, settings: Settings, history: any[], opts: { tentativa?: number } = {}) {
  const es = lead.idioma === 'es';
  const tentativa = Math.max(1, opts.tentativa || 1);
  const dores = (lead.pains || []).slice(0, 4).join(', ') || '(a pessoa não disse com todas as letras: use o que aparece na conversa, em especial o que ela contou ou reclamou: dinheiro, saúde, relacionamento, marido/esposa, família, trabalho)';
  const horas = Math.max(1, Math.round((Date.now() - new Date(lead.last_inbound_at || lead.last_outbound_at || Date.now()).getTime()) / 3600000));
  const quando = horas < 30 ? (es ? 'ayer' : 'ontem') : horas < 54 ? (es ? 'anteayer' : 'anteontem') : (es ? 'hace unos días' : 'esses dias');
  const m = lead.memory || {};
  const ficha = [m.signo && `Signo: ${m.signo}`, m.mapa_nascimento && `Nascimento: ${m.mapa_nascimento}`, m.interesse && `Interesse dito: ${m.interesse}`, m.ultima_tratativa && `Onde parou: ${m.ultima_tratativa}`].filter(Boolean).join(' · ');
  const brains = await getBrains();
  const system = `Você é ${settings.assistant_name}, de ${settings.company_name}. Escreva em ${es ? 'ESPANHOL neutro latino-americano (tuteo)' : 'PORTUGUÊS do Brasil'}.
RETOMADA DE CONVERSA (${tentativa === 1 ? '1º toque' : 'último toque'}). Esta pessoa conversou com você ${quando} e parou de responder. Você vai chamá-la de novo, na MESMA conversa, como quem ajuda e desperta a curiosidade, nunca como quem cobra, intromete ou insiste.
${WRITING_RULES}
Roteiro (2 a 3 balões curtos, tom humano, calmo e educado):
1) Um "${es ? 'Hola' : 'Oi'}, {primeiro nome se souber}" curto (sem se apresentar de novo, sem "tudo bem?" em série) e diga que estava revendo o mapa dela e encontrou algo importante, e que resolveu passar só para deixar uma dica de como ajudar na situação dela. NUNCA diga "você sumiu", "não me respondeu", "só passando para saber" nem peça desculpa de nada.
2) Retome a situação que ELA contou na conversa anterior (${dores}) com algo específico, ligado ao mapa dela (signo, números, ciclo) e à fala dela. Nada genérico. Se ela quase não contou nada, use o signo/o ciclo do momento dela.
3) Dê UMA dica prática, simples e rápida que ela possa aplicar hoje para essa situação (um gesto, um hábito, uma reflexão de 2 minutos). Deve ajudar por si só. Em tendência ("o seu mapa mostra que..."), nunca como fato, previsão ou promessa; use "lidar, entender, aprender, descobrir".
4) Feche com UMA pergunta leve e curiosa que convide a continuar (ex.: se ela quer que você olhe mais de perto essa parte do mapa). ${tentativa === 1 ? '' : 'Como é o último toque: diga com carinho que fica à disposição e que não vai incomodar mais, deixando a porta aberta (sem pergunta de cobrança). '}NÃO envie link, NÃO fale de preço ou pagamento, NÃO pergunte se já pagou, NÃO insista. A vontade do mapa completo nasce da ajuda e da curiosidade.
No máximo 1 emoji. Máximo 3 balões curtos.
Ficha: ${ficha || '(sem dados extras)'}

${brainsBlock(brains)}`;
  const user = `Cliente:\n${leadBlock(lead)}\n\nConversa até agora:\n${transcript(history)}\n\nEscreva a mensagem.`;
  for (let i = 0; i < 2; i++) {
    const r = await structured<{ messages: string[] }>(withMaster(brains.master, system), user + (i ? '\n\nATENÇÃO: a versão anterior tinha link, preço, pagamento ou pedido de desculpa. Reescreva sem isso.' : ''), 'reaquecimento', MESSAGE_SCHEMA, 600, { task: 'follow_up', leadId: lead.id });
    const parts = bubbles(r, 3).map(semDesculpaPorDemora).filter((x) => x.length > 1);
    if (parts.length && !/https?:|www\.|US\$|R\$|\bpix\b|pagamento|pagar\b|precio|pre[cç]o|\bpago\b/i.test(parts.join(' '))) return parts;
  }
  return [];
}

/** Confere se o número tem WhatsApp. Devolve false se não tiver. */
export async function hasWhatsapp(number: any, lead: any) {
  try {
    const r: any = await evo.exists(number.instance_name, [lead.whatsapp]);
    const item = Array.isArray(r) ? r[0] : null;
    if (item && item.exists === false) return false;
    return true;
  } catch {
    return true; // na dúvida, tenta enviar
  }
}

/** Configurações com o nome de quem atende ESTE número (cada chip tem o seu atendente). */
export function withAgent<T extends { assistant_name?: string }>(settings: T, number: any): T {
  const n = String(number?.agent_name || '').trim();
  return n ? { ...settings, assistant_name: n } : settings;
}

export async function sendFirstContact(number: any, lead: any, settings0: Settings): Promise<'sent' | 'skip'> {
  const settings = withAgent(settings0, number);
  const blocked = await db().from('blocked_phones').select('wa_key').eq('wa_key', lead.wa_key || '').maybeSingle();
  if (blocked.data) {
    await db().from('leads').update({ wa_status: 'bloqueado', opted_out: true }).eq('id', lead.id);
    return 'skip';
  }
  if (!(await hasWhatsapp(number, lead))) {
    await db().from('leads').update({ wa_status: 'invalido' }).eq('id', lead.id);
    await logEvent(lead.id, 'wa_invalid', 'wa', `${lead.name}: o número não tem WhatsApp`);
    return 'skip';
  }
  const approach = await chooseApproach(settings);
  const { parts, meta } = await writeOpening(lead, approach, settings);
  if (!parts.length) throw new Error('A IA não escreveu a primeira mensagem');
  await sendBubbles(number, lead, parts, 'ai', settings.typing, meta);
  await db()
    .from('leads')
    .update({
      wa_status: 'enviado',
      stage: lead.stage === 'novo' ? 'abordado' : lead.stage,
      number_id: number.id,
      approach_slug: approach?.slug || null,
      steps: withSteps(lead.steps, 'maps', 'valid', 'wa'),
      last_outbound_at: new Date().toISOString(),
      followups_sent: 0,
      next_step: 'Aguardar resposta. Follow-up automático se não responder.',
    })
    .eq('id', lead.id);
  await bumpApproach(approach?.slug, 'sends');
  await logEvent(lead.id, 'wa_first', 'wa', `${number.label} enviou a primeira mensagem para ${lead.name}`, { number_id: number.id, approach: approach?.name });
  return 'sent';
}

export async function sendFollowUp(number: any, lead: any, settings0: Settings) {
  const settings = withAgent(settings0, number);
  // conversa arquivada ou contato salvo no celular: sem follow-up automático
  if (lead.archived_at) return;
  const { data: history } = await db().from('messages').select('*').eq('lead_id', lead.id).order('created_at').limit(40);
  const reactivation = lead.stage === 'remarketing';
  const reaquece = !reactivation && lead.source !== 'google' && lead.source !== 'recuperacao_site' && ['interessado', 'negociando', 'pix'].includes(lead.stage) && !lead.memory?.reaquecido_em;
  const { data: approach } = await db().from('approaches').select('*').eq('slug', lead.approach_slug || 'calma').maybeSingle();
  // RECUPERAÇÃO: viu a prévia e sumiu → o 1º lembrete é uma mensagem leve com a prévia e uma melhoria oferecida (sem IA, custo zero)
  const recovery = !reactivation && !!lead.preview_slug && !lead.recovery_sent_at && (settings as any).recovery?.on !== false;
  let parts: string[];
  let meta: any = {};
  const fuTexts: string[] = Array.isArray((settings as any).followup_texts) ? (settings as any).followup_texts.filter((x: string) => String(x || '').trim()) : [];
  const useTpl = !reactivation && !recovery && lead.source !== 'google' && fuTexts.length > 0;
  if (reaquece) {
    parts = await writeReaquecimento(lead, settings, history || []);
  } else if (recovery) {
    parts = recoveryMessage(lead, settings);
  } else if (useTpl) {
    // retomada leve e direta (sem se apresentar de novo): "Você tem interesse ou posso encerrar o atendimento?"
    const tpl = fuTexts[Math.min(lead.followups_sent, fuTexts.length - 1)];
    const first = String(lead.memory?.nome_cliente || '').trim().split(/\s+/)[0];
    const g = greetingWord(settings, spNow().minutes);
    parts = [
      tpl
        .replace(/\{Saudacao\}/g, g)
        .replace(/\{saudacao\}/g, g.charAt(0).toLowerCase() + g.slice(1))
        .replace(/\{nome\}/g, first)
        .replace(/,\s*([!?.])/g, '$1')
        .replace(/\s{2,}/g, ' ')
        .trim(),
    ];
  } else {
    ({ parts, meta } = await writeFollowUp(lead, approach, settings, history || [], lead.followups_sent + 1, reactivation));
  }
  if (!parts.length) throw new Error('A IA não escreveu o follow-up');
  await sendBubbles(number, lead, parts, 'ai', settings.typing, meta);
  const days = settings.followup_days;
  const sent = lead.followups_sent + 1;
  const patch: any = { last_outbound_at: new Date().toISOString(), followups_sent: reactivation ? 0 : sent, number_id: number.id };
  if (recovery) patch.recovery_sent_at = new Date().toISOString();
  if (reaquece) patch.memory = { ...(lead.memory || {}), reaquecido_em: new Date().toISOString() };
  if (reactivation) {
    patch.stage = 'respondeu';
    patch.remarketing_at = null;
  }
  if (!reactivation && (sent >= days.length || (useTpl && sent >= fuTexts.length))) {
    const d = new Date(Date.now() + settings.remarketing_after_followups_days * 86400000);
    patch.next_step = 'Sem resposta depois de todos os follow-ups. Volta em remarketing.';
    patch.stage = 'remarketing';
    patch.remarketing_at = d.toISOString().slice(0, 10);
  }
  await db().from('leads').update(patch).eq('id', lead.id);
  await logEvent(lead.id, reactivation ? 'remarketing' : reaquece ? 'reaquecimento' : recovery ? 'recovery' : 'followup', 'wa', `${number.label} ${reactivation ? 'retomou o contato (remarketing) com' : reaquece ? 'reaqueceu (dor + dica prática) a conversa de' : recovery ? 'mandou a mensagem de recuperação (prévia) para' : 'enviou follow-up ' + sent + ' para'} ${lead.name}`);
}

/** Mensagem de recuperação: leve, com a prévia e uma melhoria oferecida (sem pressão e sem falar de pagamento). */
export function recoveryMessage(lead: any, settings: any) {
  const first = String(lead.memory?.nome_cliente || '').trim().split(/\s+/)[0];
  const oi = first ? `Oi, ${first}! Tudo bem?` : 'Oi! Tudo bem?';
  const url = urlMapa(lead.mapa_slug || lead.preview_slug, '', lead.idioma);
  const ideas = [
    'Quando sentir que é o momento, eu libero o seu mapa completo, com todas as leituras e o PDF pra guardar.',
    'Ficou alguma dúvida sobre o que apareceu na prévia? Posso te explicar com calma.',
    'O seu mapa completo mostra também os seus ciclos e o que este ano pessoal pede de você.',
  ];
  const idea = ideas[Math.floor(Math.random() * ideas.length)];
  return [`${oi} Passando com carinho pra deixar a prévia do seu Mapa da Alma guardada aqui ✨👇\n${url}\n\n${idea} 💜`];
}

const PV_OBJ = '(pr[eé]via|vers[aã]o|link|modelo|exemplo|esbo[cç]o|layout|rascunho|demonstra[cç][aã]o)';
const PV_ANY = '(pr[eé]via|vers[aã]o|link|modelo|exemplo|esbo[cç]o|site|p[aá]gina|layout|rascunho)';
/** assunto é pagamento (link de pagamento, Pix…), não a prévia */
const PAY_TALK = /(pagamento|pagar|pix|boleto|cart[aã]o|checkout|contrato|recibo|nota fiscal|comprovante)/i;
const PV_VERB = '(ger[ao]|gere|gerar|fa[zcç]a?|fazer|mont[ae]|montar|mand[ae]|mandar|envi[ae]|enviar|mostr[ae]|mostrar|cri[ae]|criar|prepar[ae]|preparar|refa[zcç]a?|refazer|ajust[ae]|ajustar|troc[ae]|trocar|mud[ae]|mudar|coloc[ae]|colocar)';

/** A IA prometeu/anunciou a prévia no texto ("já deixei pronta", "aqui está", "vou gerar a versão em azul"). */
export function previewPromised(text: string) {
  const t = String(text || '');
  if (PAY_TALK.test(t) && !/pr[eé]via/i.test(t)) return false;
  return (
    new RegExp(`(vou|j[aá] vou|vamos|deixa comigo|t[oô]|estou)[^.?!]{0,25}${PV_VERB}[^.?!]{0,30}${PV_OBJ}`, 'i').test(t) ||
    new RegExp(`(pr[eé]via|vers[aã]o|esbo[cç]o|modelo)[^.?!]{0,50}(pront[oa]|aqui|segue|te mand|j[aá] te mando|chegando|saindo)`, 'i').test(t) ||
    new RegExp(`(aqui est[aá]|segue|deixei pront[oa]|j[aá] (deixei|montei|preparei|fiz|gerei|ajustei|mandei))[^.?!]{0,30}${PV_OBJ}`, 'i').test(t) ||
    /quando (chegar|abrir)[^.?!]{0,30}(me conta|me fala|v[eê])/i.test(t)
  );
}

/** O cliente pediu a prévia, uma versão nova, ou disse que o link não chegou. */
export function previewRequested(text: string) {
  const t = String(text || '');
  if (PAY_TALK.test(t) && !/pr[eé]via/i.test(t)) return false;
  return (
    new RegExp(`n[aã]o (me )?(mandou|enviou|chegou|veio|recebi|abriu|gerou|apareceu)[^.?!]{0,25}${PV_ANY}`, 'i').test(t) ||
    new RegExp(`${PV_ANY}[^.?!]{0,25}(n[aã]o (chegou|veio|abriu|apareceu|gerou)|cad[eê])`, 'i').test(t) ||
    new RegExp(`cad[eê][^.?!]{0,15}${PV_ANY}`, 'i').test(t) ||
    new RegExp(`${PV_VERB}[^.?!]{0,30}(o |a |uma |um |outra |outro |nova |novo )?${PV_OBJ}`, 'i').test(t)
  );
}

/** Pedido de mudança dito pelo cliente (cor, nome, textos…) para registrar mesmo se a IA esquecer. */
export function changeRequest(text: string) {
  const t = String(text || '').trim();
  if (!t) return null;
  if (colorFrom(t) || /(troc|mud|coloc|tir[ae]|inclu|acrescent|nome|endere[cç]o|hor[aá]rio|servi[cç]o|foto|logo)/i.test(t)) return t.slice(0, 160);
  return null;
}

/** Manda o link da prévia + a explicação (é prévia, fotos ilustrativas, dá pra mudar tudo). */
export async function sendPreviewLink(number: any, lead: any, p: { url: string; slug: string }, settings: any, author: 'system' | 'human' = 'system') {
  const pv: any = settings.previews || {};
  const explain = String(pv.explain || '').trim();
  // só usa o nome que a própria pessoa disse (nome do perfil do WhatsApp costuma ser apelido)
  const nome = String(lead.memory?.nome_cliente || '').trim().split(' ')[0];
  let first = String(pv.message || '{url}')
    .replace(/\{nome\}\s*,\s*/g, nome ? `${nome}, ` : '')
    .replace(/\{nome\}/g, nome)
    .replace('{url}', p.url);
  first = first.charAt(0).toUpperCase() + first.slice(1);
  // a explicação já termina perguntando o que achou: tira a pergunta repetida da primeira mensagem
  if (explain) first = first.replace(/\n?\s*o que (você )?achou\??\s*$/i, '').trim();
  await sendAndRecord(number, lead, first, author, settings.typing, { preview: p.slug });
  if (explain) {
    await new Promise((r) => setTimeout(r, 2500));
    await sendAndRecord(number, lead, explain, author === 'human' ? 'human' : 'ai', settings.typing, { preview: p.slug });
  }
  await db().from('previews').update({ sent_at: new Date().toISOString() }).eq('slug', p.slug);
}

/* ---------------- sem desespero para vender ---------------- */

const PAY_ASK = /\b(link|pagamento|pagar|paga|pix|cart[aã]o|boleto|fechar|fechamos|fechado|garantir|reservad|come[cç]ar o seu)\b/i;
const PAID_CHECK =
  /(j[aá] (pagou|conseguiu|fez o (pix|pagamento))|conseguiu (pagar|fazer o pix|finalizar|concluir)|deu certo (o|com o) (pagamento|pix|link)|vai (dar|conseguir) (pra |para )?(pagar|fechar)|consegue (pagar|fazer o pix)|quando (vai|consegue|pretende) (pagar|fechar)|(conseguiu|deu pra) (ver|abrir) o link|alguma d[uú]vida (no|com o) (pagamento|link)|pagou\?)/i;
const CLIENT_TALKS_PAY = /pag|pix|link|cart[aã]o|boleto|parcel|transfer|comprovante|quanto fica|valor|pre[cç]o|fechar|fecho/i;

/** A IA dizendo o que é (IA/robô/automação) ou dizendo que é humana: nenhum dos dois sai. */
const SELF_ID =
  /\b(sou|eu sou|aqui [eé]|t[oô] sendo|estou sendo|[eé] um|[eé] uma|sou s[oó] um|sou s[oó] uma)\s+(a |o |um |uma |s[oó] )?(intelig[eê]ncia artificial|ia\b|i\.a\.?|rob[oô]|bot\b|chatbot|assistente virtual|atendente virtual|automa[cç][aã]o|sistema autom|resposta autom|atendimento autom)|\b(sou|eu sou) (humano|humana|uma pessoa de verdade|gente de verdade)|n[aã]o sou (um |uma )?(rob[oô]|bot|ia\b|intelig[eê]ncia artificial|m[aá]quina)|\b(mensagem|resposta) autom[aá]tica/i;
/** Mesma trava em espanhol (e termos soltos): "soy una atención automática", "soy un bot", "asistente virtual"... */
const SELF_ID_ES =
  /\b(soy|somos|eres?|es|estás|estas|estoy)\s+(solo |s[oó]lo |solamente |una? |el |la )*(inteligencia artificial|ia\b|i\.a\.?|robot|bot\b|chatbot|asistente virtual|asistente autom|atenci[oó]n autom[aá]tica|atenci[oó]n virtual|atendimento autom)|\b(atenci[oó]n|respuesta|mensaje|atendimiento|asistente)s? (autom[aá]tic|virtual)|\bno soy (un |una )?(robot|bot|ia\b|inteligencia artificial|m[aá]quina|humano|humana|persona real)|\bsoy (humano|humana|una persona real|una persona de verdad)|\b(chat ?bot|chat ?gpt|claude|openai|anthropic|modelo de lenguaje)\b/i;
export function selfIdentifies(text: string) {
  if (SELF_ID_ES.test(String(text || ''))) return true;
  return SELF_ID.test(String(text || ''));
}

/** Tudo que o cliente escreveu desde a última mensagem nossa. */
export function pendingClientText(history: any[]) {
  const i = history.map((m) => m.direction).lastIndexOf('out');
  return history
    .slice(i + 1)
    .filter((m) => m.direction === 'in')
    .map((m) => String(m.transcript || m.body || '').trim())
    .filter(Boolean)
    .join(' ');
}

/** O cliente espera resposta? Só não espera quando mandou só emoji/figurinha ou um "ok/obrigado" de encerramento. */
export function clientExpectsReply(text: string) {
  const t = String(text || '').trim();
  if (!t) return false;
  const letters = t.replace(/[^\p{L}\p{N}?]/gu, '');
  if (!letters) return false; // só emoji, figurinha, pontuação
  if (/^(ok+|okay|blz|beleza|t[aá]|ta bom|t[aá] bom|obrigad[oa]|obg|valeu|vlw|show|top|perfeito|certo|fechou|tmj|👍|kk+|rs+|haha+)[\s!.]*$/i.test(t)) return false;
  return true;
}

/** Resposta simples quando a IA não conseguiu escrever (nunca deixa o cliente no vácuo). */
export function fallbackReply(lead: any, settings: any, pending: string) {
  const nome = String(lead.memory?.nome_cliente || '').split(' ')[0];
  const quem = settings?.assistant_name || 'Ana';
  const empresa = settings?.company_name || '';
  const greet = /^(oi+|ol[aá]|opa|e a[ií]|bom dia|boa tarde|boa noite|tudo bem|td bem)/i.test(pending.trim());
  if (!nome) return `Oi, tudo bem? Aqui é ${quem}${empresa ? `, da ${empresa}` : ''} 😊 Qual seu nome?`;
  return greet ? `Oi, ${nome}! Tudo bem? 😊 Me conta, o que você precisa?` : `Oi, ${nome}! Já te respondo certinho, me dá só um instante 😊`;
}

/** Pedido de aprovação (desconto abaixo do mínimo): a equipe vê pop-up, alerta em Conversas e no sininho. */
export const APPROVAL = 'APROVAÇÃO: ';

/** Frase que entrega que alguém precisa aprovar ("vou consultar a equipe", "não tenho autonomia"…). */
const APPROVAL_TALK =
  /\b(consult|verific|check|confirm|falar|ver|perguntar|alinhar)\w*\s+(isso\s+)?(com\s+)?(a\s+|o\s+|meu\s+|minha\s+|nosso\s+|nossa\s+)?(equipe|time|gerente|gestor|gestora|chefe|respons[aá]vel|diretor|diretoria|s[oó]ci[oa]|financeiro|setor|supervis|coordena|superior|pessoal)|aprova[çc][aã]o|autoriza[çc][aã]o|\bautoriz(ar|em|e)\b|n[aã]o tenho (autonomia|permiss[aã]o|liberdade)|(preciso|tenho que|vou) (pedir|solicitar) (a )?(libera|aprova|autoriza)|n[aã]o (posso|consigo) (decidir|aprovar|liberar) (sozinh|isso)|acima de mim|fora da minha al[cç]ada/i;

export function approvalTalk(text: string) {
  return APPROVAL_TALK.test(String(text || ''));
}

/** Resposta neutra enquanto a equipe decide o desconto (sem dizer que alguém vai aprovar), sempre com emoji. */
const NEUTRAL_HOLD = [
  'Certo, deixa eu ver aqui o que eu consigo fazer por você hoje 😊',
  'Entendi! Me dá só um instante que eu vejo com carinho o que dá pra fazer 😉',
  'Hmm, deixa comigo! Vou ver aqui a melhor condição que consigo pra você 😊',
  'Beleza! Só um minutinho que eu vejo o que consigo fazer aqui 🙌',
  'Justo! Deixa eu dar uma olhada aqui no que consigo fazer por você 😄',
];
export function neutralHold() {
  return NEUTRAL_HOLD[Math.floor(Math.random() * NEUTRAL_HOLD.length)];
}

/** Situação do pedido de pagamento na conversa (calculado sem IA). */
export function payPace(history: any[], lead: any, lastClientText: string) {
  const aiOut = history.filter((m) => m.direction === 'out' && m.author === 'ai');
  const recent = aiOut.slice(-4).map((m) => String(m.body || ''));
  const askedRecently = recent.some((b) => b.trim().endsWith('?') && PAY_ASK.test(b));
  const linkSent = lead?.stage === 'pix' || aiOut.some((m) => /https?:\/\//.test(String(m.body || '')) && /pag|link|pix|checkout/i.test(String(m.body || '')) && !/pr[eé]via/i.test(String(m.body || '')));
  const clientTalksPay = CLIENT_TALKS_PAY.test(lastClientText || '');
  return { askedRecently, linkSent, clientTalksPay };
}

/** Balão que soaria como cobrança/desespero neste momento (é retirado antes de enviar). */
export function pushyBubble(text: string, pace: { askedRecently: boolean; linkSent: boolean; clientTalksPay: boolean }) {
  const t = String(text || '').trim();
  if (pace.clientTalksPay) return false; // o cliente puxou o assunto: pode falar de pagamento
  if (PAID_CHECK.test(t)) return true; // "já pagou?", "conseguiu pagar?", "vai dar pra pagar?"
  if ((pace.askedRecently || pace.linkSent) && t.endsWith('?') && PAY_ASK.test(t) && !/pr[eé]via/i.test(t)) return true; // pedir o link/fechar de novo
  return false;
}

/**
 * Pix direto (copia e cola) ligado a ESTA conversa: sem CPF e sem link, fácil para quem tem dificuldade (ex.: idosos).
 * Fica gravado em payments (provider 'asaas_qr'); quando a pessoa paga, o webhook do Asaas traz o pixQrCodeId e o mapa é liberado sozinho.
 */
export async function enviarPixDireto(number: any, lead: any, svc: any, price: number, settings: any, junto = false) {
  const es = lead.idioma === 'es';
  const nomeMapa = String(lead.memory?.mapa_nome_completo || lead.memory?.nome_cliente || lead.name || '').split(' ').slice(0, 2).join(' ');
  const pix = await criarPixDireto({ valor: price, descricao: `Mapa da Alma ${nomeMapa}`, horas: Math.max(24, Number(settings?.pix?.validity_hours) || 48) });
  await db().from('payments').insert({ lead_id: lead.id, provider: 'asaas_qr', provider_id: pix.id, service: svc?.slug || null, amount: price, status: 'pendente', qr_code: pix.payload, expires_at: new Date(Date.now() + 48 * 3600_000).toISOString() });
  if (es) {
    await sendAndRecord(number, lead, `${junto ? 'Si te resulta más fácil, también puedes pagar directo por Pix' : `Perfecto${String(lead.memory?.nome_cliente || '').split(' ')[0] ? ', ' + String(lead.memory.nome_cliente).split(' ')[0] : ''} 💜 Te paso el Pix de *R$ ${price.toFixed(2).replace('.', ',')}* (reales)`} 👇

1️⃣ Abre la app de tu banco y toca en *Pix*
2️⃣ Elige *Pix Copia e Cola* (copia y pega)
3️⃣ Pega el código que va en el próximo mensaje y confirma el valor de *R$ ${price.toFixed(2).replace('.', ',')}*`, 'system', true);
    await sendAndRecord(number, lead, pix.payload, 'system', false, { pix_qr: pix.id });
    await sendAndRecord(number, lead, 'En cuanto pagues, mándame el comprobante por aquí, ¿sí? 🙏 Yo lo reviso y enseguida te libero tu mapa completo 💜', 'system', true);
  } else {
    await sendAndRecord(number, lead, `${junto ? 'Se for mais fácil, você também pode pagar direto pelo Pix' : `Pra ficar bem simples, vou te mandar o Pix de *${brl(price)}*`} 👇

1️⃣ Abra o aplicativo do seu banco e toque em *Pix*
2️⃣ Escolha *Pix Copia e Cola*
3️⃣ Cole o código que vai na próxima mensagem e confirme o valor de *${brl(price)}*`, 'system', true);
    await sendAndRecord(number, lead, pix.payload, 'system', false, { pix_qr: pix.id });
    await sendAndRecord(number, lead, 'Assim que pagar, me manda o comprovante aqui, tá? 🙏 Eu confiro e já libero o seu mapa completo 💜', 'system', true);
  }
  await logEvent(lead.id, 'pix_created', 'pay', `Pix direto (copia e cola) de ${brl(price)} enviado para ${lead.name}`, { pix_qr: pix.id });
  return pix;
}

/* ---------------- resposta da IA ---------------- */

export async function handleReply(leadId: string, opts: { force?: boolean; audio?: boolean } = {}) {
  const { data: lead } = await db().from('leads').select('*').eq('id', leadId).maybeSingle();
  if (!lead) return;
  // sem horário marcado = já foi respondido (ou outra parte do sistema está respondendo). Só o botão "Responder agora" força.
  if (!opts.force && !lead.reply_due_at) return;
  if (lead.ai_locked || !lead.ai_enabled || lead.opted_out) {
    await db().from('leads').update({ reply_due_at: null }).eq('id', leadId);
    return;
  }
  const number = await connectedNumber(lead.number_id);
  if (!number) return; // tenta de novo no próximo ciclo
  // trava da conversa: enquanto uma resposta está sendo preparada/enviada, ninguém mais responde este cliente
  const lockUntil = new Date(Date.now() + 4 * 60_000).toISOString();
  const { data: locked, error: lockErr } = await db()
    .from('leads')
    .update({ reply_lock_until: lockUntil })
    .eq('id', leadId)
    .or(`reply_lock_until.is.null,reply_lock_until.lt.${new Date().toISOString()}`)
    .select('id');
  if (!lockErr && !locked?.length) return; // outra resposta em andamento; esta fica para a próxima rodada
  try {
    return await replyLocked(lead, number, opts);
  } finally {
    if (!lockErr) await db().from('leads').update({ reply_lock_until: null }).eq('id', leadId);
  }
}

async function replyLocked(lead0: any, number: any, opts: { force?: boolean; audio?: boolean }) {
  const leadId = lead0.id;
  // relê o cliente já com a trava: pode ter mudado enquanto outra resposta terminava
  const { data: fresh } = await db().from('leads').select('*').eq('id', leadId).maybeSingle();
  const lead = fresh || lead0;
  if (lead.ai_locked) return; // pausada definitivamente: nem o "Responder agora" passa
  // cliente ainda digitando: não lê nem gasta IA agora; tenta de novo quando ele terminar.
  // (se o "digitando" ficar preso, depois de 3 min da última mensagem responde mesmo assim)
  if (!opts.force && lead.typing_until && new Date(lead.typing_until).getTime() > Date.now()) {
    const lastInAt = lead.last_inbound_at ? new Date(lead.last_inbound_at).getTime() : 0;
    if (Date.now() - lastInAt < 3 * 60_000) {
      await db().from('leads').update({ reply_due_at: new Date(new Date(lead.typing_until).getTime() + 4000).toISOString() }).eq('id', leadId).not('reply_due_at', 'is', null);
      return;
    }
  }
  // segurança extra: id de grupo (muito longo) nunca recebe resposta
  if (String(lead.whatsapp || '').replace(/\D/g, '').length > 15) return;
  if (!opts.force && (!lead.reply_due_at || !lead.ai_enabled)) return;
  // "pega" esta resposta: se outra parte do sistema já pegou, não responde duas vezes.
  // Se o cliente mandar outra mensagem enquanto a IA escreve, um novo horário é marcado e ela responde de novo.
  if (lead.reply_due_at) {
    const { data: claimed } = await db().from('leads').update({ reply_due_at: null }).eq('id', leadId).eq('reply_due_at', lead.reply_due_at).select('id');
    if (!claimed?.length) return;
  }

  // CONSULTA AO MAPA em andamento: a consultora ainda está "olhando o mapa"; só volta na hora marcada
  const pend: any = lead.memory?.consulta_pendente || null;
  if (pend && !opts.force && Date.now() < Number(pend.ate || 0)) {
    await db().from('leads').update({ reply_due_at: new Date(Number(pend.ate)).toISOString() }).eq('id', leadId);
    return;
  }
  const entregar: any = lead.memory?.entregar_pendente || null; // resgate de promessa: a IA disse que voltava e não voltou
  if (entregar) {
    const m2 = { ...(lead.memory || {}) };
    delete m2.entregar_pendente;
    lead.memory = m2;
    await db().from('leads').update({ memory: m2 }).eq('id', leadId).then(() => {}, () => {});
  }
  const voltando = pend ? String(pend.tema || 'a sua pergunta') : null;
  if (pend) {
    const m2 = { ...(lead.memory || {}) };
    delete m2.consulta_pendente;
    lead.memory = m2;
    await db().from('leads').update({ memory: m2 }).eq('id', leadId).then(() => {}, () => {});
  }

  // economia: só as mensagens recentes vão para a IA; o que veio antes está na FICHA (memória) e no resumo vivo
  const { data: msgs } = await db().from('messages').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(lead.stage === 'pago' ? 6 : Math.min(30, Math.max(6, Number((await getSettings(db())).budget?.history_msgs) || HISTORY_MSGS)));
  const history = (msgs || []).reverse();
  const posN = await mensagensPosVenda(lead);
  // LINK DA PRÉVIA QUE NÃO ABRE (expirou ou não chegou): o sistema renova o tempo e reenvia o link na hora, sem IA e sem esperar
  if (lead.stage !== 'pago' && !lead.cortesia && !opts.force) {
    try {
      const ultimoIn = [...history].reverse().find((m: any) => m.direction === 'in');
      const tIn = String(ultimoIn?.transcript || ultimoIn?.body || '').trim();
      const problemaLink = /no me aparece|no me lleg[oó]|no (me )?abre|no (lo )?veo|no puedo (ver|abrir)|d[oó]nde est[aá]|donde esta|expir[oó]|no carga|n[aã]o (me )?(abre|chegou|apareceu|carrega|consigo (abrir|ver))|cad[eê] (o )?(link|mapa|pr[eé]via)|onde est[aá] (o )?(link|mapa|pr[eé]via)|expirou|sem acesso|(volver|vuelve|vuelvas|mandar(me)?|enviar(me)?|reenv[ií]a(me)?|pasa(r|me)?|manda(me)?) (a )?(mandar |enviar |pasar )?(el |ese |otra vez |de nuevo |nuevamente )*(enlace|link)|(otra vez|de nuevo|nuevamente|otro) (el |un )?(enlace|link)|(enlace|link)[^.?!]{0,25}(otra vez|de nuevo|nuevamente|vencid|caduc)|(manda|envia|mande|envie|reenvia|reenvie|passa|me d[aá])[^.?!]{0,20}(de novo|outra vez|novamente|o link)|(outro|novo) link|link (de novo|novamente|expirou|venceu)|(no|ya no) (me )?(deja|funciona|abre)|vencid[oa]|caduc[oa]/iu.test(tIn) || (/^(no|n[aã]o)[\s\p{Emoji_Presentation}\p{Extended_Pictographic}!.]*$/iu.test(tIn) && /enlace|link|abre|ves bien|aparece|pr[eé]via|vista previa/i.test(String([...history].reverse().find((m: any) => m.direction === 'out')?.body || '')));
      const saidas = history.filter((m: any) => m.direction === 'out').slice(-8).map((m: any) => String(m.body || ''));
      const mandouLink = saidas.some((b: string) => /acesso\.mapad|\/mapa\//i.test(b)) || saidas.some((b: string) => /pr[eé]via|vista previa|enlace|link/i.test(b));
      const slugL = lead.mapa_slug || lead.preview_slug;
      const ultimoReenvio = Number(lead.memory?.previa_reenvio_em || 0);
      if (problemaLink && mandouLink && slugL && Date.now() - ultimoReenvio > 3 * 60_000) {
        const { data: mL } = await db().from('mapas').select('*').eq('slug', slugL).maybeSingle();
        if (mL && !mL.liberado) {
          await db().from('mapas').update({ previa_inicio: null }).eq('id', mL.id);
          const svL = await import('./mapa-alma/servico');
          const nomeL = String(lead.memory?.nome_cliente || '').trim().split(/\s+/)[0];
          const esL = lead.idioma === 'es';
          const minL = Number((await import('./mapa-alma/previa').then((m) => m.previaCfg()).catch(() => null))?.minutos) || 10;
          let precoL = '';
          try {
            const cb = await import('./cambio');
            const mo = cb.moedaDoPais(lead.pais);
            const cv = mo ? await cb.converter(10, mo).catch(() => null) : null;
            precoL = cv ? ` (${cv.texto})` : '';
          } catch {}
          let precoBR = '';
          if (!esL) { const { data: sv } = await db().from('services').select('price_steps,min_price').eq('slug', 'mapa-completo').maybeSingle(); const pv0 = Number((sv as any)?.price_steps?.[0] ?? (sv as any)?.min_price ?? 0); precoBR = pv0 ? ` custa ${brl(pv0)} e` : ' tem o valor combinado e'; }
          const linkL = svL.linkMapa({ slug: mL.slug, idioma: esL ? 'es' : 'pt' });
          const txtL = esL
            ? `${nomeL ? nomeL + ', ' : ''}vuelvo a generar el enlace de tu vista previa 💜 Dura solo ${minL} minutos y después se cierra solo, así que ábrelo ahora, apenas te llegue 👇\n${linkL}\n\nEs una vista previa con partes bloqueadas. El mapa completo, con todo liberado, el paso a paso y el PDF, cuesta solo US$ 10${precoL} hoy (antes US$ 19). Mírala con calma y cuéntame qué parte te llamó más la atención.`
            : `${nomeL ? nomeL + ', ' : ''}vou gerar novamente o link da sua prévia 💜 Ele dura só ${minL} minutos e depois expira sozinho, então abre assim que chegar 👇\n${linkL}\n\nÉ uma prévia com partes bloqueadas. O mapa completo, com tudo liberado, o passo a passo e o PDF,${precoBR} é liberado após o pagamento. Vê com calma e me conta qual parte chamou mais a atenção.`;
          await sendAndRecord(number, lead, txtL, 'ai', (await getSettings(db())).typing, { preview: mL.slug, reenvio_previa: true });
          await db().from('leads').update({ memory: { ...(lead.memory || {}), previa_reenvio_em: Date.now() }, last_outbound_at: new Date().toISOString(), needs_human: null }).eq('id', leadId).then(() => {}, () => {});
          await logEvent(lead.id, 'previa_reaberta', 'ok', `O link da prévia de ${lead.name} não abria (expirado): o sistema renovou o tempo e reenviou o link sozinho.`);
          return;
        }
      }
    } catch (e) { console.error('reenvio de prévia', e); }
  }
  // PÓS-VENDA SEM IA: quem já comprou e só continua conversando recebe respostas prontas, cada vez mais espaçadas, e depois silêncio (custo zero).
  // Dúvida de verdade (senha, link, PDF, erro, reembolso, nova compra) continua com a IA, no modelo mais barato.
  if (lead.stage === 'pago' && !lead.cortesia && !opts.force && posN >= 3) {
    const ultimo = [...history].reverse().find((m: any) => m.direction === 'in');
    const txt = String(ultimo?.transcript || ultimo?.body || '').trim();
    const precisa = /senha|contrase|password|link|enlace|pdf|n[aã]o (abre|recebi|consigo|chegou)|no (me )?(abre|carga|funciona|lleg)|erro|error|problema|reembols|devol|estorn|cobr|compr|tar[oô]|pirâmide|piramide|casal|pareja|outro mapa|otro mapa|indic|recomend/i.test(txt);
    const soAgradece = txt.length < 40 && !/[?¿]/.test(txt) && /obrigad|gracias|valeu|^ok\b|okay|beleza|entendi|entiendo|dale|listo|perfecto|genial|👍|💜|🙏|❤|🙌/i.test(txt);
    if (!precisa) {
      const recente = lead.memory?.pos_encerrado_em && Date.now() - new Date(lead.memory.pos_encerrado_em).getTime() < 48 * 3600_000;
      if (soAgradece || recente) return; // não responde: sem custo, e o cliente percebe que o atendimento está corrido
      if (posN >= 5) {
        const es1 = lead.idioma === 'es';
        const T_PT = ['Que bom que está gostando 💜 Hoje a minha agenda está bem corrida, então vou demorar um pouquinho mais pra responder. Qualquer dúvida do seu mapa, deixa aqui que eu vejo assim que puder.', 'Entendi 💜 Vou te responder com calma, tá? Estou atendendo outras pessoas agora.', 'Obrigada por compartilhar 🙏 Continuo na correria do dia, mas fico feliz que o mapa esteja fazendo sentido pra você.'];
        const T_ES = ['¡Qué bueno que te esté gustando! 💜 Hoy mi agenda está muy movida, así que voy a tardar un poquito más en responder. Cualquier duda de tu mapa, déjala por acá y la veo apenas pueda.', 'Entiendo 💜 Te respondo con calma, ¿sí? Estoy atendiendo a otras personas ahora.', 'Gracias por compartir 🙏 Sigo con mucho movimiento hoy, pero me alegra que el mapa te esté haciendo sentido.'];
        const FIM_PT = 'Fico muito feliz com a nossa conversa 💜 Preciso voltar aos meus atendimentos agora. O seu mapa tem muita coisa pra você ir lendo com calma, e se surgir uma dúvida importante é só me chamar. Um abraço grande!';
        const FIM_ES = 'Me alegra mucho nuestra conversación 💜 Ahora tengo que volver a mis atenciones. Tu mapa tiene mucho para ir leyendo con calma, y si te surge una duda importante solo escríbeme. ¡Un abrazo grande!';
        const fim = posN >= 8;
        const msg = fim ? (es1 ? FIM_ES : FIM_PT) : (es1 ? T_ES : T_PT)[(posN - 5) % 3];
        const st1 = await getSettings(db());
        await sendBubbles(number, lead, [msg], 'ai', st1.typing, { pos_venda_pronto: true });
        await db().from('leads').update({ last_outbound_at: new Date().toISOString(), ...(fim ? { memory: { ...(lead.memory || {}), pos_encerrado_em: new Date().toISOString() } } : {}) }).eq('id', leadId).then(() => {}, () => {});
        return;
      }
    }
  }
  // CLIENTE QUE JÁ PAGOU: a IA precisa SABER disso em toda resposta (nunca vender de novo, nunca pedir de novo o que já tem)
  let notaPago = '';
  if (lead.stage === 'pago' && !lead.cortesia) {
    try {
      const slugP = lead.mapa_slug || lead.preview_slug;
      const { data: mp } = slugP ? await db().from('mapas').select('*').eq('slug', slugP).maybeSingle() : { data: null as any };
      const sv = await import('./mapa-alma/servico');
      const nomeOk = !!(lead.memory?.mapa_nome_completo || mp?.nome);
      const nascOk = !!(lead.memory?.mapa_nascimento || mp?.nascimento);
      const es0 = lead.idioma === 'es';
      if (mp?.sent_at) {
        notaPago = `\n\nCLIENTE JÁ PAGOU E JÁ RECEBEU O MAPA COMPLETO (${new Date(mp.sent_at).toLocaleDateString('pt-BR')}). Link: ${sv.linkMapa(mp)}${lead.memory?.senha_mapa ? ` · senha: ${lead.memory.senha_mapa}` : ''}. REGRAS ABSOLUTAS: NUNCA ofereça o mapa nem fale de preço/pagamento/link de pagamento, NUNCA peça nome completo nem data de nascimento (já temos), NUNCA recomece a venda nem a leitura gratuita. Trate-o como cliente: agradeça, tire dúvidas sobre o mapa dele e, se pedir o link ou a senha, envie estes. ${es0 ? 'Responda em espanhol.' : ''}`;
      } else {
        notaPago = `\n\nCLIENTE JÁ PAGOU (pagamento confirmado) e o mapa completo dele ainda está sendo preparado/entregue. REGRAS ABSOLUTAS: NUNCA ofereça o mapa nem fale de preço/pagamento/link de pagamento e NUNCA aja como se ainda fosse vender. Agradeça a compra. ${nomeOk && nascOk ? 'Já temos o nome completo e a data de nascimento: NÃO peça de novo; diga que o mapa está sendo preparado e chega em instantes aqui na conversa.' : `Para preparar o mapa completo FALTAM ${!nomeOk ? 'o nome completo de nascimento' : ''}${!nomeOk && !nascOk ? ' e ' : ''}${!nascOk ? 'a data de nascimento' : ''}: peça SÓ o que falta, agradecendo e deixando claro que é para finalizar o mapa que ele já comprou (ex.: "Muito obrigada pela sua compra! Para finalizar o seu mapa completo, me confirma o nome completo de nascimento e a data?").`} ${es0 ? 'Responda em espanhol.' : ''}`;
      }
    } catch {}
  }
  // IDIOMA/PAÍS (+55 = português; demais países da América Latina = espanhol), antes do fluxo e da IA
  try {
    const { resolverIdioma } = await import('./internacional');
    const ir = await resolverIdioma(lead, history);
    if (ir.idioma !== (lead.idioma || 'pt') || (ir.pais && ir.pais !== lead.pais)) {
      lead.idioma = ir.idioma;
      lead.pais = ir.pais;
      await db().from('leads').update({ idioma: ir.idioma, pais: ir.pais }).eq('id', leadId).then(() => {}, () => {});
    }
  } catch {}
  // FLUXO (menu Fluxo): conversa nova roda a sequência de abertura antes da IA; enquanto ela roda, a IA não responde
  if (!lead.memory?.fluxo?.fim) {
    const { runFluxo } = await import('./mapa-alma/fluxo');
    const ocupado = await runFluxo(lead, number, await getSettings(db()), history, !!opts.force).catch(async (e) => {
      await logEvent(leadId, 'fluxo_erro', 'warn', `Fluxo de ${lead.name} com erro (a IA assume): ${e?.message || e}`);
      return false;
    });
    if (ocupado) return;
  }
  // a última mensagem do cliente já tem resposta? então não responde de novo
  const lastInIdx = history.map((m) => m.direction).lastIndexOf('in');
  const retomar = !!lead.memory?.retomar;
  if (retomar) {
    const m3 = { ...(lead.memory || {}) };
    delete m3.retomar;
    lead.memory = m3;
    await db().from('leads').update({ memory: m3 }).eq('id', leadId).then(() => {}, () => {});
  }
  if (!opts.force && !voltando && !retomar && lastInIdx >= 0 && history.slice(lastInIdx + 1).some((m) => m.direction === 'out' && m.author !== 'system')) return;
  const lastIn = [...history].reverse().find((m) => m.direction === 'in');
  if (!lastIn) {
    await db().from('leads').update({ reply_due_at: null }).eq('id', leadId);
    return;
  }
  const recentIn = history.filter((m) => m.direction === 'in').slice(-3).map((m) => m.transcript || m.body || '').join(' ');
  // "visualizou": marca como lidas as mensagens do cliente antes de começar a digitar
  const unread = history.filter((m) => m.direction === 'in' && m.wa_message_id && m.created_at > (lead.last_outbound_at || '')).map((m) => m.wa_message_id);
  if (unread.length && lead.whatsapp) {
    const s0 = await getSettings(db());
    if (s0.read_receipts !== false) await evo.markRead(number.instance_name, `${lead.whatsapp}@s.whatsapp.net`, unread).catch(() => {});
  }
  const ctx = await loadContext(lead, recentIn);
  // a IA se apresenta com o nome de quem atende este número
  ctx.settings = withAgent(ctx.settings, number);
  const floor = floorFor(lead, ctx.services);
  // áudio com a voz da equipe: só entra no prompt quando dá para usar agora (custo e teto)
  // opts.audio: botão "IA responde em áudio" do painel (teste/uso manual), ignora o teto
  const voiceOn = opts.audio ? voiceConfigured() : posN >= 4 ? false : await audioAllowed(lead, ctx.settings).catch(() => false);
  const lastWasAudio = lastIn?.kind === 'audio';
  // CONSULTA AO VIVO: com nome completo + data, o mapa é calculado agora e vira a base da conversa
  const leitura = await prepararLeitura(number, lead, history, ctx.settings).catch((e) => { console.error('[leitura]', e?.message); return null; });
  // leitura nova: o aviso "vou abrir o seu mapa" já foi; a leitura em si volta em 2 a 4 min
  if (leitura?.nova) return;
  const inicial = voltando === 'leitura inicial';
  // registra em qual modo de venda esta conversa está sendo atendida (para comparar os modos)
  const modo = modoAtual(ctx.settings);
  if (lead.modo_venda !== modo) await db().from('leads').update({ modo_venda: modo }).eq('id', lead.id).then(() => {}, () => {});
  // TARÔ: tiragem ativa desta conversa vai para a IA ler as cartas ao vivo
  let fichaTaro: string | null = null;
  if (lead.memory?.taro_ativa) {
    const { data: tr } = await db().from('tiragens').select('*').eq('slug', lead.memory.taro_ativa).maybeSingle();
    if (tr) fichaTaro = (await import('./mapa-alma/taro/tiragem')).fichaTiragem(tr as any);
  }
  const grazi = modo === 'grazi';
  const fechGrazi = !grazi && fechamentoGraziOn(ctx.settings);
  const vagas = grazi || fechGrazi ? calcVagas(ctx.settings, await atendidasHoje(lead.id)) : null;
  const simpatias = lead.cortesia ? '' : await import('./mapa-alma/simpatias/servico').then((m) => m.blocoSimpatias()).catch(() => '');
  const audios = await import('./mapa-alma/audios').then((m) => m.blocoAudios(lead)).catch(() => '');
  const paisCfg = lead.idioma === 'es' ? await (await import('./internacional')).paisDoLead(lead) : null;
  const cambio = paisCfg ? await import('./cambio').then((m) => m.blocoCambio(Number(paisCfg.preco) || 10, lead.pais || paisCfg.codigo)).catch(() => '') : '';
  const system = salesSystem({ ...ctx, idioma: lead.idioma === 'es' ? 'es' : 'pt', paisCfg, cambio, vagas, simpatias, audios, lead, floor, ficha: leitura?.ficha || null, leituraNova: inicial, voltaConsulta: inicial ? null : voltando, fichaTaro, cortesia: !!lead.cortesia, podeConsultar: !voltando && lead.stage !== 'pago' && modoAtual(ctx.settings) !== 'grazi' && podeConsultar(lead.memory), voiceOn: voiceOn && (!!fichaTaro || (lastWasAudio && momentOn(ctx.settings, 'cliente_audio')) || momentOn(ctx.settings, 'fechamento')), lastWasAudio }) + PERSONA_NOTE + (lead.stage !== 'pago' ? NOTA_SEM_PREVIA : '') + notaPago + notaPosVenda(posN, lead.idioma === 'es');
  // primeiro contato de quem chegou: áudio curto de boas-vindas ("atendimento corrido, pode ir mandando") e depois texto
  const firstTalk = !history.some((m) => m.direction === 'out');
  const welcome = firstTalk && !opts.audio && !grazi ? await momentScript('boas_vindas', lead, ctx.settings).catch(() => null) : null;
  const welcomeNote0 = welcome
    ? `\n\nANTES da sua resposta vai um áudio seu dizendo: "${welcome}". Então NÃO cumprimente nem se apresente de novo: responda direto ao que o cliente disse, em texto curto.`
    : '';
  // primeira resposta da conversa: a abertura agora é do ROTEIRO (3 balões) ou do Fluxo de abertura; a saudação fixa antiga fica desligada
  const greetOn = false && firstTalk && !grazi && !welcome && !opts.audio && (ctx.settings as any).greeting?.on !== false;
  const greet = greetOn ? greetingLine(ctx.settings, spNow().minutes) : '';
  // texto pronto do anúncio do Meta (o cliente só clicou): a IA trata como interesse, sem repetir a frase
  const firstIn = history.find((m) => m.direction === 'in');
  // veio de anúncio (marcado na chegada) ou a 1ª mensagem é o texto pronto de uma campanha
  const jaFalou = history.some((m) => m.direction === 'out' && m.author !== 'system'); // áudios do fluxo contam: já falaram
  const fromAd = !jaFalou && !!firstIn && history.filter((m) => m.direction === 'in').length <= 2 && (lead.source === 'anuncio' || !!campaignOf(ctx.settings, String(firstIn.body || '')));
  const audioNote = opts.audio
    ? `\n\nESTA RESPOSTA VAI COMO UM ÚNICO ÁUDIO DE WHATSAPP: junte tudo o que você diria numa mensagem só ("messages" com 1 item), falada, natural e com contexto, como alguém gravando um áudio (pode ter "olha", "então", "tá?"). Até uns 500 caracteres, sem links, sem emoji, sem listas, sem abreviações.`
    : '';
  const retomarNote = retomar
    ? `\n\nRETOMADA DEPOIS DOS ÁUDIOS: os áudios/mensagens acima JÁ se apresentaram, JÁ explicaram o trabalho e o mapa e JÁ perguntaram qual área mais pesa e o nome. O cliente ainda não respondeu. NÃO repita nenhuma explicação nem nenhuma dessas perguntas, NÃO diga "que bom que você quer conhecer o seu mapa" nem agradeça por ele ter chegado. Escreva UM balão só, bem curto (até 130 caracteres), como uma pessoa que dá um toque leve sem pressionar, por exemplo: "Ficou alguma dúvida? Pode me responder do seu jeito, por áudio ou texto, sem pressa 💜". No máximo UMA pergunta, e só se for realmente nova.`
    : '';
  // logo depois dos áudios do fluxo, a IA não "despeja" texto: poucas palavras, uma ideia por vez
  const depoisAudios = (lead.memory?.audios_enviados?.length || 0) > 0 && history.filter((m) => m.direction === 'out' && m.author !== 'system' && !/^🎤/.test(String(m.body || ''))).length <= 2;
  const audiosNote = depoisAudios
    ? `\n\nO CLIENTE ACABOU DE OUVIR ÁUDIOS SEUS (estão na conversa, com 🎤): tudo o que eles disseram já foi dito, não repita nem reexplique. Responda ao que ele escreveu agora, em UM balão curto e humano, com no máximo UMA pergunta. Sem listas, sem blocos de texto, sem pedir de novo o que os áudios já pediram.`
    : '';
  // depois de pagar: pede o e-mail pessoal (cadastro do acesso, recibo e mapa). Uma vez, e de novo só 1 dia depois se ele não deu.
  const emailJaSei = !!(lead.memory?.cliente?.email || lead.memory?.email);
  const ep: any = lead.memory?.email_pedido || { n: 0, em: 0 };
  const pedirEmail = lead.stage === 'pago' && !emailJaSei && !lead.cortesia && ep.n < 2 && (ep.n === 0 || Date.now() - Number(ep.em) > 20 * 3600_000) && jaFalou;
  if (pedirEmail) {
    lead.memory = { ...(lead.memory || {}), email_pedido: { n: ep.n + 1, em: Date.now() } };
    db().from('leads').update({ memory: lead.memory }).eq('id', lead.id).then(() => {}, () => {});
  }
  const emailNote = pedirEmail
    ? `\n\nCADASTRO DO E-MAIL (este cliente JÁ PAGOU): depois de responder ao que ele disse, peça UMA vez o e-mail pessoal dele, com leveza, explicando que é para cadastrar o acesso dele no sistema e enviar o recibo e o mapa. Um pedido só, curto, sem insistir. Se ele já deu o e-mail ou já recusou, não peça de novo.`
    : '';
  const recupNote = lead.memory?.recuperacao ? (await import('./recuperacao')).notaRecuperacao(lead, history) : '';
  const welcomeNote =
    recupNote +
    emailNote +
    retomarNote +
    audiosNote +
    audioNote +
    welcomeNote0 +
    (greet ? `\n\nSUA RESPOSTA JÁ VAI COMEÇAR com a saudação "${greet}" (o sistema coloca sozinho, como primeiro balão). NÃO cumprimente, NÃO diga oi/olá/bom dia e NÃO se apresente: comece direto no assunto do cliente.` : '') +
    (grazi && firstTalk
      ? `\n\nMODO GRAZI — ESTA É A PRIMEIRA RESPOSTA DA CONVERSA: nada de "bom dia/boa tarde", "tudo bem?", "aqui é ${(ctx.settings as any).assistant_name || 'a consultora'}" ou "qual é o seu nome?". Comece JÁ com a fila de hoje (${fraseVagas(vagas)}), a oportunidade com o preço de hoje e o pedido do nome completo de nascimento + data. 1 ou 2 balões curtos, firme e simpática.${fromAd ? ` A primeira mensagem do cliente ("${String(firstIn!.body || '').slice(0, 200)}") é o texto automático de um anúncio nosso: ele já demonstrou interesse, não repita a frase dele.` : ''}`
      : '') +
    (fromAd && !grazi
      ? `\n\nA primeira mensagem do cliente ("${String(firstIn!.body || '').slice(0, 200)}") é o TEXTO AUTOMÁTICO DE UM ANÚNCIO NOSSO no Instagram/Facebook (campanha rodando no Meta) que ele clicou. Ele já disse o que quer: use isso. Não agradeça por ele ter chegado, não diga "que bom que você chegou", não repita a frase dele palavra por palavra  Resposta descontraída e certeira, já confirmando o interesse com as palavras da campanha e pedindo o que falta para começar, em uma mensagem só. Ex. (adapte ao anúncio): "Que bom que você quer conhecer o seu mapa ✨ Me conta: tem alguma área da sua vida que anda pesando mais agora, tipo dinheiro, amor ou família?". Se o anúncio cita um preço, esse é o preço da campanha (confirme se ele perguntar). NESTA resposta não ofereça nem fale de preço: primeiro a pessoa precisa contar o que está vivendo.`
      : '');
  // PERGUNTA DE PREÇO: o cliente quer o valor, a resposta TEM de trazer o valor (sem adiar, sem perguntar antes)
  const textoPendente = pendingClientText(history);
  const perguntouPreco = lead.stage !== 'pago' && !lead.cortesia && /cu[aá]nto (sale|cuesta|vale|es|cobr)|qu[eé] (precio|valor)|\bprecio\b|\bvalor\b|\bcosto\b|\bcu[aá]nto\b.*(estudio|mapa)|quanto (custa|sai|é|fica|cobra)|qual (o )?(pre[cç]o|valor)|\bpre[cç]o\b|\bvalor\b/i.test(textoPendente);
  const NOTA_PRECO = perguntouPreco
    ? `\n\nPERGUNTA DE PREÇO (REGRA ABSOLUTA, vale mais que o roteiro): o cliente acabou de perguntar quanto custa. Seu PRIMEIRO balão DEVE trazer o valor, claro e direto (${lead.idioma === 'es' ? 'la promoción de hoy: de US$ 19 a solo US$ 10 (con la conversión a su moneda de la tabla CAMBIO DEL DÍA), pago único, solo por hoy' : 'o preço, pagamento único'}). PROIBIDO adiar ("eu confirmo já", "antes de te passar o valor..."), proibido responder só com pergunta. Depois do valor, em outro balão, diga o que o mapa entrega em uma frase e, se ainda faltar nome completo/data de nascimento, peça (se já tiver, não peça).`
    : '';
  const NOTA_ENTREGA = entregar
    ? `\n\nENTREGA PENDENTE (REGRA ABSOLUTA): você prometeu voltar com algo e a pessoa ficou esperando: "${String(entregar.texto).replace(/"/g, "'")}". Agora ENTREGUE o que prometeu, já nesta resposta (a leitura/resposta de verdade usando a FICHA do mapa e o que ela contou). NÃO diga "dame un momento", "um instante" nem peça mais tempo, NÃO peça desculpa pela demora, NÃO use "consultar_mapa" e NÃO se apresente de novo. ${lead.idioma === 'es' ? 'Responda SOMENTE em espanhol.' : 'Responda em português.'}`
    : '';
  const NOTA_RITMO = modoAtual(ctx.settings) !== 'grazi' ? notaRitmo(lead, history, (ctx.settings as any).ritmo, lead.idioma === 'es') : '';
  // O PREÇO É FIXO (US$ 10). Se o cliente citar outro valor ("son 1000 pesos"), a IA corrige com gentileza; nunca confirma.
  const usdOficial = paisCfg && paisCfg.moeda === 'USD' ? Number(paisCfg.preco) || 10 : 10;
  const travaValorOn = lead.idioma === 'es' && (!paisCfg || paisCfg.moeda === 'USD');
  const cliCitou = travaValorOn && lead.stage !== 'pago' && !lead.cortesia && valoresCitados(textoPendente).some((v) => Math.abs(v - usdOficial) > 0.5);
  let convTxt = '';
  if (lead.idioma === 'es' && paisCfg) {
    const cb = await import('./cambio');
    const mo = cb.moedaDoPais(lead.pais || paisCfg.codigo);
    const c = mo ? await cb.converter(usdOficial, mo).catch(() => null) : null;
    convTxt = c ? c.texto : '';
  }
  const NOTA_VALOR = cliCitou
    ? `\n\nO CLIENTE CITOU UM VALOR (${JSON.stringify(textoPendente.slice(0, 120))}) QUE PODE ESTAR ERRADO. O preço oficial é SEMPRE US$ ${usdOficial} (pago único)${convTxt ? `, aproximadamente ${convTxt} no câmbio de hoje` : ''}. NÃO confirme o valor que ele disse. Corrija com gentileza já no primeiro balão ("el valor es US$ ${usdOficial}${convTxt ? `, unos ${convTxt} al cambio de hoy` : ''}; el enlace de pago te muestra el valor ya convertido a tu moneda") e só então siga. Nunca prometa link ou cobrança em outro valor.`
    : '';
  const gen = (extra = '', tier: 'fast' | 'smart' = needsSmart(lead, ctx.settings) ? 'smart' : 'fast') =>
    structured<ReplyResult>(
      system,
      `Conversa (mais antiga primeiro):\n${transcript(history)}\n\nResponda à última mensagem do LEAD e registre a análise.${welcomeNote}${NOTA_PRECO}${NOTA_VALOR}${NOTA_RITMO}${NOTA_ENTREGA}${extra}`,
      'registrar_resposta',
      REPLY_SCHEMA,
      2200,
      { task: 'resposta', leadId: lead.id, tier },
    );
  const maxB = retomar || depoisAudios ? 1 : firstTalk ? 3 : Math.max(1, Math.min(3, Number((ctx.settings as any).max_bubbles) || 2));
  const before = history.filter((m) => m.direction === 'out' && m.author !== 'system').slice(-30).map((m) => String(m.body || ''));
  // sem desespero: depois de pedir o fechamento ou mandar o link, não fica cobrando
  const pace = payPace(history, lead, String(lastIn?.transcript || lastIn?.body || ''));
  const clean = (r: ReplyResult) => {
    // nunca repete o que já foi dito: remove balões quase iguais a mensagens anteriores (e perguntas já feitas)
    let ps = bubbles(r, maxB).filter((p) => !before.some((b) => similar(p, b) >= (p.trim().endsWith('?') ? 0.55 : 0.7)));
    ps = ps.filter((p) => !pushyBubble(p, pace) && !selfIdentifies(p));
    // nunca pede desculpa pela demora nem agradece a paciência (1 a 4 min é normal)
    ps = ps.map(semDesculpaPorDemora).filter((p) => p.length > 1);
    // já estamos conversando (áudios ou mensagens anteriores): nada de novo "¡Hola!" no começo
    if (before.length > 0 && ps.length) ps = [semSaudacao(ps[0]), ...ps.slice(1)].filter((p) => p.length > 1);
    // sem apelidos carinhosos ("amor", "querida", "meu bem"...): soam invasivos vindos de uma desconhecida
    {
      const AP = '(meu\\s+amor|amor|amore|querid[ao]|flor|lind[ao]|meu\\s+bem|anjo|amad[ao]|benzinho|fofa|gat[ao])';
      ps = ps.map((p) => p.replace(new RegExp(`,\\s*${AP}(?=\\s*[,!.?…]|\\s*$)`, 'gi'), '').replace(new RegExp(`^${AP}\\s*[,!]\\s*`, 'i'), '').replace(/\s{2,}/g, ' ').trim().replace(/^\p{Ll}/u, (c) => c.toUpperCase()));
    }
    // EMOJI COM MATURIDADE: se as 2 últimas respostas já tiveram emoji, esta vai sem; senão, no máximo 1 emoji na resposta toda
    {
      const RE_EMO = /(\p{Extended_Pictographic}(\uFE0F|\u200D\p{Extended_Pictographic})*)/gu;
      const recentes = before.slice(-2);
      const teveEmoji = recentes.some((b) => new RegExp(RE_EMO.source, 'u').test(b));
      let usados = 0;
      ps = ps.map((p) => p.replace(RE_EMO, (m) => (!teveEmoji && usados++ === 0 ? m : '')));
      ps = ps.map((p) => p.replace(/[ \t]+([.!?,])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim()).filter(Boolean);
    }
    // nada de "Anotado!" nem boas-vindas forçadas (robótico)
    ps = ps
      .map((p) =>
        p
          .replace(/(^|[.!?]\s+|\s)(certo,?\s*|ok,?\s*|perfeito,?\s*)?anotad[oíi]ssimo[!.]*\s*(👍|✅|📝)?/gi, '$1')
          .replace(/(^|[.!?]\s+|\s)(certo,?\s*|ok,?\s*|perfeito,?\s*)?anotad[oa][!.]*\s*(👍|✅|📝)?/gi, '$1')
          .replace(/\b(que bom que (você|vc) (chegou|veio)( até a gente| aqui)?|que bom ter (você|vc) (aqui|por aqui))[!.]*\s*/gi, '')
          .replace(/\s{2,}/g, ' ')
          .trim(),
      )
      .filter((p) => p.length > 1);
    const fullName = String((r as any)?.memory?.nome_cliente || lead.memory?.nome_cliente || '').trim();
    if (fullName.split(/\s+/).length > 1) {
      const first = fullName.split(/\s+/)[0];
      const esc = fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      ps = ps.map((p) => p.replace(new RegExp(esc, 'gi'), first));
    }
    // apresentação forçada demais vira uma pergunta simples
    ps = ps.map((p) => p.replace(/\s*(e\s+)?com quem (eu )?(tenho|teria) o (prazer|privil[eé]gio) de (falar|conversar)\s*\?/gi, ' Qual seu nome?').replace(/\s*a quem devo a honra\s*\?/gi, ' Qual seu nome?').trim());
    // nunca diz que vai consultar alguém/pedir aprovação: vira uma frase neutra (uma só)
    if (ps.some(approvalTalk)) {
      ps = ps.filter((p) => !approvalTalk(p));
      ps.unshift(neutralHold());
    }
    // link de prévia escrito pela própria IA (copiado da conversa) pode estar velho ou apagado: só o sistema manda o link
    ps = ps.map((p) => p.replace(/https?:\/\/\S*\/(previa|site)\/\S+/gi, '').replace(/\s{2,}/g, ' ').trim()).filter((p) => p.length > 1);
    // no máximo uma pergunta por resposta: fica a última
    const qs = ps.filter((p) => p.trim().endsWith('?'));
    if (qs.length > 1) ps = ps.filter((p) => !p.trim().endsWith('?') || p === qs[qs.length - 1]);
    // TRAVA (todos os clientes): nunca pede de novo nome completo/data de nascimento que já temos
    const temDados0 = !!((lead.memory?.mapa_nome_completo || (res as any)?.memory?.mapa_nome_completo) && (lead.memory?.mapa_nascimento || (res as any)?.memory?.mapa_nascimento));
    if (temDados0) ps = ps.filter((p) => !/nombre completo|nome completo|fecha de nacimiento|data de nascimento|nombre de nacimiento|nome de nascimento/i.test(p) || /(gracias|obrigad|ya tengo|j[aá] tenho)/i.test(p));
    // TRAVA: o mapa/prévia/link NÃO é enviado pela IA nesta conversa (só as pirâmides, que o sistema manda sozinho, e o mapa completo depois do pagamento).
    // Frase que PROMETE prévia, vista previa ou enlace do mapa sem o sistema enviar nada é descartada: o cliente ficaria esperando algo que não vem.
    if (lead.stage !== 'pago') ps = ps.filter((p) => !/(te (la |lo )?(env[ií]o|mando|dejo|paso|voy a (enviar|mandar))|aqu[ií] (tienes|va|est[aá])|ya te (env[ií]o|mando|dejo)|te (envio|mando|deixo)|aqui est[aá]|segue)[^.?!]{0,40}(pr[eé]via|vista previa|preview|enlace|link)[^.?!]{0,30}(de tu mapa|do seu mapa|tu mapa|seu mapa)?/i.test(p) && !/https?:\/\//.test(p));
    // TRAVA: cliente que JÁ PAGOU nunca recebe oferta/preço/link de pagamento
    if (lead.stage === 'pago' && !lead.cortesia) {
      ps = ps.filter((p) => !/enlace de pago|link de pagamento|pago único|pagamento único|us\$ ?\d+.*(pago|precio|valor)|¿?lo quieres por tarjeta|quer começar pelo mapa|quieres empezar por el mapa/i.test(p));
    }
    return ps;
  };
  let res = await gen();
  // não entendeu direito, cliente cobrando ou irritado: pensa de novo com o modelo mais inteligente (só nesses casos)
  if (ctx.settings?.budget?.smart_retry !== false && lead.stage !== 'pago' && needsSmarter(res) && !needsSmart(lead, ctx.settings)) res = await gen('', 'smart').catch(() => res);
  let parts = clean(res);
  // se mesmo assim a resposta não trouxe valor nenhum, pede de novo uma vez com ordem mais dura
  const trazValor = (ps: string[]) => ps.some((p) => /(US\$|\$|R\$|USD|CLP|COP|MXN|ARS|PEN|UYU|EUR|€)\s?\d|\d[\d.,]*\s?(d[oó]lares|reais|pesos|usd)/i.test(p));
  if (perguntouPreco && parts.length && !trazValor(parts)) {
    const again = await gen('\n\nATENÇÃO: sua resposta anterior NÃO trouxe o valor. Responda AGORA com o valor do mapa no primeiro balão.').catch(() => null);
    const p2 = again ? clean(again) : [];
    if (again && p2.length && trazValor(p2)) {
      res = again;
      parts = p2;
    }
  }
  // TRAVA DE VALOR: nenhuma mensagem sai com preço que não seja US$ oficial ou a conversão dele
  if (travaValorOn && lead.stage !== 'pago' && !lead.cortesia && parts.length) {
    let ruins = await valoresInvalidos(parts, usdOficial).catch(() => []);
    if (ruins.length) {
      const again = await gen(`\n\nATENÇÃO (TRAVA DE VALOR): sua resposta citou um valor errado (${ruins.join(', ')}). O ÚNICO preço é US$ ${usdOficial}${convTxt ? ` (≈ ${convTxt})` : ''}, pago único. Reescreva corrigindo, sem repetir o valor errado.`).catch(() => null);
      const p2 = again ? clean(again) : [];
      if (again && p2.length && !(await valoresInvalidos(p2, usdOficial).catch(() => [1])).length) {
        res = again;
        parts = p2;
      } else {
        parts = [`Hoy el Mapa del Alma completo está en promoción: de US$ 19 a solo US$ ${usdOficial}${convTxt ? ` (unos ${convTxt} al cambio de hoy)` : ''}, pago único y solo por hoy. El enlace de pago te muestra el valor ya convertido a tu moneda 💜`];
      }
      await logEvent(lead.id, 'valor_corrigido', 'warn', `Trava de valor: a IA ia citar ${ruins.join(', ')} e foi corrigida para US$ ${usdOficial}`).catch(() => {});
    }
  }
  let skipReason = '';
  if (!parts.length && bubbles(res, maxB).length) {
    // tudo que ela escreveu repetia a conversa: pede uma resposta nova uma vez
    const again = await gen('\n\nATENÇÃO: sua resposta anterior repetia coisas já ditas. Escreva algo NOVO que avance a venda, ou deixe "messages" vazio se realmente não houver o que responder.');
    const p2 = clean(again);
    if (p2.length) {
      res = again;
      parts = p2;
    } else skipReason = 'a resposta repetiria algo já dito na conversa';
  } else if (!parts.length && bubbles(res, maxB).some((p) => pushyBubble(p, pace))) {
    // ela só ia cobrar o pagamento de novo: pede uma resposta sobre o assunto do cliente (uma vez)
    const again = await gen('\n\nATENÇÃO: NÃO fale de pagamento, link ou fechamento agora (você já pediu ou já mandou o link). Responda com calma ao que o cliente disse, sem cobrar nada.');
    const p2 = clean(again);
    if (p2.length) {
      res = again;
      parts = p2;
    } else skipReason = 'evitou insistir no pagamento (o cliente decide no tempo dele)';
  } else if (!parts.length) skipReason = 'a última mensagem não pedia resposta (ex.: só emoji ou figurinha)';

  // cliente escreveu de verdade ("oi", uma pergunta, um áudio): NUNCA fica sem resposta
  const pending = pendingClientText(history);
  if (!parts.length && skipReason && clientExpectsReply(pending)) {
    const again = await gen(`\n\nATENÇÃO: o cliente escreveu "${pending.slice(0, 200)}" e está esperando resposta. Responda agora, curto e natural (se for um cumprimento, cumprimente de volta e siga a conversa).`).catch(() => null);
    const p2 = again ? clean(again) : [];
    if (again && p2.length) {
      res = again;
      parts = p2;
    } else {
      // última garantia: uma resposta simples e humana
      parts = [fallbackReply(lead, ctx.settings, pending)];
    }
    skipReason = '';
  }

  // nunca deixa a venda parada: depois de um sinal de compra (com o preço já apresentado),
  // a resposta sempre termina pedindo o fechamento
  const priceKnown = !!(lead.deal_price || res.offered_price || (lead.memory?.precos_ditos || []).length || history.some((m) => m.direction === 'out' && /R\$\s?\d/.test(String(m.body || ''))));
  const closing = res.buying_signal || ['fechamento', 'oferta'].includes(String(res.sales_step || ''));
  // só quando o próprio cliente deu sinal de compra, e no máximo uma vez: sem ficar cobrando
  void closing;
  if (parts.length && res.buying_signal && priceKnown && !pace.askedRecently && !pace.linkSent && !res.accepted && !res.opt_out && !['pix', 'pago'].includes(lead.stage) && !parts.some((p) => p.trim().endsWith('?'))) {
    const asks = ['Se fizer sentido pra você, te mando o link. Quer?', 'Quer que eu te mande o link pra gente começar?', 'Posso te mandar o link?'];
    const ask = asks.find((q) => !before.some((b) => similar(q, b) >= 0.55));
    if (ask) parts = [...parts.slice(0, Math.max(1, maxB - 1)), ask];
  }

  // o cliente escreveu de novo enquanto a resposta era preparada? descarta este rascunho:
  // já há uma nova resposta marcada que vai considerar TODAS as mensagens juntas.
  const newer = async () => {
    const { data: nx } = await db().from('messages').select('id').eq('lead_id', leadId).eq('direction', 'in').gt("created_at", lastIn!.created_at).limit(1);
    return !!nx?.length;
  };
  if (await newer()) return;

  // saudação padrão no primeiro balão; tira cumprimento/apresentação repetidos do que a IA escreveu
  if (greet && parts.length) {
    let rest = parts.map(stripGreeting).filter((p) => p.length > 1);
    if (rest.length > maxB) rest = [...rest.slice(0, maxB - 1), rest.slice(maxB - 1).join(' ')];
    parts = [greet, ...rest];
  }

  const now = new Date().toISOString();
  // limpa restos de marcação que às vezes vazam da IA ("</summary>", "<parameter name=...>")
  const limpaTxt = (t: any) => String(t || '').split(/<\/?(summary|parameter|next_step)[^>]*>|<\/?parameter/i)[0].trim() || null;
  const patch: any = { summary: limpaTxt(res.summary), next_step: limpaTxt(res.next_step) };
  const oldTemp = lead.temperature || 0;
  patch.temperature = Math.max(0, Math.min(100, Math.round(res.temperature)));
  if (typeof res.close_probability === 'number') patch.close_probability = Math.max(0, Math.min(100, Math.round(res.close_probability)));

  // etapa: não volta para trás (exceto sem interesse / remarketing)
  let stage = res.stage;
  if (!STAGE_RANK.hasOwnProperty(stage)) stage = lead.stage;
  if (['pix', 'pago'].includes(lead.stage) && !['sem'].includes(stage)) stage = lead.stage;
  else if (!['sem', 'remarketing'].includes(stage) && STAGE_RANK[stage] < STAGE_RANK[lead.stage] && !['sem', 'remarketing'].includes(lead.stage)) stage = lead.stage;
  patch.stage = stage;

  const steps: string[] = ['talk'];
  if (voltando) steps.push('leitura');
  if (STAGE_RANK[stage] >= 3 && !['sem', 'remarketing'].includes(stage)) steps.push('interest');
  if (res.offered_price) steps.push('price');
  patch.steps = withSteps(lead.steps, ...steps);
  if (res.pains?.length) patch.pains = Array.from(new Set([...(lead.pains || []), ...res.pains])).slice(0, 12);
  if (res.offered_service) patch.deal_service = res.offered_service;
  if (res.offered_price) {
    patch.deal_price = Math.max(Number(res.offered_price), floor || 0);
  }
  if (res.objection) patch.objections = Array.from(new Set([...(lead.objections || []), res.objection])).slice(0, 12);
  if (res.remarketing_date && stage === 'remarketing') patch.remarketing_at = res.remarketing_date;
  if (res.needs_human) patch.needs_human = res.human_reason || 'A IA pediu ajuda da equipe';
  // cliente pediu um valor abaixo do mínimo: pedido de aprovação para a equipe (a conversa segue neutra)
  const reqPrice = Number((res as any).price_request || 0);
  const minNow = floorFor(lead, ctx.services);
  if (reqPrice > 0 && minNow && reqPrice < minNow) {
    patch.needs_human = `${APPROVAL}${lead.name} pediu ${brl(reqPrice)} (mínimo atual ${brl(minNow)}). Aprove um valor ou recuse.`;
  } else if (res.needs_human && /desconto|abaixo|menor (pre[çc]o|valor)|aprova/i.test(String(res.human_reason || '')) && !String(patch.needs_human).startsWith(APPROVAL)) {
    patch.needs_human = APPROVAL + String(res.human_reason || 'Cliente pediu um valor abaixo do mínimo. Aprove ou recuse.');
  }
  // prometeu chamar a equipe ou o cliente pediu uma pessoa: a equipe é avisada de verdade
  else if (res.understanding?.promises?.includes('chamar_equipe') || res.understanding?.intents?.includes('quer_falar_com_pessoa'))
    patch.needs_human = res.human_reason || `O cliente quer falar com alguém da equipe: ${String(res.understanding?.client_meant || '').slice(0, 160)}`;
  // perguntou se é robô/IA: a equipe assume a conversa agora (a IA sai desta conversa)
  if (res.asked_if_bot) {
    patch.needs_human = 'URGENTE: o cliente perguntou se está falando com robô/IA. A IA saiu da conversa; assuma agora.';
    patch.ai_enabled = false;
    patch.reply_due_at = null;
    if (!parts.length) parts = ['Vou chamar alguém da equipe pra continuar com você aqui, só um instante 😊'];
  }
  // prospecção: recusou de vez → etiqueta "Não demonstrou interesse", IA sai da conversa e o motivo fica registrado
  if (isProspect(lead) && (stage === 'sem' || res.opt_out) && lead.stage !== 'sem') {
    const why = String(res.lost_reason || res.objection || (res.opt_out ? 'pediu para não receber mensagens' : 'sem interesse')).slice(0, 160);
    patch.stage = 'sem';
    patch.ai_enabled = false;
    patch.reply_due_at = null;
    patch.lost_reason = why;
    patch.lost_at = new Date().toISOString();
    patch.next_step = 'Não demonstrou interesse. IA desligada nesta conversa.';
    if (!res.needs_human) patch.needs_human = null;
    await logEvent(lead.id, 'lost', 'warn', `${lead.name} não demonstrou interesse (${why}). IA desligada nesta conversa.`, { reason: why });
  }
  if (!lead.needs_human && patch.temperature >= 65 && oldTemp < 65 && ctx.settings.alert_hot)
    if (lead.stage !== 'pago') patch.needs_human = patch.needs_human || 'Lead quente: acompanhe de perto (pronto para fechar)';

  // 1) responde (em áudio com a voz da conversa, quando fizer sentido; senão em texto)
  if (parts.length) {
    const metaKb = await kbMeta(ctx.kb, res.techniques_used);
    const metaNow = { temp: patch.temperature, stage: patch.stage, step: res.sales_step };
    let spoke: any = false;
    // boas-vindas em áudio (frase pronta, sem gastar IA) e a resposta em texto logo depois
    let welcomed = false;
    if (welcome && !res.asked_if_bot && !(await newer())) {
      welcomed = await sendMoment(number, lead, 'boas_vindas', ctx.settings, welcome);
      if (!welcomed && !/^(oi|ol[aá]|opa|bom dia|boa tarde|boa noite)/i.test(parts[0] || '')) parts = ['Oi, tudo bem? 😊', ...parts].slice(0, Math.max(2, maxB));
    }
    // áudio escrito pela IA: só nos momentos ligados (cliente mandou áudio, ou fechamento de verdade)
    const closingMoment = res.buying_signal || ['fechamento', 'oferta'].includes(String(res.sales_step || ''));
    const wantAudio =
      voiceOn &&
      !welcomed &&
      !res.asked_if_bot &&
      (!!opts.audio || (lastWasAudio && momentOn(ctx.settings, 'cliente_audio') && res.as_audio !== false) || (res.as_audio === true && closingMoment && momentOn(ctx.settings, 'fechamento')) || (res.as_audio === true && !!fichaTaro && voiceOn));
    if (wantAudio && !(await newer())) {
      try {
        // um áudio só com tudo (nada de áudio + textos depois)
        spoke = await sendVoice(number, lead, parts.join(' '), ctx.settings, { ...metaKb, ...metaNow });
      } catch (e: any) {
        await logEvent(lead.id, 'voice_error', 'warn', `Áudio não saiu (foi em texto): ${String(e?.message || e).slice(0, 200)}`);
      }
    }
    if (!spoke) await sendBubbles(number, lead, parts, 'ai', ctx.settings.typing, metaKb, metaNow, newer);
    patch.last_outbound_at = now;
  } else if (skipReason) {
    await logEvent(lead.id, 'reply_skip', 'ai', `IA não respondeu ${lead.name}: ${skipReason}`);
  }

  // 2) aceitou: gera o Pix (precisa de CPF ou CNPJ para o Asaas)
  const doc = cleanDocument(res.document) || lead.cpf_cnpj || null;
  if (cleanDocument(res.document) && cleanDocument(res.document) !== lead.cpf_cnpj) patch.cpf_cnpj = cleanDocument(res.document);
  let cortesiaServico: string | null = null;
  // espanhol: o preço é fixo (US$ 10, Kiwify), então "aceitou" vale mesmo sem a IA informar valor
  let offer: any = res.accepted && (res.accepted.price || lead.cortesia || lead.idioma === 'es') && !res.opt_out ? { service_slug: 'mapa-completo', ...res.accepted } : null;
  // REDE DE SEGURANÇA (espanhol): a pessoa pediu para pagar/"pix" ou a IA prometeu o enlace/Pix e o sistema não gerou nada → gera o link internacional agora (1 a cada 30 min)
  if (!offer && lead.idioma === 'es' && !lead.cortesia && lead.stage !== 'pago' && !res.opt_out) {
    const falaIA = (parts || []).join(' ');
    const falaCli = pendingClientText(history);
    const prometeu = /(te (paso|mando|env[ií]o|enviar[eé]|dejo)|ya te (paso|mando|env[ií]o)|estoy (preparando|generando)|voy a (pasar|mandar|enviar|generar))[^.?!]{0,40}(pix|enlace|link|pago|valor)/i.test(falaIA) || /(preparando|generando) (tu|el) (pix|enlace|link)/i.test(falaIA);
    const pidio = /\b(pix|pagar|pago|pagarlo|enlace de pago|c[oó]mo (lo )?pago|quiero (pagar|comprar|el mapa)|m[aá]nda(me)? (el )?(pix|link|enlace)|d[oó]nde pago|dame el (pix|link|enlace))\b/i.test(falaCli);
    if (prometeu || (pidio && (res.buying_signal || ['fechamento', 'oferta'].includes(String(res.sales_step || ''))))) {
      const { data: recente } = await db().from('payments').select('id').eq('lead_id', lead.id).eq('status', 'pendente').not('ticket_url', 'is', null).gte('created_at', new Date(Date.now() - 30 * 60_000).toISOString()).limit(1);
      if (!recente?.length) offer = { service_slug: 'mapa-completo', price: 0, via: 'rede_de_seguranca' };
    }
  }
  if (!offer && lead.accepted_offer && doc && !lead.cpf_cnpj && !res.opt_out) offer = lead.accepted_offer; // aceitou antes e só agora mandou o documento
  // espanhol que pediu PIX (brasileiro morando fora, fronteira etc.): Pix copia e cola pelo Asaas, no valor do mapa no Brasil
  const pediuPix = lead.idioma === 'es' && !lead.cortesia && offer && /\bpix\b/i.test(pendingClientText(history) || history.filter((m: any) => m.direction === 'in').slice(-3).map((m: any) => m.transcript || m.body || '').join(' '));
  if (pediuPix) {
    try {
      const svcPix = ctx.services.find((s: any) => s.slug === 'mapa-completo') || ctx.services[0];
      const precoPix = Number(svcPix?.price_steps?.[0] ?? svcPix?.min_price ?? 49) || 49;
      await enviarPixDireto(number, lead, svcPix, precoPix, ctx.settings);
      patch.stage = 'pix';
      patch.accepted_offer = null;
      patch.deal_service = svcPix?.slug || 'mapa-completo';
      patch.deal_price = precoPix;
      patch.steps = withSteps(patch.steps, 'price', 'pix');
      patch.next_step = 'Pix copia e cola enviado. Aguardando o pagamento e o comprovante.';
    } catch (e: any) {
      patch.needs_human = 'Cliente (espanhol) pediu Pix, mas o Pix não foi gerado: ' + e.message;
      await logEvent(lead.id, 'pix_error', 'warn', `Pix direto não gerado para ${lead.name}: ${e?.message || e}`);
    }
  } else if (offer && lead.idioma === 'es' && !lead.cortesia) {
    try {
      await cobrarInternacional(number, lead, paisCfg!, patch);
    } catch (e: any) {
      patch.needs_human = 'Cliente (espanhol) aceitou, mas o link internacional não foi gerado: ' + e.message;
      await logEvent(lead.id, 'link_error', 'warn', `Erro no link internacional de ${lead.name}: ${e.message}`);
    }
  } else if (offer) {
    const svc = ctx.services.find((s: any) => s.slug === offer.service_slug) || ctx.services[0];
    let price = Number(offer.price);
    // passagem simples → completa: preço definido pelo Master (diferença ou valor fixo), sem passar pelo piso
    const upPreco = svc?.slug === 'mapa-completo' ? (precoUpgrade(lead, ctx.settings, ctx.services) ?? segundaOfertaValida(lead, ctx.settings)) : null;
    if (upPreco != null) price = upPreco;
    if (svc && lead.cortesia) {
      // conversa GRATUITA / TESTE: entrega sem cobrar (o cliente não vê nada de pagamento)
      cortesiaServico = svc.slug;
      patch.accepted_offer = null;
      patch.deal_service = svc.slug;
      patch.deal_price = 0;
      await logEvent(lead.id, 'cortesia', 'acc', `${lead.name}: ${svc.name} liberado sem cobrança (conversa gratuita/teste)`);
    } else if (!svc) {
      patch.needs_human = 'Cliente aceitou, mas não há serviço ativo com preço. Gere a cobrança manualmente.';
    } else if (floor && price < floor && upPreco == null) {
      patch.needs_human = `${APPROVAL}${lead.name} quer fechar por ${brl(price)}, abaixo do mínimo (${brl(floor)}). Aprove um valor ou recuse.`;
    } else if (ctx.settings.payments?.mode !== 'pix') {
      // modo link: checkout próprio, o cliente escolhe Pix ou cartão
      try {
        const link = await linkForLead(lead, svc, price);
        import('./meta-capi').then((m) => m.enviarEvento(lead.id, 'InitiateCheckout', { valor: Number(price) || undefined, moeda: 'BRL' })).catch(() => {});
        const monthly = link.billing === 'mensal';
        // áudio rápido ("vou deixar o link aqui embaixo, assim que finalizar é só me avisar") e o link em texto
        const said = await sendMoment(number, lead, 'link_pagamento', ctx.settings);
        await sendAndRecord(number, lead, `Link de pagamento seguro${monthly ? ' (mensalidade)' : ''}: ${link.url}\nVocê escolhe Pix ou cartão por lá.${said ? '' : ' Assim que finalizar, é só me avisar 😊'}`, 'system', false, { link: link.slug });
        patch.stage = 'pix';
        patch.accepted_offer = null;
        patch.deal_service = svc.slug;
        patch.deal_price = price;
        patch.steps = withSteps(patch.steps, 'price', 'pix');
        patch.next_step = 'Link de pagamento enviado. Aguardando o pagamento.';
        await logEvent(lead.id, 'link_sent', 'pay', `Link de pagamento de ${brl(price)}${monthly ? '/mês' : ''} enviado para ${lead.name}`, { slug: link.slug });
        // junto do link, o Pix copia e cola (quem não consegue usar o link paga direto no banco)
        if (!monthly) await enviarPixDireto(number, lead, svc, price, ctx.settings, true).catch((e) => logEvent(lead.id, 'pix_error', 'warn', `Pix direto não gerado para ${lead.name}: ${e?.message || e}`));
      } catch (e: any) {
        patch.needs_human = 'Cliente aceitou, mas o link de pagamento não foi gerado: ' + e.message;
        await logEvent(lead.id, 'link_error', 'warn', `Erro ao gerar link para ${lead.name}: ${e.message}`);
      }
    } else if (!doc && (await enviarPixDireto(number, lead, svc, price, ctx.settings).then(() => true, async (e) => { await logEvent(lead.id, 'pix_error', 'warn', `Pix direto não gerado para ${lead.name}: ${e?.message || e}`); return false; }))) {
      patch.stage = 'pix';
      patch.accepted_offer = null;
      patch.deal_service = svc.slug;
      patch.deal_price = price;
      patch.steps = withSteps(patch.steps, 'price', 'pix');
      patch.next_step = 'Pix copia e cola enviado. Aguardando o pagamento e o comprovante.';
    } else if (!doc) {
      patch.accepted_offer = { service_slug: svc.slug, price };
      patch.deal_service = svc.slug;
      patch.deal_price = price;
      patch.stage = 'negociando';
      patch.next_step = 'Cliente aceitou. Aguardando CPF ou CNPJ para gerar o Pix.';
      await logEvent(lead.id, 'accepted', 'acc', `${lead.name} aceitou ${svc.name} por ${brl(price)}. Falta o CPF/CNPJ`);
    } else {
      try {
        const customerId = await ensureCustomer({ id: lead.id, name: lead.name, cpf_cnpj: doc, whatsapp: lead.whatsapp, asaas_customer_id: lead.asaas_customer_id });
        patch.asaas_customer_id = customerId;
        const pix = await createPixCharge({ customerId, amount: price, description: `${svc.name} - ${lead.name}`, leadId: lead.id, hours: ctx.settings.pix.validity_hours });
        await db().from('payments').insert({ lead_id: lead.id, provider: 'asaas', provider_id: pix.id, service: svc.slug, amount: price, status: 'pendente', qr_code: pix.qr_code, ticket_url: pix.ticket_url, expires_at: pix.expires_at });
        const said = await sendMoment(number, lead, 'link_pagamento', ctx.settings);
        await sendAndRecord(number, lead, `Pix de ${brl(price)} (copia e cola) aqui embaixo:${said ? '' : ' assim que pagar, é só me avisar 😊'}`, 'system', false);
        await sendAndRecord(number, lead, pix.qr_code, 'system', false);
        patch.stage = 'pix';
        patch.accepted_offer = null;
        patch.deal_service = svc.slug;
        patch.deal_price = price;
        patch.steps = withSteps(patch.steps, 'price', 'pix');
        patch.next_step = 'Aguardando o pagamento do Pix.';
        await logEvent(lead.id, 'pix_created', 'pay', `Pix de ${brl(price)} gerado para ${lead.name}`, { service: svc.slug });
      } catch (e: any) {
        patch.needs_human = 'Cliente aceitou, mas o Pix não foi gerado: ' + e.message;
        await logEvent(lead.id, 'pix_error', 'warn', `Erro ao gerar Pix para ${lead.name}: ${e.message}`);
      }
    }
  }

  if (res.document && !cleanDocument(res.document) && !lead.cpf_cnpj) {
    await sendAndRecord(number, lead, 'Acho que esse número veio com algum dígito trocado. Pode conferir e me mandar de novo?', 'ai', ctx.settings.typing);
  }

  // 3) pediu para sair
  if (res.opt_out) {
    patch.opted_out = true;
    patch.stage = 'sem';
    patch.ai_enabled = false;
    if (lead.wa_key) await db().from('blocked_phones').upsert({ wa_key: lead.wa_key, reason: 'Pediu para não receber mensagens' });
    await logEvent(lead.id, 'opt_out', 'warn', `${lead.name} pediu para não receber mais mensagens`);
  }

  // 4) objeção registrada para aprendizado
  if (res.objection) {
    const key = norm(res.objection).slice(0, 80);
    const { data: ob } = await db().from('objections').select('*').eq('niche', lead.niche || NICHO_MAPA).eq('objection', key).maybeSingle();
    if (ob) await db().from('objections').update({ tries: ob.tries + 1, updated_at: now }).eq('id', ob.id);
    else await db().from('objections').insert({ niche: lead.niche || NICHO_MAPA, objection: key, tries: 1 });
  }

  // memória da conversa (o que já se sabe e o que já foi dito)
  if (res.memory && typeof res.memory === 'object') {
    const old = lead.memory && typeof lead.memory === 'object' ? lead.memory : {};
    const mem: any = { ...old };
    for (const [k, v] of Object.entries(res.memory)) {
      if (Array.isArray(v)) mem[k] = Array.from(new Set([...(Array.isArray(old[k]) ? old[k] : []), ...v.map(String)])).slice(-20);
      else if (v !== null && v !== undefined && String(v).trim()) mem[k] = (k === 'mapa_nome_completo' || k === 'mapa_nome_2' ? nomeProprio(String(v)) : String(v)).slice(0, 300);
    }
    lead.memory = mem;
    await db().from('leads').update({ memory: mem }).eq('id', lead.id).then(() => {}, () => {});
    const known: any = {};
    if (!lead.niche && mem.negocio) known.niche = patch.niche = String(mem.negocio).slice(0, 80).toLowerCase();
    if (!lead.city && mem.cidade) known.city = patch.city = String(mem.cidade).slice(0, 80);
    // homem ou mulher (pelo nome que a pessoa disse, base do IBGE, grátis): escolhe o modelo certo da prévia
    if (!lead.gender && (mem.nome_cliente || mem.genero_cliente)) {
      const g = await detectGender(lead).catch(() => null);
      if (g) {
        known.gender = g;
        lead.gender = g;
      }
    }
    if (Object.keys(known).length) await db().from('leads').update(known).eq('id', lead.id);
  }

  // INTENÇÃO E HUMOR do cliente nesta mensagem (aparece na conversa para a equipe)
  if (res.understanding?.client_meant) {
    const mi = { ...(lead.memory || {}), intencao: String(res.understanding.client_meant).slice(0, 300), intencoes: (res.understanding.intents || []).slice(0, 6), humor: res.understanding.mood || null };
    lead.memory = mi;
    await db().from('leads').update({ memory: mi }).eq('id', lead.id).then(() => {}, () => {});
  }

  // COMPROVANTE: chegou imagem/PDF enquanto o pagamento está pendente → equipe confere no Asaas
  if (lead.stage === 'pix' && ['image', 'document'].includes(String(lastIn?.kind || ''))) {
    patch.needs_human = patch.needs_human || `Comprovante recebido de ${lead.name}: confira no Asaas. Se o Pix caiu e o mapa não foi liberado sozinho, use "Marcar como pago".`;
    await logEvent(lead.id, 'comprovante', 'pay', `${lead.name} mandou o comprovante de pagamento`);
  }

  // CONSULTAR O MAPA: a IA avisou que vai olhar o mapa; a resposta de verdade volta em 2 a 4 min
  let consultaAte = 0;
  const temaConsulta = String(res.consultar_mapa || '').trim();
  if (temaConsulta && leitura?.ficha && !voltando && !entregar && podeConsultar(lead.memory) && parts.length) {
    consultaAte = Date.now() + tempoConsulta();
    const m3 = { ...(lead.memory || {}), consulta_pendente: { tema: temaConsulta.slice(0, 80), ate: consultaAte }, ultima_consulta: Date.now(), consultas: (Number(lead.memory?.consultas) || 0) + 1 };
    lead.memory = m3;
    await db().from('leads').update({ memory: m3 }).eq('id', lead.id).then(() => {}, () => {});
    await logEvent(lead.id, 'consulta_mapa', 'acc', `${lead.name}: consultando o mapa sobre "${temaConsulta}" (volta em ${Math.round((consultaAte - Date.now()) / 60000)} min)`);
  }

  // 5) prévia do mapa: só quando o cliente passou o nome completo e a data de nascimento
  const pv = ctx.settings.previews;
  // 5b) PRÉVIA: toda vez que a IA diz que vai mandar (preview_ok) ou ajustar (preview_update), a prévia é
  // gerada/atualizada DE VERDADE e o link é conferido antes de enviar. Prévia apagada ou antiga é recriada.
  // além das marcações da IA, o próprio sistema percebe quando a prévia foi prometida ou pedida
  const sinceLastOut = history
    .slice(history.map((m) => m.direction).lastIndexOf('out') + 1)
    .filter((m) => m.direction === 'in')
    .map((m) => String(m.transcript || m.body || ''))
    .join(' ');
  const forced = previewPromised(bubbles(res, 3).join(' ')) || previewRequested(sinceLastOut || String(lastIn?.transcript || lastIn?.body || ''));
  let wantsPreview = res.preview_ok === true || res.preview_update === true || forced || previewByUnderstanding(res, !!lead.preview_slug);
  // MAPA DA ALMA: a IA NÃO manda prévia/link do mapa na conversa. O atendimento é uma consulta ao vivo e o mapa
  // só vai depois do pagamento (ou pela equipe, no painel). Só se o próprio cliente pedir com todas as letras para "ver o mapa"
  // e a equipe tiver ligado "prévia sob pedido" em Configurações.
  // MODO CONVERSÃO: com nome completo e data em mãos, a prévia trancada sai logo no começo (desligável em previews.auto_apos_dados=false)
  const dadosOk = !!((lead.memory?.mapa_nome_completo || (res.memory as any)?.mapa_nome_completo) && (lead.memory?.mapa_nascimento || (res.memory as any)?.mapa_nascimento));
  if ((pv as any)?.auto_apos_dados !== false && dadosOk && !lead.preview_slug && lead.stage !== 'pago' && !lead.cortesia) wantsPreview = true;
  else if (!(pv as any)?.sob_pedido || !previewRequested(sinceLastOut || String(lastIn?.transcript || lastIn?.body || ''))) wantsPreview = false;
  // e nunca duas vezes: se já existe prévia enviada, não reenvia sozinho
  if (lead.preview_slug && !res.preview_update) wantsPreview = false;
  // TRAVA: prévia nunca sai por iniciativa da IA sem conversa de verdade. Só quando o cliente PEDIU com todas as letras,
  // ou quando ele já respondeu depois de uma mensagem nossa E a gente já sabe o ramo dele (mensagem pronta do anúncio não conta)
  if (wantsPreview && !lead.preview_slug) {
    const ins = history.filter((m) => m.direction === 'in');
    const talked = ins.some((m) => history.some((o) => o.direction === 'out' && o.author !== 'system' && o.created_at < m.created_at));
    // Mapa da Alma: só gera a prévia com o nome completo e a data de nascimento em mãos
    const knowsBiz = !!((lead.memory?.mapa_nome_completo || (res.memory as any)?.mapa_nome_completo) && (lead.memory?.mapa_nascimento || (res.memory as any)?.mapa_nascimento));
    const askedExplicit = previewRequested(sinceLastOut || String(lastIn?.transcript || lastIn?.body || '')) && !campaignOf(ctx.settings, sinceLastOut || String(lastIn?.body || ''));
    if (!askedExplicit && !(talked && knowsBiz)) {
      wantsPreview = false;
      await logEvent(lead.id, 'preview_blocked', 'acc', `Prévia do mapa não enviada para ${lead.name}: ${!talked ? 'o cliente ainda não conversou' : 'ainda faltam o nome completo e a data de nascimento'}`);
    }
  }
  const lastPv = Number(lead.memory?.previa_enviada_em || 0);
  const revisions = Number(lead.memory?.revisoes_previa || 0);
  const isUpdate = (res.preview_update === true || !!res.understanding?.promises?.includes('ajustar_previa') || !!res.understanding?.intents?.includes('quer_mudar_previa')) && !!lead.preview_slug;
  if (pv?.auto !== false && wantsPreview && !res.opt_out && !offer && patch.stage !== 'sem' && (isUpdate || Date.now() - lastPv > 20_000) && revisions < 25) {
    // o que o cliente pediu agora entra na prévia mesmo se a IA não anotou
    const ask = changeRequest(sinceLastOut);
    if (ask) {
      const cur = (await db().from('leads').select('memory').eq('id', lead.id).single()).data?.memory || lead.memory || {};
      const ped: string[] = Array.isArray(cur.pedidos_previa) ? cur.pedidos_previa : [];
      if (!ped.some((x) => similar(x, ask) > 0.8)) {
        const mem2 = { ...cur, pedidos_previa: [...ped, ask].slice(-20) };
        await db().from('leads').update({ memory: mem2 }).eq('id', lead.id).then(() => {}, () => {});
        lead.memory = mem2;
      }
    }
    const job = { isUpdate, custom: String(res.preview_message || '').replace(/https?:\/\/\S+/g, '').trim(), revisions };
    const delay = previewDelayMs(ctx.settings);
    if (delay > 0) {
      // a prévia sai depois de alguns minutos (parece trabalho feito com calma, não algo instantâneo)
      const pending = lead.preview_due_at && new Date(lead.preview_due_at).getTime() > Date.now();
      if (!pending) {
        patch.preview_due_at = new Date(Date.now() + delay).toISOString();
        patch.preview_job = job;
        // a IA não avisou nada: o cliente sabe que está sendo feito
        if (!parts.length) await sendAndRecord(number, lead, 'Show! Vou montar com carinho e em alguns minutinhos te mando aqui 😊', 'ai', ctx.settings.typing);
        await logEvent(lead.id, 'preview_scheduled', 'acc', `Prévia de ${lead.name} agendada para daqui a ${Math.round(delay / 1000)}s`);
      } else if (isUpdate || job.custom) {
        // já tem prévia a caminho: só atualiza o que vai junto (os pedidos novos já estão na memória)
        patch.preview_job = { ...(lead.preview_job || {}), ...job, isUpdate: isUpdate || !!lead.preview_job?.isUpdate };
      }
    } else {
      const r = await deliverPreview(number, lead, ctx.settings, job);
      if (r.ok) {
        patch.steps = withSteps(patch.steps, 'preview');
        patch.last_outbound_at = new Date().toISOString();
        if (r.memory) lead.memory = r.memory;
      } else patch.needs_human = r.needs_human;
    }
  }
  const said = parts.join(' ');
  if (/https?:\/\//.test(said) && ctx.examples?.some((x: any) => said.includes(x.example_url))) patch.example_sent = true;

  if (consultaAte && patch.ai_enabled !== false) patch.reply_due_at = new Date(consultaAte).toISOString();
  await db().from('leads').update(patch).eq('id', lead.id);
  // pedidos da IA nesta resposta: imagem da oferta, pirâmides escolhidas e simpatia (cada um no máximo uma vez)
  if (parts.length && !consultaAte && !res.opt_out) {
    if (res.enviar_apresentacao && !lead.memory?.apresentacao_em)
      await enviarApresentacao(number, lead).catch((e) => logEvent(lead.id, 'apresentacao_erro', 'warn', `Imagem de apresentação não enviada para ${lead.name}: ${e?.message || e}`));
    // seções do mapa comentadas nesta resposta: abrem completas na prévia do cliente
    if (Array.isArray(res.liberar_secoes) && res.liberar_secoes.length && (lead.mapa_slug || lead.preview_slug)) {
      const { IDS_SECAO } = await import('./mapa-alma/previa');
      const ja: string[] = Array.isArray(lead.memory?.secoes_liberadas) ? lead.memory.secoes_liberadas : [];
      const novas = res.liberar_secoes.map((x) => String(x)).filter((x) => IDS_SECAO.includes(x) && !ja.includes(x));
      if (novas.length) {
        const mem = { ...(lead.memory || {}), secoes_liberadas: [...ja, ...novas] };
        lead.memory = mem;
        await db().from('leads').update({ memory: mem }).eq('id', lead.id).then(() => {}, () => {});
        await logEvent(lead.id, 'secoes_liberadas', 'ai', `Prévia de ${lead.name}: seção(ões) aberta(s) por ter sido comentada: ${novas.join(', ')}`);
      }
    }
    const jaPir: string[] = Array.isArray(lead.memory?.piramides_enviadas) ? lead.memory.piramides_enviadas : [];
    const pir = (res.enviar_piramides || []).filter((x) => !jaPir.includes(x));
    if (pir.length && (lead.mapa_slug || lead.preview_slug))
      await enviarPiramides(number, lead, pir).catch((e) => logEvent(lead.id, 'piramides_erro', 'warn', `Pirâmides não enviadas para ${lead.name}: ${e?.message || e}`));
    // áudio pronto da biblioteca (nunca o mesmo duas vezes para o mesmo contato)
    if (res.enviar_audio) {
      const am = await import('./mapa-alma/audios');
      const a = await am.audioPorCodigo(res.enviar_audio).catch(() => null);
      if (a) await am.enviarAudioPronto(number, lead, a).then((ok) => ok && logEvent(lead.id, 'audio_pronto', 'ai', `IA mandou o áudio "${a.nome}" para ${lead.name}`)).catch((e) => logEvent(lead.id, 'audio_erro', 'warn', `Áudio "${a.nome}" não enviado para ${lead.name}: ${e?.message || e}`));
    }
    const jaSp: number[] = Array.isArray(lead.memory?.simpatias_enviadas) ? lead.memory.simpatias_enviadas : [];
    const cod = Number(String(res.enviar_simpatia || '').replace(/\D/g, ''));
    if (cod && !jaSp.includes(cod) && jaSp.length < 2)
      await enviarSimpatia(number, lead, cod).catch((e) => logEvent(lead.id, 'simpatia_erro', 'warn', `Simpatia não enviada para ${lead.name}: ${e?.message || e}`));
    // FECHAMENTO GRAZI: o ultimato saiu nesta resposta → guarda a hora (a IA não repete e o follow-up sabe)
    if (!lead.memory?.ultimato_em && /passar (a )?(sua|tua) vaga|vaga (pra|para) (a )?(pr[oó]xima|outra) pessoa/i.test(said)) {
      const mu = { ...(lead.memory || {}), ultimato_em: Date.now() };
      lead.memory = mu;
      await db().from('leads').update({ memory: mu }).eq('id', lead.id).then(() => {}, () => {});
      await logEvent(lead.id, 'ultimato', 'ai', `Fechamento Grazi: ${lead.name} recebeu o "última vaga de hoje"`);
    }
  }
  // gratuito/teste: entrega agora, depois de salvar a conversa (mapa completo ou tarô, como se tivesse pago)
  if (cortesiaServico) await markPaid(lead.id, 0, 'cortesia', null, cortesiaServico).catch((e) => logEvent(lead.id, 'cortesia_erro', 'warn', `Falha ao entregar (gratuito) para ${lead.name}: ${e?.message || e}`));
  if (patch.temperature - oldTemp >= 15) await logEvent(lead.id, 'temp_up', 'acc', `${lead.name} esquentou: temperatura ${oldTemp} → ${patch.temperature}`);
  if (patch.stage !== lead.stage) await logEvent(lead.id, 'stage', 'acc', `${lead.name} foi para "${patch.stage}"`);
  if (patch.needs_human && patch.needs_human !== lead.needs_human) await logEvent(lead.id, 'needs_human', 'warn', `${lead.name}: ${patch.needs_human}`);
}

/* ---------------- prévia agendada ---------------- */

/** Atraso da prévia (ms), sorteado entre o mínimo e o máximo das configurações (0 = na hora). */
export function previewDelayMs(settings: any) {
  const pv = settings?.previews || {};
  if (pv.delay_on === false) return 0;
  const a = Math.max(0, Number(pv.delay_min ?? 200));
  const b = Math.max(a, Number(pv.delay_max ?? 250));
  return Math.round((a + Math.random() * (b - a)) * 1000);
}

/** Gera (ou ajusta) a prévia, confere o link e manda para o cliente. Nunca manda link quebrado. */
export async function deliverPreview(number: any, lead: any, settings: any, job: { isUpdate?: boolean; custom?: string; revisions?: number }) {
  let p: any = null;
  let err = '';
  let memory: any = null;
  for (let tentativa = 0; tentativa < 2 && !p; tentativa++) {
    try {
      p = await generatePreview(lead.id);
    } catch (e: any) {
      err = String(e?.message || e);
    }
  }
  const revisions = Number(job.revisions ?? lead.memory?.revisoes_previa ?? 0);
  const isUpdate = !!job.isUpdate;
  if (p) {
    const fresh = (await db().from('leads').select('*').eq('id', lead.id).single()).data || lead;
    const custom = String(job.custom || '').trim();
    if (custom) {
      // mensagem escrita pela IA para esta conversa + o link conferido
      await sendAndRecord(number, fresh, `${custom}\n${p.url}`, 'ai', settings.typing, { preview: p.slug });
      await db().from('previews').update({ sent_at: new Date().toISOString() }).eq('slug', p.slug);
    } else if (isUpdate) await sendBubbles(number, fresh, [`Prontinho, refiz o seu mapa com os dados certinhos ✨👇\n${p.url}`, 'Agora sim! O que mais chamou a sua atenção?'], 'system', settings.typing, { preview: p.slug });
    else await sendPreviewLink(number, fresh, p, settings);
    const mem = { ...(fresh.memory || {}), previa_enviada_em: Date.now(), ...(isUpdate ? { revisoes_previa: revisions + 1 } : {}) };
    memory = mem;
    await db().from('leads').update({ memory: mem }).eq('id', lead.id).then(() => {}, () => {});
    // primeira prévia do site: alguns minutos depois vai a prévia do Link na bio com a oferta (Configurações › bio_upsell)
    const up = (settings as any).bio_upsell || {};
    if (!isUpdate && up.on !== false && !fresh.memory?.bio_ofertado) {
      const delay = Math.max(30, Number(up.delay_s) || 180) * 1000;
      await db().from('leads').update({ bio_due_at: new Date(Date.now() + delay).toISOString() }).eq('id', lead.id).then(() => {}, () => {});
    }
    await logEvent(lead.id, 'preview_sent', 'acc', isUpdate ? `Prévia do mapa refeita e reenviada para ${lead.name}` : `Prévia do mapa enviada para ${lead.name}`, { slug: p.slug });
  } else {
    // não deu para gerar: avisa o cliente com calma e chama a equipe (nunca manda link quebrado)
    await sendAndRecord(number, lead, /faltam o nome/i.test(err) ? 'Pra montar o seu mapa certinho, me confirma o seu nome completo de nascimento e a sua data de nascimento? 🙂' : 'Tô finalizando a prévia do seu mapa aqui, já já te mando o link 🙏', 'ai', settings.typing);
    await logEvent(lead.id, 'preview_error', 'warn', `Não consegui gerar a prévia do mapa de ${lead.name}: ${err}`);
  }
  return {
    ok: !!p,
    memory,
    needs_human: p || /faltam o nome/i.test(err) ? null : 'URGENTE: a prévia do mapa não foi gerada (' + err.slice(0, 150) + '). Gere em Gerador de mapas e envie pela lista.',
  };
}

/** Manda as prévias agendadas que já deram a hora (robô e reserva do painel chamam a cada poucos segundos). */
export async function processPreviewJobs(limit = 2) {
  const now = new Date().toISOString();
  const { data: due } = await db().from('leads').select('*').lte('preview_due_at', now).order('preview_due_at').limit(limit);
  for (const lead of due || []) {
    // pega o trabalho (só um processo manda)
    const { data: claimed } = await db().from('leads').update({ preview_due_at: null }).eq('id', lead.id).eq('preview_due_at', lead.preview_due_at).select('id');
    if (!claimed?.length) continue;
    try {
      if (lead.opted_out || lead.ai_locked || lead.stage === 'sem') continue;
      const number = await connectedNumber(lead.number_id);
      if (!number) {
        // número da conversa desconectado: tenta de novo em 1 minuto
        await db().from('leads').update({ preview_due_at: new Date(Date.now() + 60_000).toISOString() }).eq('id', lead.id);
        continue;
      }
      const settings = await getSettings(db());
      const r = await deliverPreview(number, lead, settings, lead.preview_job || {});
      const upd: any = { preview_job: null };
      if (r.ok) {
        upd.steps = withSteps(lead.steps, 'preview');
        upd.last_outbound_at = new Date().toISOString();
      } else upd.needs_human = r.needs_human;
      await db().from('leads').update(upd).eq('id', lead.id);
    } catch (e: any) {
      await db().from('leads').update({ preview_due_at: new Date(Date.now() + 60_000).toISOString() }).eq('id', lead.id);
      await logEvent(lead.id, 'preview_error', 'warn', `Erro ao mandar a prévia agendada de ${lead.name}: ${e?.message || e}`);
    }
  }
}

/* ---------------- mensagens recebidas ---------------- */

export function extractText(msg: any): { kind: string; text: string | null } {
  if (!msg) return { kind: 'text', text: null };
  if (msg.conversation) return { kind: 'text', text: msg.conversation };
  if (msg.extendedTextMessage?.text) return { kind: 'text', text: msg.extendedTextMessage.text };
  if (msg.audioMessage) return { kind: 'audio', text: null };
  if (msg.imageMessage) return { kind: 'image', text: msg.imageMessage.caption || '[imagem]' };
  if (msg.videoMessage) return { kind: 'video', text: msg.videoMessage.caption || '[vídeo]' };
  if (msg.documentMessage) return { kind: 'document', text: '[documento] ' + (msg.documentMessage.fileName || '') };
  if (msg.documentWithCaptionMessage?.message?.documentMessage) {
    const d = msg.documentWithCaptionMessage.message.documentMessage;
    return { kind: 'document', text: '[documento] ' + (d.fileName || '') + (d.caption ? ' — ' + d.caption : '') };
  }
  if (msg.stickerMessage) return { kind: 'sticker', text: '[figurinha]' };
  if (msg.reactionMessage) return { kind: 'reaction', text: null };
  if (msg.buttonsResponseMessage?.selectedDisplayText) return { kind: 'text', text: msg.buttonsResponseMessage.selectedDisplayText };
  if (msg.listResponseMessage?.title) return { kind: 'text', text: msg.listResponseMessage.title };
  return { kind: 'other', text: null };
}

/** Dados do negócio que valem para qualquer conversa da mesma pessoa (não a conversa em si). */
const PROFILE_FIELDS = ['niche', 'city', 'address', 'lat', 'lng', 'instagram', 'website', 'site_status', 'site_reasons', 'rating', 'reviews', 'photos', 'maps_url', 'phone'];

/**
 * Conversa deste contato NESTE número de WhatsApp. O mesmo cliente pode falar com dois números:
 * cada número tem a sua conversa (histórico, IA, etapa e voz separados), ligadas por related_lead_id.
 * - já existe conversa neste número → ela
 * - contato prospectado que ainda não falou com nenhum número → passa a ser deste número
 * - já fala com OUTRO número → cria uma conversa nova aqui (atendimento do zero), copiando só os dados do negócio
 */
export async function leadForNumber(k: string | null, numberId: string, create?: Record<string, any>) {
  if (!k) return { lead: null as any, sibling: null as any };
  const { data: rows } = await db().from('leads').select('*').eq('wa_key', k).order('updated_at', { ascending: false }).limit(20);
  const list = rows || [];
  const same = list.find((r: any) => r.number_id === numberId);
  if (same) return { lead: same, sibling: list.find((r: any) => r.id !== same.id) || null };
  const free = list.find((r: any) => !r.number_id);
  if (free) {
    const { data: upd } = await db().from('leads').update({ number_id: numberId }).eq('id', free.id).select('*').single();
    return { lead: upd || { ...free, number_id: numberId }, sibling: list.find((r: any) => r.id !== free.id) || null };
  }
  const sibling = list[0] || null;
  if (!create) return { lead: null, sibling };
  // país e idioma pelo DDI JÁ NA CRIAÇÃO (mesmo com a IA desligada): +55 = português; qualquer outro DDI = espanhol
  if (create.whatsapp && !create.pais) {
    try {
      const { paisesCfg, ddiDoNumero } = await import('./internacional');
      const info = ddiDoNumero(String(create.whatsapp), await paisesCfg());
      create = { ...create, pais: info.brasil ? 'BR' : info.pais?.codigo || null, idioma: info.brasil ? 'pt' : 'es' };
    } catch {}
  }
  const profile: any = {};
  if (sibling) for (const f of PROFILE_FIELDS) if (sibling[f] !== null && sibling[f] !== undefined) profile[f] = sibling[f];
  let { data: created, error: insErr } = await db()
    .from('leads')
    .insert({ ...profile, ...create, wa_key: k, number_id: numberId, related_lead_id: sibling?.id || null })
    .select('*')
    .single();
  // banco sem a coluna nova ainda (migração pendente): cria sem ela para nunca perder a mensagem
  if (insErr && ('saved_contact' in create || 'pais' in create || 'idioma' in create)) {
    const { saved_contact: _s, ...rest } = create as any;
    ({ data: created } = await db().from('leads').insert({ ...profile, ...rest, wa_key: k, number_id: numberId, related_lead_id: sibling?.id || null }).select('*').single());
  }
  if (created && sibling && !sibling.related_lead_id) await db().from('leads').update({ related_lead_id: created.id }).eq('id', sibling.id).then(() => {}, () => {});
  return { lead: created, sibling };
}

/** O número está salvo na agenda do celular deste chip? (Evolution v2: isSaved). Na dúvida, false. */
export async function isSavedContact(instance: string, jid: string) {
  try {
    const r: any = await evo.findContacts(instance, jid);
    const list: any[] = Array.isArray(r) ? r : Array.isArray(r?.contacts) ? r.contacts : r ? [r] : [];
    // só conta se a Evolution devolveu ESTE número (antes pegava o primeiro da lista e marcava gente que não está salva)
    const digits = jid.split('@')[0].replace(/\D/g, '');
    const c = list.find((x: any) => String(x?.remoteJid || x?.id || '').split('@')[0].replace(/\D/g, '') === digits);
    if (!c) return false;
    return c.isSaved === true || c.isMyContact === true || c.isContact === true;
  } catch {
    return false;
  }
}

/**
 * Corrige conversas marcadas como "Contato salvo" por engano (versão antiga da checagem):
 * se o número não está salvo no celular do chip, a IA volta a atender. Não mexe em quem a equipe já assumiu.
 */
export async function recheckSavedContacts() {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const st: any = await getSettings(db());
  const bloquear = st.bloquear_contatos_salvos === true;
  const { data: rows } = await db().from('leads').select('id,whatsapp,number_id,ai_locked,name').eq('saved_contact', true).eq('ai_enabled', false).gte('created_at', since).limit(300);
  let fixed = 0;
  for (const l of rows || []) {
    if (l.ai_locked || !l.whatsapp) continue;
    const { count } = await db().from('messages').select('id', { count: 'exact', head: true }).eq('lead_id', l.id).eq('direction', 'out').eq('author', 'human');
    if (count) continue; // a equipe já conversou: deixa como está
    if (bloquear) {
      if (!l.number_id) continue;
      const { data: n } = await db().from('whatsapp_numbers').select('instance_name').eq('id', l.number_id).maybeSingle();
      if (!n) continue;
      const saved = await isSavedContact(n.instance_name, `${String(l.whatsapp).replace(/\D/g, '')}@s.whatsapp.net`);
      if (saved) continue;
    }
    // se o cliente está esperando resposta, devolve já à fila
    const { data: last } = await db().from('messages').select('direction').eq('lead_id', l.id).order('created_at', { ascending: false }).limit(1);
    await db().from('leads').update({ saved_contact: false, ai_enabled: true, next_step: 'Entender o que a pessoa procura.', reply_due_at: last?.[0]?.direction === 'in' ? new Date().toISOString() : null }).eq('id', l.id);
    await logEvent(l.id, 'saved_contact', 'ai', `${l.name}: a IA atende todos os contatos, então voltou a atender esta conversa`);
    fixed++;
  }
  return fixed;
}

/** Corrige país/idioma de conversas criadas sem DDI resolvido (ex.: IA desligada na chegada). Não mexe em idioma fixado pela equipe. */
export async function corrigirIdiomaPais() {
  const { paisesCfg, ddiDoNumero } = await import('./internacional');
  const paises = await paisesCfg();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: rows } = await db().from('leads').select('id,whatsapp,idioma,pais,memory,campanha_id,stage').gte('created_at', since).limit(1000);
  let n = 0;
  for (const l of rows || []) {
    if (!l.whatsapp || l.memory?.idioma_fixo) continue;
    const info = ddiDoNumero(String(l.whatsapp), paises);
    const pais = info.brasil ? 'BR' : info.pais?.codigo || null;
    const idioma = l.campanha_id ? l.idioma : info.brasil ? 'pt' : 'es'; // campanha com idioma próprio manda no idioma
    if (l.idioma === idioma && (l.pais || null) === pais) continue;
    if (!info.brasil && l.idioma === 'es' && l.pais) continue; // país já cadastrado por outro caminho
    await db().from('leads').update({ idioma, pais }).eq('id', l.id).then(() => {}, () => {});
    await logEvent(l.id, 'idioma_corrigido', 'ai', `País/idioma corrigidos pelo DDI do número: ${pais || 'outro'} · ${idioma === 'es' ? 'espanhol' : 'português'}`).catch(() => {});
    n++;
  }
  return n;
}

/** Quanto tempo a IA espera, no máximo, enquanto o cliente aparece "digitando…". */
const TYPING_HOLD_MS = 30_000;

/**
 * "digitando…" do cliente (evento PRESENCE_UPDATE da Evolution). Enquanto ele digita, a resposta
 * fica segurada; quando ele para, a IA espera uns segundos para a mensagem chegar e lê tudo de uma vez.
 * Não chama a IA: só ajusta horários no banco (custo zero).
 */
export async function handlePresence(instance: string, data: any) {
  const jid = String(data?.id || '');
  if (!jid || jid.endsWith('@g.us') || jid.endsWith('@lid')) return;
  const pres = data?.presences || {};
  const first: any = pres[jid] || Object.values(pres)[0] || {};
  const state = String(first.lastKnownPresence || first.presence || '').toLowerCase();
  if (!state) return;
  const k = waKey(jid);
  if (!k) return;
  const { data: num } = await db().from('whatsapp_numbers').select('id').eq('instance_name', instance).maybeSingle();
  let q = db().from('leads').select('id,reply_due_at,typing_until,ai_enabled').eq('wa_key', k);
  if (num?.id) q = q.eq('number_id', num.id);
  const { data: found } = await q.order('updated_at', { ascending: false }).limit(1);
  const lead = found?.[0];
  if (!lead || !lead.ai_enabled) return;
  const now = Date.now();
  if (state === 'composing' || state === 'recording') {
    await db().from('leads').update({ typing_until: new Date(now + TYPING_HOLD_MS).toISOString() }).eq('id', lead.id);
  } else if (lead.typing_until) {
    // parou de digitar: dá um respiro para a mensagem chegar antes de responder
    const patch: any = { typing_until: null };
    if (lead.reply_due_at && new Date(lead.reply_due_at).getTime() < now + 6000) patch.reply_due_at = new Date(now + 6000).toISOString();
    await db().from('leads').update(patch).eq('id', lead.id);
  }
}

/** Mensagem que parece "pela metade" (o cliente costuma mandar o resto logo em seguida). */
export function looksUnfinished(text: string) {
  const t = String(text || '').trim();
  if (!t) return false;
  // saudação sozinha ("oi", "boa tarde!") quase sempre vem seguida do assunto
  if (/^(oi+|ol[aá]|opa|e a[ií]|bom dia|boa tarde|boa noite|tudo bem|td bem|tudo bom)[\s!.,?]*$/i.test(t)) return true;
  if (/[?!]$/.test(t)) return false;
  if (/(,|\.\.\.|…|:|\b(e|mas|que|tipo|porque|pq|então|entao|aí|ai|daí|dai|ou)$)/i.test(t)) return true;
  return false;
}

export async function handleIncoming(instance: string, data: any) {
  const key = data?.key || {};
  const raw: string = key.remoteJid || '';
  // grupos, status e canais: NUNCA responde (nem registra)
  if (!raw || raw.endsWith('@g.us') || raw.endsWith('@broadcast') || raw === 'status@broadcast' || raw.endsWith('@newsletter') || String(key.participant || '').length > 0 && raw.includes('@g.us')) return;
  if (data?.isGroup === true || String(data?.messageType || '').toLowerCase().includes('group')) return;
  // contatos com código interno (@lid): usa o número de verdade quando vier junto
  const jid: string = phoneJid(key, data) || raw;
  if (jid.endsWith('@lid')) {
    console.warn('mensagem de contato sem número visível (@lid), ignorada:', raw);
    await logEvent(null, 'wa_lid', 'warn', `Chegou mensagem de ${data?.pushName || 'um contato'} com o número oculto pelo WhatsApp; atualize a Evolution API para a versão mais nova.`);
    return;
  }
  const { data: number } = await db().from('whatsapp_numbers').select('*').eq('instance_name', instance).maybeSingle();
  if (!number) return;
  const wa_id = key.id as string;
  if (wa_id) {
    const { data: dup } = await db().from('messages').select('id').eq('wa_message_id', wa_id).maybeSingle();
    if (dup) return;
  }
  const k = waKey(jid);
  const digits = jid.split('@')[0].replace(/\D/g, '');
  const tsRaw = Number(data?.messageTimestamp?.low ?? data?.messageTimestamp ?? 0);
  const sentAt = tsRaw ? new Date(tsRaw > 1e12 ? tsRaw : tsRaw * 1000).toISOString() : new Date().toISOString();
  const { kind, text } = extractText(data.message);
  if (kind === 'reaction' || (kind === 'other' && !text)) return;

  // administradores pelo WhatsApp (recurso ligado no painel): responde com relatório, sem IA e sem criar conversa
  if (await import('./admin-wa').then((m) => m.tratarAdmin(number, k, digits, text || '', !!key.fromMe)).catch(() => false)) return;

  // encontra a conversa deste contato NESTE número (cada número tem a sua)
  let lead: any = (await leadForNumber(k, number.id)).lead;

  if (key.fromMe) {
    // pode ser a própria mensagem que a IA acabou de mandar: espera o registro do envio e confere de novo
    if (wa_id) {
      if (sentByUs.has(wa_id)) return;
      await new Promise((r) => setTimeout(r, 8000));
      if (sentByUs.has(wa_id)) return;
      const { data: mine } = await db().from('messages').select('id').eq('wa_message_id', wa_id).maybeSingle();
      if (mine) return;
    }
    // mídia (áudio, imagem, PDF) que o próprio sistema acabou de mandar nesta conversa: é eco, não é a equipe
    if (lead && !text && (await import('./mapa-alma/midia')).midiaEmEnvio(lead.id)) return;
    if (lead && !text) {
      const { data: rec } = await db().from('messages').select('id').eq('lead_id', lead.id).eq('direction', 'out').neq('author', 'human').eq('kind', kind).gte('created_at', new Date(Date.now() - 5 * 60_000).toISOString()).limit(1);
      if (rec?.length) return;
    }
    // mesma frase enviada pelo sistema nas últimas horas (o registro pode ter outro id): não é da equipe
    if (lead && text) {
      const { data: same } = await db()
        .from('messages')
        .select('id')
        .eq('lead_id', lead.id)
        .eq('direction', 'out')
        .eq('body', text)
        .gte('created_at', new Date(Date.now() - 3 * 3600_000).toISOString())
        .limit(1);
      if (same?.length) return;
    }
    // mensagem enviada direto pelo celular por alguém da equipe (contato novo vira conversa da equipe, com a IA desligada)
    if (!lead) {
      lead = (await leadForNumber(k, number.id, { name: digits, source: 'whatsapp', whatsapp: digits, stage: 'abordado', wa_status: 'enviado', ai_enabled: false, summary: 'Conversa iniciada pela equipe direto no celular.', next_step: 'Equipe atendendo.' })).lead;
      if (!lead) return;
    }
    await db().from('messages').insert({ lead_id: lead.id, number_id: number.id, direction: 'out', author: 'human', kind, body: text || '[mídia]', wa_message_id: wa_id, created_at: sentAt });
    const st: any = await getSettings(db());
    const takeover = st.pause_ai_on_human !== false && lead.ai_enabled;
    // alguém da equipe respondeu pelo celular: a IA sai desta conversa para não atropelar (volta com "Devolver para a IA")
    await db()
      .from('leads')
      .update({ last_outbound_at: new Date().toISOString(), ...(takeover ? { ai_enabled: false, reply_due_at: null } : {}) })
      .eq('id', lead.id);
    if (takeover) await logEvent(lead.id, 'ai_toggle', 'acc', `A equipe respondeu ${lead.name} pelo celular: a IA pausou nesta conversa`);
    return;
  }

  if (!lead) {
    // REGRA DO DONO: a IA atende TODOS, automático. Só bloqueia contato salvo se o Master ligar "bloquear_contatos_salvos" no Painel rápido.
    const st0: any = await getSettings(db());
    const saved = st0.bloquear_contatos_salvos === true ? await isSavedContact(instance, jid) : false;
    const r = await leadForNumber(k, number.id, {
      name: data.pushName || digits,
      source: 'whatsapp',
      whatsapp: digits,
      stage: 'respondeu',
      wa_status: 'conversa',
      temperature: 30,
      steps: ['talk'],
      summary: 'Contato chegou direto pelo WhatsApp.',
      ...(saved
        ? { ai_enabled: false, saved_contact: true, next_step: 'Contato salvo no celular: a IA não atende. Para a IA atender, clique em "Ativar IA" na conversa.' }
        : { next_step: 'Entender o que a pessoa procura.' }),
    });
    lead = r.lead;
    if (!lead) return;
    if (saved) await logEvent(lead.id, 'saved_contact', 'acc', `${lead.name} está salvo nos contatos do ${number.label}: a IA ficou desligada nesta conversa`);
    await logEvent(
      lead.id,
      'inbound_new',
      'wa',
      r.sibling ? `${lead.name} chamou também no número ${number.label} (já conversa por outro número): atendimento novo e separado neste número` : `Novo contato chegou pelo WhatsApp: ${lead.name} (${number.label})`,
    );
  }

  let body = text;
  let transcriptText: string | null = null;
  // mídia (foto, áudio, vídeo, PDF, figurinha): baixa uma vez e guarda uma cópia para a equipe ver/ouvir no painel (sem IA, sem crédito)
  const isMedia = ['audio', 'image', 'video', 'document', 'sticker'].includes(kind);
  let b64: string | null = isMedia ? data.message?.base64 || data.base64 || null : null;
  if (isMedia && !b64 && wa_id) {
    try {
      const m: any = await evo.media(instance, wa_id, raw, false);
      b64 = m?.base64 || null;
    } catch {
      /* sem mídia */
    }
  }
  if (kind === 'audio') {
    transcriptText = b64 ? await transcribe(b64, data.message?.audioMessage?.mimetype || 'audio/ogg', lead?.idioma === 'es' ? 'es' : 'pt') : null;
    body = transcriptText ? '🎤 ' + transcriptText : '🎤 Áudio';
    const secs = data.message?.audioMessage?.seconds;
    await logEvent(lead.id, 'audio', 'ai', `Áudio${secs ? ' de ' + secs + 's' : ''} de ${lead.name} ${transcriptText ? 'transcrito' : 'recebido (sem transcrição)'}`);
  }

  // arquivo do cliente: guarda tipo e nome original (o backup no Drive usa)
  const mm = data.message || {};
  const mediaObj = mm.imageMessage || mm.videoMessage || mm.documentMessage || mm.documentWithCaptionMessage?.message?.documentMessage || mm.audioMessage || null;
  let inMeta: any = mediaObj ? { mime: mediaObj.mimetype || null, file: mediaObj.fileName || null } : null;
  const stickerObj = mm.stickerMessage || null;
  if (b64 && (mediaObj || stickerObj)) {
    try {
      const mime = String((mediaObj || stickerObj).mimetype || (kind === 'audio' ? 'audio/ogg' : kind === 'image' ? 'image/jpeg' : 'application/octet-stream')).split(';')[0];
      const buf = Buffer.from(String(b64).replace(/^data:[^,]+,/, ''), 'base64');
      if (buf.length <= 16 * 1024 * 1024) {
        const ext = (mime.split('/')[1] || 'bin').replace('jpeg', 'jpg').replace('mpeg', 'mp3').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'bin';
        const path = `chat/${lead.id}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const up = await db().storage.from('publico').upload(path, buf, { contentType: mime, cacheControl: '31536000' });
        if (!up.error) inMeta = { ...(inMeta || {}), mime, url: db().storage.from('publico').getPublicUrl(path).data.publicUrl, size: buf.length };
      }
    } catch {
      /* fica só o aviso de mídia */
    }
  }
  // o cliente respondeu (citou) uma mensagem específica: guarda qual, para mostrar no balão
  const ctxInfo = mm.extendedTextMessage?.contextInfo || mediaObj?.contextInfo || null;
  if (ctxInfo?.stanzaId) {
    const { data: qm } = await db().from('messages').select('id,body,direction').eq('wa_message_id', ctxInfo.stanzaId).maybeSingle();
    const qb = qm?.body || ctxInfo.quotedMessage?.conversation || ctxInfo.quotedMessage?.extendedTextMessage?.text || ctxInfo.quotedMessage?.imageMessage?.caption || '';
    inMeta = { ...(inMeta || {}), quoted: { id: qm?.id || null, wa_id: ctxInfo.stanzaId, body: String(qb).slice(0, 300), dir: qm?.direction || (ctxInfo.participant ? 'in' : 'out') } };
  }
  const { error: insErr } = await db().from('messages').insert({ lead_id: lead.id, number_id: number.id, direction: 'in', author: 'lead', kind, body, transcript: transcriptText, wa_message_id: wa_id, created_at: sentAt, ...(inMeta ? { meta: inMeta } : {}) });
  // anúncio "Click-to-WhatsApp": guarda o ID do anúncio e o clique (ctwa_clid) quando o WhatsApp entrega, para atribuir e devolver a compra ao Meta
  try {
    const cx = (data as any).contextInfo || mm.extendedTextMessage?.contextInfo || mm.conversation?.contextInfo || mediaObj?.contextInfo || null;
    const ad = cx?.externalAdReply || null;
    const clid = ad?.ctwaClid || cx?.ctwaClid || (data as any)?.ctwaClid || null;
    if ((ad || clid) && !lead.memory?.ads) {
      lead.memory = { ...(lead.memory || {}), ads: { ad_id: ad?.sourceId || null, tipo: ad?.sourceType || null, url: ad?.sourceUrl || null, titulo: ad?.title || null, ctwa_clid: clid } };
      await db().from('leads').update({ memory: lead.memory, ...(lead.source === 'whatsapp' && (ad?.sourceType === 'ad' || clid) ? { source: 'anuncio' } : {}) }).eq('id', lead.id).then(() => {}, () => {});
    }
  } catch {}
  // veio do teste gratuito do site? (código "Ref: XXXXXX" na mensagem, ou clique recente no botão do WhatsApp)
  if (!insErr && kind === 'text' && !lead.memory?.site) {
    try {
      const so = await import('./site-origem');
      let provavel = false;
      if (!so.refDoTexto(String(body || ''))) {
        const { count: n0 } = await db().from('messages').select('id', { count: 'exact', head: true }).eq('lead_id', lead.id).eq('direction', 'in');
        provavel = (n0 || 0) <= 1 && !lead.campaign && lead.source === 'whatsapp';
      }
      await so.atribuirSite(lead, { texto: String(body || ''), provavel });
    } catch (e) { console.error('[site-origem]', e); }
  }
  // e-mail escrito pelo cliente na conversa: guarda no cadastro e leva ao Meta (qualidade da correspondência)
  if (!insErr && kind === 'text') {
    const meta = await import('./meta-capi');
    const em = meta.emailDoTexto(String(body || ''));
    if (em && em !== meta.emailDoLead(lead)) {
      await meta.salvarCliente(lead.id, { email: em, fonte: 'conversa' });
      lead.memory = { ...(lead.memory || {}), cliente: { ...(lead.memory?.cliente || {}), email: em } };
      await logEvent(lead.id, 'email_cadastrado', 'ok', `${lead.name} informou o e-mail na conversa e ele foi cadastrado (${em}).`);
      if (lead.stage === 'pago') meta.enviarCompraDoLead(lead.id).catch(() => {});
    }
  }
  // origem: a 1ª mensagem é o texto pronto de um anúncio? marca a campanha (para medir quanto cada uma vende)
  if (!insErr && lead.source === 'whatsapp' && !lead.campaign && kind === 'text') {
    const { count: nIn } = await db().from('messages').select('id', { count: 'exact', head: true }).eq('lead_id', lead.id).eq('direction', 'in');
    // menu Campanhas: a mensagem bate com alguma campanha cadastrada?
    const cmp = (nIn || 0) <= 2 ? await import('./mapa-alma/campanhas').then((m) => m.campanhaDaMensagem(String(body || '')).then((c) => (c ? { c, src: m.sourceDaOrigem(c.origem) } : null))).catch(() => null) : null;
    if (cmp) {
      await db().from('leads').update({ source: cmp.src, campaign: cmp.c.nome, campanha_id: cmp.c.id }).eq('id', lead.id).then(() => {}, () => {});
      lead.source = cmp.src;
      lead.campaign = cmp.c.nome;
      lead.campanha_id = cmp.c.id;
      await logEvent(lead.id, 'campaign', 'acc', `${lead.name} chegou pela campanha "${cmp.c.nome}"`);
      import('./meta-capi').then((m) => m.enviarEvento(lead.id, 'Contact')).catch(() => {});
    } else if ((nIn || 0) <= 2) {
      const camp = campaignOf(await getSettings(db()), String(body || ''));
      if (camp) {
        await db().from('leads').update({ source: 'anuncio', campaign: camp.name }).eq('id', lead.id).then(() => {}, () => {});
        lead.source = 'anuncio';
        lead.campaign = camp.name;
        await logEvent(lead.id, 'campaign', 'acc', `${lead.name} chegou pelo anúncio "${camp.name}"`);
      }
    }
  }
  // conversa arquivada volta para a lista quando o cliente escreve (como no WhatsApp)
  if (lead.archived_at) await db().from('leads').update({ archived_at: null }).eq('id', lead.id).then(() => {}, () => {});
  if (insErr) {
    if (/duplicate|unique/i.test(insErr.message)) return; // já registrada (chegou pelo webhook e pela conferência ao mesmo tempo)
    throw new Error('Não consegui salvar a mensagem recebida: ' + insErr.message);
  }
  // bolinha vermelha em Conversas: mensagem do cliente que a equipe ainda não viu
  await db().from('leads').update({ team_unread: (Number(lead.team_unread) || 0) + 1 }).eq('id', lead.id).then(() => {}, () => {});

  const settings = await getSettings(db());
  const firstReply = !lead.last_inbound_at;
  let delay = rand(settings.reply_delay.min, settings.reply_delay.max) * 1000;
  // FORA DO HORÁRIO DE ATENDIMENTO: a IA não responde agora. Responde no próximo horário COMERCIAL, num minuto aleatório
  // (nunca cedo demais). Se o cliente escrever de novo dentro do horário de atendimento, a resposta volta a ser na hora.
  const offHours = !inService(settings);
  if (offHours && lead.ai_enabled && !lead.opted_out && !lead.ai_locked) {
    const start = nextCommercialStart(settings);
    delay = Math.max(delay, start.getTime() - Date.now() + rand(4, 55) * 60_000);
    // aviso automático (Configurações › Fora do horário), uma vez por noite
    const ah = (settings as any).after_hours || {};
    const lastAh = lead.memory?.aviso_fora_horario ? new Date(lead.memory.aviso_fora_horario).getTime() : 0;
    if (ah.on !== false && String(ah.text || '').trim() && Date.now() - lastAh > 10 * 3600_000 && kind !== 'reaction') {
      const h: any = (settings as any).hours || {};
      const txt = String(ah.text).replace(/\{inicio\}/g, h.start || '').replace(/\{fim\}/g, h.end || '').replace(/\{empresa\}/g, (settings as any).company_name || '');
      await sendAndRecord(number, lead, txt, 'system', true, { after_hours: true }).catch(() => {});
      await db().from('leads').update({ memory: { ...(lead.memory || {}), aviso_fora_horario: new Date().toISOString() } }).eq('id', lead.id).then(() => {}, () => {});
    }
  }
  // dá tempo do cliente ler e terminar de escrever: nunca responde colado na resposta anterior
  const sinceOut = lead.last_outbound_at ? Date.now() - new Date(lead.last_outbound_at).getTime() : Infinity;
  const gap = (Number((settings as any).turn_gap) || 25) * 1000;
  if (sinceOut < gap) delay = Math.max(delay, gap - sinceOut + rand(3, 8) * 1000);
  // quem já comprou e continua conversando: a resposta vai demorando mais a cada mensagem (atendimento "corrido")
  if (lead.stage === 'pago') delay += esperaPosVenda((await mensagensPosVenda(lead)) + 1) * 1000;
  // mensagem pela metade: espera um pouco mais pelo resto (zero custo de IA)
  if (looksUnfinished(body)) delay += 15_000;
  // passa a receber o "digitando…" deste cliente (a Evolution assina a presença dele)
  if (lead.ai_enabled && !lead.opted_out) evo.presence(number.instance_name, lead.whatsapp || digits, 'paused', 300).catch(() => {});
  const patch: any = {
    typing_until: null,
    last_inbound_at: new Date().toISOString(),
    wa_status: 'conversa',
    number_id: lead.number_id || number.id,
    steps: withSteps(lead.steps, 'talk'),
    reply_due_at: lead.ai_enabled && !lead.opted_out ? new Date(Date.now() + delay).toISOString() : null,
    followups_sent: 0,
  };
  if (['novo', 'abordado'].includes(lead.stage)) patch.stage = 'respondeu';
  if (lead.stage === 'remarketing') patch.stage = 'respondeu';
  if (!lead.temperature || lead.temperature < 20) patch.temperature = 25;
  const { error: upErr } = await db().from('leads').update(patch).eq('id', lead.id);
  if (lead.production_status && ['image', 'video', 'document', 'audio', 'text'].includes(kind)) await db().from('leads').update({ doc_dirty: true }).eq('id', lead.id).then(() => {}, () => {});
  if (upErr && /typing_until/.test(upErr.message)) {
    // migração 014 ainda não rodada: segue sem o "digitando"
    delete patch.typing_until;
    await db().from('leads').update(patch).eq('id', lead.id);
  }
  if (firstReply) {
    await bumpApproach(lead.approach_slug, 'replies');
    await logEvent(lead.id, 'wa_reply', 'wa', `${lead.name} respondeu no WhatsApp`);
  }
}

/* ---------------- pagamento e aprendizado ---------------- */

const now0 = () => new Date().toISOString();
export async function markPaid(leadId: string, amount: number | null, source: string, paymentId?: string | null, servico?: string | null) {
  const { data: lead } = await db().from('leads').select('*').eq('id', leadId).maybeSingle();
  if (!lead) return;
  // qual produto foi pago: o da cobrança, o informado ou o negociado na conversa
  let svcSlug = servico || null;
  if (!svcSlug && paymentId) svcSlug = (await db().from('payments').select('service').eq('id', paymentId).maybeSingle()).data?.service || null;
  if (!svcSlug) svcSlug = lead.deal_service || null;
  const taro = /^taro/.test(String(svcSlug || ''));
  const cortesia = source === 'cortesia';
  // UPGRADE: já tinha o mapa simples e comprou o completo → libera as pirâmides no mesmo link
  if (lead.stage === 'pago' && svcSlug === 'mapa-completo') {
    const slug0 = lead.mapa_slug || lead.preview_slug;
    const { data: m0 } = slug0 ? await db().from('mapas').select('*').eq('slug', slug0).maybeSingle() : { data: null as any };
    if (m0 && m0.versao === 'simples') {
      await db().from('mapas').update({ versao: 'completa', pdf_path: null }).eq('id', m0.id);
      if (!paymentId) await db().from('payments').insert({ lead_id: leadId, provider: source === 'cortesia' ? 'cortesia' : 'manual', service: svcSlug, amount: source === 'cortesia' ? 0 : amount ?? lead.deal_price ?? 0, status: 'pago', paid_at: now0() });
      const n0 = await connectedNumber(lead.number_id);
      const mapas0 = await import('./mapa-alma/servico');
      if (n0 && lead.whatsapp) await sendAndRecord(n0, lead, `Prontinho! As pirâmides do seu nome já estão liberadas no mesmo link do seu mapa, num capítulo novo no final 🔺✨\n${mapas0.linkMapa(m0)}\n\n(A senha continua a mesma 💜)`, 'ai', true);
      await logEvent(leadId, 'upgrade', 'ok', `${lead.name} passou para a versão completa (pirâmides liberadas)`);
      return;
    }
  }
  // mapa já pago não paga de novo; o tarô é uma compra a mais (pode vir depois do mapa)
  if (lead.stage === 'pago' && !taro) return;
  const value = cortesia ? 0 : amount ?? lead.deal_price ?? null;
  const now = new Date().toISOString();
  if (!cortesia && value) {
    // devolve a COMPRA ao Meta (na moeda paga). Sem e-mail ainda, espera até 15 min pelo e-mail da conversa (o robô envia depois).
    import('./meta-capi').then((m) => m.enviarCompraDoLead(leadId, { paymentId: paymentId || null, espera: true })).catch(() => {});
  }
  if (taro) {
    await db().from('leads').update({ stage: 'pago', is_client: true, client_since: lead.client_since || now, needs_human: null, accepted_offer: null, next_step: 'Tarô entregue: leitura das cartas na conversa.' }).eq('id', leadId);
    if (!paymentId) await db().from('payments').insert({ lead_id: leadId, provider: cortesia ? 'cortesia' : 'manual', service: svcSlug, amount: value || 0, status: 'pago', paid_at: now });
    await logEvent(leadId, 'paid', 'ok', `${cortesia ? 'Tarô liberado (gratuito/teste)' : 'Tarô pago'}: ${lead.name}${value ? ' · ' + brl(value) : ''}`, { source, service: svcSlug });
    const number = await connectedNumber(lead.number_id);
    if (number && lead.whatsapp) {
      try {
        if (!cortesia) await sendAndRecord(number, lead, 'Pagamento recebido! Muito obrigada pela confiança 💜', 'ai', true);
        const { entregarTaro } = await import('./mapa-alma/taro/servico');
        await entregarTaro(lead, svcSlug, paymentId || null, (t: string) => sendAndRecord(number, lead, t, 'ai', true));
      } catch (e: any) {
        await db().from('leads').update({ needs_human: `URGENTE: o tarô não foi entregue sozinho (${String(e?.message || e).slice(0, 120)}).` }).eq('id', leadId).then(() => {}, () => {});
        await logEvent(leadId, 'taro_erro', 'warn', `Não consegui entregar o tarô de ${lead.name}: ${e?.message || e}`);
      }
    }
    return;
  }
  await db()
    .from('leads')
    .update({ stage: 'pago', is_client: true, client_since: lead.client_since || now, temperature: 100, close_probability: 100, paid_amount: value, paid_at: now, steps: withSteps(lead.steps, 'price', 'pix', 'paid'), needs_human: null, learn_pending: true, accepted_offer: null, next_step: 'Venda concluída: mapa completo liberado e enviado na conversa.' })
    .eq('id', leadId);
  if (!paymentId) {
    // pagamento registrado pela equipe: cria o registro para gerar o recibo
    await db().from('payments').insert({ lead_id: leadId, provider: cortesia ? 'cortesia' : 'manual', service: svcSlug || lead.deal_service, amount: value || 0, status: 'pago', paid_at: now });
  }
  await bumpApproach(lead.approach_slug, 'sales');
  // Mapa da Alma: não há produção; o mapa é liberado e enviado logo abaixo
  const credited = await creditWins(leadId);
  await creditRealWins(leadId).catch(() => {});
  if (credited) await logEvent(leadId, 'kb_win', 'ai', `${credited} técnica(s) da base ganharam pontos com a venda de ${lead.name}`);
  const modoV = modoAtual(await getSettings(db()));
  await db().from('leads').update({ modo_venda_venda: modoV }).eq('id', leadId).then(() => {}, () => {});
  await db().from('payments').update({ modo_venda: modoV }).eq('lead_id', leadId).eq('status', 'pago').is('modo_venda', null).then(() => {}, () => {});
  await logEvent(leadId, 'paid', 'ok', `Pagamento confirmado: ${lead.name} · ${brl(value)} · modo ${modoV === 'grazi' ? 'Grazi' : 'Consulta'}`, { source, modo_venda: modoV });
  const number = await connectedNumber(lead.number_id);
  if (number && lead.whatsapp) {
    try {
      const st0 = await getSettings(db());
      const said = cortesia ? false : await sendMoment(number, lead, 'pagamento_confirmado', st0);
      if (cortesia) await sendAndRecord(number, lead, 'Prontinho! Preparei tudo com muito carinho pra você 💜 Já te mando o seu Mapa da Alma completo aqui.', 'ai', true);
      else if (!said) await sendAndRecord(number, lead, 'Pagamento recebido! Muito obrigada pela confiança 💜 Já te mando o seu Mapa da Alma completo aqui.', 'ai', true);
    } catch (e) {
      console.error('Falha ao enviar agradecimento', e);
    }
    // libera e envia o mapa completo (link + PDF); se ainda não houver prévia, cria com os dados da conversa
    try {
      const mapas = await import('./mapa-alma/servico');
      let slug = lead.mapa_slug || lead.preview_slug;
      if (!slug) slug = (await mapas.gerarMapaDoLead(leadId, 'ia')).slug;
      const { data: m } = await db().from('mapas').select('*').eq('slug', slug).maybeSingle();
      if (!m) throw new Error('mapa não encontrado');
      // versão comprada: "mapa-pessoal" = simples (sem as pirâmides); "mapa-completo" (ou gratuito/teste) = completa
      const versao = svcSlug === 'mapa-pessoal' && !cortesia ? 'simples' : 'completa';
      if (m.versao !== versao) { await db().from('mapas').update({ versao, pdf_path: null }).eq('id', m.id); m.versao = versao; m.pdf_path = null; }
      await mapas.enviarMapaCompleto(m, lead, number, (t: string) => sendAndRecord(number, lead, t, 'ai', true));
      await logEvent(leadId, 'mapa_enviado', 'ok', `Mapa completo liberado e enviado para ${lead.name}`, { slug });
      await db().from('leads').update({ steps: withSteps([...(lead.steps || []), 'price', 'pix', 'paid'], 'entregue') }).eq('id', leadId).then(() => {}, () => {});
    } catch (e: any) {
      await db().from('leads').update({ needs_human: `URGENTE: pagou, mas o mapa não foi enviado sozinho (${String(e?.message || e).slice(0, 120)}). Envie em Gerador de mapas.` }).eq('id', leadId).then(() => {}, () => {});
      await logEvent(leadId, 'mapa_erro', 'warn', `Pagou, mas não consegui enviar o mapa de ${lead.name}: ${e?.message || e}`);
    }
  }
}

export async function analyzeSale(leadId: string) {
  const { data: lead } = await db().from('leads').select('*').eq('id', leadId).maybeSingle();
  if (!lead) return;
  const { data: msgs } = await db().from('messages').select('*').eq('lead_id', leadId).order('created_at').limit(120);
  const r = await structured<any>(
    'Você analisa conversas de vendas que terminaram em compra para ensinar a equipe. Seja objetivo e use as palavras do cliente.',
    `Cliente:\n${leadBlock(lead)}\nAbordagem usada: ${lead.approach_slug}\nValor pago: ${brl(lead.paid_amount)}\n\nConversa:\n${transcript(msgs || [])}`,
    'analise_venda',
    SALE_SCHEMA,
    1500,
    { task: 'aprendizado', leadId, tier: 'fast' },
  );
  await db().from('learnings').insert({ lead_id: leadId, niche: lead.niche || NICHO_MAPA, service: lead.deal_service, price: lead.paid_amount, approach_slug: lead.approach_slug, pains: r.pains || [], decisive_factor: r.decisive_factor, hook: r.hook, objections: r.objections || [], notes: r.notes });
  for (const o of r.objections || []) {
    if (!o.objection) continue;
    const key = norm(o.objection).slice(0, 80);
    const { data: ob } = await db().from('objections').select('*').eq('niche', lead.niche || NICHO_MAPA).eq('objection', key).maybeSingle();
    if (ob) await db().from('objections').update({ wins: ob.wins + 1, best_response: o.response, updated_at: new Date().toISOString() }).eq('id', ob.id);
    else await db().from('objections').insert({ niche: lead.niche || NICHO_MAPA, objection: key, best_response: o.response, tries: 1, wins: 1 });
  }
  await db().from('leads').update({ learn_pending: false }).eq('id', leadId);
  await logEvent(leadId, 'learned', 'ai', `IA estudou a venda de ${lead.name}: fator decisivo "${r.decisive_factor}"`);
  // playbook: já nas 3 primeiras vendas (a base começa pequena) e depois a cada 3
  const nicho = lead.niche || NICHO_MAPA;
  const { count } = await db().from('learnings').select('id', { count: 'exact', head: true }).eq('niche', nicho);
  if (count && (count <= 3 || count % 3 === 0)) await generatePlaybook(nicho);
}

export async function generatePlaybook(niche: string) {
  const { data: ls } = await db().from('learnings').select('*').eq('niche', niche).order('created_at', { ascending: false }).limit(40);
  const { data: obs } = await db().from('objections').select('*').eq('niche', niche).order('wins', { ascending: false }).limit(15);
  const services = await activeServices();
  const r = await structured<{ content: string }>(
    'Você escreve playbooks de vendas curtos e práticos para uma IA que vende pelo WhatsApp. Use tópicos curtos. Inclua: melhor abordagem de abertura, dores que mais aparecem, quando mandar a prévia, como contornar as objeções, sinais de compra e preço médio. Máximo 18 linhas.',
    `Nicho: ${niche}\nServiços: ${servicesBlock(services)}\n\nVendas analisadas:\n${(ls || []).map((l: any) => `- ${brl(l.price)} | abordagem ${l.approach_slug} | fator: ${l.decisive_factor} | gancho: ${l.hook} | dores: ${(l.pains || []).join(', ')} | lição: ${l.notes}`).join('\n') || '(nenhuma ainda)'}\n\nObjeções:\n${(obs || []).map((o: any) => `- ${o.objection} (${o.wins}/${o.tries}): ${o.best_response || ''}`).join('\n') || '(nenhuma)'}`,
    'playbook',
    PLAYBOOK_SCHEMA,
    1500,
    { task: 'playbook', tier: 'smart' },
  );
  await db().from('playbooks').upsert({ niche, content: r.content, sales: ls?.length || 0, updated_at: new Date().toISOString() });
  await logEvent(null, 'playbook', 'ai', `Playbook de "${niche}" atualizado com ${ls?.length || 0} vendas`);
  return r.content;
}

/**
 * Resumo VIVO da conversa (modelo barato): parte do resumo anterior + ficha e junta só as mensagens novas.
 * Guarda nome, local, serviços, links, valores, negociação, prazos e onde parou — dá para retomar dias depois.
 */
export async function refreshSummary(leadId: string, incremental = false) {
  const { data: lead } = await db().from('leads').select('*').eq('id', leadId).maybeSingle();
  if (!lead) throw new Error('Lead não encontrado');
  const since = incremental && lead.memory?.resumo_ate ? String(lead.memory.resumo_ate) : null;
  let q = db().from('messages').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(since ? 80 : 150);
  if (since) q = q.gt('created_at', since);
  const { data: rows } = await q;
  const msgs = (rows || []).reverse();
  if (!msgs.length) return lead;
  const r = await structured<any>(
    `Você mantém o RESUMO VIVO de uma negociação pelo WhatsApp, para a equipe e para a IA retomarem a conversa dias depois sem reler tudo.
Escreva em tópicos curtos (um por linha, começando com "• "), só fatos importantes, sem enrolação, nesta ordem quando houver:
• Quem é (primeiro nome, idade aproximada se disse, cidade se disse) • O que a pessoa está vivendo e quer entender (dor: dinheiro, amor, família, saúde, trabalho) • Dados do mapa (nome de nascimento, data, signo; casal: dados do outro) • O que o mapa já revelou na conversa e como ela reagiu • Links já enviados (pagamento, mapa) • Valores e negociação (o que foi oferecido, pedido, combinado, descontos) • Prazos e datas combinadas • Objeções • Onde parou e o próximo passo. Se o cliente JÁ PAGOU (veja o bloco do cliente), escreva logo no início "JÁ COMPROU e recebeu o mapa completo" e NUNCA como próximo passo vender, pedir dados do mapa ou apresentar preço: o próximo passo é só pós-venda (dúvidas do mapa, indicação).
${since ? 'Use o RESUMO ANTERIOR como base: mantenha o que continua valendo, corrija o que mudou e acrescente só o que é novo nas mensagens abaixo.' : ''}
No máximo ~1.200 caracteres. Não invente nada.`,
    `Cliente:\n${leadBlock(lead)}\n\n${memoryBlock(lead.memory)}\n\n${since ? `RESUMO ANTERIOR:\n${lead.summary || '(vazio)'}\n\nMENSAGENS NOVAS:` : 'CONVERSA:'}\n${transcript(msgs)}`,
    'resumo',
    SUMMARY_SCHEMA,
    900,
    { task: 'resumo', leadId },
  );
  const memory = { ...(lead.memory || {}), resumo_ate: msgs[msgs.length - 1].created_at };
  const { data } = await db()
    .from('leads')
    .update({ summary: String(r.summary || '').slice(0, 2000), next_step: r.next_step, temperature: r.temperature, close_probability: r.close_probability ?? lead.close_probability, memory })
    .eq('id', leadId)
    .select('*')
    .single();
  return data;
}

/** Atualiza o resumo vivo sozinho a cada ~10 mensagens novas (barato, em segundo plano). */
export async function maybeRefreshSummary(leadId: string) {
  const { data: lead } = await db().from('leads').select('memory,summary').eq('id', leadId).maybeSingle();
  const since = lead?.memory?.resumo_ate;
  let q = db().from('messages').select('id', { count: 'exact', head: true }).eq('lead_id', leadId);
  if (since) q = q.gt('created_at', since);
  const { count } = await q;
  const minMsgs = Math.min(40, Math.max(6, Number((await getSettings(db())).budget?.summary_min_msgs) || 10));
  if ((count || 0) >= minMsgs) await refreshSummary(leadId, !!since && !!lead?.summary).catch(() => {});
}


/** Cobrança em outra moeda (clientes de língua espanhola): Stripe Checkout automático ou link manual do país. */
async function cobrarInternacional(number: any, lead: any, pais: any, patch: any) {
  const { stripeLigado, criarCheckoutStripe } = await import('./stripe');
  const { centavos, precoTexto } = await import('./internacional');
  const { appBase } = await import('./util');
  const brlRef = Number(pais.brl) || 60;
  const { data: pay, error } = await db().from('payments').insert({ lead_id: lead.id, provider: stripeLigado() ? 'stripe' : 'manual', service: 'mapa-completo', amount: brlRef, status: 'pendente', moeda: pais.moeda, valor_local: pais.preco }).select().single();
  if (error || !pay) throw new Error('não registrei a cobrança: ' + (error?.message || ''));
  let url: string | null = null;
  if (stripeLigado()) {
    const ck = await criarCheckoutStripe({ valorMinimo: centavos(pais.preco, pais.moeda), moeda: pais.moeda, titulo: 'Mapa del Alma completo', descricao: 'Numerología cabalística + astrología', leadId: lead.id, pagamentoId: pay.id, sucessoUrl: `${appBase()}/api/pago-ok`, cancelaUrl: `${appBase()}/api/pago-ok?cancelado=1` });
    url = ck.url;
    await db().from('payments').update({ provider_id: ck.id, ticket_url: ck.url }).eq('id', pay.id);
  } else if (pais.link || process.env.LINK_CHECKOUT_INTERNACIONAL) {
    // o ID da cobrança vai no link (src) para o webhook da Kiwify achar quem pagou
    const base = String(pais.link || process.env.LINK_CHECKOUT_INTERNACIONAL);
    url = base + (base.includes('?') ? '&' : '?') + 'src=' + pay.id;
    await db().from('payments').update({ ticket_url: url }).eq('id', pay.id);
  }
  if (!url) throw new Error('Stripe desligado e este país não tem link manual (menu Países e preços).');
  await sendAndRecord(number, lead, `Aquí está tu enlace de pago seguro (${precoTexto(pais)}, pago único) 👇\n${url}\nCuando termines, avísame y te preparo tu Mapa del Alma enseguida 💫`, 'system', false, { link_internacional: true });
  import('./meta-capi').then((m) => m.enviarEvento(lead.id, 'InitiateCheckout', { valor: pais.preco, moeda: pais.moeda })).catch(() => {});
  patch.stage = 'pix';
  patch.accepted_offer = null;
  patch.deal_service = 'mapa-completo';
  patch.deal_price = brlRef;
  patch.next_step = 'Link internacional enviado. Aguardando o pagamento.';
  await logEvent(lead.id, 'link_sent', 'pay', `Link internacional (${precoTexto(pais)}) enviado para ${lead.name}`, { moeda: pais.moeda });
}
