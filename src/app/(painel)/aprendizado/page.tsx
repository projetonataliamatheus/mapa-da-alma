'use client';
import { useEffect, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { api, toast, brl, timeLabel } from '@/components/ui';
import { sb } from '@/lib/supabase/browser';

export default function Aprendizado() {
  const [niches, setNiches] = useState<string[]>([]);
  const [niche, setNiche] = useState('');
  const [learn, setLearn] = useState<any[]>([]);
  const [obs, setObs] = useState<any[]>([]);
  const [playbook, setPlaybook] = useState<any>(null);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await sb().from('leads').select('niche').not('niche', 'is', null).limit(5000);
      const list = Array.from(new Set((data || []).map((d: any) => d.niche))) as string[];
      // Mapa da Alma tem um só nicho: as vendas confirmadas sempre aparecem nele
      const todos = ['Mapa da Alma', ...list.filter((n) => n !== 'Mapa da Alma')];
      setNiches(todos);
      setNiche(todos[0]);
    })();
  }, []);

  useEffect(() => {
    if (!niche) return;
    (async () => {
      const [l, o, p, b] = await Promise.all([
        sb().from('learnings').select('*').eq('niche', niche).order('created_at', { ascending: false }).limit(200),
        sb().from('objections').select('*').eq('niche', niche).order('wins', { ascending: false }).limit(30),
        sb().from('playbooks').select('*').eq('niche', niche).maybeSingle(),
        (niche === 'Mapa da Alma' ? sb().from('leads').select('id,name,city,paid_amount,paid_at,approach_slug').eq('stage', 'pago').eq('cortesia', false) : sb().from('leads').select('id,name,city,paid_amount,paid_at,approach_slug').eq('niche', niche).eq('stage', 'pago')).order('paid_at', { ascending: false }).limit(50),
      ]);
      setLearn(l.data || []);
      setObs(o.data || []);
      setPlaybook(p.data);
      setBuyers(b.data || []);
    })();
  }, [niche]);

  async function gen() {
    setBusy(true);
    try {
      const r = await api('/api/playbook', 'POST', { niche });
      setPlaybook({ content: r.content, updated_at: new Date().toISOString() });
      toast('Playbook atualizado');
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }

  const factors: Record<string, number> = {};
  learn.forEach((l) => l.decisive_factor && (factors[l.decisive_factor] = (factors[l.decisive_factor] || 0) + 1));
  const fl = Object.entries(factors).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const pains: Record<string, number> = {};
  learn.forEach((l) => (l.pains || []).forEach((p: string) => (pains[p] = (pains[p] || 0) + 1)));
  const pl = Object.entries(pains).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const learnByLead = Object.fromEntries(learn.map((l) => [l.lead_id, l]));

  return (
    <>
      <PageHead title="Aprendizado" sub="O que as vendas fechadas ensinam, por nicho" icon="bulb" tone="warn" help="aprendizado">
        {niches.length > 0 && (
          <select className="input" style={{ width: 'auto' }} value={niche} onChange={(e) => setNiche(e.target.value)} aria-label="Nicho">
            {niches.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        )}
      </PageHead>
      {!niche ? (
        <div className="card empty">
          <Ib name="bulb" tone="warn" size="lg" />
          <div>
            <h2>Ainda sem dados</h2>
            <p>Assim que as primeiras vendas forem pagas, a IA estuda cada conversa e mostra aqui o que funcionou.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid g-2">
            <div className="card">
              <div className="card-h">
                <Ib name="target" tone="acc" size="sm" />
                <h2>Fatores decisivos da compra</h2>
                <span className="sp muted" style={{ fontSize: 12 }}>
                  {learn.length} vendas estudadas
                </span>
              </div>
              {fl.length === 0 && <p className="muted">Aparece depois da primeira venda neste nicho.</p>}
              {fl.map(([k, v]) => (
                <div className="hbar" key={k}>
                  <span>{k}</span>
                  <div className="t">
                    <i style={{ width: `${(v / learn.length) * 100}%` }} />
                  </div>
                  <b className="num">{Math.round((v / learn.length) * 100)}%</b>
                </div>
              ))}
              {pl.length > 0 && (
                <>
                  <div className="sect" style={{ marginTop: 14 }}>
                    <h3>Dores mais citadas</h3>
                  </div>
                  <div className="chips">
                    {pl.map(([p]) => (
                      <span key={p} className="chip" style={{ ['--t' as any]: 'var(--accent)' }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="card">
              <div className="card-h">
                <Ib name="robot" tone="ai" size="sm" />
                <h2>Playbook da IA</h2>
                <button className="sp btn btn-sm" onClick={gen} disabled={busy}>
                  {busy ? <span className="spin" /> : <Icon name="refresh" />}
                  {busy ? 'Gerando…' : 'Atualizar agora'}
                </button>
              </div>
              {playbook?.content ? (
                <>
                  <div className="aisum pre">{playbook.content}</div>
                  <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                    Atualizado {timeLabel(playbook.updated_at)}. A IA usa este playbook em todas as conversas deste nicho e o refaz sozinha a cada 3 vendas.
                  </p>
                </>
              ) : (
                <p className="muted">Ainda não existe playbook para este nicho. Ele é criado sozinho depois de 3 vendas, ou clique em Atualizar agora.</p>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <Ib name="shield" tone="warn" size="sm" />
              <h2>Biblioteca de objeções</h2>
              <span className="sp muted" style={{ fontSize: 12 }}>
                resposta que mais converteu
              </span>
            </div>
            {obs.length === 0 ? (
              <p className="muted">As objeções aparecem aqui conforme os clientes conversam.</p>
            ) : (
              <div className="tablewrap">
                <table>
                  <thead>
                    <tr>
                      <th>Objeção</th>
                      <th>Resposta vencedora</th>
                      <th>Viradas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {obs.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <b>{o.objection}</b>
                        </td>
                        <td>{o.best_response || <span className="muted">Ainda sem venda depois desta objeção</span>}</td>
                        <td className="num">
                          {o.wins} de {o.tries}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="card">
            <div className="card-h">
              <Ib name="money" tone="ok" size="sm" />
              <h2>Clientes que compraram</h2>
            </div>
            {buyers.length === 0 ? (
              <p className="muted">Nenhuma venda paga neste nicho ainda.</p>
            ) : (
              <div className="tablewrap">
                <table>
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Cidade</th>
                      <th>Valor</th>
                      <th>Fator decisivo</th>
                      <th>Abordagem</th>
                      <th>Quando</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buyers.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <b>{b.name}</b>
                        </td>
                        <td>{b.city}</td>
                        <td className="num">{brl(b.paid_amount)}</td>
                        <td>{learnByLead[b.id]?.decisive_factor || <span className="muted">estudando…</span>}</td>
                        <td>
                          <span className="chip">{b.approach_slug || '—'}</span>
                        </td>
                        <td className="muted">{timeLabel(b.paid_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
