import { NextResponse } from 'next/server'
import { admin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/** Registra o clique do visitante (WhatsApp ou pagamento) no teste gratuito: base do rastreio site → conversa → compra. */
export async function POST(req: Request) {
  const b: any = await req.json().catch(() => ({}))
  const ref = String(b.ref || '').toUpperCase()
  const tipo = b.tipo === 'checkout' ? 'checkout' : 'whatsapp'
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(ref)) return NextResponse.json({ ok: false })
  const db = admin()
  const { data: sl } = await db.from('site_leads').select('id,cliques,lead_id').eq('ref', ref).maybeSingle()
  if (!sl) return NextResponse.json({ ok: false })
  const agora = new Date().toISOString()
  await db.from('site_leads').update({ [tipo === 'checkout' ? 'checkout_click_at' : 'wa_click_at']: agora, cliques: [...(sl.cliques || []).slice(-20), { tipo, em: agora }] }).eq('id', sl.id)
  if (sl.lead_id) await db.from('lead_events').insert({ lead_id: sl.lead_id, type: 'site_clique', channel: 'acc', text: `Clicou no site em ${tipo === 'checkout' ? 'Pagar' : 'WhatsApp'}` }).then(() => {}, () => {})
  return NextResponse.json({ ok: true })
}
