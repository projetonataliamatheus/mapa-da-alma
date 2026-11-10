import { NextResponse } from 'next/server'
import { admin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/** Medição do quiz de teste: só sid anônimo, tela, país e faixa. Nunca recebe nome nem data. */
export async function POST(req: Request) {
  const b: any = await req.json().catch(() => ({}))
  const sid = String(b.sid || '').replace(/[^a-z0-9]/gi, '').slice(0, 16)
  const tela = Math.round(Number(b.tela))
  if (!sid || !(tela >= 1 && tela <= 60)) return NextResponse.json({ ok: false })
  const tipo = b.tipo === 'checkout' ? 'checkout' : 'tela'
  const pais = b.pais ? String(b.pais).replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() : null
  const faixa = ['frio', 'morno', 'quente'].includes(b.faixa) ? b.faixa : null
  await admin().from('quiz_eventos').insert({ sid, tela, tipo, pais, faixa }).then(() => {}, () => {})
  return NextResponse.json({ ok: true })
}
