import { NextResponse } from 'next/server'
import { withUser } from '@/lib/supabase/server'
import { admin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/** Funil do quiz de teste: por tela, quantos chegaram, quantos avançaram e quantos saíram (contagem por visitante anônimo). */
export const GET = withUser(async (req: Request) => {
  const dias = Math.min(60, Math.max(1, Number(new URL(req.url).searchParams.get('dias')) || 7))
  const desde = new Date(Date.now() - dias * 86400000).toISOString()
  const rows: any[] = []
  for (let from = 0; from < 50000; from += 1000) {
    const { data, error } = await admin().from('quiz_eventos').select('sid,tela,tipo,pais,faixa').gte('created_at', desde).range(from, from + 999)
    if (error) return NextResponse.json({ error: 'Tabela quiz_eventos não existe ainda: rode a migração 067 no Supabase.' }, { status: 500 })
    rows.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  const porSid = new Map<string, { max: number; telas: Set<number>; checkout: boolean; pais: string | null; faixa: string | null }>()
  for (const r of rows) {
    const o = porSid.get(r.sid) || { max: 0, telas: new Set<number>(), checkout: false, pais: null, faixa: null }
    if (r.tipo === 'checkout') o.checkout = true
    else { o.telas.add(r.tela); o.max = Math.max(o.max, r.tela) }
    if (r.pais) o.pais = r.pais
    if (r.faixa) o.faixa = r.faixa
    porSid.set(r.sid, o)
  }
  const telas = Array.from({ length: 52 }, (_, i) => i + 1).map((n) => {
    const chegaram = Array.from(porSid.values()).filter((o) => o.telas.has(n)).length
    const avancaram = Array.from(porSid.values()).filter((o) => o.max > n).length
    return { tela: n, chegaram, avancaram, sairam: Math.max(0, chegaram - avancaram) }
  })
  const v = Array.from(porSid.values())
  return NextResponse.json({
    dias, visitantes: v.length, cliques_pagar: v.filter((o) => o.checkout).length, telas,
    faixas: { frio: v.filter((o) => o.faixa === 'frio').length, morno: v.filter((o) => o.faixa === 'morno').length, quente: v.filter((o) => o.faixa === 'quente').length },
    idiomas: { br: v.filter((o) => o.pais === 'BR').length, es: v.filter((o) => o.pais && o.pais !== 'BR').length },
  })
})
