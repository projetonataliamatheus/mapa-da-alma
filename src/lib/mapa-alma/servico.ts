// Mapa da Alma: gerar, liberar, montar o PDF e enviar os mapas (usado pela IA, pelo painel e pelo pagamento).
import { nomeProprio, chaveNome } from './nome.ts';
import { randomBytes, createHmac } from 'node:crypto';
import { admin as db } from '../supabase/admin';
import { appBase } from '../util';
import { montarConteudo, montarCasal, type Conteudo, type Overrides } from './mapa/conteudo.ts';
import { previaCfg, previaExtras, restanteMs, liberadasDoMapa, faixaVars } from './previa.ts';
import { htmlWeb, htmlPdf, MARCA_PADRAO, RODAPE_PDF, type Marca } from './mapa/html.ts';

export interface MapaRow {
  id: string; slug: string; lead_id: string | null; tipo: 'pessoal' | 'casal';
  nome: string; nascimento: string; nome2: string | null; nascimento2: string | null;
  liberado: boolean; liberado_em: string | null; pdf_path: string | null; views: number;
  sent_at: string | null; created_by: string; created_at: string;
  senha?: string | null; senha_em?: string | null;
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

/** Endereço público do mapa do cliente. Com ACESSO_URL (ex.: https://acesso.mapadelalma.site) o link fica acesso.../slug; sem ela, o padrão antigo /mapa/slug. */
export const urlMapa = (slug: string, resto = '', idioma: string | null = 'pt') => {
  // Cliente em português → ACESSO_URL_BR (ex.: https://acesso.mapadaalma.site); em espanhol → ACESSO_URL. Sem ACESSO_URL_BR, todos usam ACESSO_URL (comportamento antigo).
  const bruto = idioma === 'es' ? process.env.ACESSO_URL : process.env.ACESSO_URL_BR || process.env.ACESSO_URL;
  const a = String(bruto || '').replace(/\/+$/, '');
  return a ? `${a}/${slug}${resto}` : `${appBase()}/mapa/${slug}${resto}`;
};
export const linkMapa = (m: { slug: string; idioma?: string | null }) => urlMapa(m.slug, '', m.idioma);
export const linkPdf = (m: { slug: string; idioma?: string | null }) => urlMapa(m.slug, '/pdf', m.idioma);
export const nomeArquivo = (m: MapaRow, es = false) => `${es ? 'Mapa del Alma' : 'Mapa da Alma'} - ${m.tipo === 'casal' && m.nome2 ? `${m.nome.split(' ')[0]} ${es ? 'y' : 'e'} ${m.nome2.split(' ')[0]}` : m.nome}.pdf`;

export async function textosPersonalizados(): Promise<Overrides> {
  const { data } = await db().from('mapa_textos').select('categoria,numero,conteudo');
  return Object.fromEntries((data || []).map((l: any) => [`${l.categoria}:${l.numero}`, l.conteudo]));
}

export async function marcaDoMapa(): Promise<Marca> {
  const { data } = await db().from('settings').select('data').eq('id', 1).maybeSingle();
  const d: any = data?.data || {};
  return { ...MARCA_PADRAO, ...(d.mapa_marca || {}), whatsapp: d.mapa_marca?.whatsapp };
}

/** CSS dos cards escolhido pelo Master (Aparência › Efeitos e cards). animar=false no PDF. */
export async function estiloDoMapa(animar = true): Promise<string> {
  const { data } = await db().from('settings').select('data').eq('id', 1).maybeSingle();
  const { estiloCss } = await import('./mapa/estilo.ts');
  return estiloCss((data?.data as any)?.mapa_estilo || null, animar);
}

export async function conteudoDoMapa(m: MapaRow): Promise<Conteudo> {
  const ov = await textosPersonalizados();
  const hoje = (m.created_at || new Date().toISOString()).slice(0, 10);
  return m.tipo === 'casal' && m.nome2 && m.nascimento2
    ? montarCasal(m.nome, m.nascimento, m.nome2, m.nascimento2, ov, hoje)
    : montarConteudo(m.nome, m.nascimento, ov, hoje);
}

export async function criarMapa(d0: { leadId?: string | null; tipo: 'pessoal' | 'casal'; nome: string; nascimento: string; nome2?: string | null; nascimento2?: string | null; liberado?: boolean; by?: 'ia' | 'equipe'; porUsuario?: string | null }): Promise<MapaRow> {
  let d = d0;
  const nasc = dataISO(d.nascimento);
  if (!d.nome?.trim() || !nasc) throw new Error('Informe o nome completo e uma data de nascimento válida.');
  const nasc2 = d.tipo === 'casal' ? dataISO(d.nascimento2) : null;
  if (d.tipo === 'casal' && (!d.nome2?.trim() || !nasc2)) throw new Error('No mapa do casal, informe o nome completo e a data das duas pessoas.');
  // nome sempre com Iniciais Maiúsculas, mesmo se veio em CAIXA ALTA ou minúsculo
  d = { ...d, nome: nomeProprio(d.nome), nome2: d.tipo === 'casal' ? nomeProprio(String(d.nome2 || '')) : null }
  // NUNCA duplica: mesmo nome (ignorando maiúsculas, acentos e espaços) + mesma data = mesmo mapa
  const { data: iguais } = await db().from('mapas').select('*').eq('tipo', d.tipo).eq('nascimento', nasc).order('created_at', { ascending: true }).limit(50);
  const igual = (iguais || []).find((m: any) => chaveNome(m.nome) === chaveNome(d.nome) && (d.tipo !== 'casal' || (m.nascimento2 === nasc2 && chaveNome(m.nome2) === chaveNome(String(d.nome2)))));
  if (igual) {
    // REGRA: mapa privado do Master. Outra pessoa da equipe tentando gerar o mesmo mapa → erro, sem gerar e sem mexer em nada
    if (igual.privado_de && d.porUsuario && igual.privado_de !== d.porUsuario) throw new Error('Erro ao gerar mapa.');
    const up: any = {};
    if (d.leadId && !igual.lead_id) up.lead_id = d.leadId;
    if (igual.nome !== d.nome) up.nome = d.nome;
    if (Object.keys(up).length) await db().from('mapas').update(up).eq('id', igual.id);
    if (d.liberado && !igual.liberado) { const senha = await liberarMapa(igual.id); Object.assign(igual, { liberado: true, senha }); }
    if (d.leadId) await db().from('leads').update({ mapa_slug: igual.slug }).eq('id', d.leadId).then(() => {}, () => {});
    return { ...igual, ...up, existente: true } as MapaRow;
  }
  const base = slugify(d.tipo === 'casal' ? `${d.nome.split(' ')[0]}-e-${String(d.nome2).split(' ')[0]}` : d.nome);
  const { data, error } = await db()
    .from('mapas')
    .insert({
      slug: `${base}-${randomBytes(4).toString('hex')}`, lead_id: d.leadId || null, tipo: d.tipo,
      nome: d.nome.trim(), nascimento: nasc, nome2: d.tipo === 'casal' ? String(d.nome2).trim() : null, nascimento2: nasc2,
      liberado: !!d.liberado, liberado_em: d.liberado ? new Date().toISOString() : null, created_by: d.by || 'equipe',
      ...(d.liberado ? { senha: gerarSenha(), senha_em: new Date().toISOString() } : {}),
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
    if (atual && chaveNome(atual.nome) === chaveNome(nome) && atual.nascimento === nasc && (!casal || (chaveNome(atual.nome2) === chaveNome(String(mem.mapa_nome_2)) && atual.nascimento2 === dataISO(mem.mapa_nascimento_2))))
      return { slug: atual.slug, url: linkMapa(atual) };
  }
  const m = await criarMapa({ leadId, tipo: casal ? 'casal' : 'pessoal', nome, nascimento: nasc, nome2: casal ? mem.mapa_nome_2 : null, nascimento2: casal ? mem.mapa_nascimento_2 : null, by });
  await db().from('lead_events').insert({ lead_id: leadId, type: 'preview', channel: 'ai', text: `Prévia do ${casal ? 'mapa do casal' : 'Mapa da Alma'} criada para ${nome}`, meta: { slug: m.slug } }).then(() => {}, () => {});
  // contato de língua espanhola: já traduz a página em segundo plano (as frases ficam em cache e a 1ª abertura é rápida)
  if (lead.idioma === 'es') paginaDoMapa(m as any, { previa: true }).catch(() => {});
  // o contato passou nome e data de verdade: sinal de interesse real para o Meta (evento Lead)
  import('../meta-capi').then((x) => x.enviarEvento(leadId, 'Lead')).catch(() => {});
  return { slug: m.slug, url: linkMapa(m) };
}

/** Pirâmides do nome (capítulo do mapa): só no mapa pessoal. */
export async function piramidesDoMapa(m: MapaRow, so?: string[]): Promise<string | null> {
  if (m.tipo === 'casal') return null;
  const { montarAnalise } = await import('./analise.ts');
  const { corpoPiramides } = await import('./mapa/piramides.ts');
  return corpoPiramides(montarAnalise(m.nome, m.nascimento, await textosPersonalizados(), (m.created_at || new Date().toISOString()).slice(0, 10)), so ? { so } : {});
}
/** Versão do mapa: "completa" (mapa + pirâmides) ou "simples" (só o mapa). */
export const versaoDe = (m: any) => (m?.versao === 'simples' ? 'simples' : 'completa');

/** Estado da prévia com bloqueios: configuração, tempo que falta e "versão" (muda quando a IA libera algo novo). */
export async function estadoPrevia(m: MapaRow & { previa_inicio?: string | null }) {
  const cfg = await previaCfg();
  const lib = await liberadasDoMapa(m);
  const { ms, expirou } = restanteMs(cfg, m.previa_inicio);
  return { cfg, lib, ms, expirou, vers: lib.secoes.join(',') + '|' + lib.piramides.join(',') + '|' + (m.liberado ? 1 : 0), vars: faixaVars(cfg) };
}

/** O mapa é do contato de língua espanhola? (lê o idioma do contato; sem contato = português) */
export async function mapaEmEspanhol(m: { lead_id?: string | null; idioma?: string | null }): Promise<boolean> {
  if ((m as any).idioma === 'es') return true;
  if (!m.lead_id) return false;
  const { data } = await db().from('leads').select('idioma').eq('id', m.lead_id).maybeSingle();
  return data?.idioma === 'es';
}
/** Textos que moram dentro de scripts/CSS (a tradução automática não alcança): troca fixa. */
const FIXOS_ES: [string, string][] = [
  ["' achado(s)'", "' resultado(s)'"], ["'nada encontrado'", "'sin resultados'"], ["'Seu mapa'", "'Tu mapa'"], ["'Início'", "'Inicio'"],
  ['Prévia Bloqueada! Faça o Pagamento para Desbloquear o Mapa Completo', '¡Vista previa bloqueada! Realiza el pago para desbloquear el Mapa completo'],
]
export const fixosES = (h: string) => FIXOS_ES.reduce((a, [de, para]) => a.split(de).join(para), h)
/** Botão de troca de idioma (bandeiras), fixo no canto. Abre no idioma do contato; o outro fica a um toque. */
export function seletorIdioma(atual: 'pt' | 'es'): string {
  const outro = atual === 'es' ? 'pt' : 'es'
  const rot = outro === 'pt' ? '🇧🇷 Português' : '🇪🇸 Español'
  return `<a id="trocaIdioma" href="#" title="${atual === 'es' ? 'Cambiar idioma / Mudar idioma' : 'Mudar idioma / Cambiar idioma'}" style="position:fixed;top:10px;right:10px;z-index:2147483000;display:flex;align-items:center;gap:6px;padding:6px 11px;border-radius:999px;background:rgba(42,18,89,.88);color:#fff;font:600 12.5px system-ui,Arial,sans-serif;text-decoration:none;box-shadow:0 2px 10px rgba(0,0,0,.25);border:1px solid rgba(243,223,162,.5)"><span style="font-size:15px">🇧🇷⇄🇪🇸</span><span>${rot}</span></a><script>(function(){var a=document.getElementById('trocaIdioma');if(!a)return;var u=new URL(location.href);u.searchParams.set('lang','${outro}');a.href=u.toString()})()</script>`
}
const injetarSeletor = (h: string, l: 'pt' | 'es') => (/<\/body>/i.test(h) ? h.replace(/<\/body>/i, seletorIdioma(l) + '</body>') : h + seletorIdioma(l))

const telaPreparando = () => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="5"><meta name="robots" content="noindex"><title>Mapa del Alma</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 50% 20%,#5b2bb0,#1a0b3d 65%,#0d0620);color:#fff;font-family:system-ui,Arial,sans-serif;text-align:center;padding:20px"><div style="max-width:360px"><div style="font-size:46px">✨</div><h1 style="color:#f3dfa2;font-size:22px">Estamos preparando tu mapa</h1><p style="opacity:.9">Un momentito: se abrirá solo en unos segundos.</p></div>${seletorIdioma('es')}</body></html>`

/**
 * Entrega o HTML no idioma certo: espanhol para contatos de fora do +55 (traduzido; se ainda não ficou pronto mostra
 * "Estamos preparando tu mapa" e continua traduzindo — NUNCA cai em português), português para o Brasil.
 * `lang` (?lang=) deixa a pessoa trocar. limiteMs 0 = espera terminar (PDF).
 */
export async function emEspanholSeCabe(m: { lead_id?: string | null; idioma?: string | null }, html: string, limiteMs = 40_000, lang?: string | null, seletor = true): Promise<string> {
  const alvo: 'pt' | 'es' = lang === 'pt' || lang === 'es' ? lang : (await mapaEmEspanhol(m)) ? 'es' : 'pt'
  if (alvo === 'pt') return seletor ? injetarSeletor(html, 'pt') : html
  try {
    const { traduzirHtml } = await import('../i18n')
    const estado = { completo: true }
    const out = await traduzirHtml(html, limiteMs ? { limiteMs, estado } : { estado })
    if (!estado.completo) {
      traduzirHtml(html, {}).catch(() => {}) // termina em segundo plano e deixa em cache
      return telaPreparando()
    }
    const f = fixosES(out)
    return seletor ? injetarSeletor(f, 'es') : f
  } catch { return telaPreparando() }
}

export async function paginaDoMapa(m: MapaRow, opts: { equipe?: boolean; k?: string; previa?: boolean; lang?: string | null } = {}): Promise<string> {
  return emEspanholSeCabe(m as any, await paginaDoMapaPT(m, opts), 40_000, opts.lang);
}
async function paginaDoMapaPT(m: MapaRow, opts: { equipe?: boolean; k?: string; previa?: boolean; lang?: string | null } = {}): Promise<string> {
  const es = opts.lang === 'es' || opts.lang === 'pt' ? opts.lang === 'es' : await mapaEmEspanhol(m as any);
  const c = await conteudoDoMapa(m);
  const marca = await marcaDoMapa();
  const aberto = (m.liberado || !!opts.equipe) && !opts.previa;
  // PRÉVIA COM BLOQUEIOS: mapa inteiro, só o que a IA já comentou fica aberto; o resto tem cadeado, valor e contagem regressiva
  if (!aberto && m.tipo !== 'casal') {
    const ep = await estadoPrevia(m as any);
    if (ep.cfg.ativo) {
      const so = ep.lib.piramides.filter((x) => ['vida', 'pessoal', 'social', 'destino'].includes(x));
      const pirParcial = so.length && versaoDe(m) === 'completa' ? await piramidesDoMapa(m, so) : null;
      const waN = marca.whatsapp ? String(marca.whatsapp).replace(/\D/g, '') : '';
      return htmlWeb(c, marca, {
        previa: { abertas: ep.lib.secoes, cfg: ep.cfg }, bloqueado: true, piramides: pirParcial, piramidesTrancadas: !pirParcial,
        estiloCss: await estiloDoMapa(),
        ctaUrl: waN ? `https://wa.me/${waN}?text=${encodeURIComponent(es ? 'Quiero liberar mi Mapa del Alma completo ✨' : 'Quero liberar o meu Mapa da Alma completo ✨')}` : undefined,
        previaExtras: previaExtras(ep.cfg, { slug: m.slug, restanteMs: ep.ms, vers: ep.vers }),
      });
    }
  }
  const comPir = aberto && versaoDe(m) === 'completa' && m.tipo !== 'casal';
  const pir = comPir ? await piramidesDoMapa(m) : null;
  const wa = marca.whatsapp ? String(marca.whatsapp).replace(/\D/g, '') : '';
  return htmlWeb(c, marca, { piramides: pir, piramidesTrancadas: !pir && m.tipo !== 'casal', upgradeUrl: wa ? `https://wa.me/${wa}?text=${encodeURIComponent(es ? 'Quiero la versión completa de mi Mapa del Alma, con las pirámides del nombre ✨' : 'Quero a versão completa do meu Mapa da Alma, com as pirâmides do nome ✨')}` : undefined, estiloCss: await estiloDoMapa(), pdfUrl: aberto ? `/mapa/${m.slug}/pdf${opts.k ? `?k=${opts.k}` : ''}` : undefined, bloqueado: !aberto, ctaUrl: marca.whatsapp ? `https://wa.me/${String(marca.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(es ? 'Quiero liberar mi Mapa del Alma completo ✨' : 'Quero liberar o meu Mapa da Alma completo ✨')}` : undefined });
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
  const pir = versaoDe(m) === 'completa' ? await piramidesDoMapa(m) : null;
  const pdf = await pdfBrowserless(await emEspanholSeCabe(m as any, htmlPdf(await conteudoDoMapa(m), await marcaDoMapa(), { piramides: pir, estiloCss: await estiloDoMapa(false) }), 0, null, false));
  const path = `${m.slug}.pdf`;
  const up = await db().storage.from('mapas').upload(path, pdf, { contentType: 'application/pdf', upsert: true });
  if (!up.error) await db().from('mapas').update({ pdf_path: path }).eq('id', m.id);
  return pdf;
}

/** Senha curta e fácil de digitar (sem 0/O, 1/I/L). */
export function gerarSenha(): string {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from(randomBytes(6)).map(b => abc[b % abc.length]).join('');
}

/** Libera o mapa completo e cria a senha de acesso (se ainda não tiver). Devolve a senha. */
export async function liberarMapa(id: string): Promise<string> {
  const { data: m } = await db().from('mapas').select('senha').eq('id', id).maybeSingle();
  const senha = m?.senha || gerarSenha();
  await db().from('mapas').update({ liberado: true, liberado_em: new Date().toISOString(), senha, senha_em: m?.senha ? undefined : new Date().toISOString() }).eq('id', id);
  return senha;
}

/** Gera uma senha nova para o mapa (a antiga deixa de funcionar). */
export async function novaSenha(id: string): Promise<string> {
  const senha = gerarSenha();
  await db().from('mapas').update({ senha, senha_em: new Date().toISOString() }).eq('id', id);
  return senha;
}

/** Valor do cookie que prova que o leitor digitou a senha certa (muda quando a senha muda). */
export function cookieSenha(m: { slug: string; senha?: string | null }) {
  return createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY || 'mapa').update('senha:' + m.slug + ':' + (m.senha || '')).digest('hex').slice(0, 24);
}

/** Leitor pode ver o mapa completo? (prévia não pede senha; equipe sempre pode) */
export function acessoLiberado(m: { slug: string; senha?: string | null; liberado: boolean }, req: Request, equipe: boolean) {
  if (equipe || !m.liberado || !m.senha) return true;
  const c = req.headers.get('cookie') || '';
  return c.split(/;\s*/).some(x => x === `mapa_${m.slug}=${cookieSenha(m)}`);
}

/** Envia o mapa completo (link + PDF) no WhatsApp do lead, pelo número que atende a conversa. */
export async function enviarMapaCompleto(m: MapaRow, lead: any, number: any, sendText: (t: string) => Promise<any>) {
  const { evo } = await import('../evolution');
  const senha = await liberarMapa(m.id);
  const pdf = await pdfDoMapa({ ...m, liberado: true });
  const nome = String(lead?.memory?.nome_cliente || m.nome).split(' ')[0];
  const es = lead?.idioma === 'es'
  if (es) await sendText(`${nome}, ¡tu Mapa del Alma completo está listo! ✨\n\nPara leerlo en el celular, con calma 👇\n${linkMapa(m)}\n\n🔐 Tu contraseña de acceso: *${senha}*\n(es solo tuya: guárdala con cariño)\n\nY aquí abajo va el PDF completo para que lo guardes 💜`)
  else await sendText(`${nome}, o seu Mapa da Alma completo está pronto ✨\n\nPra ler no celular, com calma 👇\n${linkMapa(m)}\n\n🔐 Sua senha de acesso: *${senha}*\n(é só sua: guarde com carinho)\n\nE aqui embaixo vai o PDF completo pra você guardar 💜`);
  const { enviarMidia } = await import('./midia');
  await enviarMidia(number, lead, { tipo: 'pdf', b64: pdf.toString('base64'), nome: nomeArquivo(m, es), body: `[PDF ${nomeArquivo(m, es)}]`, meta: { mapa: m.slug } });
  await db().from('mapas').update({ sent_at: new Date().toISOString() }).eq('id', m.id);
  // a senha fica na memória da conversa: se o cliente pedir de novo, a IA (e a equipe) sabem qual é
  if (lead?.id) await db().from('leads').update({ memory: { ...(lead.memory || {}), senha_mapa: senha } }).eq('id', lead.id).then(() => {}, () => {});
}

/** Chave para a equipe abrir o mapa completo (mesmo antes do pagamento) pelo painel. */
export function chaveEquipe(slug: string) {
  return createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY || 'mapa').update('mapa:' + slug).digest('hex').slice(0, 20);
}

/** Link só com as pirâmides escolhidas (1, 2 ou 3): o cliente vê antes de comprar, sem senha. Assinado para não abrir as outras. */
export function chavePiramides(slug: string, so: string[]) {
  return createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY || 'mapa').update('pir:' + slug + ':' + so.join(',')).digest('hex').slice(0, 16);
}
export async function linkPiramides(slug: string, so0: string[] | string): Promise<string> {
  const { pirValidas } = await import('./mapa/piramides.ts');
  const so = pirValidas(so0);
  if (!so.length) throw new Error('Escolha pelo menos uma pirâmide');
  return `${urlMapa(slug, '/piramides')}?so=${so.join(',')}&t=${chavePiramides(slug, so)}`;
}

