'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { api, toast, useLive } from '@/components/ui';
import { sb } from '@/lib/supabase/browser';
import { dailyLimit, phaseOf } from '@/lib/limits';
import { DEFAULT_SETTINGS, deepMerge } from '@/lib/settings';
import { formatPhone } from '@/lib/phone';
import { CHIP_COLORS, chipColor, chipFinal } from '@/lib/chips';

function QrModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [n, setN] = useState<any>(null);
  const [err, setErr] = useState('');
  // Timer: o WhatsApp troca o QR sozinho a cada ~45 s; contamos desde que o código atual apareceu
  const [qrDesde, setQrDesde] = useState(0);
  const [agora, setAgora] = useState(Date.now());
  const QR_VALE = 45;
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (n?.qr) setQrDesde(Date.now());
  }, [n?.qr]);
  const restam = qrDesde ? Math.max(0, QR_VALE - Math.floor((agora - qrDesde) / 1000)) : null;
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch(`/api/numbers/${id}`).then((x) => x.json());
        if (!alive) return;
        setN(r);
        setErr(r.error || '');
        if (r.status === 'conectado') {
          toast(`${r.label} conectado`);
          setTimeout(onClose, 1200);
          return;
        }
      } catch (e: any) {
        setErr(e.message);
      }
      if (alive) setTimeout(poll, 2000);
    };
    poll();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-label="Conectar número">
        <Ib name="qr" tone="wa" size="lg" />
        <h2>{n?.label ? `Conectar ${n.label}` : 'Conectar número'}</h2>
        <div className="qrbox">{n?.status === 'conectado' ? <Ib name="check" tone="ok" size="lg" /> : n?.qr ? <img src={n.qr.startsWith('data:') ? n.qr : `data:image/png;base64,${n.qr}`} alt="QR Code do WhatsApp" /> : <span className="spin" />}</div>
        {n?.status !== 'conectado' && n?.qr && restam !== null && (
          <div style={{ margin: '8px 0', textAlign: 'center' }} aria-live="polite">
            <div style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: restam > 15 ? '#16a34a' : restam > 5 ? '#d97706' : '#dc2626' }}>
              {restam > 0 ? `0:${String(restam).padStart(2, '0')}` : 'Atualizando…'}
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'rgba(0,0,0,.1)', overflow: 'hidden', marginTop: 4 }}>
              <div style={{ height: '100%', width: `${(restam / QR_VALE) * 100}%`, background: restam > 15 ? '#16a34a' : restam > 5 ? '#d97706' : '#dc2626', transition: 'width 1s linear' }} />
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{restam > 0 ? 'Tempo restante deste QR Code. Se zerar, um novo aparece sozinho.' : 'Gerando um QR Code novo…'}</div>
          </div>
        )}
        <p className="muted" style={{ fontSize: 13 }}>
          No celular do número: WhatsApp › <b>Aparelhos conectados</b> › <b>Conectar aparelho</b>. Aponte a câmera para o código. Ele se atualiza sozinho.
        </p>
        {err && <p className="err">{err}</p>}
        <button className="btn" onClick={onClose}>
          Fechar
        </button>
      </div>
    </>
  );
}

/** Importa as conversas que já existem no WhatsApp deste número. */
function ImportChats({ n, onClose }: { n: any; onClose: () => void }) {
  const [days, setDays] = useState(30);
  const [ai, setAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  async function run() {
    setBusy(true);
    setRes(null);
    try {
      setRes(await api(`/api/numbers/${n.id}`, 'PATCH', { action: 'import', days, ai }));
    } catch (e: any) {
      setRes({ error: e.message });
    }
    setBusy(false);
  }
  return (
    <>
      <div className="scrim" onClick={busy ? undefined : onClose} />
      <div className="modal" role="dialog" aria-label="Importar conversas" style={{ textAlign: 'left', alignItems: 'stretch' }}>
        <h2 style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Ib name="chat" tone="wa" size="sm" /> Importar conversas · {n.label}
        </h2>
        <p className="muted" style={{ fontSize: 13 }}>
          Traz as conversas que já existem neste WhatsApp para o painel, com o histórico. Grupos ficam de fora.
        </p>
        <div className="field">
          <label htmlFor="imp-days">Conversas dos últimos</label>
          <select id="imp-days" className="input" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>7 dias</option>
            <option value={30}>30 dias</option>
            <option value={90}>90 dias</option>
            <option value={365}>1 ano</option>
          </select>
        </div>
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
          <input type="checkbox" checked={ai} onChange={(e) => setAi(e.target.checked)} style={{ marginTop: 3 }} />
          <span>
            A IA responde quando esses contatos mandarem mensagem nova
            <small className="muted" style={{ display: 'block' }}>Deixe desmarcado se no número há clientes antigos, amigos ou fornecedores. Você pode ligar a IA conversa por conversa depois.</small>
          </span>
        </label>
        {res && !res.error && !res.empty && (
          <div className="alert" style={{ borderColor: 'var(--ok)' }}>
            <Icon name="check" className="status-ok" />
            <div style={{ fontSize: 13 }}>
              {res.chats} conversas encontradas · <b>{res.imported} novas no painel</b> · {res.messages} mensagens. {res.skipped ? `${res.skipped} sem mensagens no período ou com número oculto.` : ''}
            </div>
          </div>
        )}
        {res?.empty && (
          <div className="alert" style={{ borderColor: 'var(--warn)' }}>
            <Icon name="alert" className="status-bad" />
            <div style={{ fontSize: 13 }}>
              <b>A Evolution ainda não tem o histórico deste número.</b> O WhatsApp só envia as conversas antigas no momento em que o aparelho é conectado. Já liguei o histórico neste número; agora:
              <ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                <li>No Easypanel › whatsapp › evolution › Ambiente, confira <code>DATABASE_SAVE_DATA_HISTORIC=true</code> (e Implantar, se mudou).</li>
                <li>No celular: WhatsApp › Aparelhos conectados › desconecte este aparelho.</li>
                <li>Aqui: clique em <b>Conectar via QR Code</b> neste número e leia de novo.</li>
                <li>Espere 2 a 5 minutos e clique em Importar outra vez.</li>
              </ol>
            </div>
          </div>
        )}
        {res?.error && <p className="err">{res.error}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-wa" onClick={run} disabled={busy}>
            {busy ? <span className="spin" /> : <Icon name="refresh" />}
            {busy ? 'Importando… (pode levar 1 a 2 min)' : res ? 'Importar de novo' : 'Importar'}
          </button>
          <button className="btn btn-g" onClick={onClose} disabled={busy}>
            Fechar
          </button>
        </div>
      </div>
    </>
  );
}

/** Nome de quem atende este número: a IA se apresenta com ele ("Aqui é a Ana…"). */
function AgentName({ n, onSaved }: { n: any; onSaved: () => void }) {
  const [v, setV] = useState(n.agent_name || '');
  const [busy, setBusy] = useState(false);
  useEffect(() => setV(n.agent_name || ''), [n.agent_name]);
  const changed = (v || '').trim() !== (n.agent_name || '');
  async function save() {
    setBusy(true);
    try {
      await api(`/api/numbers/${n.id}`, 'PATCH', { agent_name: v.trim() });
      toast(v.trim() ? `A IA deste número agora se apresenta como ${v.trim()}` : 'Este número usa o nome padrão das Configurações');
      onSaved();
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }
  return (
    <div className="field">
      <label htmlFor={`ag-${n.id}`}>Nome de quem atende (a IA se apresenta com ele)</label>
      <div style={{ display: 'flex', gap: 6 }}>
        <input id={`ag-${n.id}`} className="input" placeholder="ex.: Ana" maxLength={40} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && changed && save()} />
        {changed && (
          <button className="btn btn-sm btn-p" disabled={busy} onClick={save}>
            Salvar
          </button>
        )}
      </div>
      <small className="muted">Use junto com a voz abaixo: cada número com o seu atendente (nome + voz).</small>
    </div>
  );
}

/** Nome, cor (etiqueta) e voz do número: aparecem em Conversas para toda a equipe. */
function ChipSettings({ n, index, voices, onSaved }: { n: any; index: number; voices: any[]; onSaved: () => void }) {
  const [label, setLabel] = useState(n.label);
  const [saving, setSaving] = useState(false);
  useEffect(() => setLabel(n.label), [n.label]);
  const color = chipColor(n, index);
  async function save(body: any, msg: string) {
    setSaving(true);
    try {
      await api(`/api/numbers/${n.id}`, 'PATCH', body);
      toast(msg);
      onSaved();
    } catch (e: any) {
      toast(e.message);
    }
    setSaving(false);
  }
  const fin = chipFinal(n);
  return (
    <div className="chipset" data-perm="numeros.gerenciar">
      <div className="field">
        <label htmlFor={`nm-${n.id}`}>Nome do número</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            id={`nm-${n.id}`}
            className="input"
            value={label}
            maxLength={40}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && label.trim() && label !== n.label && save({ label }, 'Nome salvo')}
          />
          {label.trim() && label !== n.label && (
            <button className="btn btn-sm btn-p" disabled={saving} onClick={() => save({ label }, 'Nome salvo')}>
              Salvar
            </button>
          )}
        </div>
        <small className="muted">
          Aparece assim nas conversas: <b>{label || n.label}{fin ? ` - ${fin}` : ''}</b>
        </small>
      </div>
      <AgentName n={n} onSaved={onSaved} />
      <div className="field">
        <label>Cor da etiqueta</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {CHIP_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`swatch${color.toLowerCase() === c ? ' on' : ''}`}
              style={{ background: c }}
              aria-label={`Usar a cor ${c}`}
              onClick={() => save({ color: c }, 'Cor salva')}
            />
          ))}
          <label className="swatch swatch-custom" title="Outra cor" style={{ background: color }}>
            <input type="color" value={color} onChange={(e) => save({ color: e.target.value }, 'Cor salva')} aria-label="Escolher outra cor" />
          </label>
        </div>
      </div>
      <div className="field">
        <label htmlFor={`vz-${n.id}`}>Voz deste número (áudios da IA)</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select id={`vz-${n.id}`} className="input" style={{ flex: 1, minWidth: 140 }} value={n.voice_id || ''} onChange={(e) => save({ voice_id: e.target.value || null }, 'Voz do número salva')} disabled={n.voice_enabled === false}>
            <option value="">Voz padrão do sistema</option>
            {voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {v.active === false ? ' (desativada)' : ''}
              </option>
            ))}
          </select>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
            <input type="checkbox" checked={n.voice_enabled !== false} onChange={(e) => save({ voice_enabled: e.target.checked }, e.target.checked ? 'Áudios ligados neste número' : 'Este número agora só responde em texto')} />
            Mandar áudios
          </label>
        </div>
      </div>
    </div>
  );
}

export default function Numeros() {
  const [nums, setNums] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(DEFAULT_SETTINGS);
  const [label, setLabel] = useState('');
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [importing, setImporting] = useState<any>(null);
  const [voices, setVoices] = useState<any[]>([]);

  async function load() {
    const [{ data }, { data: s }] = await Promise.all([sb().from('whatsapp_numbers').select('*').order('created_at'), sb().from('settings').select('data').eq('id', 1).maybeSingle()]);
    setNums(data || []);
    setSettings(deepMerge(DEFAULT_SETTINGS, s?.data || {}));
    const { data: vs } = await sb().from('voices').select('id,name,active').order('created_at');
    setVoices(vs || []);
  }
  useLive(['whatsapp_numbers'], load);

  async function add() {
    setBusy(true);
    try {
      const n = await api('/api/numbers', 'POST', { label: label.trim() || undefined });
      setLabel('');
      setQr(n.id);
      load();
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }
  async function patch(id: string, action: string) {
    try {
      await api(`/api/numbers/${id}`, 'PATCH', { action });
      toast(action === 'pause' ? 'Número pausado' : action === 'resume' ? 'Número retomado' : action === 'webhook' ? 'Conexão com o painel refeita' : 'Fase reiniciada');
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function remove(id: string) {
    try {
      await api(`/api/numbers/${id}`, 'DELETE');
      toast('Número removido');
      setConfirm(null);
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }

  return (
    <>
      <PageHead title="Números WhatsApp" sub="Até 10 números conectados por QR Code, cada um com seu limite diário" icon="phone" tone="wa" help="conectar" />
      <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <Ib name="shield" tone="ok" size="lg" />
        <div style={{ flex: 1, minWidth: 220 }}>
          <h2>Proteção contra bloqueio ligada</h2>
          <p className="muted">
            Intervalos aleatórios de {settings.interval_min.min} a {settings.interval_min.max} min, digitação simulada, primeiro contato só das {settings.hours.start} às {settings.hours.end}, pausa longa a cada {settings.long_pause_every} envios e pausa automática se recusas e erros passarem de {settings.auto_pause_pct}%.
          </p>
        </div>
        <Link className="btn" href="/config">
          <Icon name="sliders" />
          Ajustar limites
        </Link>
      </div>
      {nums.length < 10 && (
        <div data-perm="numeros.gerenciar" className="card" style={{ display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: 1, minWidth: 200 }}>
            <label htmlFor="lbl">Nome do novo número</label>
            <input id="lbl" className="input" placeholder={`Linha ${String(nums.length + 1).padStart(2, '0')}`} value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <button className="btn btn-p" onClick={add} disabled={busy}>
            <Icon name="qr" />
            {busy ? 'Criando…' : 'Conectar via QR Code'}
          </button>
        </div>
      )}
      <div className="grid g-3">
        {nums.map((n, i) => {
          const lim = dailyLimit(n, settings.limits);
          const paused = n.paused_until && new Date(n.paused_until) > new Date();
          const on = n.status === 'conectado';
          const tone = !on ? 'bad' : paused ? 'warn' : 'wa';
          const st = n.stats || {};
          return (
            <div className="card numcard" key={n.id} style={{ borderTop: `4px solid ${chipColor(n, i)}` }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Ib name="wa" tone={tone} delay={i * 0.3} />
                <div style={{ minWidth: 0 }}>
                  <b style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <i className="chipdot" style={{ background: chipColor(n, i) }} />
                    {n.label}
                    {chipFinal(n) ? ` - ${chipFinal(n)}` : ''}
                  </b>
                  <br />
                  <small className="muted mono">{n.phone ? formatPhone(n.phone) : n.instance_name}</small>
                </div>
                <span className="chip" style={{ ['--t' as any]: `var(--${!on ? 'bad' : paused ? 'warn' : 'ok'})`, marginLeft: 'auto' }}>
                  {!on ? (n.status === 'qr' ? 'Aguardando QR' : 'Desconectado') : paused ? 'Pausado' : 'Conectado'}
                </span>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span className="muted">Primeiros contatos hoje</span>
                  <b className="num">
                    {n.sent_today} / {lim}
                  </b>
                </div>
                <div className="progress">
                  <i style={{ width: `${Math.min(100, (n.sent_today / lim) * 100)}%`, background: `var(--${tone})` }} />
                </div>
              </div>
              <div className="kv">
                <span>Fase</span>
                <b>{phaseOf(n).label}</b>
                <span>Taxa de resposta (7 dias)</span>
                <b>{st.resp_rate ?? 0}%</b>
                <span>Recusas e erros (24h)</span>
                <b>{(st.optouts24 || 0) + (st.errors24 || 0)}</b>
                <span>Saúde</span>
                <b style={{ color: n.health < 60 ? 'var(--bad)' : n.health < 80 ? 'var(--warn)' : 'var(--ok)' }}>{n.health}/100</b>
              </div>
              {paused && n.pause_reason && <p style={{ fontSize: 12, color: 'var(--warn)' }}>{n.pause_reason}</p>}
              <ChipSettings n={n} index={i} voices={voices} onSaved={load} />
              <div className="row-actions">
                {!on && (
                  <button data-perm="numeros.gerenciar" className="btn btn-sm btn-p" onClick={() => setQr(n.id)}>
                    <Icon name="qr" />
                    Ler QR Code
                  </button>
                )}
                {on && (paused ? <button data-perm="numeros.gerenciar" className="btn btn-sm" onClick={() => patch(n.id, 'resume')}><Icon name="play" />Retomar</button> : <button data-perm="numeros.gerenciar" className="btn btn-sm" onClick={() => patch(n.id, 'pause')}><Icon name="pause" />Pausar</button>)}
                {on && (
                  <button data-perm="numeros.gerenciar" className="btn btn-sm" onClick={() => setImporting(n)}>
                    <Icon name="chat" />
                    Importar conversas
                  </button>
                )}
                <button data-perm="numeros.gerenciar" className="btn btn-sm btn-g" onClick={() => patch(n.id, 'webhook')} title="Use se as mensagens recebidas pararem de aparecer">
                  <Icon name="refresh" />
                  Refazer conexão
                </button>
                {confirm === n.id ? (
                  <>
                    <button data-perm="numeros.gerenciar" className="btn btn-sm" style={{ color: 'var(--bad)' }} onClick={() => remove(n.id)}>
                      Confirmar remoção
                    </button>
                    <button className="btn btn-sm btn-g" onClick={() => setConfirm(null)}>
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button data-perm="numeros.gerenciar" className="btn btn-sm btn-g" onClick={() => setConfirm(n.id)}>
                    <Icon name="trash" />
                    Remover
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {Array.from({ length: Math.max(0, 10 - nums.length) }, (_, i) => (
          <div className="card numcard empty" key={'e' + i}>
            <Ib name="qr" tone="mut" size="lg" delay={i * 0.2} />
            <b>Espaço {String(nums.length + i + 1).padStart(2, '0')}</b>
            <small>Livre</small>
          </div>
        ))}
      </div>
      {qr && <QrModal id={qr} onClose={() => setQr(null)} />}
      {importing && <ImportChats n={importing} onClose={() => setImporting(null)} />}
    </>
  );
}
