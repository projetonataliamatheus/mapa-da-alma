'use client';
/* Ficha do cliente: tudo dele junto (resumo, páginas, financeiro, renovações, Instagram e acesso à área do cliente). */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { api, toast, brl, initials, copyText } from '@/components/ui';
import { useCan } from '@/components/Shell';
import { VisibleSwitch } from '@/components/ClientAccess';
import { todaySP } from '@/lib/finance';
import { LineChart, RenewalForm, KIND } from '@/components/ClientWidgets';

const fmt = (d?: string | null) => (d ? new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('pt-BR') : '—');
const fmtDT = (d?: string | null) => (d ? new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');
const n = (v: any) => (v == null ? '—' : Number(v).toLocaleString('pt-BR'));
const STP: Record<string, [string, string]> = { pago: ['Pago', 'var(--ok)'], pendente: ['Pendente', 'var(--warn)'], expirado: ['Expirado', 'var(--muted)'], cancelado: ['Cancelado', 'var(--muted)'], estornado: ['Estornado', 'var(--bad)'] };

function Instagram({ lead, profiles, onChanged, canEdit }: { lead: any; profiles: any[]; onChanged: () => void; canEdit: boolean }) {
  const [user, setUser] = useState('');
  const [busy, setBusy] = useState('');
  const [manual, setManual] = useState<any>(null);
  async function addProfile() {
    setBusy('add');
    try {
      const r = await api('/api/instagram-acomp', 'POST', { lead_id: lead.id, username: user });
      toast(r.warning ? `Perfil adicionado. ${r.warning}` : 'Perfil adicionado e lido agora. A partir de hoje a leitura é automática, todo dia.');
      setUser('');
      onChanged();
    } catch (e: any) {
      toast(e.message);
    }
    setBusy('');
  }
  async function refresh(id: string) {
    setBusy(id);
    try {
      await api('/api/instagram-acomp', 'POST', { action: 'refresh', id });
      toast('Atualizado');
      onChanged();
    } catch (e: any) {
      toast(e.message);
    }
    setBusy('');
  }
  async function remove(id: string) {
    if (!window.confirm('Parar de acompanhar e apagar o histórico deste perfil?')) return;
    await api('/api/instagram-acomp', 'DELETE', { id }).catch((e) => toast(e.message));
    onChanged();
  }
  return (
    <div className="grid" style={{ gap: 14 }}>
      {canEdit && (
        <div className="card ig-add">
          <div>
            <b>Acompanhar um perfil</b>
            <p className="muted" style={{ fontSize: 12.5, margin: '2px 0 0' }}>
              Só o @. O sistema lê os números públicos todo dia sozinho, sem login e sem conectar a conta do cliente (zero risco de bloqueio).
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" value={user} onChange={(e) => setUser(e.target.value)} placeholder="@perfil ou link do Instagram" onKeyDown={(e) => e.key === 'Enter' && user && addProfile()} />
            <button className="btn btn-p" disabled={!user || busy === 'add'} onClick={addProfile}>
              {busy === 'add' ? 'Lendo…' : 'Acompanhar'}
            </button>
          </div>
        </div>
      )}
      {profiles.length === 0 && <p className="muted">Nenhum perfil acompanhado ainda.</p>}
      {profiles.map((p) => {
        const s = p.snapshots || [];
        const last = s[s.length - 1];
        const ago = (days: number) => {
          const lim = Date.parse(todaySP() + 'T12:00:00') - days * 86400_000;
          const old = [...s].reverse().find((x: any) => Date.parse(x.day + 'T12:00:00') <= lim) || s[0];
          return last && old && old !== last && last.followers != null && old.followers != null ? last.followers - old.followers : null;
        };
        const daily = s.slice(1).map((x: any, i: number) => ({ x: x.day, y: x.followers != null && s[i].followers != null ? x.followers - s[i].followers : null }));
        const eng = last && last.followers && last.recent ? (((last.likes || 0) + (last.comments || 0)) / last.recent / last.followers) * 100 : null;
        return (
          <div key={p.id} className="card ig-card">
            <div className="ig-h">
              <span className="avatar cl-av" style={p.pic_url ? { background: `url("${p.pic_url}") center/cover` } : undefined}>
                {!p.pic_url && '@'}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <a href={`https://instagram.com/${p.username}`} target="_blank" rel="noopener noreferrer">
                  <b>@{p.username}</b>
                </a>
                <small className="muted" style={{ display: 'block' }}>
                  {p.full_name ? `${p.full_name} · ` : ''}última leitura {fmtDT(p.last_fetch_at)}
                  {p.last_error ? ` · ${p.last_error}` : ''}
                </small>
              </div>
              {canEdit && (
                <>
                  <button className="btn btn-sm btn-g" onClick={() => refresh(p.id)} disabled={busy === p.id}>
                    <Icon name="refresh" /> {busy === p.id ? 'Lendo…' : 'Ler agora'}
                  </button>
                  <button className="btn btn-sm btn-g" onClick={() => setManual({ id: p.id, day: todaySP() })} title="Se o Instagram bloquear a leitura por um tempo">
                    Lançar dia
                  </button>
                  <button className="iconbtn" onClick={() => remove(p.id)} aria-label="Parar de acompanhar">
                    <Icon name="trash" />
                  </button>
                </>
              )}
            </div>
            <div className="ig-kpis">
              <div>
                <small>Seguidores</small>
                <b>{n(last?.followers)}</b>
              </div>
              <div>
                <small>Hoje</small>
                <b className={(daily[daily.length - 1]?.y || 0) >= 0 ? 'up' : 'down'}>{daily.length && daily[daily.length - 1].y != null ? `${daily[daily.length - 1].y! >= 0 ? '+' : ''}${n(daily[daily.length - 1].y)}` : '—'}</b>
              </div>
              <div>
                <small>7 dias</small>
                <b className={(ago(7) || 0) >= 0 ? 'up' : 'down'}>{ago(7) == null ? '—' : `${ago(7)! >= 0 ? '+' : ''}${n(ago(7))}`}</b>
              </div>
              <div>
                <small>30 dias</small>
                <b className={(ago(30) || 0) >= 0 ? 'up' : 'down'}>{ago(30) == null ? '—' : `${ago(30)! >= 0 ? '+' : ''}${n(ago(30))}`}</b>
              </div>
              <div>
                <small>Posts</small>
                <b>{n(last?.posts)}</b>
              </div>
              <div>
                <small>Curtidas (últimos {last?.recent || 0})</small>
                <b>{n(last?.likes)}</b>
              </div>
              <div>
                <small>Comentários</small>
                <b>{n(last?.comments)}</b>
              </div>
              <div>
                <small>Engajamento</small>
                <b>{eng == null ? '—' : `${eng.toFixed(2).replace('.', ',')}%`}</b>
              </div>
            </div>
            <div className="ig-charts">
              <div>
                <small className="muted">Seguidores</small>
                <LineChart label="Seguidores por dia" points={s.map((x: any) => ({ x: x.day, y: x.followers }))} />
              </div>
              <div>
                <small className="muted">Curtidas nos posts recentes</small>
                <LineChart label="Curtidas por dia" color="var(--bad)" points={s.map((x: any) => ({ x: x.day, y: x.likes }))} />
              </div>
              <div>
                <small className="muted">Comentários nos posts recentes</small>
                <LineChart label="Comentários por dia" color="var(--ai)" points={s.map((x: any) => ({ x: x.day, y: x.comments }))} />
              </div>
            </div>
          </div>
        );
      })}
      {manual && (
        <>
          <div className="scrim" onClick={() => setManual(null)} />
          <form
            className="modal fin-form"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api('/api/instagram-acomp', 'POST', { action: 'manual', ...manual });
                toast('Dia lançado');
                setManual(null);
                onChanged();
              } catch (er: any) {
                toast(er.message);
              }
            }}
          >
            <h2>Lançar números de um dia</h2>
            <p className="muted" style={{ fontSize: 12.5 }}>Só para quando a leitura automática falhar. Campos vazios ficam como estavam.</p>
            <label className="field">
              <span>Dia</span>
              <input className="input" type="date" value={manual.day} onChange={(e) => setManual({ ...manual, day: e.target.value })} required />
            </label>
            <div className="fin-2">
              {(
                [
                  ['followers', 'Seguidores'],
                  ['following', 'Seguindo'],
                  ['posts', 'Posts'],
                  ['likes', 'Curtidas'],
                  ['comments', 'Comentários'],
                ] as const
              ).map(([k, l]) => (
                <label key={k} className="field">
                  <span>{l}</span>
                  <input className="input" inputMode="numeric" value={manual[k] || ''} onChange={(e) => setManual({ ...manual, [k]: e.target.value })} />
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-g" onClick={() => setManual(null)}>
                Cancelar
              </button>
              <button className="btn btn-p">Salvar</button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

export default function Cliente({ params }: { params: { id: string } }) {
  const can = useCan();
  const canEdit = can('leads.editar');
  const [d, setD] = useState<any>(null);
  const [tab, setTab] = useState<'resumo' | 'paginas' | 'financeiro' | 'renovacoes' | 'instagram' | 'acesso'>('resumo');
  const [ren, setRen] = useState<any>(null);
  const [shown, setShown] = useState<any>(null);
  const [uname, setUname] = useState('');
  const load = () =>
    api(`/api/clientes/${params.id}`, 'GET')
      .then(setD)
      .catch((e) => toast(e.message));
  useEffect(() => {
    load();
    try {
      const t = new URLSearchParams(window.location.search).get('aba');
      if (t) setTab(t as any);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);
  const money = useMemo(() => {
    if (!d) return { paid: 0, open: 0 };
    const paid = d.payments.filter((p: any) => p.status === 'pago').reduce((t: number, p: any) => t + Number(p.amount || 0), 0);
    const open = d.entries.filter((e: any) => e.kind === 'receita' && e.status === 'pendente').reduce((t: number, e: any) => t + Number(e.amount || 0), 0);
    return { paid, open };
  }, [d]);
  async function access(action: string) {
    try {
      if (action === 'reset' && !window.confirm('Gerar uma senha nova? A antiga para de funcionar na hora.')) return;
      const r = await api(`/api/clientes/${params.id}`, 'POST', { action, username: uname || undefined });
      if (r.username) setShown(r);
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  if (!d) return <p className="muted">Carregando…</p>;
  const l = d.lead;
  const late = l.production_due && l.production_due < todaySP() && l.production_status !== 'entregue';
  return (
    <>
      <div className="cl-head">
        <Link href="/clientes" className="btn btn-g btn-sm">
          ← Clientes
        </Link>
        <span className="avatar cl-av big" style={l.photo_url ? { background: `url("${l.photo_url}") center/cover` } : undefined}>
          {!l.photo_url && initials(l.name)}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1>{l.name}</h1>
          <p className="muted">{[l.niche, l.city, l.whatsapp, l.campaign ? `anúncio: ${l.campaign}` : l.source].filter(Boolean).join(' · ')}</p>
        </div>
        <a className="btn btn-sm" href={`/conversas?lead=${l.id}`}>
          <Icon name="chat" /> Conversa
        </a>
        <a className="btn btn-sm" href={`/producao`}>
          <Icon name="target" /> Produção
        </a>
      </div>
      <div className="seg" role="tablist" style={{ alignSelf: 'flex-start' }}>
        {(
          [
            ['resumo', 'Resumo'],
            ['paginas', `Páginas (${d.bios.length + d.catalogs.length + d.previews.length})`],
            ['financeiro', 'Financeiro'],
            ['renovacoes', `Renovações (${d.renewals.length})`],
            ['instagram', 'Instagram'],
            ['acesso', 'Área do cliente'],
          ] as const
        ).map(([k, t]) => (
          <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'resumo' && (
        <div className="grid cl-two">
          <div className="card">
            <div className="card-h">
              <h2>Números</h2>
            </div>
            <dl className="fin-dl">
              <dt>Já pagou</dt>
              <dd style={{ color: 'var(--ok)', fontWeight: 700 }}>{brl(money.paid)}</dd>
              <dt>A receber</dt>
              <dd>{brl(money.open)}</dd>
              <dt>Cliente desde</dt>
              <dd>{fmt(l.client_since || l.paid_at)}</dd>
              <dt>Serviço</dt>
              <dd>{l.deal_service || '—'}</dd>
              <dt>Produção</dt>
              <dd style={late ? { color: 'var(--bad)', fontWeight: 600 } : undefined}>
                {l.production_status || '—'}
                {l.production_due ? ` · prazo ${fmt(l.production_due)}${late ? ' (atrasado)' : ''}` : ''}
              </dd>
              <dt>Entregue em</dt>
              <dd>{fmt(l.delivered_at)}</dd>
              <dt>Depoimento</dt>
              <dd>{l.testimonial_asked_at ? `pedido em ${fmt(l.testimonial_asked_at)}` : 'ainda não pedido'}</dd>
            </dl>
          </div>
          <div className="card">
            <div className="card-h">
              <h2>Resumo da conversa</h2>
            </div>
            {l.summary ? <p className="aisum">{l.summary}</p> : <p className="muted">Sem resumo ainda.</p>}
            {l.next_step && (
              <p className="muted" style={{ fontSize: 13 }}>
                Próximo passo: {l.next_step}
              </p>
            )}
            {l.project_summary && (
              <>
                <h3 style={{ fontSize: 13, margin: '10px 0 4px' }}>Projeto</h3>
                <p style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{l.project_summary}</p>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'paginas' && (
        <div className="grid" style={{ gap: 10 }}>
          {[...d.bios.map((b: any) => ({ ...b, k: 'bio', label: 'Link na bio', href: `/bio/${b.id}` })), ...d.catalogs.map((c: any) => ({ ...c, k: 'catalogo', label: 'Catálogo digital', href: `/catalogo/${c.id}` })), ...d.previews.map((p: any) => ({ ...p, id: p.slug, name: 'Prévia do mapa', k: 'previa', label: 'Mapa (prévia)', href: '/modelos' }))].map((p: any) => (
            <div key={p.k + p.id} className="card cl-page">
              <div style={{ minWidth: 0, flex: 1 }}>
                <small className="muted">{p.label}</small>
                <b style={{ display: 'block' }}>{p.name}</b>
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="muted" style={{ fontSize: 12.5 }}>
                  {String(p.url).replace(/^https?:\/\//, '')} ↗
                </a>
              </div>
              <span className="muted" style={{ fontSize: 12.5 }}>{p.views || 0} visitas</span>
              <VisibleSwitch kind={p.k} id={p.id} name={p.name} value={p.visible !== false} onChange={(v) => setD((o: any) => ({ ...o, [p.k === 'bio' ? 'bios' : p.k === 'catalogo' ? 'catalogs' : 'previews']: o[p.k === 'bio' ? 'bios' : p.k === 'catalogo' ? 'catalogs' : 'previews'].map((x: any) => ((x.id || x.slug) === p.id ? { ...x, visible: v } : x)) }))} />
              <Link className="btn btn-sm" href={p.href}>
                Editar
              </Link>
            </div>
          ))}
          {!d.bios.length && !d.catalogs.length && !d.previews.length && <p className="muted">Nenhuma página deste cliente ainda.</p>}
        </div>
      )}

      {tab === 'financeiro' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th style={{ textAlign: 'right' }}>Valor</th>
                  <th>Situação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {d.payments.map((p: any) => (
                  <tr key={p.id}>
                    <td className="muted">OS {String(p.receipt_number).padStart(5, '0')}</td>
                    <td>{fmtDT(p.paid_at || p.created_at)}</td>
                    <td>{p.service || 'Pagamento'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 650 }}>{brl(p.amount)}</td>
                    <td>
                      <span className="chip" style={{ ['--t' as any]: (STP[p.status] || STP.pendente)[1] }}>
                        {(STP[p.status] || STP.pendente)[0]}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {p.receipt_path && (
                        <a className="btn btn-sm btn-g" href={`/api/payments/${p.id}`} target="_blank" rel="noopener noreferrer">
                          Recibo
                        </a>
                      )}
                      {p.asaas_receipt_url && (
                        <a className="btn btn-sm btn-g" href={p.asaas_receipt_url} target="_blank" rel="noopener noreferrer">
                          Asaas
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
                {d.entries
                  .filter((e: any) => !(e.payment_id && e.status === 'pago'))
                  .map((e: any) => (
                    <tr key={e.id}>
                      <td className="muted">
                        {e.kind === 'despesa' ? 'DP' : 'RC'} {String(e.number).padStart(5, '0')}
                      </td>
                      <td>{e.status === 'pago' ? fmtDT(e.paid_at) : `vence ${fmt(e.due_date)}`}</td>
                      <td>{e.description}</td>
                      <td style={{ textAlign: 'right', fontWeight: 650 }}>{brl(e.amount)}</td>
                      <td>
                        <span className="chip" style={{ ['--t' as any]: (STP[e.status] || STP.pendente)[1] }}>
                          {(STP[e.status] || STP.pendente)[0]}
                        </span>
                      </td>
                      <td />
                    </tr>
                  ))}
                {!d.payments.length && !d.entries.length && (
                  <tr>
                    <td colSpan={6} className="muted">
                      Nenhum lançamento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'renovacoes' && (
        <div className="grid" style={{ gap: 10 }}>
          {canEdit && (
            <button className="btn btn-p btn-sm" style={{ justifySelf: 'start' }} onClick={() => setRen({ lead_id: l.id, title: 'Renovação do domínio' })}>
              <Icon name="plus" /> Nova renovação
            </button>
          )}
          {d.renewals.map((r: any) => {
            const left = Math.round((Date.parse(r.next_due + 'T12:00:00') - Date.now()) / 86400_000);
            return (
              <div key={r.id} className="card cl-page" style={{ opacity: r.active ? 1 : 0.55 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <small className="muted">
                    {KIND[r.kind] || r.kind} · {r.cycle === 'anual' ? 'anual' : 'mensal'} · {r.auto_charge ? `cobra ${r.remind_days} dia(s) antes no WhatsApp` : 'cobrança manual'}
                  </small>
                  <b style={{ display: 'block' }}>{r.title}</b>
                  <span style={{ fontSize: 13, color: left < 0 ? 'var(--bad)' : left <= 7 ? 'var(--warn)' : undefined }}>
                    Vence {fmt(r.next_due)} ({left < 0 ? `há ${-left} dias` : left === 0 ? 'hoje' : `em ${left} dias`}){r.last_sent_at ? ` · cobrança enviada ${fmtDT(r.last_sent_at)}` : ''}
                  </span>
                </div>
                <b>{brl(r.amount)}</b>
                {canEdit && (
                  <>
                    <button className="btn btn-sm btn-g" onClick={() => setRen(r)}>
                      Editar
                    </button>
                    <button
                      className="iconbtn"
                      aria-label="Apagar renovação"
                      onClick={async () => {
                        if (!window.confirm('Apagar esta renovação?')) return;
                        await api('/api/renovacoes', 'DELETE', { id: r.id }).catch((e) => toast(e.message));
                        load();
                      }}
                    >
                      <Icon name="trash" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
          {!d.renewals.length && <p className="muted">Nenhuma renovação. Cadastre domínio, hospedagem ou mensalidade: a cobrança sai sozinha no WhatsApp.</p>}
        </div>
      )}

      {tab === 'instagram' && <Instagram lead={l} profiles={d.instagram} onChanged={load} canEdit={canEdit} />}

      {tab === 'acesso' && (
        <div className="card" style={{ maxWidth: 620 }}>
          <div className="card-h">
            <Icon name="key" />
            <h2>Área do cliente</h2>
          </div>
          <p className="muted" style={{ fontSize: 13 }}>
            O link exclusivo do cliente: com usuário e senha ele vê e edita as páginas dele, acompanha o Instagram, os pagamentos e as renovações.{' '}
            <a href={d.area} target="_blank" rel="noopener noreferrer">
              {d.area.replace(/^https?:\/\//, '')} ↗
            </a>
          </p>
          {shown ? (
            <div className="ca-shown">
              <div>
                Usuário: <b>{shown.username}</b>
              </div>
              {shown.password && (
                <div>
                  Senha: <b className="ca-pw">{shown.password}</b> <small className="muted">(aparece só agora)</small>
                </div>
              )}
              <textarea className="input" readOnly rows={6} value={shown.message} style={{ fontSize: 12.5 }} />
              <button className="btn btn-p" onClick={() => copyText(shown.message)}>
                <Icon name="copy" /> Copiar mensagem para o cliente
              </button>
            </div>
          ) : d.account ? (
            <div className="ca-info">
              <div>
                Usuário: <b>{d.account.username}</b> · {d.account.active ? 'ativo' : 'desativado'}
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                {d.account.last_login_at ? `Último acesso ${fmtDT(d.account.last_login_at)}` : 'Ainda não entrou'}
              </div>
              {canEdit && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-sm" onClick={() => access('reset')}>
                    <Icon name="refresh" /> Gerar senha nova
                  </button>
                  <button className="btn btn-sm btn-g" onClick={() => access(d.account.active ? 'disable' : 'enable')}>
                    {d.account.active ? 'Desativar acesso' : 'Reativar acesso'}
                  </button>
                </div>
              )}
            </div>
          ) : canEdit ? (
            <div className="ca-info">
              <label className="field">
                <span>Usuário (opcional)</span>
                <input className="input" value={uname} onChange={(e) => setUname(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))} placeholder="em branco: usa o nome do cliente" />
              </label>
              <button className="btn btn-p" onClick={() => access('create')}>
                Criar acesso e gerar senha
              </button>
            </div>
          ) : (
            <p className="muted">Este cliente ainda não tem acesso.</p>
          )}
        </div>
      )}
      {ren && <RenewalForm initial={ren} onClose={() => setRen(null)} onSaved={load} />}
    </>
  );
}
