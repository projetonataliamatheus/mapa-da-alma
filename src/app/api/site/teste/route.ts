import { NextResponse } from 'next/server'
import { admin } from '@/lib/supabase/admin'
import { criarMapa, dataISO } from '@/lib/mapa-alma/servico'
import { chaveNome, nomeProprio } from '@/lib/mapa-alma/nome'
import { montarTeaser, novoRef } from '@/lib/site-origem'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const uso = new Map<string, number[]>()
const limite = (ip: string) => {
  const agora = Date.now(), lista = (uso.get(ip) || []).filter((t) => agora - t < 3600_000)
  if (lista.length >= 8) return false
  lista.push(agora); uso.set(ip, lista); if (uso.size > 5000) uso.clear()
  return true
}

/** Teste gratuito da página de vendas: nome completo + fecha → resultado parcial (só o que o mapa aponta; o "o que fazer" fica no mapa completo). */
export async function POST(req: Request) {
  const b: any = await req.clone().json().catch(() => ({}))
  const pt = b.idioma === 'pt'
  const T = (es: string, ptx: string) => (pt ? ptx : es)
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'x'
  if (!limite(ip)) return NextResponse.json({ error: T('Demasiados intentos. Inténtalo de nuevo en un rato.', 'Muitas tentativas. Tente de novo daqui a pouco.') }, { status: 429 })
  const nome = nomeProprio(String(b.nombre || '').slice(0, 90))
  const nasc = dataISO(String(b.fecha || ''))
  if (nome.split(' ').filter((p) => p.length > 1).length < 2 || /[^\p{L}'’ .-]/u.test(nome)) return NextResponse.json({ error: T('Escribe tu nombre completo de nacimiento (nombre y apellidos).', 'Escreva seu nome completo de nascimento (nome e sobrenomes).') }, { status: 400 })
  if (!nasc || nasc < '1910-01-01' || nasc > new Date().toISOString().slice(0, 10)) return NextResponse.json({ error: T('Revisa tu fecha de nacimiento (día, mes y año).', 'Confira sua data de nascimento (dia, mês e ano).') }, { status: 400 })
  try {
    const teaser = await montarTeaser(nome, nasc, pt ? 'pt' : 'es')
    if (!teaser) return NextResponse.json({ error: T('No pudimos preparar tu estudio ahora. Inténtalo de nuevo en unos segundos.', 'Não conseguimos preparar seu estudo agora. Tente de novo em alguns segundos.') }, { status: 503 })
    const m = await criarMapa({ tipo: 'pessoal', nome, nascimento: nasc, by: 'ia' })
    const db = admin()
    const chave = chaveNome(nome)
    const { data: ja } = await db.from('site_leads').select('ref').eq('nome_chave', chave).eq('nascimento', nasc).gte('created_at', new Date(Date.now() - 7 * 86400_000).toISOString()).order('created_at', { ascending: false }).limit(1)
    let ref = ja?.[0]?.ref as string | undefined
    const meta = { utm: b.utm && typeof b.utm === 'object' ? b.utm : {}, fbp: String(b.fbp || '').slice(0, 120) || null, fbc: String(b.fbc || '').slice(0, 200) || null, ua: (req.headers.get('user-agent') || '').slice(0, 300), ip: (req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0] || req.headers.get('x-real-ip') || '').trim().slice(0, 64) || null, pais: req.headers.get('cf-ipcountry') || req.headers.get('x-vercel-ip-country') || null }
    if (ref) await db.from('site_leads').update({ mapa_slug: m.slug, idioma: pt ? 'pt' : 'es', ...meta }).eq('ref', ref)
    else {
      ref = novoRef()
      const { error } = await db.from('site_leads').insert({ ref, nome, nome_chave: chave, nascimento: nasc, mapa_slug: m.slug, idioma: pt ? 'pt' : 'es', ...meta })
      if (error) throw new Error(error.message)
    }
    return NextResponse.json({ ref, nombre: nome, fecha: nasc.split('-').reverse().join('/'), teaser })
  } catch (e: any) {
    console.error('site teste', e)
    return NextResponse.json({ error: T('No pudimos preparar tu estudio ahora. Inténtalo de nuevo.', 'Não conseguimos preparar seu estudo agora. Tente de novo.') }, { status: 500 })
  }
}
