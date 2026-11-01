'use client';
/*
 * Prospecção › Selecionados e abordagens
 * - Selecionados: quem veio da busca e foi escolhido (nada é enviado ainda).
 * - Chips e regras: quais números prospectam (rodízio aleatório), quantas por dia, intervalos, tempo para revisar, lembretes.
 * - Iniciar / Pausar.
 * - Próximas mensagens: cada abordagem aparece aqui antes de sair (com contagem); dá para editar, segurar, enviar já ou pular.
 * - Andamento e recusas (com o motivo).
 */
import { useEffect, useRef, useState } from 'react';
import { Icon, Ib } from './Icon';
import { api, toast, ScoreBar, SiteChip, timeLabel, stageOf } from './ui';
import { sb } from '@/lib/supabase/browser';

function Countdown({ at, hold }: { at?: string | null; hold?: boolean }) {
  const [, setT] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, []);
  if (hold) return <span className="pb-count" style={{ color: 'var(--warn)' }}>segurada</span>;
  if (!at) return null;
  const s = Math.max(0, Math.round((new Date(at).getTime() - Date.now()) / 1000));
  return <span className="pb-count">{s > 0 ? `sai em ${s}s` : 'enviando…'}</span>;
}

function Draft({ l, onChange }: { l: any; onChange: () => void }) {
  const [txt, setTxt] = useState<string>((l.draft?.parts || []).join('\n\n'));
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState('');
  const base = useRef(txt);
  useEffect(() => {
    // chegou versão nova do servidor e a pessoa não está editando
    const t = (l.draft?.parts || []).join('\n\n');
    if (!editing && t !== base.current) {
      base.current = t;
      setTxt(t);
    }
  }, [l.draft, editing]);
  async function act(body: any, label: string, ok?: string) {
    setBusy(label);
    try {
      const r = await api('/api/prospect', 'POST', { id: l.id, ...body });
      if (r?.parts) {
        const t = r.parts.join('\n\n');
        base.current = t;
        setTxt(t);
      }
      if (ok) toast(ok);
      onChange();
    } catch (e: any) {
      toast(e.message);
    }
    setBusy('');
  }
  const parts = () => txt.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);
  return (
    <div className={`pb-draft ${l.draft_hold ? 'hold' : ''}`}>
      <div className="pb-draft-h">
        <b>{l.name}</b>
        <span className="muted">
          {l.niche || ''} {l.city ? '· ' + l.city : ''}
        </span>
        <span className="chip" style={{ ['--t' as any]: 'var(--wa)' }}>
          {l.draft?.number_label || 'chip'}
          {l.draft?.agent ? ` · ${l.draft.agent}` : ''}
        </span>
        {l.wa_status === 'enviando' ? <span className="pb-count">enviando…</span> : <Countdown at={l.draft_at} hold={l.draft_hold} />}
      </div>
      <textarea
        className="input"
        value={txt}
        onFocus={() => {
          setEditing(true);
          // começou a editar: segura a mensagem para não sair no meio
          if (!l.draft_hold) act({ action: 'draft', hold: true }, 'hold');
        }}
        onChange={(e) => setTxt(e.target.value)}
        aria-label={`Mensagem para ${l.name}`}
        disabled={l.wa_status !== 'rascunho'}
      />
      <div className="row-actions" style={{ flexWrap: 'wrap' }}>
        {(editing || txt !== base.current) && (
          <button
            className="btn btn-sm btn-p"
            disabled={!!busy || !parts().length}
            onClick={async () => {
              await act({ action: 'draft', parts: parts(), hold: false }, 'save', 'Mensagem editada. Sai em alguns segundos.');
              base.current = txt;
              setEditing(false);
            }}
          >
            <Icon name="check" /> Salvar e liberar
          </button>
        )}
        {l.draft_hold && !editing && (
          <button className="btn btn-sm" disabled={!!busy} onClick={() => act({ action: 'draft', hold: false }, 'free', 'Liberada')}>
            <Icon name="play" /> Liberar
          </button>
        )}
        <button className="btn btn-sm btn-wa" disabled={!!busy || l.wa_status !== 'rascunho'} onClick={() => act({ action: 'send_now' }, 'send', 'Enviada')}>
          {busy === 'send' ? <span className="spin" /> : <Icon name="send" />} Enviar agora
        </button>
        <button className="btn btn-sm" disabled={!!busy} onClick={() => act({ action: 'new_opening' }, 'new')} title="Sortear outro modelo de cumprimento">
          <Icon name="refresh" /> Outra frase
        </button>
        <button className="btn btn-sm" disabled={!!busy} onClick={() => act({ action: 'skip' }, 'skip', 'Voltou para os selecionados')} style={{ marginLeft: 'auto' }}>
          <Icon name="x" /> Pular
        </button>
      </div>
    </div>
  );
}

export function ProspectBoard({ onOpen }: { onOpen: (id: string) => void }) {
  const [d, setD] = useState<any>(null);
  const [cfg, setCfg] = useState<any>(null);
  const [pick, setPick] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const first = useRef(true);

  async function load() {
    try {
      const r = await api('/api/prospect', 'GET');
      setD(r);
      if (first.current) {
        first.current = false;
        setCfg(r.cfg);
        setPick(new Set((r.selected || []).map((x: any) => x.id)));
      }
    } catch (e: any) {
      toast(e.message);
    }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    const ch = sb()
      .channel('prospect-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (p: any) => {
        if (['rascunho', 'enviando', 'enviado', 'fila', 'preparando'].includes(p.new?.wa_status) || p.old?.wa_status === 'rascunho') load();
      })
      .subscribe();
    return () => {
      clearInterval(t);
      sb().removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!d || !cfg) return <div className="spin" />;
  if (d.missing)
    return (
      <div className="card">
        <p>Rode a atualização <b>033_prospeccao_manual.sql</b> no Supabase para liberar esta tela.</p>
      </div>
    );

  const set = (k: string, v: any) => setCfg({ ...cfg, [k]: v });
  async function saveCfg(next = cfg) {
    try {
      const r = await api('/api/prospect', 'POST', { action: 'config', cfg: next });
      setCfg({ ...r.cfg, running: d.cfg.running });
      toast('Regras salvas');
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function start() {
    const connected = d.numbers.filter((n: any) => n.status === 'conectado' && (!cfg.numbers.length || cfg.numbers.includes(n.id)));
    if (!connected.length) return toast('Escolha pelo menos um chip conectado.');
    if (!pick.size && !d.queued.length) return toast('Marque quem vai ser abordado na lista de selecionados.');
    setBusy(true);
    try {
      await api('/api/prospect', 'POST', { action: 'start', ids: Array.from(pick), cfg });
      setPick(new Set());
      toast(cfg.review_s > 0 ? `Iniciada! Cada mensagem aparece aqui ${cfg.review_s}s antes de sair.` : 'Iniciada!');
      await load();
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }
  async function pause() {
    setBusy(true);
    try {
      await api('/api/prospect', 'POST', { action: 'pause' });
      toast('Prospecção pausada. Nada mais sai até iniciar de novo.');
      await load();
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }
  async function remove(ids: string[], action = 'remove') {
    try {
      await api('/api/prospect', 'POST', { action, ids });
      setPick((p) => new Set(Array.from(p).filter((x) => !ids.includes(x))));
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  const running = !!d.cfg.running;
  const chips = d.numbers;
  const togglePick = (id: string) => {
    const s = new Set(pick);
    s.has(id) ? s.delete(id) : s.add(id);
    setPick(s);
  };
  const toggleChip = (id: string) => {
    const list: string[] = cfg.numbers.includes(id) ? cfg.numbers.filter((x: string) => x !== id) : [...cfg.numbers, id];
    const next = { ...cfg, numbers: list };
    setCfg(next);
    saveCfg(next);
  };

  return (
    <>
      <div className="card">
        <div className="card-h" style={{ flexWrap: 'wrap' }}>
          <Ib name="radar" tone={running ? 'ok' : 'mut'} size="sm" />
          <h2>{running ? 'Prospecção rodando' : 'Prospecção parada'}</h2>
          <span className="muted" style={{ fontSize: 12.5 }}>
            {d.queued.length} na fila · {d.drafts.length} para sair · {d.selected.length} selecionados
          </span>
          <span className="sp" />
          {running ? (
            <button className="btn btn-sm" onClick={pause} disabled={busy}>
              <Icon name="pause" /> Pausar
            </button>
          ) : null}
          <button className="btn btn-p" onClick={start} disabled={busy}>
            <Icon name="play" />
            {running ? (pick.size ? `Adicionar ${pick.size} à fila` : 'Rodando') : `Iniciar${pick.size ? ` com ${pick.size}` : ''}`}
          </button>
        </div>
        <div className="field">
          <label>Chips que vão prospectar (rodízio em ordem aleatória; cada um se apresenta com o nome do atendente dele)</label>
          <div className="pb-chips">
            {chips.map((n: any) => {
              const on = cfg.numbers.includes(n.id);
              return (
                <button type="button" key={n.id} className={`pb-chip ${on ? 'on' : ''}`} onClick={() => toggleChip(n.id)} aria-pressed={on} disabled={n.status !== 'conectado' && !on}>
                  <input type="checkbox" readOnly checked={on} tabIndex={-1} />
                  <span>
                    <b>{n.label}</b> {n.agent_name && <small>· {n.agent_name}</small>}
                    <br />
                    <small>
                      {n.status === 'conectado' ? `${n.prospect_today || 0}/${cfg.daily_per_chip} hoje` : 'desconectado'}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
          {!cfg.numbers.length && <small className="muted">Nenhum marcado = todos os chips conectados participam.</small>}
        </div>
        <button className="btn btn-sm" style={{ alignSelf: 'flex-start', marginTop: 10 }} onClick={() => setShowRules(!showRules)} aria-expanded={showRules}>
          <Icon name="sliders" /> {showRules ? 'Fechar regras' : 'Regras de envio (quantidade, intervalos, revisão, lembretes)'}
        </button>
        {showRules && (
          <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            <div className="pb-rules">
              <div className="field">
                <label>Abordagens por chip/dia</label>
                <input className="input" type="number" min={1} max={80} value={cfg.daily_per_chip} onChange={(e) => set('daily_per_chip', Number(e.target.value))} />
              </div>
              <div className="field">
                <label>Intervalo mín. (min)</label>
                <input className="input" type="number" min={1} max={120} value={cfg.interval_min} onChange={(e) => set('interval_min', Number(e.target.value))} />
              </div>
              <div className="field">
                <label>Intervalo máx. (min)</label>
                <input className="input" type="number" min={1} max={180} value={cfg.interval_max} onChange={(e) => set('interval_max', Number(e.target.value))} />
              </div>
              <div className="field">
                <label>Tempo para revisar (s)</label>
                <input className="input" type="number" min={0} max={600} value={cfg.review_s} onChange={(e) => set('review_s', Number(e.target.value))} />
              </div>
              <div className="field">
                <label>Lembretes se não responder</label>
                <select className="input" value={cfg.max_followups} onChange={(e) => set('max_followups', Number(e.target.value))}>
                  <option value={0}>Nenhum (não insiste)</option>
                  <option value={1}>1 lembrete</option>
                  <option value={2}>2 lembretes</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Modelos da 1ª mensagem (um por linha; sorteado a cada contato). Use {'{Saudacao}'} / {'{saudacao}'} (Bom dia/Boa tarde/Boa noite) e {'{empresa}'}.</label>
              <textarea className="input" rows={4} value={cfg.openings} onChange={(e) => set('openings', e.target.value)} />
              <small className="muted">A 1ª mensagem é só um cumprimento para validar o contato (sem oferta, sem link): reduz bloqueios. Quando a pessoa responde, a IA pede licença, apresenta a agência e oferece ver a prévia pronta, sem compromisso.</small>
            </div>
            <div className="row-actions">
              <button className="btn btn-p btn-sm" onClick={() => saveCfg()}>
                <Icon name="check" /> Salvar regras
              </button>
              <small className="muted">Só envia no horário de trabalho (Configurações) e respeita a pausa geral.</small>
            </div>
          </div>
        )}
      </div>

      <div className="pb-grid">
        <div className="card">
          <div className="card-h">
            <Ib name="send" tone="wa" size="sm" />
            <h2>Próximas mensagens</h2>
            <span className="sp muted" style={{ fontSize: 12 }}>
              clique na mensagem para editar (ela fica segurada até você liberar)
            </span>
          </div>
          {d.drafts.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>
              {running ? (d.queued.length ? 'Preparando a próxima… respeitando o intervalo entre abordagens de cada chip.' : 'Fila vazia. Marque contatos nos selecionados e clique em Adicionar à fila.') : 'Nada saindo. Marque os contatos abaixo e clique em Iniciar.'}
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {d.drafts.map((l: any) => (
                <Draft key={l.id} l={l} onChange={load} />
              ))}
            </div>
          )}
          {d.queued.length > 0 && (
            <>
              <div className="navlabel" style={{ marginTop: 14 }}>
                Na fila ({d.queued.length})
              </div>
              <div className="pb-list">
                {d.queued.map((l: any) => (
                  <div className="pb-row" key={l.id}>
                    <div className="nm">
                      <b>{l.name}</b>
                      <small>
                        {l.niche} · {l.city}
                      </small>
                    </div>
                    <ScoreBar v={l.score || 0} />
                    <button className="iconbtn" title="Tirar da fila" aria-label="Tirar da fila" onClick={() => remove([l.id], 'unqueue')}>
                      <Icon name="x" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="card">
          <div className="card-h">
            <Ib name="target" tone="acc" size="sm" />
            <h2>Selecionados ({d.selected.length})</h2>
            <span className="sp" />
            {d.selected.length > 0 && (
              <button className="btn btn-sm" onClick={() => setPick(pick.size === d.selected.length ? new Set() : new Set(d.selected.map((x: any) => x.id)))}>
                {pick.size === d.selected.length ? 'Desmarcar todos' : 'Marcar todos'}
              </button>
            )}
          </div>
          {d.selected.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>
              Faça uma busca na aba <b>Buscar</b>, marque os melhores e clique em <b>Adicionar aos selecionados</b>. Nada é enviado até você clicar em Iniciar.
            </p>
          ) : (
            <div className="pb-list">
              {d.selected.map((l: any) => (
                <label className="pb-row" key={l.id} style={{ cursor: 'pointer' }}>
                  <input type="checkbox" className="selbox" checked={pick.has(l.id)} onChange={() => togglePick(l.id)} />
                  <div className="nm">
                    <b>{l.name}</b>
                    <small>
                      {l.niche} · {l.city} {l.rating ? `· ⭐ ${l.rating} (${l.reviews})` : ''}
                    </small>
                  </div>
                  <SiteChip s={l.site_status} />
                  <ScoreBar v={l.score || 0} />
                  <button
                    type="button"
                    className="iconbtn"
                    title="Tirar dos selecionados"
                    aria-label="Tirar dos selecionados"
                    onClick={(e) => {
                      e.preventDefault();
                      remove([l.id]);
                    }}
                  >
                    <Icon name="trash" />
                  </button>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pb-grid">
        <div className="card">
          <div className="card-h">
            <Ib name="chat" tone="ai" size="sm" />
            <h2>Abordados recentes</h2>
          </div>
          {d.recent.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>Ninguém abordado ainda.</p>
          ) : (
            <div className="pb-list">
              {d.recent.map((l: any) => (
                <button type="button" className="pb-row" key={l.id} onClick={() => onOpen(l.id)} style={{ textAlign: 'left', cursor: 'pointer' }}>
                  <div className="nm">
                    <b>{l.name}</b>
                    <small>
                      abordado {timeLabel(l.last_outbound_at)} · {l.last_inbound_at && l.last_inbound_at > l.last_outbound_at ? 'respondeu' : l.last_inbound_at ? 'em conversa' : 'aguardando resposta'}
                    </small>
                  </div>
                  <span className="cs" style={{ height: 20, fontSize: 11 }}>
                    {stageOf(l.stage)[1]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-h">
            <Ib name="x" tone="bad" size="sm" />
            <h2>Não demonstraram interesse ({d.lost.length})</h2>
          </div>
          {d.lost.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>Quando alguém recusa, a IA agradece, se despede, desliga nesta conversa e o motivo aparece aqui.</p>
          ) : (
            <div className="pb-list">
              {d.lost.map((l: any) => (
                <button type="button" className="pb-row" key={l.id} onClick={() => onOpen(l.id)} style={{ textAlign: 'left', cursor: 'pointer' }}>
                  <div className="nm">
                    <b>{l.name}</b>
                    <small>
                      Motivo: <b style={{ display: 'inline', color: 'var(--bad)' }}>{l.lost_reason}</b> · {timeLabel(l.lost_at)}
                    </small>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
