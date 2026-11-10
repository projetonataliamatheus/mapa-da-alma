import { NextResponse } from 'next/server'
import { dataISO } from '@/lib/mapa-alma/servico'
import { nomeProprio } from '@/lib/mapa-alma/nome'
import { montarEtapasQuiz } from '@/lib/quiz-etapas'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const uso = new Map<string, number[]>()
const limite = (ip: string) => {
  const agora = Date.now(), lista = (uso.get(ip) || []).filter((t) => agora - t < 3600_000)
  if (lista.length >= 10) return false
  lista.push(agora); uso.set(ip, lista); if (uso.size > 5000) uso.clear()
  return true
}

/** Quiz de teste: calcula o mapa real (mesmo gerador do site) e devolve o resultado parcial. NÃO grava nome nem data. */
export async function POST(req: Request) {
  const b: any = await req.json().catch(() => ({}))
  const pt = b.idioma === 'pt'
  const T = (es: string, p: string) => (pt ? p : es)
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'x'
  if (!limite(ip)) return NextResponse.json({ error: T('Demasiados intentos. Inténtalo en un rato.', 'Muitas tentativas. Tente de novo daqui a pouco.') }, { status: 429 })
  const nome = nomeProprio(String(b.nombre || '').slice(0, 90))
  const nasc = dataISO(String(b.fecha || ''))
  if (nome.split(' ').filter((p) => p.length > 1).length < 2 || /[^\p{L}'’ .-]/u.test(nome)) return NextResponse.json({ error: T('Escribe tu nombre completo de nacimiento.', 'Escreva seu nome completo de nascimento.') }, { status: 400 })
  if (!nasc || nasc < '1910-01-01' || nasc > new Date().toISOString().slice(0, 10)) return NextResponse.json({ error: T('Revisa tu fecha de nacimiento.', 'Confira sua data de nascimento.') }, { status: 400 })
  try {
    const etapas = await montarEtapasQuiz(nome, nasc, pt ? 'pt' : 'es')
    if (!etapas) return NextResponse.json({ error: T('No pudimos preparar tu estudio ahora. Inténtalo de nuevo en unos segundos.', 'Não conseguimos preparar seu estudo agora. Tente de novo em alguns segundos.') }, { status: 503 })
    return NextResponse.json({ nombre: nome, etapas })
  } catch (e: any) {
    console.error('quizz mapa', e)
    return NextResponse.json({ error: T('No pudimos preparar tu estudio ahora. Inténtalo de nuevo.', 'Não conseguimos preparar seu estudo agora. Tente de novo.') }, { status: 500 })
  }
}
