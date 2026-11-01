'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { api, toast, useLive, brl, timeLabel } from '@/components/ui';
import { useCan } from '@/components/Shell';
import { sb } from '@/lib/supabase/browser';
import { norm } from '@/lib/util';
import { PRODUCTION_STEPS } from '@/lib/production-steps';

const KIND: Record<string, string> = { image: 'Imagem', video: 'Vídeo', audio: 'Áudio', document: 'Documento' };
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

function DriveCard() {
  const can = useCan();
  const master = can('config');
  const params = useSearchParams();
  const [st, setSt] = useState<any>(null);
  async function load() {
    try {
      setSt(await api('/api/google/drive', 'GET'));
    } catch {}
  }
  useEffect(() => {
    load();
    const d = params.get('drive');
    if (d === 'ok') toast('Google Drive conectado! A pasta "Radar de Vendas - Clientes" foi criada.');
    else if (d === 'cancelado') toast('Conexão com o Google cancelada');
    else if (d === 'erro') toast('Não conectou: ' + (params.get('msg') || 'erro'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function disconnect() {
    try {
      await api('/api/google/drive', 'DELETE');
      toast('Google Drive desconectado');
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  if (!st) return null;
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="card-h" style={{ flexWrap: 'wrap' }}>
        <Ib name="globe" tone={st.connected ? 'ok' : 'warn'} size="sm" />
        <h2 style={{ flex: 1 }}>Google Drive (backup dos clientes)</h2>
        {st.connected ? (
          <>
            <span className="chip" style={{ ['--t' as any]: st.error ? 'var(--bad)' : 'var(--ok)' }}>
              {st.error ? 'Precisa reconectar' : `Conectado${st.email ? ' · ' + st.email : ''}`}
            </span>
            {st.root_url && (
              <a className="btn btn-sm" href={st.root_url} target="_blank" rel="noreferrer">
                <Icon name="ext" /> Abrir pasta dos clientes
              </a>
            )}
            {master && (
              <>
                {st.error && (
                  <a className="btn btn-sm btn-p" href="/api/google/drive/connect">
                    Reconectar
                  </a>
                )}
                <button className="btn btn-sm btn-g" onClick={disconnect}>
                  Desconectar
                </button>
              </>
            )}
          </>
        ) : master && st.configured ? (
          <a className="btn btn-sm btn-p" href="/api/google/drive/connect">
            <Icon name="plus" /> Conectar Google Drive
          </a>
        ) : null}
      </div>
      {st.error && <p className="err" style={{ fontSize: 12.5 }}>{st.error}</p>}
      {!st.configured && (
        <p className="muted" style={{ fontSize: 12.5 }}>
          Falta configurar o login do Google: crie um "ID do cliente OAuth" (Aplicativo da Web) no Google Cloud com o endereço de retorno <span className="mono">{st.redirect_uri}</span> e cole <b className="mono">GOOGLE_OAUTH_CLIENT_ID</b> e <b className="mono">GOOGLE_OAUTH_CLIENT_SECRET</b> no Easypanel (Ambiente). Passo a passo em Ajuda.
        </p>
      )}
      {st.connected && !st.error && (
        <p className="muted" style={{ fontSize: 12.5 }}>
          Cada cliente que negocia, paga ou manda arquivo ganha uma pasta com Imagens, Vídeos, Documentos e PDFs, Áudios e Pagamentos e Recibos, mais o Google Docs com o resumo completo do projeto. Tudo automático, a cada minuto.
        </p>
      )}
    </div>
  );
}

function Detail({ id, onClose }: { id: string; onClose: () => void }) {
  const can = useCan();
  const edit = can('producao.editar');
  const [l, setL] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [pays, setPays] = useState<any[]>([]);
  const [busy, setBusy] = useState('');
  const [newTask, setNewTask] = useState('');
  const [notes, setNotes] = useState('');
  async function load() {
    const [{ data: lead }, { data: f }, { data: p }] = await Promise.all([
      sb().from('leads').select('*').eq('id', id).maybeSingle(),
      sb().from('messages').select('id,kind,body,created_at,drive_url').eq('lead_id', id).eq('direction', 'in').in('kind', ['image', 'video', 'audio', 'document']).order('created_at', { ascending: false }).limit(200),
      sb().from('payments').select('*').eq('lead_id', id).order('created_at'),
    ]);
    setL(lead);
    setNotes(lead?.production_notes || '');
    setFiles(f || []);
    setPays(p || []);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useLive(['leads'], load, [id]);
  async function act(body: any, msg?: string, key = body.action) {
    setBusy(key);
    try {
      setL(await api(`/api/producao/${id}`, 'POST', body));
      if (msg) toast(msg);
    } catch (e: any) {
      toast(e.message);
    }
    setBusy('');
  }
  if (!l) return null;
  const tasks: any[] = Array.isArray(l.project_tasks) ? l.project_tasks : [];
  const setTasks = (t: any[]) => act({ action: 'update', tasks: t }, undefined, 'tasks');
  const late = l.production_due && l.production_due < today() && l.production_status !== 'entregue';
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={`Produção de ${l.name}`}>
        <div className="head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>{l.name}</h2>
            <p className="muted">
              {[l.niche, l.city, l.deal_service, l.paid_amount ? `pago ${brl(l.paid_amount)}` : null].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>

        <div className="row-actions" style={{ flexWrap: 'wrap', marginBottom: 10 }}>
          <a className="btn btn-sm" href={`/conversas?lead=${l.id}`}>
            <Icon name="chat" /> Conversa completa
          </a>
          {l.drive_folder_url && (
            <a className="btn btn-sm" href={l.drive_folder_url} target="_blank" rel="noreferrer">
              <Icon name="ext" /> Pasta no Drive
            </a>
          )}
          {l.drive_doc_url && (
            <a className="btn btn-sm" href={l.drive_doc_url} target="_blank" rel="noreferrer">
              <Icon name="file" /> Resumo (Google Docs)
            </a>
          )}
          {edit && !l.drive_folder_url && (
            <button className="btn btn-sm" onClick={() => act({ action: 'folder' }, 'Pasta criada no Drive')} disabled={!!busy}>
              {busy === 'folder' ? <span className="spin" /> : <Icon name="plus" />} Criar pasta no Drive
            </button>
          )}
        </div>
        {l.drive_error && <p className="err" style={{ fontSize: 12.5, marginBottom: 8 }}>{l.drive_error}</p>}

        <div className="sect">
          <h3>Etapa</h3>
        </div>
        <div className="seg" role="group" style={{ flexWrap: 'wrap', marginBottom: 10 }}>
          {PRODUCTION_STEPS.map(([k, label]) => (
            <button key={k} aria-pressed={l.production_status === k} disabled={!edit || !!busy} onClick={() => act({ action: 'status', status: k }, `Movido para "${label}"`)}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          <label style={{ flex: 1, minWidth: 150, fontSize: 12.5 }}>
            Responsável
            <input className="input" defaultValue={l.production_owner || ''} disabled={!edit} onBlur={(e) => e.target.value !== (l.production_owner || '') && act({ action: 'update', owner: e.target.value }, 'Responsável salvo', 'owner')} placeholder="Quem cuida" />
          </label>
          <label style={{ width: 170, fontSize: 12.5 }}>
            Prazo de entrega
            <input className="input" type="date" value={l.production_due || ''} disabled={!edit} onChange={(e) => act({ action: 'update', due: e.target.value }, 'Prazo salvo', 'due')} style={late ? { borderColor: 'var(--bad)', color: 'var(--bad)' } : undefined} />
          </label>
        </div>

        <div className="sect" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ flex: 1 }}>
            Tarefas ({tasks.filter((t) => t.done).length}/{tasks.length})
          </h3>
        </div>
        <div className="grid" style={{ gap: 4, marginBottom: 8 }}>
          {tasks.length === 0 && <p className="muted" style={{ fontSize: 12.5 }}>As tarefas aparecem quando o resumo do projeto é montado.</p>}
          {tasks.map((t, i) => (
            <label key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
              <input type="checkbox" checked={!!t.done} disabled={!edit} onChange={(e) => setTasks(tasks.map((x, k) => (k === i ? { ...x, done: e.target.checked } : x)))} />
              <span style={{ flex: 1, textDecoration: t.done ? 'line-through' : undefined, color: t.done ? 'var(--muted)' : undefined }}>{t.title}</span>
              {edit && (
                <button className="linkbtn" aria-label="Remover tarefa" onClick={(e) => (e.preventDefault(), setTasks(tasks.filter((_, k) => k !== i)))}>
                  ×
                </button>
              )}
            </label>
          ))}
          {edit && (
            <form
              style={{ display: 'flex', gap: 6 }}
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTask.trim()) return;
                setTasks([...tasks, { title: newTask.trim(), done: false, manual: true }]);
                setNewTask('');
              }}
            >
              <input className="input" value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Nova tarefa" />
              <button className="btn btn-sm">Adicionar</button>
            </form>
          )}
        </div>

        <div className="sect" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ flex: 1 }}>Resumo do projeto</h3>
          {edit && (
            <button className="btn btn-sm" onClick={() => act({ action: 'refresh' }, 'Resumo atualizado (e o Google Docs também)')} disabled={!!busy}>
              {busy === 'refresh' ? <span className="spin" /> : <Icon name="refresh" />}
              {busy === 'refresh' ? 'Montando…' : 'Refazer agora'}
            </button>
          )}
        </div>
        {l.project_summary ? (
          <>
            <div className="aisum pre" style={{ maxHeight: 360, overflow: 'auto', fontSize: 13 }}>
              {l.project_summary}
            </div>
            <small className="muted">Atualizado {timeLabel(l.project_summary_at)}. É refeito sozinho quando o cliente manda algo novo (no máximo a cada 30 min).</small>
          </>
        ) : (
          <p className="muted" style={{ fontSize: 12.5 }}>O resumo é montado em até 1 minuto depois que o cliente entra na Produção.</p>
        )}

        <div className="sect">
          <h3>Anotações da equipe</h3>
        </div>
        <textarea className="input" style={{ minHeight: 90 }} value={notes} disabled={!edit} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (l.production_notes || '') && act({ action: 'update', notes }, 'Anotação salva', 'notes')} placeholder="Combinados por telefone, acessos, observações… (entram no próximo resumo)" />

        <div className="sect">
          <h3>Pagamentos</h3>
        </div>
        {pays.length === 0 ? (
          <p className="muted" style={{ fontSize: 12.5 }}>Nenhum pagamento registrado.</p>
        ) : (
          pays.map((p) => (
            <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 13, marginBottom: 4 }}>
              <b>{brl(p.amount)}</b>
              <span className="chip" style={{ ['--t' as any]: p.status === 'pago' ? 'var(--ok)' : 'var(--warn)' }}>
                {p.status}
              </span>
              {p.paid_at && <small className="muted">{timeLabel(p.paid_at)}</small>}
              {p.receipt_drive_url && (
                <a className="linkbtn" href={p.receipt_drive_url} target="_blank" rel="noreferrer">
                  recibo
                </a>
              )}
              {(p.asaas_drive_url || p.asaas_receipt_url) && (
                <a className="linkbtn" href={p.asaas_drive_url || p.asaas_receipt_url} target="_blank" rel="noreferrer">
                  comprovante Asaas
                </a>
              )}
            </div>
          ))
        )}

        <div className="sect">
          <h3>Arquivos do cliente ({files.length})</h3>
        </div>
        {files.length === 0 ? (
          <p className="muted" style={{ fontSize: 12.5 }}>Nenhum arquivo recebido pelo WhatsApp ainda.</p>
        ) : (
          <div className="grid" style={{ gap: 4 }}>
            {files.map((f) => (
              <div key={f.id} style={{ display: 'flex', gap: 8, fontSize: 12.5, alignItems: 'center' }}>
                <span className="chip">{KIND[f.kind] || f.kind}</span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.body}</span>
                <small className="muted">{timeLabel(f.created_at)}</small>
                {f.drive_url ? (
                  <a className="linkbtn" href={f.drive_url} target="_blank" rel="noreferrer">
                    abrir
                  </a>
                ) : (
                  <small className="muted">indo pro Drive…</small>
                )}
              </div>
            ))}
          </div>
        )}
      </aside>
    </>
  );
}

function Producao() {
  const can = useCan();
  const edit = can('producao.editar');
  const params = useSearchParams();
  const [list, setList] = useState<any[]>([]);
  const [missing, setMissing] = useState(false);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(params.get('lead'));
  const [over, setOver] = useState<string | null>(null);
  const [cands, setCands] = useState<any[]>([]);
  async function load() {
    const { data, error } = await sb()
      .from('leads')
      .select('id,name,niche,city,whatsapp,deal_service,deal_price,paid_amount,paid_at,production_status,production_owner,production_due,project_tasks,drive_folder_url,drive_doc_url,drive_error,updated_at')
      .not('production_status', 'is', null)
      .order('paid_at', { ascending: false, nullsFirst: false })
      .limit(500);
    setMissing(!!error);
    setList(data || []);
    const { data: c } = await sb().from('leads').select('id,name,stage').in('stage', ['negociando', 'pix']).is('production_status', null).order('updated_at', { ascending: false }).limit(30);
    setCands(c || []);
  }
  useLive(['leads'], load);
  async function move(id: string, status: string) {
    setList((old) => old.map((x) => (x.id === id ? { ...x, production_status: status } : x)));
    try {
      await api(`/api/producao/${id}`, 'POST', { action: 'status', status });
    } catch (e: any) {
      toast(e.message);
      load();
    }
  }
  async function start(id: string) {
    try {
      await api(`/api/producao/${id}`, 'POST', { action: 'start' });
      toast('Cliente colocado na Produção');
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  const shown = useMemo(() => list.filter((l) => !q || norm(`${l.name} ${l.whatsapp || ''} ${l.deal_service || ''} ${l.production_owner || ''}`).includes(norm(q))), [list, q]);
  const late = list.filter((l) => l.production_due && l.production_due < today() && l.production_status !== 'entregue').length;
  const active = list.filter((l) => !['entregue', 'pausado'].includes(l.production_status)).length;

  return (
    <>
      <PageHead title="Produção" sub="Clientes pagos: o que fazer, resumo do projeto, arquivos e pasta no Drive" icon="target" tone="ok" help="kanban">
        <input className="input" style={{ width: 220 }} placeholder="Buscar cliente" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar cliente" />
      </PageHead>
      {missing && <div className="alert" style={{ marginBottom: 12, borderColor: 'var(--bad)' }}><Icon name="alert" className="status-bad" /><div style={{ fontSize: 13 }}>Rode a migração <b>016_producao_drive.sql</b> no Supabase para ativar a Produção.</div></div>}
      <DriveCard />
      <div className="grid g-kpi" style={{ marginBottom: 14 }}>
        {[
          ['target', 'ai', 'Em andamento', active],
          ['clock', 'bad', 'Atrasados', late],
          ['check', 'ok', 'Entregues', list.filter((l) => l.production_status === 'entregue').length],
          ['money', 'gg', 'Valor em produção', brl(list.filter((l) => !['entregue'].includes(l.production_status)).reduce((a, l) => a + Number(l.paid_amount || l.deal_price || 0), 0))],
        ].map((k: any, i) => (
          <div className="card kpi" key={i}>
            <div className="row">
              <Ib name={k[0]} tone={k[1]} delay={i * 0.3} />
            </div>
            <div className="v">{k[3]}</div>
            <div className="l">{k[2]}</div>
          </div>
        ))}
      </div>
      {edit && cands.length > 0 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <small className="muted">Colocar na Produção antes de pagar:</small>
          <select className="input" style={{ width: 260 }} defaultValue="" onChange={(e) => e.target.value && start(e.target.value)} aria-label="Colocar cliente na Produção">
            <option value="">Escolha um cliente em negociação…</option>
            {cands.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="kanban">
        {PRODUCTION_STEPS.map(([k, label, tone]) => {
          const items = shown.filter((l) => l.production_status === k);
          return (
            <section
              key={k}
              className={`col ${over === k ? 'over' : ''}`}
              onDragOver={(e) => {
                if (!edit) return;
                e.preventDefault();
                setOver(k);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                setOver(null);
                const id = e.dataTransfer.getData('text/plain');
                if (id) move(id, k);
              }}
            >
              <div className="col-h">
                <Ib name={k === 'entregue' ? 'check' : k === 'pausado' ? 'pause' : 'target'} tone={tone} size="sm" />
                <b>{label}</b>
                <span className="n">{items.length}</span>
              </div>
              {items.map((l) => {
                const tasks: any[] = Array.isArray(l.project_tasks) ? l.project_tasks : [];
                const done = tasks.filter((t) => t.done).length;
                const isLate = l.production_due && l.production_due < today() && k !== 'entregue';
                return (
                  <article key={l.id} className="lcard" draggable={edit} tabIndex={0} onDragStart={(e) => e.dataTransfer.setData('text/plain', l.id)} onClick={() => setOpen(l.id)} onKeyDown={(e) => e.key === 'Enter' && setOpen(l.id)}>
                    <div className="top">
                      <div style={{ minWidth: 0 }}>
                        <b>{l.name}</b>
                        <small>{[l.deal_service, l.niche].filter(Boolean).join(' · ')}</small>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {(l.paid_amount || l.deal_price) && (
                        <span className="chip" style={{ ['--t' as any]: l.paid_amount ? 'var(--ok)' : 'var(--warn)' }}>
                          {brl(l.paid_amount || l.deal_price)}
                        </span>
                      )}
                      {tasks.length > 0 && <span className="chip">✓ {done}/{tasks.length}</span>}
                      {l.production_due && (
                        <span className="chip" style={{ ['--t' as any]: isLate ? 'var(--bad)' : 'var(--muted)' }}>
                          {isLate ? 'atrasado · ' : ''}
                          {new Date(l.production_due + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      )}
                      {l.production_owner && <span className="chip">{l.production_owner}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 10, fontSize: 12 }} onClick={(e) => e.stopPropagation()}>
                      <a className="linkbtn" href={`/conversas?lead=${l.id}`}>conversa</a>
                      {l.drive_folder_url && (
                        <a className="linkbtn" href={l.drive_folder_url} target="_blank" rel="noreferrer">
                          pasta
                        </a>
                      )}
                      {l.drive_doc_url && (
                        <a className="linkbtn" href={l.drive_doc_url} target="_blank" rel="noreferrer">
                          resumo
                        </a>
                      )}
                      {l.drive_error && <span className="status-bad" title={l.drive_error}>⚠ Drive</span>}
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
      {open && <Detail id={open} onClose={() => setOpen(null)} />}
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="spin" />}>
      <Producao />
    </Suspense>
  );
}
