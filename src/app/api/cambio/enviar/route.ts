import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { connectedNumber, sendAndRecord } from '@/lib/engine';
import { paisDoLead } from '@/lib/internacional';
import { converter, moedaDoPais, MOEDAS } from '@/lib/cambio';

export const dynamic = 'force-dynamic';

/** Manda na conversa o valor do mapa na moeda do cliente (câmbio do dia), em espanhol e com o número certo. */
export const POST = withUser(async (req) => {
  const b = await req.json();
  const db = admin();
  const { data: lead } = await db.from('leads').select('*').eq('id', String(b.leadId || '')).maybeSingle();
  if (!lead) return NextResponse.json({ error: 'Contato não encontrado.' }, { status: 404 });
  if (lead.idioma !== 'es') return NextResponse.json({ error: 'Este botão é para contatos de fora do Brasil (espanhol). No Brasil o valor é em R$.' }, { status: 400 });
  const pais = await paisDoLead(lead);
  const code = String(b.moeda || '').toUpperCase() || moedaDoPais(lead.pais || pais.codigo);
  if (!code || !MOEDAS[code]) return NextResponse.json({ error: 'Não tenho a moeda deste país. Escolha uma moeda ou escreva manualmente.' }, { status: 400 });
  const c = await converter(Number(pais.preco) || 10, code);
  if (!c) return NextResponse.json({ error: 'Não consegui o câmbio agora. Tente em instantes.' }, { status: 502 });
  const number = await connectedNumber(lead.number_id);
  if (!number) return NextResponse.json({ error: 'Nenhum número do WhatsApp conectado.' }, { status: 400 });
  const nome = String(lead.memory?.nome_cliente || lead.name || '').split(/\s+/)[0];
  const texto = `${nome ? nome + ', ' : ''}te lo paso en tu moneda: hoy US$ ${pais.preco} equivale a unos $ ${c.texto.replace(/ .*/, '')} ${c.nome} (cambio del día, aproximado). El cobro es de US$ ${pais.preco}, una sola vez, y en el enlace de pago ves el valor convertido a tu moneda con tarjeta de crédito o débito 💜`;
  await sendAndRecord(number, lead, texto, 'ai', true, { cambio: c.moeda });
  return NextResponse.json({ ok: true, texto });
}, { perm: 'conversas.responder' });
