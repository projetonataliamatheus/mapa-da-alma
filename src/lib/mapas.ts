// Criar, gerar PDF e enviar mapas.
import { randomBytes } from 'node:crypto'
import { db, storage, config } from './db.ts'
import { montarConteudo, montarCasal, type Conteudo, type Overrides } from './mapa/conteudo.ts'
import { htmlWeb, htmlPdf, MARCA_PADRAO, type Marca } from './mapa/html.ts'
import { htmlParaPdf, whatsapp, appUrl } from './integracoes.ts'

export interface MapaRow {
  id: string; slug: string; cliente_id: string | null; tipo: 'pessoal' | 'casal'
  nome: string; nascimento: string; nome2: string | null; nascimento2: string | null
  pdf_path: string | null; status: string; enviado_em: string | null; visualizacoes: number; criado_em: string
}

const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)

export async function overrides(): Promise<Overrides> {
  const linhas = await db.select<{ categoria: string; numero: string; conteudo: string }>('textos')
  return Object.fromEntries(linhas.map(l => [`${l.categoria}:${l.numero}`, l.conteudo]))
}

export async function marca(): Promise<Marca> {
  const c = await config()
  return { ...MARCA_PADRAO, ...(c.marca || {}) }
}

export async function conteudoDe(m: MapaRow): Promise<Conteudo> {
  const ov = await overrides()
  // Ano/mês/dia pessoal e arcano atual são calculados na data em que o mapa foi gerado.
  const hoje = m.criado_em.slice(0, 10)
  return m.tipo === 'casal' && m.nome2 && m.nascimento2
    ? montarCasal(m.nome, m.nascimento, m.nome2, m.nascimento2, ov, hoje)
    : montarConteudo(m.nome, m.nascimento, ov, hoje)
}

export const linkMapa = (m: { slug: string }) => `${appUrl()}/m/${m.slug}`

export async function criarMapa(d: { clienteId?: string | null; tipo: 'pessoal' | 'casal'; nome: string; nascimento: string; nome2?: string; nascimento2?: string }): Promise<MapaRow> {
  const base = slugify(d.tipo === 'casal' && d.nome2 ? `${d.nome.split(' ')[0]}-e-${d.nome2.split(' ')[0]}` : d.nome)
  const slug = `${base}-${randomBytes(4).toString('hex')}`
  return db.insert<MapaRow>('mapas', {
    slug, cliente_id: d.clienteId || null, tipo: d.tipo, nome: d.nome.trim(), nascimento: d.nascimento,
    nome2: d.nome2?.trim() || null, nascimento2: d.nascimento2 || null,
  })
}

export async function paginaAoVivo(m: MapaRow): Promise<string> {
  return htmlWeb(await conteudoDe(m), await marca(), { pdfUrl: `/m/${m.slug}.pdf` })
}

/** Gera (ou reaproveita) o PDF guardado no Storage. */
export async function pdfDoMapa(m: MapaRow, refazer = false): Promise<Buffer> {
  if (m.pdf_path && !refazer) {
    const b = await storage.get(m.pdf_path)
    if (b) return b
  }
  const pdf = await htmlParaPdf(htmlPdf(await conteudoDe(m), await marca()))
  const path = `${m.slug}.pdf`
  await storage.put(path, pdf)
  await db.update('mapas', { id: `eq.${m.id}` }, { pdf_path: path })
  return pdf
}

export const nomeArquivo = (m: MapaRow) => `Mapa da Alma - ${m.tipo === 'casal' && m.nome2 ? `${m.nome.split(' ')[0]} e ${m.nome2.split(' ')[0]}` : m.nome}.pdf`

/** Envia o link ao vivo + o PDF pelo WhatsApp do cliente. */
export async function enviarMapa(m: MapaRow, numero: string, mensagem?: string) {
  const pdf = await pdfDoMapa(m)
  const primeiro = m.nome.split(' ')[0]
  const texto = mensagem || `${primeiro}, o seu Mapa da Alma está pronto! ✨\n\nVocê pode ver online, no celular, por aqui:\n${linkMapa(m)}\n\nE logo abaixo vai o PDF completo para guardar. Leia com calma, tá? Qualquer dúvida, é só me chamar. 💜`
  await whatsapp.texto(numero, texto, 2500)
  await whatsapp.pdf(numero, pdf.toString('base64'), nomeArquivo(m), '')
  await db.update('mapas', { id: `eq.${m.id}` }, { status: 'enviado', enviado_em: new Date().toISOString() })
  if (m.cliente_id) {
    await db.insert('mensagens', { cliente_id: m.cliente_id, autor: 'sistema', texto: `📄 Mapa enviado: ${linkMapa(m)}` })
    await db.update('clientes', { id: `eq.${m.cliente_id}` }, { etapa: 'entregue' })
  }
}
