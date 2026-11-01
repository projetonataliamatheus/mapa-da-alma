import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { isMaster } from '@/lib/perms';
import { evo } from '@/lib/evolution';
import { getSettings } from '@/lib/settings';
import { logEvent } from '@/lib/engine';

export const dynamic = 'force-dynamic';

function device(ua: string) {
  const os = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Outro';
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  return `${br} · ${os}`;
}

/** Registra a entrada no painel (uma vez por sessão). Aparelho/rede novos geram aviso no WhatsApp do Master. */
export const POST = withUser(async (req, _ctx, user) => {
  const ua = req.headers.get('user-agent') || '';
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || '';
  const dev = device(ua);
  const net = ip.split(/[.:]/).slice(0, 2).join('.');
  const db = admin();
  const { data: prev } = await db.from('access_log').select('device,ip').eq('user_id', user.id).gte('created_at', new Date(Date.now() - 120 * 86400_000).toISOString()).limit(300);
  const known = (prev || []).some((p: any) => p.device === dev && String(p.ip || '').split(/[.:]/).slice(0, 2).join('.') === net);
  const isNew = !known;
  await db.from('access_log').insert({ user_id: user.id, email: user.email, name: user.member?.name || user.email, ip, device: dev, user_agent: ua.slice(0, 300), new_device: isNew });
  // só avisa quando a pessoa já tinha acessos registrados (o primeiro registro de cada um não dispara)
  if (isNew && (prev || []).length) {
    const when = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    await logEvent(null, 'login_new', 'warn', `Novo acesso de ${user.member?.name || user.email}: ${dev} · IP ${ip} · ${when}`).catch(() => {});
    try {
      const s: any = await getSettings(db);
      const { data: nums } = await db.from('whatsapp_numbers').select('instance_name,phone').eq('status', 'conectado').order('created_at').limit(1);
      const to = String(s.report?.to || nums?.[0]?.phone || '').replace(/\D/g, '');
      if (nums?.[0] && to)
        await evo.sendText(nums[0].instance_name, to.length <= 11 ? '55' + to : to, `🔐 *Novo acesso ao painel*\n${user.member?.name || user.email} entrou de um aparelho ou rede nova.\n${dev} · IP ${ip}\n${when}\n\nSe não foi alguém da equipe, redefina a senha e o 2FA em Equipe.`, 0);
    } catch {}
  }
  return NextResponse.json({ ok: true, new: isNew });
});

/** Últimos acessos (só o Master). */
export const GET = withUser(async (_req, _ctx, user) => {
  if (!isMaster(user.member)) return NextResponse.json({ error: 'Só o Master vê o registro de acessos.' }, { status: 403 });
  const { data } = await admin().from('access_log').select('*').order('created_at', { ascending: false }).limit(300);
  return NextResponse.json({ items: data || [] });
});
