'use client';
import { useEffect, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { api, toast, brl, timeLabel } from '@/components/ui';

const KIND: Record<string, string> = { abertura: 'Abertura', follow_up: 'Follow-up', resposta: 'Resposta', objecao: 'Objeção', fechamento: 'Fechamento' };
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) + '%' : '—');

export default function Inteligencia() {
  const [d, setD] = useState<any>(null);
  const [tab, setTab] = useState<'cerebro' | 'ganhos' | 'perdidos' | 'mensagens' | 'testar'>('cerebro');
  const [niche, setNiche] = useState('');
  const [busy, setBusy] = useState('');
  const [q, setQ] = useState('Achei caro, vou pensar');
  const [res, setRes] = useState<any>(null);
  const [del, setDel] = useState<string | null>(null);
  async function remove(kind: 'case' | 'snippet', id: number) {
    try {
      await api('/api/intel', 'POST', { action: 'delete', kind, id });
      setDel(null);
      toast('Excluído do aprendizado');
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  const DelBtn = ({ kind, id }: { kind: 'case' | 'snippet'; id: number }) =>
    del === kind + id ? (
      <span className="confirm-pop" data-perm="conhecimento.enviar">
        Excluir do aprendizado?
        <button className="btn btn-sm" style={{ color: 'var(--bad)' }} onClick={() => remove(kind, id)}>
          Excluir
        </button>
        <button className="btn btn-sm btn-g" onClick={() => setDel(null)}>
          Não
        </button>
      </span>
    ) : (
      <button data-perm="conhecimento.enviar" className="btn btn-sm btn-g" style={{ color: 'var(--bad)', alignSelf: 'flex-start' }} onClick={() => setDel(kind + id)}>
        <Icon name="trash" />
        Excluir
      </button>
    );

  const load = async () => {
    try {
      setD(await api(`/api/intel?niche=${encodeURIComponent(niche)}`, 'GET'));
    } catch (e: any) {
      toast(e.message);
    }
  };
  useEffect(() => {
    load();
  }, [niche]);

  async function act(action: string, label: string) {
    setBusy(action);
    try {
      const r = await api('/api/intel', 'POST', { action });
      toast(action === 'study' ? `${r.studied} conversa(s) estudada(s)` : r.content ? label : 'Ainda não há dados suficientes');
      load();
    } catch (e: any) {
      toast(e.message);
    }
    setBusy('');
  }
  async function search() {
    setBusy('search');
    try {
      setRes(await api('/api/intel', 'POST', { action: 'search', text: q, niche }));
    } catch (e: any) {
      toast(e.message);
    }
    setBusy('');
  }

  if (!d) return <PageHead title="Inteligência" sub="Carregando…" icon="robot" tone="ai" help="inteligencia" />;
  const s = d.stats;
  const conv = s.won + s.lost ? Math.round((s.won / (s.won + s.lost)) * 100) : null;
  const kpis: [string, string, string, string, string][] = [
    ['book', 'acc', 'Base 1 · técnicas dos livros', String(s.insights), `${pct(s.insightsVec, s.insights)} com busca por significado`],
    ['trend', 'ok', 'Base 2 · vendas estudadas', String(s.won), `${s.lost} perdidas estudadas`],
    ['spark', 'ai', 'Mensagens campeãs', String(s.champions), `de ${s.snippets} mensagens medidas`],
    ['target', 'gg', 'Conversão das conversas', conv === null ? '—' : conv + '%', `👍 ${s.liked} · 👎 ${s.disliked} da equipe`],
  ];

  return (
    <>
      <PageHead title="Inteligência" sub="As duas bases que fazem a IA vender mais a cada venda" icon="robot" tone="ai" help="inteligencia">
        <select className="input" style={{ width: 180 }} value={niche} onChange={(e) => setNiche(e.target.value)} aria-label="Nicho">
          <option value="">Todos os nichos</option>
          {d.niches.map((n: string) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </PageHead>

      {d.missing && (
        <div className="alert" style={{ borderColor: 'var(--warn)' }}>
          <Icon name="alert" className="status-bad" />
          <div>
            <b>Falta rodar a atualização 007 no Supabase.</b> Até lá a IA usa só a busca por palavras nos livros.
          </div>
        </div>
      )}

      <div className="grid g-kpi">
        {kpis.map((k, i) => (
          <div className="card kpi" key={i}>
            <div className="row">
              <Ib name={k[0]} tone={k[1]} delay={i * 0.3} />
            </div>
            <div className="v">{k[3]}</div>
            <div className="l">{k[2]}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {k[4]}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 13 }}>
        <Ib name={s.embed.ready ? 'check' : s.embed.error ? 'alert' : 'clock'} tone={s.embed.ready ? 'ok' : s.embed.error ? 'warn' : 'mut'} size="sm" />
        <div style={{ flex: 1, minWidth: 220 }}>
          <b>Busca por significado </b>
          {s.embed.disabled
            ? 'desligada (EMBED_DISABLED=1).'
            : s.embed.ready
              ? 'ativa neste servidor (grátis, roda na VPS).'
              : s.embed.error
                ? `indisponível: ${s.embed.error}. A IA continua com a busca por palavras.`
                : `prepara sozinha no robô. Trechos dos livros prontos: ${pct(s.chunksVec, s.chunks)}.`}
        </div>
        <button data-perm="conhecimento.enviar" className="btn btn-sm" disabled={!!busy} onClick={() => act('study', '')}>
          {busy === 'study' ? <span className="spin" /> : <Icon name="refresh" />}
          Estudar conversas encerradas agora
        </button>
      </div>

      <div className="seg" role="tablist" style={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>
        {(
          [
            ['cerebro', 'Os dois cérebros'],
            ['ganhos', `Vendas (${d.won.length})`],
            ['perdidos', `Perdidas (${d.lost.length})`],
            ['mensagens', `Mensagens campeãs (${d.top.length})`],
            ['testar', 'Testar a busca'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} role="tab" aria-pressed={tab === k} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'cerebro' && (
        <div className="grid g-2">
          <div className="card">
            <div className="card-h">
              <Ib name="trend" tone="ok" size="sm" />
              <h2>Cérebro real</h2>
              <button data-perm="conhecimento.enviar" className="sp btn btn-sm" disabled={!!busy} onClick={() => act('real', 'Cérebro real atualizado')}>
                {busy === 'real' ? <span className="spin" /> : <Icon name="refresh" />}
                Refazer
              </button>
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
              Feito só com as conversas de verdade. Tem prioridade sobre os livros. Atualiza sozinho a cada 3 casos novos.
              {d.brain?.real_updated_at ? ` Última vez ${timeLabel(d.brain.real_updated_at)}, com ${d.brain.real_cases} casos.` : ''}
            </p>
            <div className="brain">{d.brain?.real_content || 'Ainda sem conversas suficientes. Depois das primeiras vendas e perdas estudadas, o manual aparece aqui.'}</div>
          </div>
          <div className="card">
            <div className="card-h">
              <Ib name="book" tone="acc" size="sm" />
              <h2>Cérebro dos livros</h2>
              <button data-perm="conhecimento.enviar" className="sp btn btn-sm" disabled={!!busy} onClick={() => act('books', 'Cérebro dos livros atualizado')}>
                {busy === 'books' ? <span className="spin" /> : <Icon name="refresh" />}
                Refazer
              </button>
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
              Resumo das técnicas dos PDFs. Os livros são lidos uma vez; depois tudo fica no banco e a busca é grátis.
            </p>
            <div className="brain">{d.brain?.content || 'Ainda sem livros estudados.'}</div>
          </div>
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-h">
              <Ib name="pulse" tone="gg" size="sm" />
              <h2>Como cada tipo de mensagem está performando</h2>
            </div>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th style={{ textAlign: 'right' }}>Medidas</th>
                    <th style={{ textAlign: 'right' }}>Taxa de resposta</th>
                    <th style={{ textAlign: 'right' }}>Viraram venda</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(d.kinds).length === 0 && (
                    <tr>
                      <td colSpan={4} className="muted">
                        As mensagens são medidas 6 horas depois de enviadas.
                      </td>
                    </tr>
                  )}
                  {Object.entries(d.kinds).map(([k, v]: any) => (
                    <tr key={k}>
                      <td>{KIND[k] || k}</td>
                      <td style={{ textAlign: 'right' }}>{v.total}</td>
                      <td style={{ textAlign: 'right' }}>{pct(v.replied, v.total)}</td>
                      <td style={{ textAlign: 'right' }}>{pct(v.won, v.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'ganhos' && (
        <div className="grid g-2">
          {d.won.length === 0 && <div className="card muted">Cada venda paga vira um caso de estudo aqui, com a virada da conversa e a lição.</div>}
          {d.won.map((c: any) => (
            <div className="card" key={c.id}>
              <div className="chips" style={{ marginBottom: 8 }}>
                <span className="chip" style={{ ['--t' as any]: 'var(--ok)' }}>
                  Venda{c.price ? ` · ${brl(c.price)}` : ''}
                </span>
                {c.niche && <span className="chip">{c.niche}</span>}
                {c.channel && <span className="chip">{c.channel}</span>}
                {c.days_to_close != null && <span className="chip">{c.days_to_close} dias</span>}
                {c.wins > 0 && <span className="chip" style={{ ['--t' as any]: 'var(--ai)' }}>inspirou {c.wins} venda(s)</span>}
              </div>
              <p style={{ fontSize: 13.5 }}>{c.summary}</p>
              <p style={{ fontSize: 13, marginTop: 8 }}>
                <b>Virada:</b> {c.turning_point}
              </p>
              <p style={{ fontSize: 13, marginTop: 6, color: 'var(--ok)' }}>
                <b>Lição:</b> {c.lesson}
              </p>
              <div style={{ marginTop: 10 }}>
                <DelBtn kind="case" id={c.id} />
              </div>
              {(c.objections || []).length > 0 && (
                <ul style={{ fontSize: 12.5, marginTop: 8, paddingLeft: 18 }} className="muted">
                  {c.objections.map((o: any, i: number) => (
                    <li key={i}>
                      "{o.objection}" → {o.response} {o.worked ? '✓' : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'perdidos' && (
        <div className="grid g-2">
          <div className="card">
            <div className="card-h">
              <Ib name="alert" tone="warn" size="sm" />
              <h2>Por que perdemos</h2>
            </div>
            {d.reasons.length === 0 && <p className="muted">Conversas sem resposta há 14 dias ou recusadas são estudadas automaticamente.</p>}
            <div style={{ display: 'grid', gap: 8 }}>
              {d.reasons.map(([r, n]: [string, number]) => (
                <div key={r} className="frow" style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr) 36px' }}>
                  <span>{r}</span>
                  <span className="bar" style={{ width: `${(n / d.reasons[0][1]) * 100}%`, background: 'var(--warn)' }} />
                  <b>{n}</b>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <Ib name="bulb" tone="acc" size="sm" />
              <h2>Lições das perdas</h2>
            </div>
            <ul style={{ display: 'grid', gap: 10, paddingLeft: 18, fontSize: 13 }}>
              {d.lost.slice(0, 30).map((c: any) => (
                <li key={c.id}>
                  <b>{c.lost_reason}</b>
                  {c.niche ? ` (${c.niche})` : ''}: {c.lesson} <DelBtn kind="case" id={c.id} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === 'mensagens' && (
        <div className="grid g-2">
          <div className="card">
            <div className="card-h">
              <Ib name="spark" tone="ai" size="sm" />
              <h2>As que mais funcionam</h2>
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
              Nota = respondeu + esquentou + avançou de etapa + virou venda + 👍 da equipe. A IA usa as melhores como inspiração nas conversas parecidas.
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              {d.top.length === 0 && <p className="muted">Aparecem conforme as conversas acontecem.</p>}
              {d.top.map((m: any) => (
                <div key={m.id} className="snip">
                  <div className="chips">
                    <span className="chip" style={{ ['--t' as any]: 'var(--ai)' }}>
                      nota {Number(m.score).toFixed(1)}
                    </span>
                    <span className="chip">{KIND[m.kind] || m.kind}</span>
                    {m.niche && <span className="chip">{m.niche}</span>}
                    {m.author === 'human' && <span className="chip">equipe</span>}
                    {m.won && <span className="chip" style={{ ['--t' as any]: 'var(--ok)' }}>vendeu</span>}
                    {m.feedback === 1 && <span className="chip">👍</span>}
                  </div>
                  {m.situation && <p className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>Cliente: "{m.situation}"</p>}
                  <p style={{ fontSize: 13.5, marginTop: 4 }}>"{m.text}"</p>
                  <div style={{ marginTop: 8 }}>
                    <DelBtn kind="snippet" id={m.id} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <Ib name="x" tone="warn" size="sm" />
              <h2>O que evitar</h2>
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
              Mensagens com 👎 da equipe ou que esfriaram a conversa. Entram no cérebro real como "não fazer".
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              {d.bad.length === 0 && <p className="muted">Nada por aqui ainda.</p>}
              {d.bad.map((m: any) => (
                <div key={m.id} className="snip bad">
                  {m.situation && <p className="muted" style={{ fontSize: 12.5 }}>Cliente: "{m.situation}"</p>}
                  <p style={{ fontSize: 13.5, marginTop: 4 }}>"{m.text}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'testar' && (
        <div className="card">
          <div className="card-h">
            <Ib name="search" tone="gg" size="sm" />
            <h2>O que a IA encontra para uma situação</h2>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input className="input" style={{ flex: 1, minWidth: 220 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cole o que o cliente disse" />
            <button className="btn btn-p" onClick={search} disabled={busy === 'search'}>
              {busy === 'search' ? <span className="spin" /> : <Icon name="search" />}
              Buscar nas duas bases
            </button>
          </div>
          {res && (
            <div className="grid g-2" style={{ marginTop: 14 }}>
              <div>
                <h3 style={{ fontSize: 13, marginBottom: 8 }}>Base 2 · clientes reais {res.semantic ? '(por significado)' : '(por palavras)'}</h3>
                {[...res.cases, ...res.lost].length + res.snippets.length === 0 && <p className="muted">Nada parecido ainda.</p>}
                {res.cases.map((c: any) => (
                  <p key={'c' + c.id} style={{ fontSize: 13, marginBottom: 8 }}>
                    <span className="chip" style={{ ['--t' as any]: 'var(--ok)' }}>venda</span> {c.lesson}
                  </p>
                ))}
                {res.lost.map((c: any) => (
                  <p key={'l' + c.id} style={{ fontSize: 13, marginBottom: 8 }}>
                    <span className="chip" style={{ ['--t' as any]: 'var(--warn)' }}>perdida</span> {c.lesson}
                  </p>
                ))}
                {res.snippets.map((m: any) => (
                  <p key={'s' + m.id} style={{ fontSize: 13, marginBottom: 8 }}>
                    <span className="chip" style={{ ['--t' as any]: 'var(--ai)' }}>campeã</span> "{m.text}"
                  </p>
                ))}
              </div>
              <div>
                <h3 style={{ fontSize: 13, marginBottom: 8 }}>Base 1 · livros</h3>
                {res.insights.length === 0 && <p className="muted">Nenhuma técnica encontrada.</p>}
                {res.insights.map((i: any) => (
                  <p key={i.id} style={{ fontSize: 13, marginBottom: 8 }}>
                    <b>{i.title}:</b> {i.content} <span className="muted">({i.doc_name})</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
