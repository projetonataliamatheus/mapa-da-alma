import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Domínios do Link na bio (olinks.com.br e os próximos). Mais domínios: variável BIO_HOSTS no Easypanel, separados por vírgula. */
const BIO_HOSTS = new Set(
  (process.env.BIO_HOSTS || 'olinks.com.br')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
    .flatMap((h) => [h, 'www.' + h]),
);

const CATALOG_HOSTS = new Set(
  (process.env.CATALOG_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
    .flatMap((h) => [h, 'www.' + h]),
);

/** Domínio das galerias de Packs Canva (packs.suaagencia.com.br/nicho). Mais domínios: PACKS_HOSTS no Easypanel. */
const PACKS_HOSTS = new Set(
  (process.env.PACKS_HOSTS || 'packs.agenciafenixads.com.br')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean),
);

/** Nível de autenticação gravado no token (aal1 = só senha; aal2 = senha + código). */
function jwtAal(token?: string) {
  try {
    const p = (token || '').split('.')[1] || '';
    const json = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((p.length + 3) % 4)));
    return String(json.aal || '');
  } catch {
    return '';
  }
}

/** Subdomínio só de prévias: previa.agenciafenixads.com.br/cliente → o site da prévia (sem login, sem painel). */
const PREVIA_HOSTS = new Set(
  (process.env.PREVIA_HOSTS || 'previa.agenciafenixads.com.br')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean),
);

export async function middleware(request: NextRequest) {
  // olinks.com.br/empresa → página do cliente; olinks.com.br/editar/xxx → edição pelo cliente
  const host = (request.headers.get('host') || '').toLowerCase().split(':')[0];
  // domínio só de catálogo (Domínios › Catálogo digital): loja.com.br/nome → cardápio
  if (CATALOG_HOSTS.has(host)) {
    const path = request.nextUrl.pathname;
    if (path.startsWith('/api/') || path.startsWith('/_next/') || path.startsWith('/c/') || path === '/cliente' || path === '/favicon.ico') return NextResponse.next();
    const to = request.nextUrl.clone();
    to.pathname = '/c' + (path === '/' ? '' : path.toLowerCase().replace(/\/$/, ''));
    return NextResponse.rewrite(to);
  }
  // subdomínios públicos por função (qualquer domínio): previa., orcamento., relatorio., pagamento., catalogo.
  const sub = host.split('.')[0];
  const PUBLIC_ROOT: Record<string, string> = { previa: '/site', orcamento: '/orcamento', relatorio: '/relatorio', pagamento: '/pagar', catalogo: '/c' };
  const root = PREVIA_HOSTS.has(host) ? '/site' : !BIO_HOSTS.has(host) ? PUBLIC_ROOT[sub] : undefined;
  if (root) {
    const path = request.nextUrl.pathname;
    const pass = ['/api/', '/_next/', '/images/', '/fonts/', '/previa/', '/site/', '/amostra/', '/contrato/', '/orcamento/', '/relatorio/', '/pagar/', '/c/'];
    if (pass.some((x) => path.startsWith(x)) || path === '/favicon.ico') return NextResponse.next();
    if (path === '/' || path.startsWith('/login')) {
      const to = request.nextUrl.clone();
      to.host = host.split('.').slice(1).join('.');
      to.pathname = '/';
      to.port = '';
      return NextResponse.redirect(to);
    }
    const to = request.nextUrl.clone();
    to.pathname = root + (root === '/site' || root === '/c' ? path.toLowerCase() : path).replace(/\/$/, '');
    return NextResponse.rewrite(to);
  }
  if (PACKS_HOSTS.has(host)) {
    const path = request.nextUrl.pathname;
    if (path.startsWith('/api/') || path.startsWith('/_next/') || path.startsWith('/p/') || path === '/p' || path === '/favicon.ico') return NextResponse.next();
    const to = request.nextUrl.clone();
    to.pathname = '/p' + (path === '/' ? '' : path.toLowerCase().replace(/\/$/, ''));
    return NextResponse.rewrite(to);
  }
  if (BIO_HOSTS.has(host)) {
    const path = request.nextUrl.pathname;
    // olinks.com.br/c/loja → catálogo digital (mesmo domínio)
    if (path.startsWith('/api/') || path.startsWith('/_next/') || path.startsWith('/c/') || path === '/cliente' || path === '/favicon.ico') return NextResponse.next();
    const to = request.nextUrl.clone();
    to.pathname = path === '/' ? '/l' : '/l' + (/^\/[A-Za-z0-9]{2,30}\/?$/.test(path) ? path.toLowerCase().replace(/\/$/, '') : path);
    return NextResponse.rewrite(to);
  }
  // a API confere o login sozinha (withUser): não precisa de uma ida extra ao Supabase aqui
  if (request.nextUrl.pathname.startsWith('/api/')) return NextResponse.next();
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || url.includes('exemplo')) return response;
  if (request.nextUrl.pathname.startsWith('/mapa/') || request.nextUrl.pathname === '/mapa-astral' || request.nextUrl.pathname === '/sitemap.xml' || request.nextUrl.pathname === '/robots.txt' || /^\/google[a-z0-9]+\.html$/.test(request.nextUrl.pathname) || request.nextUrl.pathname.startsWith('/taro/') || request.nextUrl.pathname.startsWith('/pagar') || request.nextUrl.pathname.startsWith('/previa') || request.nextUrl.pathname.startsWith('/site/') || request.nextUrl.pathname.startsWith('/l/') || request.nextUrl.pathname === '/l' || request.nextUrl.pathname.startsWith('/c/') || request.nextUrl.pathname.startsWith('/p/') || request.nextUrl.pathname === '/p' || request.nextUrl.pathname === '/termos' || request.nextUrl.pathname === '/privacidade' || request.nextUrl.pathname.startsWith('/orcamento/') || request.nextUrl.pathname.startsWith('/relatorio/') || request.nextUrl.pathname.startsWith('/contrato/') || request.nextUrl.pathname.startsWith('/amostra/') || request.nextUrl.pathname === '/cliente' || request.nextUrl.pathname.startsWith('/orcamento/') || request.nextUrl.pathname.startsWith('/relatorio/')) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list: { name: string; value: string; options?: any }[]) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // só lê a sessão do cookie (renova se venceu): sem ida ao servidor do Supabase a cada clique.
  // Os dados continuam protegidos: a API e o banco (RLS) conferem o usuário de verdade.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user || null;
  const path = request.nextUrl.pathname;
  const isPublic = path.startsWith('/mapa/') || path === '/mapa-astral' || path === '/sitemap.xml' || path === '/robots.txt' || /^\/google[a-z0-9]+\.html$/.test(path) || path.startsWith('/taro/') || path.startsWith('/amostra/') || path.startsWith('/contrato/') || path.startsWith('/orcamento/') || path.startsWith('/relatorio/') || path.startsWith('/login') || path.startsWith('/api/') || path.startsWith('/pagar') || path.startsWith('/previa') || path.startsWith('/site/') || path.startsWith('/l/') || path === '/l' || path.startsWith('/c/');
  if (!user && !isPublic) {
    const to = request.nextUrl.clone();
    to.pathname = '/login';
    return NextResponse.redirect(to);
  }
  // 2 fatores obrigatório: sem o código do Google Authenticator (aal2) só abre a tela de verificação
  const aal = user ? jwtAal(session?.access_token) : '';
  if (user && aal !== 'aal2' && !path.startsWith('/login/2fa') && !path.startsWith('/login/nova-senha') && !isPublic) {
    const to = request.nextUrl.clone();
    to.pathname = '/login/2fa';
    return NextResponse.redirect(to);
  }
  // a tela de senha nova precisa abrir mesmo logado (o link do e-mail cria a sessão)
  if (user && path.startsWith('/login') && !path.startsWith('/login/nova-senha') && !path.startsWith('/login/2fa')) {
    const to = request.nextUrl.clone();
    to.pathname = aal === 'aal2' ? '/' : '/login/2fa';
    return NextResponse.redirect(to);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)'],
};
