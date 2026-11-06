'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Toaster, initials, ding, sessionExpired } from './ui';
import { PauseToggle } from './PageHead';
import { sb } from '@/lib/supabase/browser';
import { ART } from '@/data/manual';
import { norm } from '@/lib/util';
import { can, pagePerm, roleLabel, PERMS, MASTER_ONLY } from '@/lib/perms';
import { BrandBlock, useBrand } from './Brand';
import { FinAlerts } from './FinAlerts';
import { menuLabel } from '@/lib/brand';

export const NAV: [string, [string, string, string][]][] = [
  ['Operação', [['/', 'Visão geral', 'pulse'], ['/conversas', 'Conversas', 'chat'], ['/mapas', 'Gerador de mapas', 'star'], ['/taro', 'Tarô', 'spark'], ['/simpatias', 'Simpatias', 'heart'], ['/leads', 'Leads e funil', 'board']]],
  ['Vendas', [['/links', 'Links de pagamento', 'money'], ['/servicos', 'Mapas e preços', 'tag'], ['/checkout-editor', 'Editor do checkout', 'spark']]],
  ['Financeiro', [['/financeiro', 'Financeiro', 'pix']]],
  ['Inteligência da IA', [['/abordagens', 'Abordagens', 'chat'], ['/fluxo', 'Fluxo', 'send'], ['/paises', 'Países e preços', 'globe'], ['/campanhas', 'Campanhas', 'target'], ['/inteligencia', 'Inteligência', 'robot'], ['/aprendizado', 'Aprendizado', 'bulb'], ['/conhecimento', 'Base de conhecimento', 'book']]],
  ['Sistema', [['/numeros', 'Números WhatsApp', 'phone'], ['/vozes', 'Vozes (ElevenLabs)', 'mic'], ['/custos', 'Custos', 'trend'], ['/consumo', 'Consumo (todos os serviços)', 'pulse'], ['/config', 'Configurações', 'sliders'], ['/dominios', 'Domínios', 'globe'], ['/uso', 'Uso do sistema', 'trend'], ['/equipe', 'Equipe', 'users'], ['/ajuda', 'Ajuda e Manuais', 'help']]],
];
/** Menu lateral enxuto: cada item abre uma tela com ABAS no cabeçalho (as telas continuam as mesmas, só ficam agrupadas). */
export const MENU: { label: string; icon: string; tabs: string[] }[] = [
  { label: 'Visão geral', icon: 'pulse', tabs: ['/'] },
  { label: 'Conversas e Leads', icon: 'chat', tabs: ['/conversas', '/leads'] },
  { label: 'Mapas e Tarô', icon: 'star', tabs: ['/mapas', '/taro', '/simpatias'] },
  { label: 'Vendas', icon: 'money', tabs: ['/links', '/servicos', '/checkout-editor', '/paises'] },
  { label: 'Financeiro', icon: 'pix', tabs: ['/financeiro', '/custos'] },
  { label: 'Inteligência da IA', icon: 'robot', tabs: ['/abordagens', '/inteligencia', '/aprendizado', '/conhecimento'] },
  { label: 'WhatsApp e Fluxo', icon: 'phone', tabs: ['/numeros', '/vozes', '/fluxo', '/campanhas'] },
  { label: 'Sistema', icon: 'sliders', tabs: ['/config', '/consumo', '/dominios', '/uso', '/equipe'] },
  { label: 'Ajuda e Manuais', icon: 'help', tabs: ['/ajuda'] },
];
// "Sites" junta as duas telas de modelos (abas dentro)
const isActive = (href: string, path: string) => (href === '/' ? path === '/' : href === '/modelos-premium' ? path.startsWith('/modelos') : path.startsWith(href));

/** Menu com os nomes trocados pelo Master (Configurações › Marca do painel). */
export function useNav() {
  const { brand } = useBrand();
  return useMemo(
    () => NAV.map(([g, items]) => [menuLabel(brand, 'g:' + g, g), items.map(([h, l, i]) => [h, menuLabel(brand, h, l), i] as [string, string, string])] as [string, [string, string, string][]]),
    [brand],
  );
}

const MeCtx = createContext<any>(null);
export const useMe = () => useContext(MeCtx);
/** can('links.criar') → o usuário logado pode? */
export function useCan() {
  const me = useContext(MeCtx);
  return (perm: string) => can(me?.member, perm);
}
const visible = (member: any, href: string) => {
  if (href === '/ajuda') return true;
  if (href === '/modelos-premium') return can(member, 'modelos_premium') || can(member, 'modelos');
  const p = pagePerm(href);
  return !p || can(member, p);
};

/* ---------- tema claro/escuro ---------- */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.getAttribute('data-theme') === 'dark');
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    try {
      localStorage.setItem('radar-theme', next ? 'dark' : 'light');
    } catch {}
  }
  return (
    <button className="iconbtn" onClick={toggle} title={dark ? 'Usar tema claro' : 'Usar tema escuro'} aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'}>
      <Icon name={dark ? 'sun' : 'moon'} />
    </button>
  );
}

/* ---------- busca rápida (Ctrl+K) ---------- */
type Cmd = { label: string; icon: string; href: string; group: string; hint?: string };
function CommandPalette({ onClose, member }: { onClose: () => void; member: any }) {
  const router = useRouter();
  const nav = useNav();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const all: Cmd[] = useMemo(
    () => [
      ...nav.flatMap(([g, items]) => items.filter(([href]) => visible(member, href)).map(([href, label, icon]) => ({ label, icon, href, group: 'Ir para', hint: g }))),
      ...([
        { label: 'Conectar número de WhatsApp', icon: 'qr', href: '/numeros', group: 'Ações', p: 'numeros.gerenciar' },
        { label: 'Ajustar preços dos mapas', icon: 'tag', href: '/servicos', group: 'Ações', p: 'servicos.editar' },
        { label: 'Enviar PDF para a base', icon: 'upload', href: '/conhecimento', group: 'Ações', p: 'conhecimento.enviar' },
      ].filter((x) => can(member, x.p)) as Cmd[]),
      ...ART.map((a) => ({ label: a[2], icon: 'help', href: `/ajuda?a=${a[0]}`, group: 'Manual', hint: a[3] })),
    ],
    [member, nav],
  );
  const list = useMemo(() => {
    const t = norm(q).trim();
    if (!t) return all.filter((c) => c.group !== 'Manual');
    return all.filter((c) => norm(c.label + ' ' + (c.hint || '')).includes(t)).slice(0, 14);
  }, [q, all]);
  useEffect(() => {
    input.current?.focus();
  }, []);
  useEffect(() => setSel(0), [q]);
  function go(c?: Cmd) {
    if (!c) return;
    router.push(c.href);
    onClose();
  }
  let lastGroup = '';
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="cmdk" role="dialog" aria-label="Busca rápida">
        <div className="cmdk-in">
          <Icon name="search" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar telas, ações e dúvidas do manual…"
            aria-label="Buscar"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSel((s) => Math.min(list.length - 1, s + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSel((s) => Math.max(0, s - 1));
              } else if (e.key === 'Enter') go(list[sel]);
              else if (e.key === 'Escape') onClose();
            }}
          />
          <span className="kbd">Esc</span>
        </div>
        <div className="cmdk-list">
          {list.length === 0 && <p className="muted" style={{ padding: 14 }}>Nada encontrado.</p>}
          {list.map((c, i) => {
            const head = c.group !== lastGroup ? <div className="cmdk-group">{c.group}</div> : null;
            lastGroup = c.group;
            return (
              <div key={c.group + c.href + c.label}>
                {head}
                <button className="cmdk-item" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={() => go(c)}>
                  <Icon name={c.icon} />
                  {c.label}
                  {c.group === 'Ir para' && <small>{c.hint}</small>}
                </button>
              </div>
            );
          })}
        </div>
        <div className="cmdk-foot">
          <span>↑ ↓ navegar</span>
          <span>Enter abrir</span>
          <span>Esc fechar</span>
        </div>
      </div>
    </>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const nav = useNav();
  const [me, setMe] = useState<any>(null);
  const [alerts, setAlerts] = useState(0);
  // pedidos de aprovação de valor (desconto abaixo do mínimo): pop-up + alerta em Conversas + sininho
  const [approvals, setApprovals] = useState<{ id: string; name: string; needs_human: string }[]>([]);
  const [popup, setPopup] = useState<{ id: string; name: string; needs_human: string } | null>(null);
  const seenApprovals = useRef<Set<string> | null>(null);
  const [unread, setUnread] = useState(0);
  const [active, setActive] = useState(0);
  const [ping, setPing] = useState(0);
  async function countUnread() {
    const { data, error } = await sb().from('leads').select('team_unread').gt('team_unread', 0).limit(1000);
    if (error) return;
    const n = (data || []).reduce((a: number, r: any) => a + (Number(r.team_unread) || 0), 0);
    setUnread(n);
    // conversas em andamento: cliente escreveu nos últimos 30 minutos
    const { count } = await sb().from('leads').select('id', { count: 'exact', head: true }).gte('last_inbound_at', new Date(Date.now() - 30 * 60_000).toISOString());
    setActive(count || 0);
    try {
      document.title = (n ? `(${n}) ` : '') + document.title.replace(/^\(\d+\+?\)\s*/, '');
    } catch {}
  }
  const [blocked, setBlocked] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  // menu lateral: fixo (padrão) ou escondido (tela cheia); escondido, ele aparece ao levar o mouse para a esquerda
  const [sideHidden, setSideHidden] = useState(false);
  const [peek, setPeek] = useState(false);
  const peekTimer = useRef<any>(null);
  useEffect(() => {
    try {
      setSideHidden(localStorage.getItem('side-mode') === 'hidden');
    } catch {}
  }, []);
  function setSideMode(hidden: boolean) {
    setSideHidden(hidden);
    setPeek(false);
    try {
      localStorage.setItem('side-mode', hidden ? 'hidden' : 'fixed');
    } catch {}
  }
  const showPeek = () => {
    clearTimeout(peekTimer.current);
    setPeek(true);
  };
  const hidePeek = () => {
    clearTimeout(peekTimer.current);
    peekTimer.current = setTimeout(() => setPeek(false), 280);
  };
  const [cmdk, setCmdk] = useState(false);
  // botão Atualizar: remonta a tela atual (ela busca os dados de novo) sem recarregar a página inteira
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  function atualizar() {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    countUnread();
    setTimeout(() => setRefreshing(false), 900);
  }
  const [robot, setRobot] = useState<any>(null);
  useEffect(() => {
    const check = async () => {
      const { data, error } = await sb().from('worker_status').select('*').eq('id', 1).maybeSingle();
      if (!error && data) setRobot(data);
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, []);
  const robotDown = robot && Date.now() - new Date(robot.beat_at).getTime() > 2 * 60000;
  // robô sem sinal só é problema se houver cliente esperando resposta há mais de 2 minutos
  const [late, setLate] = useState(0);
  useEffect(() => {
    if (!robotDown) return setLate(0);
    sb()
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .lt('reply_due_at', new Date(Date.now() - 120000).toISOString())
      .then(({ count }) => setLate(count || 0));
  }, [robotDown, robot?.beat_at]);

  useEffect(() => {
    (async () => {
      const { data, error } = await sb().auth.getUser();
      // sessão encerrada no servidor (logout geral): volta para o login
      if (!data.user) return void (error ? sessionExpired() : null);
      const { data: m } = await sb().from('team_members').select('*').eq('id', data.user.id).maybeSingle();
      if (!m || m.active === false) setBlocked(true);
      setMe({ ...data.user, member: m });
      // 1º acesso: precisa trocar a senha que recebeu antes de usar o painel
      if (m?.trocar_senha && !window.location.pathname.startsWith('/conta')) return void window.location.replace('/conta?primeiro=1');
      // registro de acessos: uma vez por sessão do navegador
      try {
        if (!sessionStorage.getItem('rv-acesso')) {
          sessionStorage.setItem('rv-acesso', '1');
          fetch('/api/acesso', { method: 'POST' }).catch(() => {});
        }
      } catch {}
      const { count } = await sb().from('leads').select('id', { count: 'exact', head: true }).not('needs_human', 'is', null);
      setAlerts(count || 0);
      countUnread();
      loadApprovals();
    })();
    const ch = sb()
      .channel('shell-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, async () => {
        const { count } = await sb().from('leads').select('id', { count: 'exact', head: true }).not('needs_human', 'is', null);
        setAlerts(count || 0);
        countUnread();
        loadApprovals();
      })
      // mensagem nova de cliente: som + bolinha vermelha em Conversas
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p: any) => {
        if (p.new?.direction === 'in') {
          ding();
          setPing(Date.now());
          setTimeout(() => setPing(0), 6000);
          setTimeout(countUnread, 1500);
        }
      })
      .subscribe();
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdk((v) => !v);
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      sb().removeChannel(ch);
      window.removeEventListener('keydown', key);
    };
  }, []);

  async function loadApprovals() {
    const { data } = await sb().from('leads').select('id,name,needs_human').like('needs_human', 'APROVAÇÃO:%').order('updated_at', { ascending: false }).limit(20);
    const list = (data || []) as any[];
    setApprovals(list);
    const seen = seenApprovals.current;
    if (seen) {
      // pedido novo: pop-up na tela de quem estiver no painel
      const fresh = list.find((x) => !seen.has(x.id));
      if (fresh) {
        setPopup(fresh);
        ding();
      }
    }
    seenApprovals.current = new Set(list.map((x) => x.id));
  }

  useEffect(() => setNavOpen(false), [path]);

  async function logout() {
    await sb().auth.signOut();
    window.location.href = '/login';
  }

  const name = me?.member?.name || me?.email || '';
  const role = roleLabel(me?.member?.role);
  const pp = pagePerm(path);
  const denied = !!me?.member && !!pp && !can(me.member, pp);
  const current = nav.flatMap(([g, items]) => items.map((i) => [g, ...i])).find((x) => isActive(x[1], path));
  const menu = MENU;
  const grupo = menu.find((g) => g.tabs.some((h) => isActive(h, path)));
  const rotulos = new Map(nav.flatMap(([, items]) => items.map(([h, l]) => [h, l] as [string, string])));
  const abas = grupo ? grupo.tabs.filter((h) => !me?.member || visible(me.member, h)) : [];

  return (
    <MeCtx.Provider value={me}>
      <div className={`app ${navOpen ? 'nav-open' : ''} ${sideHidden ? 'side-hidden' : ''} ${sideHidden && peek ? 'side-peek' : ''}`}>
        {sideHidden && <div className="side-hot" onMouseEnter={showPeek} aria-hidden="true" />}
        <aside className="side" aria-label="Menu principal" onMouseEnter={sideHidden ? showPeek : undefined} onMouseLeave={sideHidden ? hidePeek : undefined}>
          <div className="side-head">
            <BrandBlock />
            <button
              type="button"
              className="iconbtn side-pin"
              onClick={() => setSideMode(!sideHidden)}
              title={sideHidden ? 'Fixar o menu na lateral' : 'Esconder o menu (tela cheia) — ele aparece ao levar o mouse para a esquerda'}
              aria-label={sideHidden ? 'Fixar menu' : 'Esconder menu'}
            >
              <Icon name={sideHidden ? 'pin' : 'chevron'} />
            </button>
          </div>
          <nav className="navwrap">
            <div className="navgroup">
              {menu.map((g) => {
                const tabs = g.tabs.filter((h) => !me?.member || visible(me.member, h));
                if (!tabs.length) return null;
                const href = tabs[0];
                const on = g.tabs.some((h) => isActive(h, path));
                const conv = g.tabs.includes('/conversas');
                return (
                  <Link key={g.label} href={href} className={`navbtn ${conv && Date.now() - ping < 6000 ? 'nav-ping' : ''}`} aria-current={on ? 'page' : undefined}>
                    <Icon name={g.icon} />
                    <span>{g.label}</span>
                    {g.tabs.includes('/') && alerts > 0 && <span className="badge">{alerts}</span>}
                    {conv && approvals.length > 0 && (
                      <span className="badge badge-approval" title={`${approvals.length} conversa(s) esperando aprovação de valor`} aria-label={`${approvals.length} aprovação(ões) pendente(s)`}>
                        ⚠ {approvals.length}
                      </span>
                    )}
                    {conv && unread > 0 && (
                      <span className="badge badge-live" title={`${unread} mensagem(ns) nova(s) de clientes`}>
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                    {conv && unread === 0 && active > 0 && (
                      <span className="badge badge-active" title={`${active} conversa(s) em andamento (cliente escreveu nos últimos 30 min)`}>
                        {active}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
          <div className="side-foot">
            <span className="avatar">{initials(name)}</span>
            <Link href="/conta" style={{ minWidth: 0, flex: 1, color: 'inherit', textDecoration: 'none' }} title="Minha conta: trocar senha e ver o que eu fiz">
              <b style={{ fontSize: 13, fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</b>
              <small className="muted" style={{ fontSize: 12 }}>
                {role} · minha conta
              </small>
            </Link>
            <button className="iconbtn" onClick={logout} title="Sair" aria-label="Sair">
              <Icon name="logout" />
            </button>
          </div>
        </aside>
        <div className="side-scrim" onClick={() => setNavOpen(false)} />

        <div className="shell">
          <header className="shell-top">
            <button className="iconbtn menu-btn" onClick={() => setNavOpen(true)} aria-label="Abrir menu">
              <Icon name="menu" />
            </button>
            {sideHidden && (
              <button className="iconbtn side-show" onClick={() => setSideMode(false)} title="Mostrar o menu lateral (fixar)" aria-label="Mostrar menu">
                <Icon name="menu" />
              </button>
            )}
            <div className="crumbs">
              {grupo && abas.length > 1 ? <b>{grupo.label}</b> : current ? <b>{current[2]}</b> : null}
            </div>
            {grupo && abas.length > 1 && (
              <nav className="top-tabs" aria-label={grupo.label}>
                {abas.map((h) => (
                  <Link key={h} href={h} className={isActive(h, path) ? 'on' : ''} aria-current={isActive(h, path) ? 'page' : undefined}>
                    {rotulos.get(h) || h}
                    {h === '/conversas' && unread > 0 && <span className="tab-dot">{unread > 99 ? '99+' : unread}</span>}
                  </Link>
                ))}
              </nav>
            )}
            <div className="top-actions">
              <button className="cmdk-btn" onClick={() => setCmdk(true)} aria-label="Busca rápida">
                <Icon name="search" />
                <span>Buscar…</span>
                <kbd>Ctrl K</kbd>
              </button>
              <ThemeToggle />
              <Link
                href={approvals.length ? `/conversas?lead=${approvals[0].id}` : '/'}
                className={`iconbtn bell${approvals.length ? ' bell-approval' : ''}`}
                title={approvals.length ? `${approvals.length} aprovação(ões) de valor esperando você` : 'Precisa de você'}
                aria-label={`Alertas: ${alerts}`}
              >
                <Icon name="bell" />
                {alerts > 0 && <span className="dotc">{alerts > 9 ? '9+' : alerts}</span>}
              </Link>
              {robotDown && late > 0 && (
                <Link href="/conversas" className="chip" style={{ ['--t' as any]: 'var(--bad)' }} title={`${late} cliente(s) esperando resposta há mais de 2 minutos. Último sinal do robô: ${new Date(robot.beat_at).toLocaleString('pt-BR')}. Abra o Painel rápido em Conversas.`}>
                  Respostas atrasadas
                </Link>
              )}
              {['/', '/conversas', '/leads', '/financeiro', '/custos'].some((h) => (h === '/' ? path === '/' : path.startsWith(h))) && (
                <button className="btn btn-sm refresh-btn" onClick={atualizar} disabled={refreshing} title="Buscar os dados de novo, sem recarregar a página">
                  <span className={refreshing ? 'spin-icon' : ''}><Icon name="refresh" /></span> Atualizar
                </button>
              )}
              <PauseToggle />
            </div>
          </header>
          {popup && (
            <div className="approval-pop" role="alertdialog" aria-label="Aprovação de valor">
              <span className="approval-ico" aria-hidden="true">⚠️</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>Aprovação de valor</b>
                <p>{String(popup.needs_human).replace(/^APROVAÇÃO: /, '')}</p>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <Link className="btn btn-sm btn-p" href={`/conversas?lead=${popup.id}`} onClick={() => setPopup(null)}>
                    Abrir conversa
                  </Link>
                  <button className="btn btn-sm btn-g" onClick={() => setPopup(null)}>
                    Depois
                  </button>
                </div>
              </div>
            </div>
          )}
          {me?.member && (
            <style>{[...PERMS.map((p) => p[0]), ...MASTER_ONLY.map((m) => m[0])]
              .filter((k) => !can(me.member, k))
              .map((k) => `[data-perm="${k}"]`)
              .join(',') + '{display:none!important}'}</style>
          )}
          <main className={`main ${path.startsWith('/conversas') ? 'main-wide' : ''}`}>
            {blocked ? (
              <div className="card empty">
                <span className="ib lg t-warn">
                  <Icon name="shield" />
                </span>
                <div>
                  <h2>Acesso não liberado</h2>
                  <p>Peça para o Master criar ou reativar seu acesso no menu Equipe.</p>
                </div>
              </div>
            ) : denied ? (
              <div className="card empty">
                <span className="ib lg t-warn">
                  <Icon name="shield" />
                </span>
                <div>
                  <h2>Sem acesso a esta tela</h2>
                  <p>Seu perfil não inclui esta área. Se precisar, peça ao Master para liberar em Equipe.</p>
                </div>
              </div>
            ) : (
              <div key={refreshKey} style={{ display: 'contents' }}>{children}</div>
            )}
          </main>
        </div>
      </div>
      {cmdk && <CommandPalette member={me?.member} onClose={() => setCmdk(false)} />}
      <FinAlerts fin={!!me?.member && can(me.member, 'financeiro')} prod={!!me?.member && can(me.member, 'producao')} />
      <Toaster />
    </MeCtx.Provider>
  );
}
