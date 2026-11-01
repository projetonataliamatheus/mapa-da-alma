'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabase/browser';
import { timeLabel } from './ui';

/**
 * O que a equipe fez (aprovou, assumiu, arquivou, respondeu, gerou prévia…), com nome do membro e horário.
 * actor = só as ações de um membro; sem actor = a equipe toda.
 */
export function TeamActivity({ actor, limit = 60 }: { actor?: string | null; limit?: number }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [who, setWho] = useState('');
  useEffect(() => {
    let q = sb().from('lead_events').select('id,lead_id,type,text,created_at,actor_id,actor_name').not('actor_id', 'is', null).order('created_at', { ascending: false }).limit(limit);
    if (actor) q = q.eq('actor_id', actor);
    q.then(({ data, error }: any) => setRows(error ? [] : data || []));
  }, [actor, limit]);
  if (!rows) return <span className="spin" />;
  const people = Array.from(new Set(rows.map((r) => r.actor_name).filter(Boolean)));
  const shown = who ? rows.filter((r) => r.actor_name === who) : rows;
  return (
    <div className="grid" style={{ gap: 8 }}>
      {!actor && people.length > 1 && (
        <select className="input" style={{ height: 32, maxWidth: 260 }} value={who} onChange={(e) => setWho(e.target.value)} aria-label="Filtrar por membro">
          <option value="">Todos os membros</option>
          {people.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      )}
      {shown.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Nenhuma ação registrada ainda.</p>}
      <div className="activity">
        {shown.map((r) => (
          <div key={r.id} className="activity-row">
            <span className="avatar" style={{ width: 26, height: 26, fontSize: 11 }}>
              {String(r.actor_name || '?')
                .split(/\s+/)
                .map((w: string) => w[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <b>{r.actor_name}</b> <small className="muted">· {timeLabel(r.created_at)}</small>
              <p>{r.text}</p>
            </div>
            {r.lead_id && (
              <Link className="linkbtn" style={{ fontSize: 12, whiteSpace: 'nowrap' }} href={`/conversas?lead=${r.lead_id}`}>
                abrir conversa
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
