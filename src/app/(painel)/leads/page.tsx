'use client';
import { useMemo, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { LeadDrawer } from '@/components/LeadDrawer';
import { STAGES, stageOf, scoreColor, ChanChips, TempChip, useLive, toast, brl } from '@/components/ui';
import { sb } from '@/lib/supabase/browser';
import { norm } from '@/lib/util';

export default function Leads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [numbers, setNumbers] = useState<Record<string, string>>({});
  const [q, setQ] = useState('');
  const [niche, setNiche] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  async function load() {
    const { data } = await sb().from('leads').select('*').order('score', { ascending: false }).limit(2000);
    setLeads(data || []);
    const { data: nums } = await sb().from('whatsapp_numbers').select('id,label');
    setNumbers(Object.fromEntries((nums || []).map((n: any) => [n.id, n.label])));
  }
  useLive(['leads'], load);

  const niches = useMemo(() => Array.from(new Set(leads.map((l) => l.niche).filter(Boolean))), [leads]);
  const filtered = leads.filter((l) => (!q || norm(l.name).includes(norm(q))) && (!niche || l.niche === niche));

  async function drop(e: React.DragEvent, stage: string) {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData('text/plain');
    const l = leads.find((x) => x.id === id);
    if (!l || l.stage === stage) return;
    setLeads(leads.map((x) => (x.id === id ? { ...x, stage } : x)));
    await sb().from('leads').update({ stage }).eq('id', id);
    await sb().from('lead_events').insert({ lead_id: id, type: 'stage', channel: 'acc', text: `${l.name} movido para "${stageOf(stage)[1]}" pela equipe` });
    toast('Movido para ' + stageOf(stage)[1]);
  }

  return (
    <>
      <PageHead title="Leads e funil" sub="Arraste os cards entre as etapas. Clique para ver tudo o que já foi feito com o lead" icon="board" help="kanban">
        <input className="input" style={{ width: 200 }} placeholder="Buscar lead" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar lead" />
        {niches.length > 1 && (
          <select className="input" style={{ width: 170 }} value={niche} onChange={(e) => setNiche(e.target.value)} aria-label="Filtrar por nicho">
            <option value="">Todos os nichos</option>
            {niches.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        )}
      </PageHead>
      <div className="kanban">
        {STAGES.map((s) => {
          const items = filtered.filter((l) => l.stage === s[0]);
          return (
            <section
              key={s[0]}
              className={`col ${over === s[0] ? 'over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(s[0]);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => drop(e, s[0])}
            >
              <div className="col-h">
                <Ib name={s[2]} tone={s[3]} size="sm" />
                <b>{s[1]}</b>
                <span className="n">{items.length}</span>
              </div>
              {items.slice(0, 150).map((l) => (
                <article
                  key={l.id}
                  className="lcard"
                  draggable
                  tabIndex={0}
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', l.id)}
                  onClick={() => setOpen(l.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setOpen(l.id)}
                >
                  <div className="top">
                    <div style={{ minWidth: 0 }}>
                      <b>{l.name}</b>
                      <small>{[l.niche, l.city].filter(Boolean).join(' · ')}</small>
                    </div>
                    <span className="sc" style={{ color: scoreColor(l.score) }}>
                      {l.score}
                    </span>
                  </div>
                  <ChanChips l={l} />
                  {l.needs_human && (
                    <span className="alertline">
                      <Icon name="bell" />
                      Precisa de você
                    </span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {l.number_id && numbers[l.number_id] && <span className="chip">{numbers[l.number_id]}</span>}
                    {l.paid_amount && (
                      <span className="chip" style={{ ['--t' as any]: 'var(--ok)' }}>
                        {brl(l.paid_amount)}
                      </span>
                    )}
                    {l.close_probability > 0 && !['pago', 'sem'].includes(l.stage) && (
                      <span className="prob" title="Probabilidade de compra">
                        {l.close_probability}%
                      </span>
                    )}
                    {l.stage !== 'novo' && <TempChip v={l.temperature} />}
                  </div>
                </article>
              ))}
              {items.length > 150 && <p className="muted" style={{ fontSize: 12 }}>+{items.length - 150} leads. Use a busca para filtrar.</p>}
            </section>
          );
        })}
      </div>
      {open && <LeadDrawer id={open} onClose={() => setOpen(null)} />}
    </>
  );
}
