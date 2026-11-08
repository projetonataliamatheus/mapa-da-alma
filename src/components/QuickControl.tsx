'use client';
/* Painel rápido de Conversas: ícone de engrenagem que abre uma janela lateral com o estado do robô, tempos de resposta, digitação e anti-bloqueio. */
import { useEffect, useState } from 'react';
import { Icon, Ib } from './Icon';
import { api, toast, Switch } from './ui';
import { useCan } from './Shell';
import { sb } from '@/lib/supabase/browser';

const SPEEDS: [string, string, number, number][] = [
  ['rapida', 'Rápida', 5, 15],
  ['media', 'Média', 20, 60],
  ['calma', 'Calma', 60, 180],
];
const ago = (iso?: string) => {
  if (!iso) return '—';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.round(s / 3600)} h`;
};

export function QuickControl() {
  const can = useCan();
  const master = can('config');
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<any>(null);
  const [saved, setSaved] = useState('');
  const [robot, setRobot] = useState<any>(null);
  const [nums, setNums] = useState<any[]>([]);
  const [logs, setLogs] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    api('/api/settings', 'GET')
      .then((x) => {
        setS(x);
        setSaved(JSON.stringify(x));
      })
      .catch(() => {});
    const load = async () => {
      const [{ data: w }, { data: n }] = await Promise.all([sb().from('worker_status').select('*').eq('id', 1).maybeSingle(), sb().from('whatsapp_numbers').select('id,label,status,sent_today').order('created_at')]);
      setRobot(w || null);
      setNums(n || []);
    };
    load();
    const t = setInterval(load, 15000);
    const t2 = setInterval(() => tick((x) => x + 1), 5000);
    return () => {
      clearInterval(t);
      clearInterval(t2);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open]);
  const set = (path: string, v: any) =>
    setS((o: any) => {
      const c = structuredClone(o);
      const k = path.split('.');
      let cur = c;
      for (let i = 0; i < k.length - 1; i++) cur = cur[k[i]] = cur[k[i]] || {};
      cur[k[k.length - 1]] = v;
      return c;
    });
  const num = (path: string, w = 64) => {
    const v = path.split('.').reduce((o: any, k) => o?.[k], s);
    return <input className="input num" style={{ width: w, height: 32 }} type="number" min={0} value={v ?? ''} disabled={!master} onChange={(e) => set(path, Number(e.target.value))} aria-label={path} />;
  };

  async function save() {
    setBusy(true);
    try {
      const pick = (({ pause_ai_on_human, turn_gap, reply_delay, reply_speed, typing, typing_speed, bubble_gap, max_bubbles, send_gap, read_receipts, reply_24h, limits, hours, interval_min, previews, ai_on_saved_contacts, bloquear_contatos_salvos }) => ({
        previews,
        ai_on_saved_contacts,
        bloquear_contatos_salvos,
        reply_delay,
        reply_speed,
        typing,
        typing_speed,
        bubble_gap,
        max_bubbles,
        send_gap,
        read_receipts,
        reply_24h,
        limits,
        hours,
        interval_min,
      }))(s);
      const r = await api('/api/settings', 'PATCH', pick);
      setS(r);
      setSaved(JSON.stringify(r));
      toast('Ajustes salvos. O robô usa a partir da próxima mensagem.');
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }
  async function pause(v: boolean) {
    try {
      const r = await api('/api/settings', 'PATCH', { paused: v });
      setS((o: any) => ({ ...o, paused: r.paused }));
      toast(v ? 'Automação pausada' : 'Automação retomada');
    } catch (e: any) {
      toast(e.message);
    }
  }

  if (!s) return null;
  const beatAge = robot ? (Date.now() - new Date(robot.beat_at).getTime()) / 1000 : null;
  const online = beatAge !== null && beatAge < 120;
  const connected = nums.filter((n) => n.status === 'conectado').length;
  const speed = SPEEDS.find((x) => s.reply_delay?.min === x[2] && s.reply_delay?.max === x[3]);
  const dirty = JSON.stringify(s) !== saved;
  const info = robot?.info || {};

  return (
    <>
      <button
        className={`iconbtn qc-trigger ${open ? 'on' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Painel rápido (ajustes do atendimento)"
        title={`Painel rápido · ${online ? 'robô online' : 'respostas pelo painel'} · ${s.paused ? 'automação pausada' : 'automação ativa'}`}
      >
        <Icon name="gear" />
        <i className={`qc-trig-dot ${s.paused ? 'off' : online ? 'ok' : 'warn'}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="qc-overlay" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <aside className="qc-drawer" role="dialog" aria-label="Painel rápido">
            <header className="qc-dh">
              <Ib name="sliders" tone="gg" size="sm" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <b>Painel rápido</b>
                <small className="muted">Ajustes do atendimento da IA</small>
              </div>
              <button className="iconbtn" onClick={() => setOpen(false)} aria-label="Fechar">
                <Icon name="x" />
              </button>
            </header>
            <div className="qc-chips">
              <span className={`qc-dot ${online ? 'ok' : ''}`}>{robot ? (online ? `Robô online${info.replying ? ` · respondendo ${info.replying}` : ''}` : 'Respostas pelo painel (robô reserva)') : 'Respostas pelo painel'}</span>
              <span>{s.paused ? 'Automação pausada' : 'Automação ativa'}</span>
              <span>Resposta: {speed ? speed[1] : 'Personalizada'} ({s.reply_delay?.min}–{s.reply_delay?.max}s)</span>
              <span>Digitando: {s.typing ? (s.typing_speed === 'lenta' ? 'lento' : s.typing_speed === 'rapida' ? 'rápido' : 'normal') : 'desligado'}</span>
              <span>Anti-bloqueio: {s.send_gap?.min ?? 4}–{s.send_gap?.max ?? 10}s</span>
              <span>Prévia: {s.previews?.delay_on === false ? 'na hora' : `${s.previews?.delay_min ?? 200}–${s.previews?.delay_max ?? 250}s`}</span>
              <span>
                {connected}/{nums.length} número(s) conectado(s)
              </span>
            </div>
            <div className="qc-body">
          <section>
            <h3>Robô</h3>
            <div className="qc-row">
              <span className={`qc-dot ${online ? 'ok' : ''}`}>{online ? 'Robô online' : 'Painel respondendo (reserva)'}</span>
              <small className="muted">último sinal há {robot ? ago(robot.beat_at) : '—'}</small>
            </div>
            <small className="muted">Ligado desde {robot?.started_at ? new Date(robot.started_at).toLocaleString('pt-BR') : '—'}{info.version ? ` · ${info.version}` : ''}</small>
            {info.last_reply_error && <p className="err" style={{ fontSize: 12 }}>Último erro: {info.last_reply_error}</p>}
            {!online && (
              <p style={{ fontSize: 12.5 }}>
                O robô de fundo está sem sinal, mas os clientes continuam sendo respondidos pela reserva do painel. Veja o registro abaixo para saber o motivo.
              </p>
            )}
            <div className="qc-row">
              <Switch label="Automação ativa" checked={!s.paused} disabled={!can('automacao.pausar')} onChange={(v) => pause(!v)} />
              <span style={{ fontSize: 13 }}>Automação ativa</span>
            </div>
            <button className="btn btn-sm btn-g" onClick={() => setLogs((v) => !v)}>
              <Icon name="file" />
              {logs ? 'Esconder registro' : 'Ver registro do robô'}
            </button>
            {logs && <pre className="qc-logs">{(info.logs || []).join('\n') || 'Sem registro ainda.'}</pre>}
          </section>

          <section>
            <h3>Tempo de resposta</h3>
            <div className="seg" role="group">
              {SPEEDS.map(([k, l, a, b]) => (
                <button key={k} type="button" disabled={!master} aria-pressed={s.reply_delay?.min === a && s.reply_delay?.max === b} onClick={() => setS({ ...s, reply_speed: k, reply_delay: { min: a, max: b } })} title={`${a} a ${b} s`}>
                  {l}
                </button>
              ))}
            </div>
            <div className="qc-row">
              <span>Espera</span>
              {num('reply_delay.min')}
              <span className="muted">a</span>
              {num('reply_delay.max')}
              <span className="muted">segundos</span>
            </div>
            <small className="muted">Aleatório entre o mínimo e o máximo. Nova mensagem do cliente reinicia a espera.</small>
            <div className="qc-row">
              <span>Respiro entre uma resposta e a próxima</span>
              {num('turn_gap')}
              <span className="muted">s</span>
            </div>
            <div className="qc-row">
              <Switch label="Responder 24h" checked={!!s.reply_24h} disabled={!master} onChange={(v) => set('reply_24h', v)} />
              <span style={{ fontSize: 13 }}>Responder 24 horas</span>
            </div>
            <div className="qc-row">
              <Switch label="IA sai quando a equipe responde" checked={s.pause_ai_on_human !== false} disabled={!master} onChange={(v) => set('pause_ai_on_human', v)} />
              <span style={{ fontSize: 13 }}>IA sai da conversa quando a equipe responde pelo celular</span>
            </div>
            <div className="qc-row">
              <Switch label="Marcar como lida" checked={s.read_receipts !== false} disabled={!master} onChange={(v) => set('read_receipts', v)} />
              <span style={{ fontSize: 13 }}>Marcar como lida (tiques azuis)</span>
            </div>
          </section>

          <section>
            <h3>Digitação e balões</h3>
            <div className="qc-row">
              <Switch label="Mostrar digitando" checked={!!s.typing} disabled={!master} onChange={(v) => set('typing', v)} />
              <span style={{ fontSize: 13 }}>Mostrar "digitando…"</span>
            </div>
            <div className="seg" role="group" aria-label="Velocidade de digitação">
              {(
                [
                  ['lenta', 'Lenta'],
                  ['normal', 'Normal'],
                  ['rapida', 'Rápida'],
                ] as [string, string][]
              ).map(([k, l]) => (
                <button key={k} type="button" disabled={!master} aria-pressed={(s.typing_speed || 'normal') === k} onClick={() => set('typing_speed', k)}>
                  {l}
                </button>
              ))}
            </div>
            <div className="qc-row">
              <span>Pausa entre balões</span>
              {num('bubble_gap.min')}
              <span className="muted">a</span>
              {num('bubble_gap.max')}
              <span className="muted">s</span>
            </div>
            <div className="qc-row">
              <span>Máximo de balões</span>
              <div className="seg" role="group">
                {[1, 2, 3].map((k) => (
                  <button key={k} type="button" disabled={!master} aria-pressed={(Number(s.max_bubbles) || 2) === k} onClick={() => set('max_bubbles', k)}>
                    {k}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h3>Ritmo do atendimento</h3>
            <label className="qc-row" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={s.ritmo?.ativo !== false} disabled={!master} onChange={(e) => set('ritmo.ativo', e.target.checked)} />
              <span>A IA percebe se o cliente é rápido ou acolhedor e encurta a conversa</span>
            </label>
            <div className="qc-row">
              <span>Cliente rápido: partes do mapa antes do valor</span>
              {num('ritmo.limite_rapido')}
            </div>
            <div className="qc-row">
              <span>Cliente equilibrado</span>
              {num('ritmo.limite_neutro')}
            </div>
            <div className="qc-row">
              <span>Cliente acolhedor (conversa mais)</span>
              {num('ritmo.limite_acolhedor')}
            </div>
            <small className="muted">Diminua os números para a IA apresentar o valor mais cedo e vá testando até onde a venda aguenta. A IA lê o ritmo pelo tamanho das mensagens, áudios longos, pedido de rapidez e momentos delicados.</small>
          </section>

          <section>
            <h3>Contatos salvos no celular</h3>
            <label className="qc-row" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={s.bloquear_contatos_salvos === true} disabled={!master} onChange={(e) => set('bloquear_contatos_salvos', e.target.checked)} />
              <span>NÃO atender (IA desligada) números salvos nos contatos do celular</span>
            </label>
            <small className="muted">Padrão: desligado, ou seja, a IA atende TODOS automaticamente. Ligue só se quiser que amigos, família e fornecedores salvos no celular do chip fiquem fora da IA.</small>
          </section>

          <section>
            <h3>Prévia do mapa</h3>
            <label className="qc-row" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={s.previews?.delay_on !== false} disabled={!master} onChange={(e) => set('previews.delay_on', e.target.checked)} />
              <span>Esperar antes de mandar a prévia (parece feita com calma, não na hora)</span>
            </label>
            <div className="qc-row">
              <span>Mandar entre</span>
              {num('previews.delay_min')}
              <span className="muted">e</span>
              {num('previews.delay_max')}
              <span className="muted">segundos depois do pedido</span>
            </div>
            <small className="muted">
              Padrão: 200 a 250 s (3 a 4 min). A IA avisa o cliente que está preparando; os pedidos que ele fizer nesse meio tempo já entram na prévia.
            </small>
          </section>

          <section>
            <h3>Anti-bloqueio do WhatsApp</h3>
            <div className="qc-row">
              <span>Entre mensagens do mesmo número</span>
              {num('send_gap.min')}
              <span className="muted">a</span>
              {num('send_gap.max')}
              <span className="muted">s</span>
            </div>
            <div className="qc-row">
              <span>Entre primeiros contatos</span>
              {num('interval_min.min')}
              <span className="muted">a</span>
              {num('interval_min.max')}
              <span className="muted">min</span>
            </div>
            <div className="qc-row">
              <span>Primeiros contatos por dia</span>
              {num('limits.week1', 54)}
              {num('limits.week2', 54)}
              {num('limits.mature', 54)}
            </div>
            <small className="muted">Semana 1 · semanas 2–3 · número maduro. Respostas a quem já conversa não contam no limite.</small>
            <div className="qc-row">
              <span>Primeiro contato das</span>
              <input className="input" type="time" style={{ width: 100, height: 32 }} value={s.hours?.start || '08:00'} disabled={!master} onChange={(e) => set('hours.start', e.target.value)} aria-label="Início" />
              <span className="muted">às</span>
              <input className="input" type="time" style={{ width: 100, height: 32 }} value={s.hours?.end || '19:00'} disabled={!master} onChange={(e) => set('hours.end', e.target.value)} aria-label="Fim" />
            </div>
            {nums.map((n) => (
              <small key={n.id} className="muted">
                {n.label}: {n.status === 'conectado' ? 'conectado' : 'desconectado'} · {n.sent_today || 0} primeiros contatos hoje
              </small>
            ))}
          </section>

            </div>
          {master ? (
            <div className="qc-foot">
              <button className="btn btn-p btn-sm" onClick={save} disabled={busy || !dirty}>
                <Icon name="check" />
                {busy ? 'Salvando…' : dirty ? 'Salvar ajustes' : 'Tudo salvo'}
              </button>
              {dirty && (
                <button className="btn btn-g btn-sm" onClick={() => setS(JSON.parse(saved))}>
                  Desfazer
                </button>
              )}
            </div>
          ) : (
            <div className="qc-foot">
              <small className="muted">Só o Master altera estes ajustes.</small>
            </div>
          )}
          </aside>
        </div>
      )}
    </>
  );
}
