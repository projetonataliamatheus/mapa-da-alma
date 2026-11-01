'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon, Ib } from './Icon';
import { api, toast } from './ui';
import { sb } from '@/lib/supabase/browser';
import { useCan } from './Shell';
import { DEFAULT_SETTINGS, deepMerge } from '@/lib/settings';
import { inService, serviceLabel } from '@/lib/hours';

export function PauseToggle() {
  const can = useCan();
  const [paused, setPaused] = useState<boolean | null>(null);
  const [st, setSt] = useState<any>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    const load = async () => {
      const { data } = await sb().from('settings').select('data').eq('id', 1).maybeSingle();
      setPaused(!!data?.data?.paused);
      setSt(deepMerge(DEFAULT_SETTINGS, data?.data || {}));
    };
    load();
    const ch = sb().channel('pause-' + Math.random().toString(36).slice(2)).on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, load).subscribe();
    // o horário muda sozinho: confere a cada minuto
    const t = setInterval(() => tick((x) => x + 1), 60_000);
    return () => {
      sb().removeChannel(ch);
      clearInterval(t);
    };
  }, []);
  async function toggle() {
    const next = !paused;
    setPaused(next);
    try {
      await api('/api/settings', 'PATCH', { paused: next });
      toast(next ? 'Automação pausada' : 'Automação retomada');
    } catch (e: any) {
      setPaused(!next);
      toast(e.message);
    }
  }
  if (paused === null) return null;
  const off = st && !paused && !inService(st);
  const hoursTxt = st ? `Atendimento da IA: ${serviceLabel(st)}` : '';
  if (off)
    return (
      <Link href="/config#horarios" className="livepill off offhours" title={`${hoursTxt}. Clique para ver os horários.`}>
        <span className="dot" />
        <span className="lbl">
          Automação pausada
          <small>Fora do horário de atendimento</small>
        </span>
      </Link>
    );
  return (
    <button className={`livepill ${paused ? 'off' : ''}`} onClick={toggle} aria-pressed={!paused} disabled={!can('automacao.pausar')} title={can('automacao.pausar') ? hoursTxt : 'Só quem tem permissão pode pausar'}>
      <span className="dot" />
      <span className="lbl">{paused ? 'Automação pausada' : 'Automação ativa'}</span>
    </button>
  );
}

export function PageHead({ title, sub, icon, tone = 'acc', help, children }: { title: string; sub: string; icon: string; tone?: string; help: string; children?: React.ReactNode }) {
  return (
    <div className="topbar">
      <div className="title">
        <Ib name={icon} tone={tone} size="lg" />
        <div style={{ minWidth: 0 }}>
          <h1>{title}</h1>
          <p>{sub}</p>
        </div>
      </div>
      {children}
      <Link className="btn btn-g btn-sm" href={`/ajuda?a=${help}`} title="Ver no manual">
        <Icon name="help" />
        Ajuda
      </Link>
    </div>
  );
}
