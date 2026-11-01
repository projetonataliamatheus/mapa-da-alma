'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { sb } from '@/lib/supabase/browser';

export const STAGES: [string, string, string, string][] = [
  ['novo', 'Novo', 'radar', 'gg'],
  ['abordado', 'Abordado', 'send', 'mut'],
  ['respondeu', 'Respondeu', 'chat', 'ai'],
  ['interessado', 'Demonstrou interesse', 'star', 'warn'],
  ['negociando', 'Negociando', 'tag', 'acc'],
  ['pix', 'Aguardando pagamento', 'pix', 'gg'],
  ['pago', 'Pagamento concluído', 'check', 'ok'],
  ['sem', 'Não demonstrou interesse', 'x', 'bad'],
  ['remarketing', 'Remarketing futuro', 'clock', 'mut'],
];
export const stageOf = (k: string) => STAGES.find((s) => s[0] === k) || STAGES[0];
export const toneVar = (t: string) => (t === 'mut' ? 'var(--muted)' : t === 'acc' ? 'var(--accent)' : `var(--${t})`);

export const STEPS: [string, string][] = [
  ['talk', 'Conversa iniciada'],
  ['interest', 'Contou o que busca (dor ou interesse)'],
  ['dados', 'Nome de nascimento e data recebidos'],
  ['leitura', 'Consulta ao mapa feita na conversa'],
  ['price', 'Mapa e preço apresentados'],
  ['pix', 'Link ou Pix enviado'],
  ['paid', 'Pagamento confirmado'],
  ['entregue', 'Mapa completo entregue'],
];

export function tempOf(v: number, warm = 35, hot = 65): [string, string, string] {
  return v >= hot ? ['Quente', 'hot', 'flame'] : v >= warm ? ['Morno', 'warm', 'thermo'] : ['Frio', 'cold', 'snow'];
}
export const scoreColor = (v: number) => (v >= 80 ? 'var(--accent)' : v >= 60 ? 'var(--warn)' : 'var(--muted)');

export const brl = (v: any) =>
  v === null || v === undefined || v === '' || isNaN(Number(v)) ? '—' : 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TZ = 'America/Sao_Paulo';
const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ }); // 2026-10-30
/** "Hoje", "Ontem" ou "25/10" (com o ano quando não é deste ano), no horário de Brasília — como no WhatsApp. */
export function dayLabel(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const k = dayKey(d);
  if (k === dayKey(now)) return 'Hoje';
  if (k === dayKey(new Date(now.getTime() - 86400_000))) return 'Ontem';
  const sameYear = k.slice(0, 4) === dayKey(now).slice(0, 4);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', ...(sameYear ? {} : { year: 'numeric' }), timeZone: TZ });
}
/** só a hora (18:33) */
export function hourLabel(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
}
/** mesmo dia? (para os separadores de data da conversa) */
export function sameDay(a?: string | null, b?: string | null) {
  return !!a && !!b && dayKey(new Date(a)) === dayKey(new Date(b));
}
/** "Hoje 18:33", "Ontem 17:31", "25/10 16:26" */
export function timeLabel(iso?: string | null) {
  if (!iso) return '';
  return `${dayLabel(iso)} ${hourLabel(iso)}`;
}

const WA_LABEL: Record<string, [string, string, boolean]> = {
  nao: ['Não abordado', 'mut', true],
  fila: ['Na fila', 'gg', false],
  enviando: ['Enviando', 'gg', false],
  enviado: ['Enviado', 'gg', false],
  respondeu: ['Respondeu', 'ai', false],
  conversa: ['Em conversa', 'ok', false],
  invalido: ['Sem WhatsApp', 'bad', true],
  preparando: ['Preparando', 'gg', false],
  rascunho: ['Para revisar', 'warn', false],
  bloqueado: ['Bloqueado', 'bad', true],
};

export function ChanChips({ l }: { l: any }) {
  const w = WA_LABEL[l.whatsapp ? l.wa_status : 'nao'] || WA_LABEL.nao;
  const g = WA_LABEL[l.instagram ? l.ig_status : 'nao'] || WA_LABEL.nao;
  return (
    <span className="chan">
      <span className={`cs ${w[2] ? 'off' : ''}`} style={{ ['--t' as any]: 'var(--wa)' }} title={'WhatsApp: ' + (l.whatsapp ? w[0] : 'sem número')}>
        <Icon name="wa" />
        {l.whatsapp ? w[0] : 'Sem WhatsApp'}
      </span>
      {/* Mapa da Alma atende só pelo WhatsApp (Instagram era do Radar) */}
      {void g}
    </span>
  );
}

export function TempChip({ v }: { v: number }) {
  const t = tempOf(v || 0);
  return (
    <span className="temp" style={{ color: `var(--${t[1]})` }}>
      <Icon name={t[2]} />
      {t[0]} {v || 0}
    </span>
  );
}

export function SiteChip({ s }: { s: string }) {
  if (s === 'nenhum') return <span className="chip" style={{ ['--t' as any]: 'var(--accent)' }}>Sem site</span>;
  if (s === 'fraco') return <span className="chip" style={{ ['--t' as any]: 'var(--warn)' }}>Site fraco</span>;
  return <span className="chip" style={{ ['--t' as any]: 'var(--ok)' }}>Tem site</span>;
}

export function ScoreBar({ v, title }: { v: number; title?: string }) {
  return (
    <div className="scorebar" title={title}>
      <div className="track">
        <div className="fill" style={{ width: `${v}%`, background: scoreColor(v) }} />
      </div>
      <b>{v}</b>
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange?: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <span className="switch">
      <input type="checkbox" aria-label={label} checked={!!checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} />
      <span />
    </span>
  );
}

export function initials(name: string) {
  return String(name || '?')
    .replace(/^(Dra?\.\s)/, '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/* ---------- toast ---------- */
export function toast(msg: string) {
  window.dispatchEvent(new CustomEvent('radar-toast', { detail: msg }));
}
export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);
  const t = useRef<any>(null);
  useEffect(() => {
    const h = (e: any) => {
      setMsg(e.detail);
      clearTimeout(t.current);
      t.current = setTimeout(() => setMsg(null), 3200);
    };
    window.addEventListener('radar-toast', h);
    return () => window.removeEventListener('radar-toast', h);
  }, []);
  if (!msg) return null;
  return (
    <div className="toast" role="status">
      <Icon name="check" />
      {msg}
    </div>
  );
}

/* ---------- chamadas à API ---------- */
export async function api(path: string, method = 'POST', body?: any) {
  const r = await fetch(path, {
    method,
    headers: body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && path.startsWith('/api/') && !path.startsWith('/api/cliente')) sessionExpired();
  if (!r.ok) throw new Error(j.error || 'Algo deu errado');
  return j;
}

/** Sessão encerrada no servidor (logout geral, senha trocada, 2 etapas): limpa o login local e volta para a tela de entrar. */
let leaving = false;
export function sessionExpired() {
  if (leaving || typeof window === 'undefined' || window.location.pathname.startsWith('/login')) return;
  leaving = true;
  sb()
    .auth.signOut({ scope: 'local' })
    .catch(() => {})
    .finally(() => (window.location.href = '/login'));
}

/* ---------- tempo real: recarrega quando a tabela muda ---------- */
export function useLive(tables: string[], load: () => void, deps: any[] = []) {
  const ref = useRef(load);
  ref.current = load;
  useEffect(() => {
    ref.current();
    let timer: any;
    const fire = () => {
      clearTimeout(timer);
      timer = setTimeout(() => ref.current(), 400);
    };
    const ch = sb().channel('live-' + tables.join('-') + '-' + Math.random().toString(36).slice(2));
    tables.forEach((t) => ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, fire));
    ch.subscribe();
    return () => {
      clearTimeout(timer);
      sb().removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Som de mensagem nova (sem arquivo: gerado pelo navegador). Desliga com localStorage radar_som=off. */
let lastDing = 0;
export function soundOn() {
  try {
    return localStorage.getItem('radar_som') !== 'off';
  } catch {
    return true;
  }
}
export function setSound(on: boolean) {
  try {
    localStorage.setItem('radar_som', on ? 'on' : 'off');
  } catch {}
}
export function ding() {
  if (!soundOn() || Date.now() - lastDing < 1500) return;
  lastDing = Date.now();
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.16;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.3);
    });
    setTimeout(() => ctx.close(), 900);
  } catch {}
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copiado');
  } catch {
    toast('Não consegui copiar. Selecione e copie: ' + text);
  }
}
