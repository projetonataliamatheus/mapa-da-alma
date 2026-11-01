'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, Ib } from './Icon';
import { STAGES, STEPS, stageOf, tempOf, scoreColor, toneVar, ChanChips, api, toast, copyText, timeLabel, brl } from './ui';
import { sb } from '@/lib/supabase/browser';
import { formatPhone } from '@/lib/phone';

const EV_TONE: Record<string, string> = { wa: 'wa', ig: 'ig', gg: 'gg', ai: 'ai', acc: 'accent', ok: 'ok', warn: 'warn', pay: 'gg', sys: 'muted' };

export function LeadDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const [l, setL] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [previewBusy, setPreviewBusy] = useState(false);
  async function makePreview(send: boolean) {
    setPreviewBusy(true);
    try {
      const r = await api('/api/previews', 'POST', { lead_id: id, send });
      toast(r.warning || (send ? 'Prévia enviada no WhatsApp' : 'Prévia criada'));
      if (!send) window.open(`/previa/${r.slug}`, '_blank');
      load();
    } catch (e: any) {
      toast(e.message);
    }
    setPreviewBusy(false);
  }
  const [price, setPrice] = useState('');
  const [paidValue, setPaidValue] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function load() {
    const { data } = await sb().from('leads').select('*').eq('id', id).maybeSingle();
    setL(data);
    const { data: ev } = await sb().from('lead_events').select('*').eq('lead_id', id).order('created_at', { ascending: false }).limit(40);
    setEvents(ev || []);
    const { data: pays } = await sb().from('payments').select('*').eq('lead_id', id).order('created_at', { ascending: false });
    setPayments(pays || []);
  }
  useEffect(() => {
    load();
    const ch = sb()
      .channel('drawer-' + id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `id=eq.${id}` }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lead_events', filter: `lead_id=eq.${id}` }, load)
      .subscribe();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => {
      sb().removeChannel(ch);
      window.removeEventListener('keydown', esc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function act(body: any, msg: string) {
    setBusy(true);
    try {
      const r = await api(`/api/leads/${id}`, 'POST', body);
      if (r?.id) setL(r);
      toast(msg);
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }
  async function move(stage: string) {
    await sb().from('leads').update({ stage, ...(stage === 'remarketing' && !l.remarketing_at ? { remarketing_at: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) } : {}) }).eq('id', id);
    await sb().from('lead_events').insert({ lead_id: id, type: 'stage', channel: 'acc', text: `${l.name} movido para "${stageOf(stage)[1]}" pela equipe` });
    toast('Movido para ' + stageOf(stage)[1]);
  }
  async function del() {
    await sb().from('leads').delete().eq('id', id);
    toast('Lead apagado');
    onClose();
  }

  if (!l)
    return (
      <>
        <div className="scrim" onClick={onClose} />
        <aside className="drawer">
          <div className="spin" />
        </aside>
      </>
    );

  const t = tempOf(l.temperature || 0);
  const st = stageOf(l.stage);
  const nextIdx = STEPS.findIndex((s) => !(l.steps || []).includes(s[0]));

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={`Ficha de ${l.name}`}>
        <div className="head">
          <div className="ring" style={{ ['--v' as any]: l.score, ['--c' as any]: scoreColor(l.score) }}>
            <b>{l.score}</b>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>{l.name}</h2>
            <p className="muted">
              {[l.niche, l.city, l.distance_km != null ? `${l.distance_km} km` : null].filter(Boolean).join(' · ')}
            </p>
            <div className="chips" style={{ marginTop: 6 }}>
              <span className="chip" style={{ ['--t' as any]: toneVar(st[3]) }}>
                <Icon name={st[2]} />
                {st[1]}
              </span>
              {l.rating != null && (
                <span className="chip">
                  <Icon name="star" />
                  {String(l.rating).replace('.', ',')} · {l.reviews} aval.
                </span>
              )}
              {l.cpf_cnpj && <span className="chip">{l.cpf_cnpj.length === 14 ? 'CNPJ' : 'CPF'} informado</span>}
              {l.paid_amount && <span className="chip" style={{ ['--t' as any]: 'var(--ok)' }}>{brl(l.paid_amount)}</span>}
            </div>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>

        {l.needs_human && (
          <div className="alert" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <Ib name="bell" tone="warn" size="sm" />
              <p>
                <b>Precisa de você:</b> {l.needs_human}
              </p>
            </div>
            <div className="row-actions">
              <div data-perm="leads.desconto" className="pill-input">
                <input className="input" style={{ width: 120 }} placeholder="Ex.: 449" value={price} onChange={(e) => setPrice(e.target.value)} aria-label="Valor aprovado" />
                <button className="btn btn-sm btn-p" disabled={busy} onClick={() => act({ action: 'approve', price: Number(price.replace(',', '.')) }, 'Desconto aprovado. A IA continua a conversa')}>
                  Aprovar até este valor
                </button>
              </div>
              <button className="btn btn-sm btn-g" onClick={() => act({ action: 'dismiss' }, 'Alerta resolvido')}>
                Resolvido
              </button>
            </div>
          </div>
        )}

        <div className="sect">
          <h3>Temperatura</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <b style={{ color: `var(--${t[1]})` }}>
              {t[0]} · {l.temperature || 0}
            </b>
            <span className="muted">frio · morno · quente</span>
          </div>
          <div className="tmeter">
            <i style={{ left: `${l.temperature || 0}%` }} />
          </div>
        </div>

        <div className="sect">
          <h3 style={{ display: 'flex', alignItems: 'center' }}>
            Resumo da IA
            <button className="linkbtn" style={{ marginLeft: 'auto', fontSize: 12, textTransform: 'none', letterSpacing: 0 }} disabled={busy} onClick={() => act({ action: 'summary' }, 'Resumo atualizado')}>
              Atualizar
            </button>
          </h3>
          <div className="aisum">{l.summary || 'Ainda sem conversa.'}</div>
        </div>
        {l.next_step && (
          <div className="next">
            <Ib name="target" tone="acc" size="sm" />
            <div>
              <b>Próximo passo</b>
              <br />
              {l.next_step}
            </div>
          </div>
        )}

        <div className="sect">
          <h3>Canais</h3>
          <div className="chan" style={{ flexWrap: 'wrap' }}>
            <ChanChips l={l} />
            <span className="chip">{l.ai_locked ? '⏸ IA pausada definitivamente' : l.ai_enabled ? 'IA atendendo' : 'Equipe atendendo'}</span>
          </div>
          <div className="row-actions" style={{ marginTop: 10 }}>
            {l.whatsapp && (
              <button className="btn btn-wa" onClick={() => router.push(`/conversas?lead=${l.id}`)}>
                <Icon name="chat" />
                Abrir conversa
              </button>
            )}
            {(l.whatsapp || l.phone) && (
              <button className="btn" onClick={() => copyText(formatPhone(l.whatsapp || l.phone))}>
                <Icon name="call" />
                {formatPhone(l.whatsapp || l.phone)}
              </button>
            )}
          </div>
        </div>

        <div className="sect">
          <h3>O que já foi feito e o que falta</h3>
          <div className="steps">
            {STEPS.map(([k, label], i) => {
              const done = (l.steps || []).includes(k);
              return (
                <div key={k} className={`step ${done ? 'done' : i === nextIdx ? 'nextstep' : 'todo'}`}>
                  <span className="bx">{done && <Icon name="check" />}</span>
                  {label}
                  {i === nextIdx && (
                    <span className="chip" style={{ ['--t' as any]: 'var(--accent)', marginLeft: 'auto' }}>
                      próximo
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {((l.pains || []).length > 0 || (l.objections || []).length > 0) && (
          <div className="sect">
            <h3>Dores e objeções</h3>
            <div className="chips">
              {(l.pains || []).map((p: string) => (
                <span key={p} className="chip" style={{ ['--t' as any]: 'var(--accent)' }}>
                  {p}
                </span>
              ))}
              {(l.objections || []).map((p: string) => (
                <span key={p} className="chip" style={{ ['--t' as any]: 'var(--warn)' }}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {payments.length > 0 && (
          <div className="sect">
            <h3>Pagamentos e recibos</h3>
            <div className="grid" style={{ gap: 8 }}>
              {payments.map((p) => (
                <div key={p.id} className="alert" style={{ alignItems: 'center' }}>
                  <Ib name={p.status === 'pago' ? 'check' : 'pix'} tone={p.status === 'pago' ? 'ok' : p.status === 'pendente' ? 'gg' : 'warn'} size="sm" />
                  <p>
                    <b>{brl(p.amount)}</b> · {p.status}
                    <br />
                    <small className="muted">
                      {p.receipt_sent_at ? `Recibo nº ${String(p.receipt_number).padStart(5, '0')} enviado ${timeLabel(p.receipt_sent_at)}` : p.status === 'pago' ? (p.receipt_error ? 'Recibo com erro: ' + p.receipt_error : 'Recibo sendo gerado…') : timeLabel(p.created_at)}
                    </small>
                  </p>
                  <span className="row-actions" style={{ marginLeft: 'auto' }}>
                    {p.receipt_path && (
                      <a className="btn btn-sm" href={`/api/payments/${p.id}`} target="_blank" rel="noreferrer">
                        <Icon name="file" />
                        PDF
                      </a>
                    )}
                    {p.status === 'pago' && (
                      <button
                        className="btn btn-sm btn-g"
                        onClick={async () => {
                          await api(`/api/payments/${p.id}`, 'POST');
                          toast('O recibo será reenviado em instantes');
                          load();
                        }}
                      >
                        Reenviar
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="sect">
          <h3>Linha do tempo</h3>
          <div className="tl">
            {events.length ? (
              events.map((e) => (
                <div key={e.id} style={{ ['--t' as any]: `var(--${EV_TONE[e.channel] || 'muted'})` }}>
                  <small>{timeLabel(e.created_at)}</small>
                  {e.text}
                </div>
              ))
            ) : (
              <div>
                <small>{timeLabel(l.created_at)}</small>Lead adicionado
              </div>
            )}
          </div>
        </div>

        <div className="sect">
          <h3>Ações</h3>
          <div className="grid" style={{ gap: 10 }}>
            <div className="field">
              <label htmlFor="mv">Mover para</label>
              <select data-perm="leads.editar" id="mv" className="input" value={l.stage} onChange={(e) => move(e.target.value)}>
                {STAGES.map((s) => (
                  <option key={s[0]} value={s[0]}>
                    {s[1]}
                  </option>
                ))}
              </select>
            </div>
            {l.stage === 'remarketing' && (
              <div className="field">
                <label htmlFor="rm">Retomar contato em</label>
                <input id="rm" type="date" className="input" value={l.remarketing_at || ''} onChange={(e) => sb().from('leads').update({ remarketing_at: e.target.value || null }).eq('id', id)} />
              </div>
            )}
            <div className="row-actions">
              {(l.mapa_slug || l.preview_slug) && (
                <a className="btn" href={`/mapa/${l.mapa_slug || l.preview_slug}?previa=1`} target="_blank" rel="noreferrer">
                  <Icon name="eye" />
                  Ver o mapa
                </a>
              )}
              {!(l.mapa_slug || l.preview_slug) && (
                <button data-perm="mapas.gerar" className="btn" disabled={previewBusy} onClick={() => makePreview(false)}>
                  <Icon name="star" />
                  {previewBusy ? 'Criando…' : 'Gerar o mapa desta conversa'}
                </button>
              )}
            </div>
            <div className="row-actions">
              {l.ai_locked ? (
                <button data-perm="conversas.responder" className="btn" onClick={() => act({ action: 'lock', on: false }, 'IA reativada nesta conversa')}>
                  ▶ Reativar IA
                </button>
              ) : (
              <button data-perm="conversas.responder" className="btn" onClick={() => act({ action: 'ai', on: !l.ai_enabled }, l.ai_enabled ? 'Você assumiu a conversa' : 'Conversa devolvida para a IA')}>
                <Icon name={l.ai_enabled ? 'user' : 'robot'} />
                {l.ai_enabled ? 'Assumir conversa' : 'Devolver para a IA'}
              </button>
              )}
            </div>
            {l.stage !== 'pago' && (
              <div data-perm="leads.pago" className="pill-input">
                <input className="input" style={{ width: 120 }} placeholder={l.deal_price ? String(l.deal_price) : 'Valor'} value={paidValue} onChange={(e) => setPaidValue(e.target.value)} aria-label="Valor pago" />
                <button className="btn btn-sm" onClick={() => act({ action: 'paid', amount: paidValue ? Number(paidValue.replace(',', '.')) : null }, 'Venda registrada')}>
                  <Icon name="check" />
                  Marcar como pago
                </button>
              </div>
            )}
            <div>
              {confirmDel ? (
                <div className="row-actions">
                  <span style={{ fontSize: 13 }}>Apagar este lead e toda a conversa?</span>
                  <button className="btn btn-sm" style={{ color: 'var(--bad)' }} onClick={del}>
                    Sim, apagar
                  </button>
                  <button className="btn btn-sm btn-g" onClick={() => setConfirmDel(false)}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <button data-perm="leads.excluir" className="btn btn-sm btn-g" onClick={() => setConfirmDel(true)}>
                  <Icon name="trash" />
                  Apagar lead
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
