import { NextResponse } from 'next/server';
import { withUser, need } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { estadoConsumo, avaliarConsumo } from '@/lib/consumo-alertas';

export const dynamic = 'force-dynamic';

/** Serviços com saldo acabando agora + avisos ainda não lidos (usado pelo menu, sininho e som). */
export const GET = withUser(async () => {
  await avaliarConsumo().catch(() => {});
  const [{ servicos }, { data: avisos }] = await Promise.all([
    estadoConsumo(),
    admin().from('consumo_alertas').select('id,service,nivel,titulo,mensagem,created_at').eq('lida', false).order('created_at', { ascending: false }).limit(20),
  ]);
  return NextResponse.json({
    ativos: servicos.filter((s) => s.ativo_alerta).map((s) => ({ id: s.id, nome: s.nome, restante: s.restante, unidade: s.unidade })),
    avisos: avisos || [],
  });
}, { perm: 'custos' });

export const POST = withUser(async (req, _c, user) => {
  need(user, 'custos');
  const b = await req.json().catch(() => ({}));
  if (b.action === 'ler') await admin().from('consumo_alertas').update({ lida: true }).eq('lida', false);
  return NextResponse.json({ ok: true });
}, { perm: 'custos' });
