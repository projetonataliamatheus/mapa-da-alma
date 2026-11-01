'use client';
import { useEffect, useMemo, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { api, toast, brl, timeLabel, copyText, useLive } from '@/components/ui';
import { sb } from '@/lib/supabase/browser';
import { DEFAULT_SETTINGS, deepMerge } from '@/lib/settings';
import { norm } from '@/lib/util';

const STATUS: Record<string, [string, string]> = { ativo: ['Ativo', 'gg'], pago: ['Pago', 'ok'], cancelado: ['Cancelado', 'muted'], expirado: ['Expirado', 'warn'] };
const num = (v: any) => Number(String(v ?? '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));

function base(settings: any, origin: string) {
  const raw = String(settings?.checkout?.base_url || '').trim();
  return raw ? (raw.startsWith('http') ? raw : 'https://' + raw).replace(/\/$/, '') : origin;
}

function LinkForm({ services, leads, settings, initial, onDone, onCancel }: { services: any[]; leads: any[]; settings: any; initial?: any; onDone: (l: any) => void; onCancel?: () => void }) {
  const editing = !!initial?.id;
  const [f, setF] = useState<any>(
    initial || {
      service_slug: '',
      title: '',
      description: '',
      includes: '',
      amount: '',
      billing: 'unico',
      max_installments: settings.checkout.max_installments,
      methods: settings.checkout.methods,
      lead_id: '',
      expires_days: settings.checkout.expiry_days,
    },
  );
  const [busy, setBusy] = useState(false);
  function pickService(slug: string) {
    const s = services.find((x) => x.slug === slug);
    if (!s) return setF({ ...f, service_slug: '' });
    setF({ ...f, service_slug: slug, title: s.name, description: s.description || '', includes: s.includes || '', amount: s.max_price ?? '', billing: /mensal/i.test(s.billing || '') ? 'mensal' : 'unico' });
  }
  // combo: vários serviços num link só, com desconto
  const [combo, setCombo] = useState<string[]>([]);
  const [disc, setDisc] = useState<number>(Number(settings?.combo_discount ?? 15));
  const priceOf = (s: any) => Number(s.max_price ?? s.monthly_price ?? s.annual_price ?? 0);
  function applyCombo(list: string[], d = disc) {
    setCombo(list);
    const items = services.filter((x) => list.includes(x.slug));
    if (list.length < 2) return;
    const total = items.reduce((a, x) => a + priceOf(x), 0);
    const final = Math.round(total * (1 - d / 100) * 100) / 100;
    setF((g: any) => ({
      ...g,
      service_slug: '',
      title: 'Combo: ' + items.map((x) => x.name.replace(/\s*\(.*\)\s*/, '')).join(' + '),
      description: `Pacote completo com ${d}% de desconto (de ${brl(total)} por ${brl(final)}).`,
      includes: items.map((x) => `${x.name} (${brl(priceOf(x))})`).join('\n'),
      amount: String(final).replace('.', ','),
      billing: 'unico',
    }));
  }
  const toggleMethod = (m: string) => setF({ ...f, methods: f.methods.includes(m) ? f.methods.filter((x: string) => x !== m) : [...f.methods, m] });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.methods.length) return toast('Escolha pelo menos uma forma de pagamento.');
    setBusy(true);
    try {
      const items = combo.length >= 2 ? services.filter((x) => combo.includes(x.slug)).map((x) => ({ slug: x.slug, name: x.name, price: priceOf(x) })) : null;
      const body = { ...f, amount: num(f.amount), max_installments: Number(f.max_installments) || 1, lead_id: f.lead_id || null, combo: items };
      const r = editing ? await api('/api/links', 'PATCH', { id: initial.id, title: body.title, description: body.description, includes: body.includes, amount: body.amount, billing: body.billing, max_installments: body.max_installments, methods: body.methods }) : await api('/api/links', 'POST', body);
      onDone(r);
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }
  return (
    <form onSubmit={submit} className="grid" style={{ gap: 12 }}>
      {!editing && (
        <div className="formgrid">
          <div className="field">
            <label htmlFor="lf-svc">Serviço cadastrado</label>
            <select id="lf-svc" className="input" value={f.service_slug} onChange={(e) => pickService(e.target.value)}>
              <option value="">Personalizado</option>
              {services.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Ou monte um combo (2 ou mais serviços com desconto)</label>
            <div className="combo-pick">
              {services
                .filter((x) => priceOf(x) > 0)
                .map((x) => (
                  <label key={x.slug} className={combo.includes(x.slug) ? 'on' : ''}>
                    <input type="checkbox" checked={combo.includes(x.slug)} onChange={() => applyCombo(combo.includes(x.slug) ? combo.filter((y) => y !== x.slug) : [...combo, x.slug])} />
                    {x.name} <small>{brl(priceOf(x))}</small>
                  </label>
                ))}
              {combo.length >= 2 && (
                <span className="combo-disc">
                  Desconto
                  <input className="input num" style={{ width: 64 }} type="number" min={0} max={60} value={disc} onChange={(e) => (setDisc(Number(e.target.value)), applyCombo(combo, Number(e.target.value)))} />%
                </span>
              )}
            </div>
          </div>
          <div className="field">
            <label htmlFor="lf-lead">Cliente (opcional)</label>
            <select id="lf-lead" className="input" value={f.lead_id} onChange={(e) => setF({ ...f, lead_id: e.target.value })}>
              <option value="">Sem cliente vinculado</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      <div className="formgrid">
        <div className="field" style={{ gridColumn: 'span 2' }}>
          <label htmlFor="lf-title">Nome do serviço (aparece no checkout)</label>
          <input id="lf-title" className="input" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ex.: Criação de site profissional" />
        </div>
        <div className="field">
          <label htmlFor="lf-amount">Valor {f.billing === 'mensal' ? 'por mês' : 'total'}</label>
          <input id="lf-amount" className="input num" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="549,00" inputMode="decimal" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="lf-desc">Descrição</label>
        <textarea id="lf-desc" className="input" value={f.description || ''} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="O que o cliente está contratando" />
      </div>
      <div className="field">
        <label htmlFor="lf-inc">O que está incluso (um item por linha)</label>
        <textarea id="lf-inc" className="input" value={f.includes || ''} onChange={(e) => setF({ ...f, includes: e.target.value })} placeholder={'Domínio e hospedagem inclusos\nEntrega em até 48 horas\nBotão de WhatsApp'} />
      </div>
      <div className="formgrid" style={{ alignItems: 'end' }}>
        <div className="field">
          <label>Cobrança</label>
          <div className="seg" role="group">
            <button type="button" aria-pressed={f.billing === 'unico'} onClick={() => setF({ ...f, billing: 'unico' })}>
              Pagamento único
            </button>
            <button type="button" aria-pressed={f.billing === 'mensal'} onClick={() => setF({ ...f, billing: 'mensal' })}>
              Mensal
            </button>
          </div>
        </div>
        <div className="field">
          <label htmlFor="lf-inst">Parcelas no cartão (máx.)</label>
          <select id="lf-inst" className="input" disabled={f.billing === 'mensal'} value={f.billing === 'mensal' ? 1 : f.max_installments} onChange={(e) => setF({ ...f, max_installments: Number(e.target.value) })}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? 'Só à vista' : `Até ${n}x`}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Formas de pagamento</label>
          <div style={{ display: 'flex', gap: 14, height: 38, alignItems: 'center' }}>
            <label className="check">
              <input type="checkbox" checked={f.methods.includes('pix')} onChange={() => toggleMethod('pix')} />
              Pix
            </label>
            <label className="check">
              <input type="checkbox" checked={f.methods.includes('card')} onChange={() => toggleMethod('card')} />
              Cartão
            </label>
          </div>
        </div>
        {!editing && (
          <div className="field">
            <label htmlFor="lf-exp">Validade</label>
            <select id="lf-exp" className="input" value={f.expires_days} onChange={(e) => setF({ ...f, expires_days: Number(e.target.value) })}>
              {[1, 3, 7, 15, 30, 0].map((d) => (
                <option key={d} value={d}>
                  {d ? `${d} dia${d > 1 ? 's' : ''}` : 'Sem validade'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="row-actions">
        <button className="btn btn-p" disabled={busy}>
          {busy ? <span className="spin" /> : <Icon name={editing ? 'check' : 'plus'} />}
          {editing ? 'Salvar alterações' : 'Criar link de pagamento'}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-g" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function CheckoutSettings({ settings, onSaved }: { settings: any; onSaved: (s: any) => void }) {
  const [c, setC] = useState<any>(settings.checkout);
  const [mode, setMode] = useState<string>(settings.payments?.mode || 'link');
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      const r = await api('/api/settings', 'PATCH', { checkout: { ...c, max_installments: Number(c.max_installments) || 1, expiry_days: Number(c.expiry_days) || 0 }, payments: { mode } });
      onSaved(r);
      toast('Checkout salvo');
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }
  const t = (k: string, label: string, ph = '') => (
    <div className="field">
      <label htmlFor={'ck-' + k}>{label}</label>
      <input id={'ck-' + k} className="input" value={c[k] ?? ''} placeholder={ph} onChange={(e) => setC({ ...c, [k]: e.target.value })} />
    </div>
  );
  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="alert" style={{ alignItems: 'center' }}>
        <Ib name="spark" tone="acc" size="sm" />
        <div style={{ flex: 1 }}>
          <b>Editor visual</b>
          <p className="muted" style={{ fontSize: 12.5 }}>Edite textos, imagens, cores, fontes e a ordem dos blocos vendo o checkout ao vivo.</p>
        </div>
        <a className="btn btn-p btn-sm" href="/checkout-editor">
          Abrir editor
        </a>
      </div>
      <div className="setrow">
        <div className="tx">
          <b>Como a IA cobra o cliente</b>
          <small>Link: envia o link do checkout com o valor combinado (Pix ou cartão). Pix direto: pede CPF e manda o copia e cola.</small>
        </div>
        <div className="seg" role="group">
          <button aria-pressed={mode === 'link'} onClick={() => setMode('link')}>
            Link de pagamento
          </button>
          <button aria-pressed={mode === 'pix'} onClick={() => setMode('pix')}>
            Pix direto
          </button>
        </div>
      </div>
      <div className="formgrid">
        {t('base_url', 'Domínio do checkout', 'pagar.suaagencia.com.br')}
        {t('brand', 'Nome no topo do checkout', 'Fênix Ads')}
        {t('logo_url', 'Endereço da logo (opcional)', 'https://…/logo.png')}
        <div className="field">
          <label htmlFor="ck-accent">Cor principal</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input id="ck-accent" type="color" value={c.accent || '#e8562a'} onChange={(e) => setC({ ...c, accent: e.target.value })} style={{ width: 44, height: 38, border: '1px solid var(--line-strong)', borderRadius: 10, background: 'none', padding: 3 }} />
            <input className="input mono" value={c.accent || ''} onChange={(e) => setC({ ...c, accent: e.target.value })} aria-label="Cor em hexadecimal" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="ck-inst">Parcelas máximas (padrão)</label>
          <input id="ck-inst" className="input num" type="number" min={1} max={12} value={c.max_installments} onChange={(e) => setC({ ...c, max_installments: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="ck-exp">Validade padrão (dias)</label>
          <input id="ck-exp" className="input num" type="number" min={0} value={c.expiry_days} onChange={(e) => setC({ ...c, expiry_days: e.target.value })} />
        </div>
      </div>
      <div className="formgrid">
        {t('unico_note', 'Texto para pagamento único')}
        {t('mensal_note', 'Texto para cobrança mensal')}
      </div>
      <div className="formgrid">
        {t('success_message', 'Mensagem depois do pagamento')}
        {t('footer', 'Rodapé')}
      </div>
      <div className="row-actions">
        <label className="check">
          <input type="checkbox" checked={(c.methods || []).includes('pix')} onChange={() => setC({ ...c, methods: c.methods.includes('pix') ? c.methods.filter((x: string) => x !== 'pix') : [...c.methods, 'pix'] })} />
          Pix nos links novos
        </label>
        <label className="check">
          <input type="checkbox" checked={(c.methods || []).includes('card')} onChange={() => setC({ ...c, methods: c.methods.includes('card') ? c.methods.filter((x: string) => x !== 'card') : [...c.methods, 'card'] })} />
          Cartão nos links novos
        </label>
        <button className="btn btn-p sp" onClick={save} disabled={busy}>
          <Icon name="check" />
          {busy ? 'Salvando…' : 'Salvar checkout'}
        </button>
      </div>
      <p className="muted" style={{ fontSize: 12.5 }}>
        Para usar seu domínio: crie no DNS um registro A de <b>pagar.seudominio.com.br</b> para <b>200.141.27.52</b>, adicione o mesmo domínio no Easypanel (serviço painel › Domínios, porta 3000) e coloque ele aqui. Até lá, os links usam o endereço do painel.
      </p>
    </div>
  );
}

export default function Links() {
  const [links, setLinks] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(DEFAULT_SETTINGS);
  const [tab, setTab] = useState<'links' | 'checkout'>('links');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [filter, setFilter] = useState('todos');
  const [q, setQ] = useState('');
  const [origin, setOrigin] = useState('');

  async function load() {
    const [{ data: l }, { data: s }] = await Promise.all([
      sb().from('checkout_links').select('*, leads(name)').order('created_at', { ascending: false }).limit(500),
      sb().from('settings').select('data').eq('id', 1).maybeSingle(),
    ]);
    setLinks(l || []);
    setSettings(deepMerge(DEFAULT_SETTINGS, s?.data || {}));
  }
  useLive(['checkout_links'], load);
  useEffect(() => {
    setOrigin(window.location.origin);
    (async () => {
      const [{ data: sv }, { data: ld }] = await Promise.all([
        sb().from('services').select('*').order('sort'),
        sb().from('leads').select('id,name').not('stage', 'in', '(novo,sem)').order('updated_at', { ascending: false }).limit(300),
      ]);
      setServices(sv || []);
      setLeads(ld || []);
    })();
  }, []);

  const url = (slug: string) => `${base(settings, origin)}/pagar/${slug}`;
  const shown = useMemo(
    () => links.filter((l) => (filter === 'todos' || l.status === filter) && (!q || norm(`${l.title} ${l.customer_name || ''} ${l.leads?.name || ''}`).includes(norm(q)))),
    [links, filter, q],
  );
  const paid = links.filter((l) => l.status === 'pago');
  const month = new Date().toISOString().slice(0, 7);
  const kpis: any[] = [
    ['money', 'ok', 'Recebido pelos links (mês)', brl(paid.filter((l) => (l.paid_at || '').startsWith(month)).reduce((a, l) => a + Number(l.amount), 0))],
    ['send', 'gg', 'Links ativos', links.filter((l) => l.status === 'ativo').length],
    ['robot', 'ai', 'Criados pela IA', links.filter((l) => l.created_by === 'ia').length],
    ['trend', 'acc', 'Taxa de pagamento', links.length ? Math.round((paid.length / links.length) * 100) + '%' : '—'],
  ];

  async function setStatus(l: any, status: string) {
    try {
      await api('/api/links', 'PATCH', { id: l.id, status });
      toast(status === 'cancelado' ? 'Link cancelado' : 'Link reativado');
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }

  return (
    <>
      <PageHead title="Links de pagamento" sub="Checkout próprio no seu domínio, com Pix ou cartão, criado por você ou pela IA" icon="money" tone="ok" help="links">
        <div className="seg" role="group">
          <button aria-pressed={tab === 'links'} onClick={() => setTab('links')}>
            Links
          </button>
          <button data-perm="checkout.editor" aria-pressed={tab === 'checkout'} onClick={() => setTab('checkout')}>
            Aparência do checkout
          </button>
        </div>
      </PageHead>

      {tab === 'checkout' ? (
        <div className="card">
          <CheckoutSettings settings={settings} onSaved={(s) => setSettings(s)} />
        </div>
      ) : (
        <>
          <div className="grid g-kpi">
            {kpis.map((k, i) => (
              <div className="card kpi" key={i}>
                <div className="row">
                  <Ib name={k[0]} tone={k[1]} delay={i * 0.3} />
                </div>
                <div className="v">{k[3]}</div>
                <div className="l">{k[2]}</div>
              </div>
            ))}
          </div>

          <div data-perm="links.criar" className="card">
            <div className="card-h">
              <Ib name="plus" tone="acc" size="sm" />
              <h2>{creating ? 'Novo link de pagamento' : 'Criar link'}</h2>
              {!creating && (
                <button className="sp btn btn-p" onClick={() => setCreating(true)}>
                  <Icon name="plus" />
                  Novo link
                </button>
              )}
            </div>
            {creating ? (
              <LinkForm
                services={services}
                leads={leads}
                settings={settings}
                onCancel={() => setCreating(false)}
                onDone={(l) => {
                  setCreating(false);
                  copyText(l.url || url(l.slug));
                  toast('Link criado e copiado');
                  load();
                }}
              />
            ) : (
              <p className="muted">Gere um link com qualquer valor para mandar ao cliente. A IA também cria links sozinha quando o cliente aceita a proposta, já com o valor negociado.</p>
            )}
          </div>

          <div className="card">
            <div className="card-h" style={{ flexWrap: 'wrap' }}>
              <Ib name="file" tone="mut" size="sm" />
              <h2>Links</h2>
              <div className="seg sp" role="group">
                {['todos', 'ativo', 'pago', 'expirado', 'cancelado'].map((s) => (
                  <button key={s} aria-pressed={filter === s} onClick={() => setFilter(s)}>
                    {s === 'todos' ? 'Todos' : STATUS[s][0]}
                  </button>
                ))}
              </div>
              <input className="input" style={{ width: 200 }} placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar link" />
            </div>
            {shown.length === 0 ? (
              <p className="muted">Nenhum link por aqui.</p>
            ) : (
              <div className="tablewrap">
                <table>
                  <thead>
                    <tr>
                      <th>Serviço</th>
                      <th>Cliente</th>
                      <th>Valor</th>
                      <th>Situação</th>
                      <th>Criado por</th>
                      <th>Visitas</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((l) => {
                      const st = STATUS[l.status] || [l.status, 'muted'];
                      return (
                        <tr key={l.id}>
                          <td className="biz">
                            <b>{l.title}</b>
                            <small>
                              {timeLabel(l.created_at)}
                              {l.expires_at && l.status === 'ativo' ? ` · vence ${timeLabel(l.expires_at)}` : ''}
                            </small>
                          </td>
                          <td>{l.leads?.name || l.customer_name || <span className="muted">—</span>}</td>
                          <td className="num">
                            <b>{brl(l.amount)}</b>
                            {l.billing === 'mensal' ? <span className="muted">/mês</span> : l.max_installments > 1 ? <span className="muted"> · até {l.max_installments}x</span> : null}
                          </td>
                          <td>
                            <span className="chip" style={{ ['--t' as any]: st[1] === 'muted' ? 'var(--muted)' : `var(--${st[1]})` }}>
                              {st[0]}
                              {l.status === 'pago' && l.last_method ? ` · ${l.last_method === 'card' ? 'cartão' : 'Pix'}` : ''}
                            </span>
                          </td>
                          <td>
                            <span className="chip" style={{ ['--t' as any]: l.created_by === 'ia' ? 'var(--ai)' : 'var(--accent)' }}>
                              <Icon name={l.created_by === 'ia' ? 'robot' : 'user'} />
                              {l.created_by === 'ia' ? 'IA' : 'Equipe'}
                            </span>
                          </td>
                          <td className="num muted">{l.views}</td>
                          <td>
                            <div className="row-actions" style={{ flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
                              <button className="iconbtn" title="Copiar link" aria-label="Copiar link" onClick={() => copyText(url(l.slug))}>
                                <Icon name="copy" />
                              </button>
                              <a className="iconbtn" title="Abrir checkout" aria-label="Abrir checkout" href={url(l.slug)} target="_blank" rel="noreferrer">
                                <Icon name="ext" />
                              </a>
                              {l.status !== 'pago' && (
                                <button data-perm="links.criar" className="iconbtn" title="Editar" aria-label="Editar" onClick={() => setEditing(l)}>
                                  <Icon name="sliders" />
                                </button>
                              )}
                              {l.status === 'ativo' && (
                                <button data-perm="links.criar" className="iconbtn" title="Cancelar link" aria-label="Cancelar link" onClick={() => setStatus(l, 'cancelado')}>
                                  <Icon name="x" />
                                </button>
                              )}
                              {(l.status === 'cancelado' || l.status === 'expirado') && (
                                <button data-perm="links.criar" className="iconbtn" title="Reativar" aria-label="Reativar" onClick={() => setStatus(l, 'ativo')}>
                                  <Icon name="refresh" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {editing && (
        <>
          <div className="scrim" onClick={() => setEditing(null)} />
          <aside className="drawer" role="dialog" aria-label="Editar link">
            <div className="head">
              <Ib name="sliders" tone="acc" />
              <div style={{ flex: 1 }}>
                <h2>Editar link</h2>
                <p className="muted">Se já existir um Pix gerado e o valor mudar, ele é cancelado e o cliente gera outro com o novo valor.</p>
              </div>
              <button className="iconbtn" onClick={() => setEditing(null)} aria-label="Fechar">
                <Icon name="x" />
              </button>
            </div>
            <LinkForm
              services={services}
              leads={leads}
              settings={settings}
              initial={{ ...editing, amount: String(editing.amount).replace('.', ','), methods: editing.methods || [] }}
              onCancel={() => setEditing(null)}
              onDone={() => {
                setEditing(null);
                toast('Link atualizado');
                load();
              }}
            />
          </aside>
        </>
      )}
    </>
  );
}

