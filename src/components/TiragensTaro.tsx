'use client';
/* Mapa da Alma › Gerador de mapas › Tarô: todas as tiragens feitas, com as cartas, o link e o PDF. */
import { useEffect, useState } from 'react';
import { Icon, Ib } from '@/components/Icon';
import { toast, api, copyText, dayLabel } from '@/components/ui';

export function TiragensTaro() {
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    api('/api/tiragens', 'GET').then(setD).catch((e: any) => toast(e.message));
  }, []);
  return (
    <div className="card">
      <div className="card-h">
        <Ib name="spark" tone="ai" size="sm" />
        <h2>Tiragens de tarô</h2>
        <div className="sp" />
        <span className="muted" style={{ fontSize: 12.5 }}>Os preços ficam em Vendas › Mapas e preços</span>
      </div>
      {!d ? <span className="spin" /> : d.aviso ? <p className="muted">{d.aviso}</p> : !d.tiragens.length ? (
        <p className="muted">Nenhuma tiragem ainda. A IA oferece o tarô depois que o cliente recebe o mapa; quando ele paga, as cartas são sorteadas e a leitura acontece na conversa.</p>
      ) : (
        <div className="tt-lista">
          {d.tiragens.map((t: any) => (
            <div key={t.id} className="tt-item">
              <div className="tt-top">
                <div>
                  <b>{t.nome || t.leads?.name || 'Cliente'}</b>
                  <div className="muted" style={{ fontSize: 12.5 }}>{t.tipo_nome} · {dayLabel(t.created_at)} · {t.views || 0} visita(s)</div>
                </div>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  {t.leads && <a className="btn btn-g btn-sm" href={`/conversas?lead=${t.leads.id}`}><Icon name="chat" />Conversa</a>}
                  <a className="btn btn-g btn-sm" href={t.url} target="_blank" rel="noreferrer"><Icon name="eye" />Abrir</a>
                  <a className="btn btn-g btn-sm" href={`${t.url}/pdf`} target="_blank" rel="noreferrer"><Icon name="file" />PDF</a>
                  <button className="btn btn-g btn-sm" onClick={() => copyText(t.url).then(() => toast('Link da tiragem copiado'))}><Icon name="link" />Copiar link</button>
                </div>
              </div>
              {t.pergunta && <p className="tt-perg">“{t.pergunta}”</p>}
              <div className="tt-cartas">{t.cartas_nomes.map((n: string, i: number) => <span key={i}>{i + 1}. {n}</span>)}</div>
            </div>
          ))}
        </div>
      )}
      <style>{`.tt-lista{display:flex;flex-direction:column;gap:10px}.tt-item{border:1px solid var(--line);border-radius:14px;padding:12px 14px}
.tt-top{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start}.tt-perg{margin:8px 0 4px;font-style:italic;color:var(--ai)}
.tt-cartas{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.tt-cartas span{font-size:12px;background:color-mix(in srgb,var(--ai) 9%,transparent);color:var(--ai);border-radius:999px;padding:3px 10px}`}</style>
    </div>
  );
}
