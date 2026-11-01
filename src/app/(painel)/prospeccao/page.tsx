'use client';
import { useEffect, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { LeadDrawer } from '@/components/LeadDrawer';
import { api, toast, ScoreBar, SiteChip, timeLabel } from '@/components/ui';
import { sb } from '@/lib/supabase/browser';
import { ProspectBoard } from '@/components/ProspectBoard';

export default function Prospeccao() {
  const [f, setF] = useState({ niche: '', city: '', radius: 10, qty: 20, noSite: false, needWa: true, needIg: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [rows, setRows] = useState<any[] | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<'buscar' | 'sel'>('buscar');

  async function loadHistory() {
    const { data } = await sb().from('searches').select('*').order('created_at', { ascending: false }).limit(8);
    setHistory(data || []);
  }
  useEffect(() => {
    loadHistory();
  }, []);

  function setResult(list: any[]) {
    setRows(list);
    // nada marcado de saída: a equipe escolhe quem vai para os selecionados
    setSel(new Set());
  }

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (!f.niche.trim() || !f.city.trim()) {
      setErr('Preencha o nicho e a cidade.');
      return;
    }
    setErr('');
    setBusy(true);
    setRows(null);
    try {
      const r = await api('/api/search', 'POST', f);
      setResult(r.leads);
      toast(`${r.leads.length} resultados (${r.newCount} novos)`);
      loadHistory();
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  }

  async function openSearch(s: any) {
    setF({ ...f, niche: s.niche, city: s.city, radius: s.radius_km, qty: s.qty });
    const { data } = await sb().from('leads').select('*').eq('search_id', s.id).order('score', { ascending: false });
    setResult(data || []);
  }

  async function queue() {
    try {
      const r = await api('/api/leads/queue', 'POST', { ids: Array.from(sel) });
      toast(`${r.wa} contato(s) nos Selecionados. Nada foi enviado: confira e clique em Iniciar.`);
      setTab('sel');
      const ids = (rows || []).map((x) => x.id);
      const { data } = await sb().from('leads').select('*').in('id', ids).order('score', { ascending: false });
      setResult(data || []);
    } catch (e: any) {
      toast(e.message);
    }
  }

  const toggle = (id: string) => {
    const s = new Set(sel);
    s.has(id) ? s.delete(id) : s.add(id);
    setSel(s);
  };
  const noSite = (rows || []).filter((r) => r.site_status === 'nenhum').length;

  return (
    <>
      <PageHead title="Prospecção" sub="Busque no Google Maps, escolha os melhores e só então inicie as abordagens (com prévia de cada mensagem)" icon="radar" tone="gg" help="busca" />
      <div className="sites-tabs" role="tablist" style={{ marginBottom: 14 }}>
        <button type="button" role="tab" aria-selected={tab === 'buscar'} className={tab === 'buscar' ? 'on' : ''} onClick={() => setTab('buscar')}>
          <Icon name="search" /> Buscar
        </button>
        <button type="button" role="tab" aria-selected={tab === 'sel'} className={tab === 'sel' ? 'on' : ''} onClick={() => setTab('sel')}>
          <Icon name="target" /> Selecionados e abordagens
        </button>
      </div>
      {tab === 'sel' && <ProspectBoard onOpen={setOpen} />}
      {tab === 'buscar' && (<>
      <form className="card" onSubmit={search}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', alignItems: 'end' }}>
          <div className="field">
            <label htmlFor="f-niche">Nicho</label>
            <input id="f-niche" className="input" value={f.niche} onChange={(e) => setF({ ...f, niche: e.target.value })} placeholder="Ex.: fisioterapeutas" />
          </div>
          <div className="field">
            <label htmlFor="f-city">Cidade ou endereço central</label>
            <input id="f-city" className="input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="Ex.: Limeira, SP" />
          </div>
          <div className="field">
            <label htmlFor="f-radius">Raio de alcance</label>
            <select id="f-radius" className="input" value={f.radius} onChange={(e) => setF({ ...f, radius: Number(e.target.value) })}>
              {[2, 5, 10, 20, 30, 50].map((v) => (
                <option key={v} value={v}>
                  {v} km
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Quantidade</label>
            <div className="seg" role="group">
              {[20, 50].map((v) => (
                <button type="button" key={v} aria-pressed={f.qty === v} onClick={() => setF({ ...f, qty: v })}>
                  {v} resultados
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginTop: 14 }}>
          <label className="check">
            <input type="checkbox" checked={f.noSite} onChange={(e) => setF({ ...f, noSite: e.target.checked })} />
            Só quem não tem site
          </label>
          <label className="check">
            <input type="checkbox" checked={f.needWa} onChange={(e) => setF({ ...f, needWa: e.target.checked })} />
            Precisa ter WhatsApp
          </label>
          <label className="check">
            <input type="checkbox" checked={f.needIg} onChange={(e) => setF({ ...f, needIg: e.target.checked })} />
            Precisa ter Instagram
          </label>
          <button data-perm="prospeccao.buscar" className="btn btn-p" style={{ marginLeft: 'auto' }} disabled={busy}>
            {busy ? <span className="spin" /> : <Icon name="search" />}
            {busy ? 'Buscando e analisando…' : 'Buscar no Google Maps'}
          </button>
        </div>
        {err && <p className="err" style={{ marginTop: 10 }}>{err}</p>}
      </form>

      {busy && (
        <div className="card empty">
          <Ib name="radar" tone="gg" size="lg" />
          <div>
            <h2>Varrendo o Google Maps…</h2>
            <p>Buscando fichas, abrindo cada site e calculando a pontuação. Leva de 20 segundos a 2 minutos.</p>
          </div>
        </div>
      )}

      {rows && !busy && (
        <div className="card">
          <div className="card-h" style={{ flexWrap: 'wrap' }}>
            <Ib name="target" tone="acc" size="sm" />
            <h2>{rows.length} resultados</h2>
            <span className="chip" style={{ ['--t' as any]: 'var(--accent)' }}>
              {noSite} sem site
            </span>
            {rows.length > 0 && (
              <span className="chip" style={{ ['--t' as any]: 'var(--gg)' }}>
                média {Math.round(rows.reduce((a, r) => a + r.score, 0) / rows.length)} pts
              </span>
            )}
            <button data-perm="prospeccao.buscar" className="sp btn btn-p" disabled={!sel.size} onClick={queue}>
              <Icon name="plus" />
              Adicionar {sel.size} aos selecionados
            </button>
          </div>
          {rows.length === 0 ? (
            <p className="muted">Nenhum resultado com esses filtros. Aumente o raio ou desmarque algum filtro.</p>
          ) : (
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        className="selbox"
                        aria-label="Selecionar todos"
                        checked={sel.size > 0 && sel.size === rows.filter((r) => r.wa_status === 'nao').length}
                        onChange={(e) => setSel(e.target.checked ? new Set(rows.filter((r) => r.wa_status === 'nao' && !r.opted_out).map((r) => r.id)) : new Set())}
                      />
                    </th>
                    <th>Negócio</th>
                    <th>Distância</th>
                    <th>Site</th>
                    <th>Ficha no Google</th>
                    <th>Canais</th>
                    <th>Chance de fechar</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="click" onClick={() => setOpen(r.id)}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="selbox" aria-label={`Selecionar ${r.name}`} checked={sel.has(r.id)} disabled={r.wa_status !== 'nao' && r.ig_status !== 'nao'} onChange={() => toggle(r.id)} />
                      </td>
                      <td className="biz">
                        <a
                          className="extlink"
                          href={r.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name + ' ' + (r.address || ''))}${r.place_id ? `&query_place_id=${r.place_id}` : ''}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Abrir a ficha no Google Maps"
                        >
                          {r.name}
                          <Icon name="ext" />
                        </a>
                        <small>
                          {r.address}
                          {r.wa_status !== 'nao' && <span className="tag-new"> · já na fila</span>}
                        </small>
                      </td>
                      <td className="num">{r.distance_km} km</td>
                      <td>
                        <SiteChip s={r.site_status} />
                      </td>
                      <td className="num">
                        {r.rating != null ? (
                          <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                            <Icon name="star" />
                            {String(r.rating).replace('.', ',')}
                          </span>
                        ) : (
                          '—'
                        )}{' '}
                        <span className="muted">
                          · {r.reviews} aval. · {r.photos} fotos{r.has_hours ? '' : ' · sem horário'}
                        </span>
                      </td>
                      <td>
                        <span className="chan">
                          <span className={`cs ${r.whatsapp ? '' : 'off'}`} style={{ ['--t' as any]: 'var(--wa)' }} title={r.whatsapp ? 'Tem WhatsApp' : 'Sem WhatsApp'}>
                            <Icon name="wa" />
                          </span>
                          <span className={`cs ${r.instagram ? '' : 'off'}`} style={{ ['--t' as any]: 'var(--ig)' }} title={r.instagram || 'Sem Instagram'}>
                            <Icon name="ig" />
                          </span>
                        </span>
                      </td>
                      <td>
                        <ScoreBar v={r.score} title={(r.score_parts || []).map((p: any) => `${p[0]} +${p[1]}`).join(' · ')} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Clique no nome para abrir a ficha no Google Maps. Clique no resto da linha para ver a ficha completa no Radar. Passe o mouse na pontuação para ver o motivo de cada ponto.
          </p>
        </div>
      )}

      {!rows && !busy && (
        <div className="card">
          <div className="card-h">
            <Ib name="clock" tone="mut" size="sm" />
            <h2>Buscas recentes</h2>
          </div>
          {history.length === 0 ? (
            <p className="muted">Nenhuma busca ainda. Comece pelo nicho e pela cidade acima.</p>
          ) : (
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Nicho</th>
                    <th>Cidade</th>
                    <th>Raio</th>
                    <th>Resultados</th>
                    <th>Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((s) => (
                    <tr key={s.id} className="click" onClick={() => openSearch(s)}>
                      <td>
                        <b>{s.niche}</b>
                      </td>
                      <td>{s.city}</td>
                      <td className="num">{s.radius_km} km</td>
                      <td className="num">{s.found}</td>
                      <td className="muted">{timeLabel(s.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      </>)}
      {open && <LeadDrawer id={open} onClose={() => setOpen(null)} />}
    </>
  );
}
