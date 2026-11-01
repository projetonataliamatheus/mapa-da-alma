// Mapa da Alma: gerar, liberar, montar o PDF e enviar os mapas (usado pela IA, pelo painel e pelo pagamento).
import { randomBytes, createHmac } from 'node:crypto';
import { admin as db } from '../supabase/admin';
import { appBase } from '../util';
import { montarConteudo, montarCasal, type Conteudo, type Overrides } from './mapa/conteudo.ts';
import { htmlWeb, htmlPdf, MARCA_PADRAO, RODAPE_PDF, type Marca } from './mapa/html.ts';

export interface MapaRow {
  id: string; slug: string; lead_id: string | null; tipo: 'pessoal' | 'casal';
  nome: string; nascimento: string; nome2: string | null; nascimento2: string | null;
  liberado: boolean; liberado_em: string | null; pdf_path: string | null; views: number;
  sent_at: string | null; created_by: string; created_at: string;
}

const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

/** Converte "15/04/1996", "15-04-96", "1996-04-15" em AAAA-MM-DD (ou null). */
export function dataISO(v: any): string | null {
  const t = String(v || '').trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = /^(\d{1,2})[\/.\- ](\d{1,2})[\/.\- ](\d{2,4})$/.exec(t);
  if (m) {
    let ano = Number(m[3]);
    if (ano < 100) ano += ano > (new Date().getFullYear() % 100) ? 1900 : 2000;
    const iso = `${ano}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    const d = new Date(iso + 'T12:00:00Z');
    return isNaN(+d) || d.getUTCDate() !== Number(m[1]) ? null : iso;
  }
  return null;
}

export const linkMapa = (m: { slug: string }) => `${appBase()}/mapa/${m.slug}`;
export const linkPdf = (m: { slug: string }) => `${appBase()}/mapa/${m.slug}/pdf`;
export const nomeArquivo = (m: MapaRow) => `Mapa da Alma - ${m.tipo === 'casal' && m.nome2 ? `${m.nome.split(' ')[0]} e ${m.nome2.split(' ')[0]}` : m.nome}.pdf`;

export async function textosPersonalizados(): Promise<Overrides> {
  const { data } = await db().from('mapa_textos').select('categoria,numero,conteudo');
  return Object.fromEntries((data || []).map((l: any) => [`${l.categoria}:${l.numero}`, l.conteudo]));
}

export async function marcaDoMapa(): Promise<Marca> {
  const { data } = await db().from('settings').select('data').eq('id', 1).maybeSingle();
  const d: any = data?.data || {};
  return { ...MARCA_PADRAO, ...(d.mapa_marca || {}), whatsapp: d.mapa_marca?.whatsapp };
}

export async function conteudoDoMapa(m: MapaRow): Promise<Conteudo> {
  const ov = await textosPersonalizados();
  const hoje = (m.created_at || new Date().toISOString()).slice(0, 10);
  return m.tipo === 'casal' && m.nome2 && m.nascimento2
    ? montarCasal(m.nome, m.nascimento, m.nome2, m.nascimento2, ov, hoje)
    : montarConteudo(m.nome, m.nascimento, ov, hoje);
}

export async function criarMapa(d: { leadId?: string | null; tipo: 'pessoal' | 'casal'; nome: string; nascimento: string; nome2?: string | null; nascimento2?: string | null; liberado?: boolean; by?: 'ia' | 'equipe' }): Promise<MapaRow> {
  const nasc = dataISO(d.nascimento);
  if (!d.nome?.trim() || !nasc) throw new Error('Informe o nome completo e uma data de nascimento válida.');
  const nasc2 = d.tipo === 'casal' ? dataISO(d.nascimento2) : null;
  if (d.tipo === 'casal' && (!d.nome2?.trim() || !nasc2)) throw new Error('No mapa do casal, informe o nome completo e a data das duas pessoas.');
  const base = slugify(d.tipo === 'casal' ? `${d.nome.split(' ')[0]}-e-${String(d.nome2).split(' ')[0]}` : d.nome);
  const { data, error } = await db()
    .from('mapas')
    .insert({
      slug: `${base}-${randomBytes(4).toString('hex')}`, lead_id: d.leadId || null, tipo: d.tipo,
      nome: d.nome.trim(), nascimento: nasc, nome2: d.tipo === 'casal' ? String(d.nome2).trim() : null, nascimento2: nasc2,
      liberado: !!d.liberado, liberado_em: d.liberado ? new Date().toISOString() : null, created_by: d.by || 'equipe',
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  if (d.leadId) await db().from('leads').update({ mapa_slug: data.slug }).eq('id', d.leadId).then(() => {}, () => {});
  return data as MapaRow;
}

/** Prévia do mapa para a conversa: usa o nome completo e a data que o cliente passou (memória da conversa). */
export async function gerarMapaDoLead(leadId: string, by: 'ia' | 'equipe' = 'ia'): Promise<{ slug: string; url: string }> {
  const { data: lead } = await db().from('leads').select('*').eq('id', leadId).maybeSingle();
  if (!lead) throw new Error('Lead não encontrado');
  const mem: any = lead.memory || {};
  const casal = /casal/i.test(String(mem.mapa_tipo || '')) && mem.mapa_nome_2 && mem.mapa_nascimento_2;
  const nome = String(mem.mapa_nome_completo || '').trim();
  const nasc = dataISO(mem.mapa_nascimento);
  if (!nome || !nasc) throw new Error('Ainda faltam o nome completo de nascimento e a data de nascimento do cliente.');
  // mesmo nome e data: reaproveita o mapa já criado
  if (lead.mapa_slug) {
    const { data: atual } = await db().from('mapas').select('*').eq('slug', lead.mapa_slug).maybeSingle();
    if (atual && atual.nome === nome && atual.nascimento === nasc && (!casal || (atual.nome2 === String(mem.mapa_nome_2).trim() && atual.nascimento2 === dataISO(mem.mapa_nascimento_2))))
      return { slug: atual.slug, url: linkMapa(atual) };
  }
  const m = await criarMapa({ leadId, tipo: casal ? 'casal' : 'pessoal', nome, nascimento: nasc, nome2: casal ? mem.mapa_nome_2 : null, nascimento2: casal ? mem.mapa_nascimento_2 : null, by });
  await db().from('lead_events').insert({ lead_id: leadId, type: 'preview', channel: 'ai', text: `Prévia do ${casal ? 'mapa do casal' : 'Mapa da Alma'} criada para ${nome}`, meta: { slug: m.slug } }).then(() => {}, () => {});
  return { slug: m.slug, url: linkMapa(m) };
}

export async function paginaDoMapa(m: MapaRow, opts: { equipe?: boolean } = {}): Promise<string> {
  const c = await conteudoDoMapa(m);
  const marca = await marcaDoMapa();
  const aberto = m.liberado || !!opts.equipe;
  return htmlWeb(c, marca, { pdfUrl: aberto ? `/mapa/${m.slug}/pdf` : undefined, bloqueado: !aberto, ctaUrl: marca.whatsapp ? `https://wa.me/${String(marca.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent('Quero liberar o meu Mapa da Alma completo ✨')}` : undefined });
}

/** Gera o PDF no Browserless (nuvem ou servidor) — mesmo serviço dos recibos. */
export async function pdfBrowserless(html: string): Promise<Buffer> {
  const baseUrl = (process.env.BROWSERLESS_URL || 'https://production-sfo.browserless.io').replace(/\/$/, '');
  const token = process.env.BROWSERLESS_TOKEN;
  if (!token) throw new Error('PDF não configurado: falta BROWSERLESS_TOKEN');
  const r = await fetch(`${baseUrl}/pdf?token=${encodeURIComponent(token)}`, {
    signal: AbortSignal.timeout(120_000), method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, options: { format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: RODAPE_PDF }, gotoOptions: { waitUntil: 'networkidle0', timeout: 60_000 } }),
  });
  if (!r.ok) throw new Error('Browserless: ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return Buffer.from(await r.arrayBuffer());
}

/** PDF do mapa (guardado no Storage; refazer=true gera de novo com os textos atuais). */
export async function pdfDoMapa(m: MapaRow, refazer = false): Promise<Buffer> {
  if (m.pdf_path && !refazer) {
    const { data } = await db().storage.from('mapas').download(m.pdf_path);
    if (data) return Buffer.from(await data.arrayBuffer());
  }
  const pdf = await pdfBrowserless(htmlPdf(await conteudoDoMapa(m), await marcaDoMapa()));
  const path = `${m.slug}.pdf`;
  const up = await db().storage.from('mapas').upload(path, pdf, { contentType: 'application/pdf', upsert: true });
  if (!up.error) await db().from('mapas').update({ pdf_path: path }).eq('id', m.id);
  return pdf;
}

export async function liberarMapa(id: string) {
  await db().from('mapas').update({ liberado: true, liberado_em: new Date().toISOString() }).eq('id', id);
}

/** Envia o mapa completo (link + PDF) no WhatsApp do lead, pelo número que atende a conversa. */
export async function enviarMapaCompleto(m: MapaRow, lead: any, number: any, sendText: (t: string) => Promise<any>) {
  const { evo } = await import('../evolution');
  if (!m.liberado) await liberarMapa(m.id);
  const pdf = await pdfDoMapa({ ...m, liberado: true });
  const nome = String(lead?.memory?.nome_cliente || m.nome).split(' ')[0];
  await sendText(`${nome}, o seu Mapa da Alma completo está pronto ✨\n\nPra ler no celular, com calma 👇\n${linkMapa(m)}\n\nE aqui embaixo vai o PDF completo pra você guardar 💜`);
  await evo.sendDocument(number.instance_name, lead.whatsapp, pdf.toString('base64'), nomeArquivo(m), '');
  await db().from('mapas').update({ sent_at: new Date().toISOString() }).eq('id', m.id);
}

/** Chave para a equipe abrir o mapa completo (mesmo antes do pagamento) pelo painel. */
export function chaveEquipe(slug: string) {
  return createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY || 'mapa').update('mapa:' + slug).digest('hex').slice(0, 20);
}
