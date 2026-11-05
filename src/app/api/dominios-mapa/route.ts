import { NextResponse } from 'next/server';
import dns from 'dns/promises';
import { withUser } from '@/lib/supabase/server';
import { target } from '@/lib/domains';

export const dynamic = 'force-dynamic';

const limpo = (h?: string) => String(h || '').toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

/** Domínios do Mapa (português e espanhol) com o DNS esperado e o que o DNS público responde agora. */
export const GET = withUser(async () => {
  const { ip, baseHost } = await target();
  const grupos = [
    { id: 'pt', nome: 'Português (Brasil)', raiz: limpo(process.env.MAPA_HOST_BR), pagamento: 'Asaas', ico: '🇧🇷' },
    { id: 'es', nome: 'Espanhol (outros países)', raiz: limpo(process.env.MAPA_HOST), pagamento: 'Kiwify', ico: '🌎' },
  ];
  const out = await Promise.all(
    grupos.map(async (g) => {
      if (!g.raiz) return { ...g, hosts: [] as any[] };
      const hosts = [
        { host: g.raiz, nome: '@', papel: 'Página de vendas' },
        { host: 'www.' + g.raiz, nome: 'www', papel: 'Página de vendas (www)' },
        { host: 'acesso.' + g.raiz, nome: 'acesso', papel: 'Mapas e tarôs dos clientes' },
        { host: 'preview.' + g.raiz, nome: 'preview', papel: 'Prévias dos mapas' },
      ];
      const rs = await Promise.all(
        hosts.map(async (h) => {
          const a = await dns.resolve4(h.host).catch(() => [] as string[]);
          return { ...h, tipo: 'A', valor: ip, encontrado: a, dns_ok: !!ip && a.includes(ip) };
        }),
      );
      return { ...g, hosts: rs };
    }),
  );
  const painel = baseHost
    ? { host: baseHost, encontrado: await dns.resolve4(baseHost).catch(() => [] as string[]) }
    : null;
  return NextResponse.json({ ip, baseHost, grupos: out, painel, geradoEm: new Date().toISOString() });
}, { master: true });
