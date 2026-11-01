'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHead } from '@/components/PageHead';
import { Icon } from '@/components/Icon';
import { ART, CATS, QUICK } from '@/data/manual';
import { norm } from '@/lib/util';

function search(q: string) {
  const ts = norm(q).split(/\s+/).filter((t) => t.length > 1);
  if (!ts.length) return [];
  return ART.map((a) => {
    const tt = norm(a[2]);
    const kk = norm(a[3]);
    const bb = norm(a[4].replace(/<[^>]+>/g, ' '));
    let s = 0;
    ts.forEach((t) => {
      if (tt.includes(t)) s += 5;
      if (kk.includes(t)) s += 3;
      if (bb.includes(t)) s += 1;
    });
    return [s, a] as [number, (typeof ART)[number]];
  })
    .filter((x) => x[0] > 0)
    .sort((a, b) => b[0] - a[0])
    .map((x) => x[1])
    .slice(0, 8);
}

function highlight(html: string, q: string) {
  const ts = norm(q).split(/\s+/).filter((t) => t.length > 2);
  if (!ts.length) return html;
  return html.replace(/>([^<]+)/g, (_m, txt) => '>' + txt.replace(/[\wÀ-ÿ]+/g, (w: string) => (ts.some((t) => norm(w).includes(t)) ? `<mark>${w}</mark>` : w)));
}

function Ajuda() {
  const params = useSearchParams();
  const [q, setQ] = useState('');
  const [art, setArt] = useState(params.get('a') || 'fluxo');
  useEffect(() => {
    const a = params.get('a');
    if (a) setArt(a);
  }, [params]);

  const results = useMemo(() => search(q), [q]);
  const a = ART.find((x) => x[0] === art) || ART[0];
  const cat = CATS.find((c) => c[0] === a[1]) || CATS[0];
  const related = ART.filter((x) => x[1] === a[1] && x[0] !== a[0]).slice(0, 3);

  function open(id: string) {
    setArt(id);
    if (window.innerWidth < 900) document.getElementById('artbox')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function onQuery(v: string) {
    setQ(v);
    const r = search(v);
    if (r[0]) setArt(r[0][0]);
  }

  return (
    <>
      <PageHead title="Ajuda e Manuais" sub="Tudo sobre o painel, tela por tela. Digite sua dúvida" icon="help" help="menus" />
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="msearch">
          <Icon name="search" />
          <input className="input" type="search" placeholder="Ex.: como conectar número, limite por dia, desconto, pix…" value={q} onChange={(e) => onQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && open(art)} aria-label="Buscar no manual" />
        </div>
        <div className="qchips">
          {QUICK.map((x) => (
            <button key={x} onClick={() => onQuery(x)}>
              {x}
            </button>
          ))}
        </div>
      </div>
      <div className="man">
        <nav className="card toc" aria-label="Tópicos do manual">
          {q.trim() ? (
            <div className="res">
              {results.length ? (
                results.map((r) => (
                  <button key={r[0]} onClick={() => open(r[0])}>
                    <b>{r[2]}</b>
                    <small>{CATS.find((c) => c[0] === r[1])?.[1]}</small>
                  </button>
                ))
              ) : (
                <p className="muted">Nada encontrado. Tente outra palavra, como "bloqueio", "preço" ou "QR".</p>
              )}
            </div>
          ) : (
            CATS.map((c) => (
              <div key={c[0]} style={{ display: 'contents' }}>
                <div className="cat">
                  <Icon name={c[2]} />
                  {c[1]}
                </div>
                {ART.filter((x) => x[1] === c[0]).map((x) => (
                  <button key={x[0]} aria-current={x[0] === art} onClick={() => open(x[0])}>
                    {x[2]}
                  </button>
                ))}
              </div>
            ))
          )}
        </nav>
        <div className="card" id="artbox">
          <article className="art">
            <div className="crumb">
              <Icon name={cat[2]} />
              {cat[1]}
            </div>
            <h2>{a[2]}</h2>
            <div dangerouslySetInnerHTML={{ __html: highlight(a[4], q) }} />
            {related.length > 0 && (
              <div className="related">
                <span className="muted" style={{ fontSize: 12.5, width: '100%' }}>
                  Tópicos relacionados
                </span>
                {related.map((r) => (
                  <button key={r[0]} className="btn btn-sm" onClick={() => open(r[0])}>
                    {r[2]}
                  </button>
                ))}
              </div>
            )}
          </article>
        </div>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="spin" />}>
      <Ajuda />
    </Suspense>
  );
}
