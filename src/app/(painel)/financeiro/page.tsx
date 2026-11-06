'use client';
/* Financeiro: recebimentos (Asaas/Pix/links + manuais), contas a pagar, alertas de vencimento e relatórios. */
import { PagamentosLog } from '@/components/PagamentosLog';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon } from '@/components/Icon';
import { api, toast, brl } from '@/components/ui';
import { useCan } from '@/components/Shell';
import { norm } from '@/lib/util';
import { FIN_CATEGORIES, daysUntil, todaySP } from '@/lib/finance';

type Row = {
  key: string;
  type: 'payment' | 'entry';
  id: string;
  num: string;
  kind: 'receita' | 'despesa';
  date: string; // data de referência (pago em / vencimento / criado)
  when: string | null; // data e hora do pagamento
  due: string | null;
  who: string;
  desc: string;
  category: string;
  method: string;
  amount: number;
  status: 'pago' | 'pendente' | 'cancelado' | 'expirado' | 'estornado';
  recurrence: string;
  files: number;
  lead_id: string | null;
  raw: any;
};

const ST: Record<string, [string, string]> = {
  pago: ['Pago', 'var(--ok)'],
  pendente: ['Pendente', 'var(--warn)'],
  cancelado: ['Cancelado', 'var(--muted)'],
  expirado: ['Expirado', 'var(--muted)'],
  estornado: ['Estornado', 'var(--bad)'],
};
const METHOD: Record<string, string> = { pix: 'Pix', card: 'Cartão', credit_card: 'Cartão', boleto: 'Boleto', dinheiro: 'Dinheiro', transferencia: 'Transferência' };
const REC: Record<string, string> = { unico: 'Única', mensal: 'Mensal', anual: 'Anual' };
const pad = (n: any, w = 5) => String(n ?? '').padStart(w, '0');
const fmtDate = (d?: string | null) => (d ? new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('pt-BR') : '—');
const fmtDT = (d?: string | null) => (d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '—');
const spDay = (iso?: string | null) => (iso ? new Date(new Date(iso).getTime() - 3 * 3600_000).toISOString().slice(0, 10) : '');
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const monthLabel = (ym: string) => (ym ? `${MONTHS[Number(ym.slice(5, 7)) - 1]}/${ym.slice(2, 4)}` : '');

function toRows(d: any): Row[] {
  const rows: Row[] = [];
  for (const p of d.payments || []) {
    const st = p.status === 'pago' ? 'pago' : ['expirado', 'estornado', 'cancelado'].includes(p.status) ? p.status : 'pendente';
    rows.push({
      key: 'p' + p.id,
      type: 'payment',
      id: p.id,
      num: 'OS ' + pad(p.receipt_number),
      kind: 'receita',
      date: spDay(p.paid_at || p.created_at),
      when: p.paid_at,
      due: null,
      who: p.leads?.name || p.checkout_links?.title || 'Cliente',
      desc: p.service || p.checkout_links?.title || 'Pagamento',
      category: p.checkout_links?.billing === 'mensal' ? 'Mensalidade' : 'Vendas',
      method: METHOD[p.method] || p.method || (p.provider === 'asaas' ? 'Asaas' : p.provider || ''),
      amount: Number(p.amount) || 0,
      status: st,
      recurrence: p.checkout_links?.billing === 'mensal' ? 'mensal' : 'unico',
      files: d.files?.[p.id] || 0,
      lead_id: p.lead_id,
      raw: p,
    });
  }
  for (const e of d.entries || []) {
    // conta a receber de renovação já paga pelo link: o pagamento aparece como OS (não conta duas vezes)
    if (e.payment_id && e.status === 'pago') continue;
    rows.push({
      key: 'e' + e.id,
      type: 'entry',
      id: e.id,
      num: (e.kind === 'despesa' ? 'DP ' : 'RC ') + pad(e.number),
      kind: e.kind,
      date: e.status === 'pago' && e.paid_at ? spDay(e.paid_at) : e.due_date || spDay(e.created_at),
      when: e.paid_at,
      due: e.due_date,
      who: e.kind === 'despesa' ? e.supplier || '' : e.leads?.name || e.supplier || '',
      desc: e.description,
      category: e.category,
      method: METHOD[e.method] || e.method || '',
      amount: Number(e.amount) || 0,
      status: e.status,
      recurrence: e.recurrence,
      files: d.files?.[e.id] || 0,
      lead_id: e.lead_id,
      raw: e,
    });
  }
  return rows;
}

/* ---------- formulário de lançamento ---------- */
function EntryForm({ initial, onClose, onSaved }: { initial: any; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<any>({ kind: 'despesa', category: 'Outros', recurrence: 'unico', status: 'pendente', due_date: todaySP(), ...initial, amount: initial?.amount != null ? String(initial.amount).replace('.', ',') : '' });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((o: any) => ({ ...o, [k]: v }));
  const cats = FIN_CATEGORIES[f.kind as 'despesa' | 'receita'] || [];
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...f, amount: String(f.amount || '0').replace(/\./g, '').replace(',', '.') };
      if (f.id) await api('/api/financeiro', 'PATCH', body);
      else await api('/api/financeiro', 'POST', body);
      toast('Salvo');
      onSaved();
      onClose();
    } catch (er: any) {
      toast(er.message);
      setBusy(false);
    }
  }
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <form className="modal fin-form" role="dialog" aria-label="Lançamento" onSubmit={save}>
        <h2>{f.id ? 'Editar lançamento' : f.kind === 'despesa' ? 'Nova conta a pagar' : 'Novo recebimento'}</h2>
        {!f.id && (
          <div className="seg" role="group">
            <button type="button" aria-pressed={f.kind === 'despesa'} onClick={() => setF((o: any) => ({ ...o, kind: 'despesa', category: 'Outros' }))}>
              Despesa / conta a pagar
            </button>
            <button type="button" aria-pressed={f.kind === 'receita'} onClick={() => setF((o: any) => ({ ...o, kind: 'receita', category: 'Outros' }))}>
              Recebimento manual
            </button>
          </div>
        )}
        <label className="field">
          <span>Descrição</span>
          <input className="input" required autoFocus value={f.description || ''} onChange={(e) => set('description', e.target.value)} placeholder={f.kind === 'despesa' ? 'Ex.: Hospedagem VPS, Meta Ads cliente X' : 'Ex.: Site da Clínica Sorriso (entrada)'} />
        </label>
        <div className="fin-2">
          <label className="field">
            <span>Valor (R$)</span>
            <input className="input" required inputMode="decimal" value={f.amount} onChange={(e) => set('amount', e.target.value.replace(/[^\d,.]/g, ''))} placeholder="0,00" />
          </label>
          <label className="field">
            <span>Vencimento</span>
            <input className="input" type="date" value={f.due_date || ''} onChange={(e) => set('due_date', e.target.value)} />
          </label>
        </div>
        <div className="fin-2">
          <label className="field">
            <span>Categoria</span>
            <input className="input" list="fin-cats" value={f.category || ''} onChange={(e) => set('category', e.target.value)} />
            <datalist id="fin-cats">
              {cats.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <label className="field">
            <span>Repetição</span>
            <select className="input" value={f.recurrence} onChange={(e) => set('recurrence', e.target.value)}>
              <option value="unico">Única (compra avulsa)</option>
              <option value="mensal">Mensal</option>
              <option value="anual">Anual</option>
            </select>
          </label>
        </div>
        <div className="fin-2">
          <label className="field">
            <span>{f.kind === 'despesa' ? 'Fornecedor' : 'Cliente'}</span>
            <input className="input" value={f.supplier || ''} onChange={(e) => set('supplier', e.target.value)} />
          </label>
          <label className="field">
            <span>Forma de pagamento</span>
            <select className="input" value={f.method || ''} onChange={(e) => set('method', e.target.value)}>
              <option value="">—</option>
              <option value="pix">Pix</option>
              <option value="card">Cartão</option>
              <option value="boleto">Boleto</option>
              <option value="transferencia">Transferência</option>
              <option value="dinheiro">Dinheiro</option>
            </select>
          </label>
        </div>
        <label className="field">
          <span>Situação</span>
          <select className="input" value={f.status} onChange={(e) => set('status', e.target.value)}>
            <option value="pendente">{f.kind === 'despesa' ? 'A pagar' : 'A receber'}</option>
            <option value="pago">{f.kind === 'despesa' ? 'Paga' : 'Recebido'}</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </label>
        <label className="field">
          <span>Observações</span>
          <textarea className="input" rows={2} value={f.notes || ''} onChange={(e) => set('notes', e.target.value)} />
        </label>
        {f.recurrence !== 'unico' && <small className="muted">Ao marcar como paga, a próxima ({f.recurrence === 'mensal' ? 'mês que vem' : 'ano que vem'}) é criada sozinha.</small>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-g" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-p" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </>
  );
}

/* ---------- ficha (ordem de serviço / lançamento) ---------- */
function Detail({ row, onClose, onChanged, onEdit, canEdit }: { row: Row; onClose: () => void; onChanged: () => void; onEdit: (r: Row) => void; canEdit: boolean }) {
  const [d, setD] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const load = () =>
    api(`/api/financeiro/item?type=${row.type}&id=${row.id}`, 'GET')
      .then((r) => (setD(r), setNotes(r.item?.notes || '')))
      .catch((e) => toast(e.message));
  useEffect(() => {
    setD(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.key]);
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    for (const f of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', f);
      fd.append(row.type === 'payment' ? 'payment_id' : 'entry_id', row.id);
      try {
        await api('/api/financeiro/arquivos', 'POST', fd);
      } catch (e: any) {
        toast(e.message);
      }
    }
    setBusy(false);
    load();
    onChanged();
  }
  async function addComment() {
    if (!comment.trim()) return;
    await api('/api/financeiro/comentarios', 'POST', { [row.type === 'payment' ? 'payment_id' : 'entry_id']: row.id, text: comment }).catch((e) => toast(e.message));
    setComment('');
    load();
  }
  async function delFile(id: string) {
    if (!window.confirm('Apagar este comprovante?')) return;
    await api('/api/financeiro/arquivos', 'DELETE', { id }).catch((e) => toast(e.message));
    load();
    onChanged();
  }
  async function markPaid(paid: boolean) {
    try {
      const r = await api('/api/financeiro', 'PATCH', { id: row.id, status: paid ? 'pago' : 'pendente' });
      toast(paid ? (r.next ? `Paga! A próxima já foi lançada para ${fmtDate(r.next.due_date)}.` : 'Marcada como paga') : 'Voltou para pendente');
      onChanged();
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function remove() {
    if (!window.confirm('Apagar este lançamento e os comprovantes dele?')) return;
    await api('/api/financeiro', 'DELETE', { id: row.id }).catch((e) => toast(e.message));
    onChanged();
    onClose();
  }
  const it = d?.item || row.raw;
  const st = ST[row.status] || ST.pendente;
  const cl = it?.checkout_links;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer fin-drawer" role="dialog" aria-label={`${row.num}`}>
        <div className="head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <small className="muted">{row.type === 'payment' ? 'Ordem de serviço' : row.kind === 'despesa' ? 'Conta a pagar' : 'Recebimento manual'}</small>
            <h2>
              {row.num} · {row.desc}
            </h2>
            <span className="chip" style={{ ['--t' as any]: st[1] }}>
              {st[0]}
            </span>{' '}
            {row.recurrence !== 'unico' && <span className="chip">{REC[row.recurrence]}</span>}
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>
        <div className="fin-amount">{brl(row.amount)}</div>
        <dl className="fin-dl">
          {row.type === 'payment' ? (
            <>
              <dt>Pago em</dt>
              <dd>{fmtDT(it?.paid_at)}</dd>
              <dt>Criado em</dt>
              <dd>{fmtDT(it?.created_at)}</dd>
              <dt>Serviço</dt>
              <dd>{it?.service || cl?.title || '—'}</dd>
              <dt>Forma</dt>
              <dd>{row.method || '—'}</dd>
              {cl?.customer_name && (
                <>
                  <dt>Pagador</dt>
                  <dd>
                    {cl.customer_name}
                    {cl.customer_document ? ` · ${cl.customer_document}` : ''}
                    {cl.customer_email ? ` · ${cl.customer_email}` : ''}
                  </dd>
                </>
              )}
              {cl?.includes && (
                <>
                  <dt>Inclui</dt>
                  <dd style={{ whiteSpace: 'pre-wrap' }}>{cl.includes}</dd>
                </>
              )}
            </>
          ) : (
            <>
              <dt>Vencimento</dt>
              <dd>{fmtDate(it?.due_date)}</dd>
              <dt>{row.status === 'pago' ? 'Pago em' : 'Situação'}</dt>
              <dd>{row.status === 'pago' ? fmtDT(it?.paid_at) : st[0]}</dd>
              <dt>Categoria</dt>
              <dd>{it?.category}</dd>
              {it?.supplier && (
                <>
                  <dt>{row.kind === 'despesa' ? 'Fornecedor' : 'Cliente'}</dt>
                  <dd>{it.supplier}</dd>
                </>
              )}
              <dt>Forma</dt>
              <dd>{row.method || '—'}</dd>
              {it?.notes && (
                <>
                  <dt>Observações</dt>
                  <dd style={{ whiteSpace: 'pre-wrap' }}>{it.notes}</dd>
                </>
              )}
              <dt>Lançado por</dt>
              <dd>
                {it?.created_by_name || '—'} · {fmtDT(it?.created_at)}
              </dd>
            </>
          )}
        </dl>
        <div className="fin-actions">
          {row.type === 'payment' && it?.asaas_receipt_url && (
            <a className="btn btn-sm" href={it.asaas_receipt_url} target="_blank" rel="noopener noreferrer">
              <Icon name="ext" /> Comprovante Asaas
            </a>
          )}
          {row.type === 'payment' && d?.receipt && (
            <a className="btn btn-sm" href={d.receipt} target="_blank" rel="noopener noreferrer">
              <Icon name="file" /> Recibo PDF
            </a>
          )}
          {row.lead_id && (
            <a className="btn btn-sm" href={`/conversas?lead=${row.lead_id}`}>
              <Icon name="chat" /> Abrir conversa
            </a>
          )}
          {row.type === 'entry' && canEdit && (
            <>
              {row.status !== 'pago' ? (
                <button className="btn btn-sm btn-p" onClick={() => markPaid(true)}>
                  <Icon name="check" /> {row.kind === 'despesa' ? 'Marcar como paga' : 'Marcar como recebido'}
                </button>
              ) : (
                <button className="btn btn-sm btn-g" onClick={() => markPaid(false)}>
                  Voltar para pendente
                </button>
              )}
              <button className="btn btn-sm btn-g" onClick={() => onEdit(row)}>
                Editar
              </button>
              <button className="iconbtn" onClick={remove} aria-label="Apagar lançamento">
                <Icon name="trash" />
              </button>
            </>
          )}
        </div>
        {d?.lead && (
          <section className="sect">
            <h3>Cliente</h3>
            <div className="card fin-lead">
              <b>{d.lead.name}</b>
              <small className="muted">{[d.lead.niche, d.lead.city, d.lead.whatsapp, d.lead.campaign ? `anúncio: ${d.lead.campaign}` : d.lead.source].filter(Boolean).join(' · ')}</small>
              {d.lead.summary && <p className="aisum" style={{ margin: '6px 0 0' }}>{d.lead.summary}</p>}
              {d.lead.next_step && (
                <p className="muted" style={{ fontSize: 12.5, margin: '6px 0 0' }}>
                  Próximo passo: {d.lead.next_step}
                </p>
              )}
            </div>
          </section>
        )}
        {row.type === 'payment' && (
          <section className="sect">
            <h3>Observações</h3>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anotações internas sobre este pagamento" disabled={!canEdit} />
            {canEdit && notes !== (d?.item?.notes || '') && (
              <button className="btn btn-sm" style={{ marginTop: 6 }} onClick={async () => (await api('/api/financeiro/item', 'PATCH', { id: row.id, notes }).catch((e) => toast(e.message)), load(), toast('Salvo'))}>
                Salvar observação
              </button>
            )}
          </section>
        )}
        <section className="sect">
          <h3>Comprovantes ({d?.files?.length || 0})</h3>
          <div className="fin-files">
            {(d?.files || []).map((f: any) => (
              <div key={f.id} className="fin-file">
                <a href={f.url || '#'} target="_blank" rel="noopener noreferrer" title={f.name}>
                  {String(f.mime).startsWith('image/') && f.url ? <img src={f.url} alt={f.name} /> : <span className="fin-pdf">PDF</span>}
                  <small>{f.name}</small>
                </a>
                {canEdit && (
                  <button className="iconbtn" onClick={() => delFile(f.id)} aria-label={`Apagar ${f.name}`}>
                    <Icon name="trash" />
                  </button>
                )}
              </div>
            ))}
            {canEdit && (
              <button className="fin-file fin-add" onClick={() => fileRef.current?.click()} disabled={busy}>
                <Icon name="upload" />
                <small>{busy ? 'Enviando…' : 'Anexar imagem ou PDF'}</small>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => (upload(e.target.files), (e.target.value = ''))} />
        </section>
        <section className="sect">
          <h3>Comentários</h3>
          <div className="fin-comments">
            {(d?.comments || []).map((c: any) => (
              <div key={c.id}>
                <small className="muted">
                  {c.author} · {fmtDT(c.created_at)}
                </small>
                <p>{c.text}</p>
              </div>
            ))}
            {d && !d.comments?.length && <small className="muted">Nenhum comentário.</small>}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input className="input" value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addComment()} placeholder="Escreva um comentário" />
            <button className="btn btn-sm" onClick={addComment}>
              Enviar
            </button>
          </div>
        </section>
      </aside>
    </>
  );
}

/* ---------- gráfico simples de barras ---------- */
function Bars({ data }: { data: { m: string; in: number; out: number }[] }) {
  const max = Math.max(1, ...data.map((x) => Math.max(x.in, x.out)));
  return (
    <div className="fin-bars" role="img" aria-label="Recebido e despesas por mês">
      {data.map((x) => (
        <div key={x.m} className="fin-bar" title={`${monthLabel(x.m)}: recebido ${brl(x.in)} · despesas ${brl(x.out)} · saldo ${brl(x.in - x.out)}`}>
          <div className="fin-bar-c">
            <i className="in" style={{ height: `${(x.in / max) * 100}%` }} />
            <i className="out" style={{ height: `${(x.out / max) * 100}%` }} />
          </div>
          <small>{monthLabel(x.m)}</small>
        </div>
      ))}
    </div>
  );
}

export default function Financeiro() {
  const can = useCan();
  const canEdit = can('financeiro.editar');
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<'resumo' | 'receber' | 'pagar' | 'relatorios'>('resumo');
  const [month, setMonth] = useState(todaySP().slice(0, 7));
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [cat, setCat] = useState('');
  const [sort, setSort] = useState<'data_desc' | 'data_asc' | 'valor_desc' | 'valor_asc'>('data_desc');
  const [form, setForm] = useState<any>(null);
  const [open, setOpen] = useState<Row | null>(null);
  const [year, setYear] = useState(todaySP().slice(0, 4));
  const load = () =>
    api('/api/financeiro', 'GET')
      .then(setData)
      .catch((e) => (toast(e.message), setData({ entries: [], payments: [], files: {} })));
  useEffect(() => {
    load();
  }, []);
  const rows = useMemo(() => (data ? toRows(data) : []), [data]);
  const today = todaySP();

  const filtered = useMemo(() => {
    const kind = tab === 'pagar' ? 'despesa' : 'receita';
    let l = rows.filter((r) => r.kind === kind && !(r.type === 'entry' && r.raw.archived));
    if (month) l = l.filter((r) => (tab === 'pagar' && r.status === 'pendente' ? (r.due || '').slice(0, 7) <= month || (r.due || '').slice(0, 7) === month : r.date.slice(0, 7) === month));
    if (status) l = l.filter((r) => (status === 'vencida' ? r.status === 'pendente' && r.due && r.due < today : r.status === status));
    if (cat) l = l.filter((r) => r.category === cat);
    if (q.trim()) {
      const n = norm(q);
      l = l.filter((r) => norm(`${r.num} ${r.who} ${r.desc} ${r.category} ${r.method} ${r.raw.notes || ''} ${String(r.amount).replace('.', ',')}`).includes(n));
    }
    const s = [...l];
    s.sort((a, b) => (sort === 'valor_desc' ? b.amount - a.amount : sort === 'valor_asc' ? a.amount - b.amount : sort === 'data_asc' ? (a.due || a.date).localeCompare(b.due || b.date) : (b.when || b.due || b.date).localeCompare(a.when || a.due || a.date)));
    return s;
  }, [rows, tab, month, status, cat, q, sort, today]);

  const kpi = useMemo(() => {
    const inMonth = (r: Row) => r.date.slice(0, 7) === month;
    const rec = rows.filter((r) => r.kind === 'receita' && r.status === 'pago' && inMonth(r)).reduce((t, r) => t + r.amount, 0);
    const aRec = rows.filter((r) => r.kind === 'receita' && r.status === 'pendente' && r.type === 'entry').reduce((t, r) => t + r.amount, 0);
    const desp = rows.filter((r) => r.kind === 'despesa' && r.status === 'pago' && inMonth(r)).reduce((t, r) => t + r.amount, 0);
    const aPag = rows.filter((r) => r.kind === 'despesa' && r.status === 'pendente' && (r.due || '').slice(0, 7) <= month).reduce((t, r) => t + r.amount, 0);
    const fixas = rows.filter((r) => r.kind === 'despesa' && r.recurrence === 'mensal' && r.status !== 'cancelado' && (r.due || '').slice(0, 7) === month).reduce((t, r) => t + r.amount, 0);
    const vendas = rows.filter((r) => r.kind === 'receita' && r.status === 'pago' && inMonth(r)).length;
    return { rec, aRec, desp, aPag, saldo: rec - desp, fixas, vendas, ticket: vendas ? rec / vendas : 0 };
  }, [rows, month]);

  const alerts = useMemo(() => rows.filter((r) => r.type === 'entry' && r.status === 'pendente' && !r.raw.archived && r.due && daysUntil(r.due, today) <= 7).sort((a, b) => (a.due || '').localeCompare(b.due || '')), [rows, today]);

  const series = useMemo(() => {
    const out: { m: string; in: number; out: number }[] = [];
    const [y, m] = month.split('-').map(Number);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(y, m - 1 - i, 1));
      const k = d.toISOString().slice(0, 7);
      out.push({
        m: k,
        in: rows.filter((r) => r.kind === 'receita' && r.status === 'pago' && r.date.slice(0, 7) === k).reduce((t, r) => t + r.amount, 0),
        out: rows.filter((r) => r.kind === 'despesa' && r.status === 'pago' && r.date.slice(0, 7) === k).reduce((t, r) => t + r.amount, 0),
      });
    }
    return out;
  }, [rows, month]);

  const report = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
    const byMonth = months.map((k) => {
      const rin = rows.filter((r) => r.kind === 'receita' && r.status === 'pago' && r.date.slice(0, 7) === k);
      const rout = rows.filter((r) => r.kind === 'despesa' && r.status === 'pago' && r.date.slice(0, 7) === k);
      const i = rin.reduce((t, r) => t + r.amount, 0);
      const o = rout.reduce((t, r) => t + r.amount, 0);
      return { k, i, o, n: rin.length };
    });
    const cats = (kind: 'receita' | 'despesa') => {
      const m: Record<string, number> = {};
      for (const r of rows.filter((r) => r.kind === kind && r.status === 'pago' && r.date.startsWith(year))) m[r.category || 'Outros'] = (m[r.category || 'Outros'] || 0) + r.amount;
      return Object.entries(m).sort((a, b) => b[1] - a[1]);
    };
    return { byMonth, catIn: cats('receita'), catOut: cats('despesa') };
  }, [rows, year]);

  function exportCsv() {
    const lines = [['Número', 'Tipo', 'Data', 'Vencimento', 'Cliente/Fornecedor', 'Descrição', 'Categoria', 'Forma', 'Valor', 'Situação', 'Repetição'].join(';')];
    for (const r of rows.filter((r) => r.date.startsWith(year)))
      lines.push([r.num, r.kind, fmtDate(r.when || r.date), fmtDate(r.due), r.who, r.desc, r.category, r.method, r.amount.toFixed(2).replace('.', ','), ST[r.status]?.[0] || r.status, REC[r.recurrence] || ''].map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(';'));
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `financeiro-${year}.csv`;
    a.click();
  }

  const catsOf = useMemo(() => Array.from(new Set(rows.filter((r) => r.kind === (tab === 'pagar' ? 'despesa' : 'receita')).map((r) => r.category))).sort(), [rows, tab]);
  const years = useMemo(() => Array.from(new Set([today.slice(0, 4), ...rows.map((r) => r.date.slice(0, 4))])).filter(Boolean).sort().reverse(), [rows, today]);

  const list = (items: Row[]) => (
    <div className="tablewrap">
      <table className="fin-table">
        <thead>
          <tr>
            <th>Nº</th>
            <th>{tab === 'pagar' ? 'Vencimento' : 'Data'}</th>
            <th>{tab === 'pagar' ? 'Conta' : 'Cliente / serviço'}</th>
            <th>Categoria</th>
            <th>Forma</th>
            <th style={{ textAlign: 'right' }}>Valor</th>
            <th>Situação</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={8} className="muted">
                Nada por aqui com esses filtros.
              </td>
            </tr>
          )}
          {items.map((r) => {
            const late = r.status === 'pendente' && r.due && r.due < today;
            const soon = r.status === 'pendente' && r.due && !late && daysUntil(r.due, today) <= 3;
            const st = late ? ['Vencida', 'var(--bad)'] : ST[r.status] || ST.pendente;
            return (
              <tr key={r.key} className="fin-row" onClick={() => setOpen(r)}>
                <td className="muted" style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  {r.num}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {tab === 'pagar' ? fmtDate(r.due) : r.when ? fmtDT(r.when) : fmtDate(r.date)}
                  {soon && <small className="fin-soon">{daysUntil(r.due!, today) === 0 ? 'vence hoje' : `em ${daysUntil(r.due!, today)} dia(s)`}</small>}
                </td>
                <td>
                  <b>{tab === 'pagar' ? r.desc : r.who}</b>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {tab === 'pagar' ? r.who : r.desc}
                    {r.recurrence !== 'unico' ? ` · ${REC[r.recurrence]}` : ''}
                    {r.files ? ` · 📎 ${r.files}` : ''}
                  </div>
                </td>
                <td className="muted">{r.category}</td>
                <td className="muted">{r.method || '—'}</td>
                <td style={{ textAlign: 'right', fontWeight: 650, whiteSpace: 'nowrap' }}>{brl(r.amount)}</td>
                <td>
                  <span className="chip" style={{ ['--t' as any]: st[1] }}>
                    {st[0]}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                  {canEdit && r.type === 'entry' && r.status === 'pendente' && (
                    <button
                      className="btn btn-sm btn-g"
                      onClick={async () => {
                        try {
                          const x = await api('/api/financeiro', 'PATCH', { id: r.id, status: 'pago' });
                          toast(x.next ? `Paga! A próxima já foi lançada para ${fmtDate(x.next.due_date)}.` : 'Marcada como paga');
                          load();
                        } catch (e: any) {
                          toast(e.message);
                        }
                      }}
                    >
                      <Icon name="check" /> {r.kind === 'despesa' ? 'Paga' : 'Recebido'}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <PageHead title="Financeiro" sub="Recebimentos, contas a pagar, vencimentos e relatórios num lugar só" icon="money" help="financeiro">
        <a className="btn btn-sm" href="/api/clientes/compradores">⬇ Compradores (Excel)</a>
        {canEdit && (
          <>
            <button className="btn btn-sm" onClick={() => setForm({ kind: 'receita', status: 'pago', due_date: today })}>
              <Icon name="plus" /> Recebimento
            </button>
            <button className="btn btn-p btn-sm" onClick={() => setForm({ kind: 'despesa' })}>
              <Icon name="plus" /> Conta a pagar
            </button>
          </>
        )}
      </PageHead>

      <div className="fin-top">
        <div className="seg" role="tablist">
          {(
            [
              ['resumo', 'Resumo'],
              ['receber', 'Recebimentos'],
              ['pagar', `Contas a pagar${alerts.length ? ` (${alerts.length})` : ''}`],
              ['relatorios', 'Relatórios'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} role="tab" aria-pressed={tab === k} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </div>
        {tab !== 'relatorios' ? (
          <label className="fin-month">
            Mês
            <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value || today.slice(0, 7))} />
          </label>
        ) : (
          <label className="fin-month">
            Ano
            <select className="input" value={year} onChange={(e) => setYear(e.target.value)}>
              {years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {data === null ? (
        <p className="muted">Carregando…</p>
      ) : tab === 'resumo' ? (
        <>
          <div className="grid g-kpi fin-kpis">
            <div className="card kpi">
              <div className="v" style={{ color: 'var(--ok)' }}>{brl(kpi.rec)}</div>
              <div className="l">Recebido em {monthLabel(month)}</div>
            </div>
            <div className="card kpi">
              <div className="v" style={{ color: 'var(--bad)' }}>{brl(kpi.desp)}</div>
              <div className="l">Despesas pagas</div>
            </div>
            <div className="card kpi">
              <div className="v" style={{ color: kpi.saldo >= 0 ? 'var(--ok)' : 'var(--bad)' }}>{brl(kpi.saldo)}</div>
              <div className="l">Saldo do mês</div>
            </div>
            <div className="card kpi">
              <div className="v">{brl(kpi.aPag)}</div>
              <div className="l">A pagar até o fim do mês</div>
            </div>
            <div className="card kpi">
              <div className="v">{kpi.vendas}</div>
              <div className="l">Vendas · ticket médio {brl(kpi.ticket)}</div>
            </div>
            <div className="card kpi">
              <div className="v">{brl(kpi.fixas)}</div>
              <div className="l">Custos fixos mensais</div>
            </div>
          </div>
          {alerts.length > 0 && (
            <div className="card fin-alerts">
              <div className="card-h">
                <Icon name="bell" />
                <h2>Vencimentos</h2>
              </div>
              {alerts.map((r) => {
                const n = daysUntil(r.due!, today);
                return (
                  <button key={r.key} className={`fin-alert ${n < 0 ? 'late' : n === 0 ? 'today' : ''}`} onClick={() => setOpen(r)}>
                    <b>{r.desc}</b>
                    <span>{brl(r.amount)}</span>
                    <small>{n < 0 ? `venceu há ${-n} dia(s)` : n === 0 ? 'vence hoje' : `vence em ${n} dia(s) · ${fmtDate(r.due)}`}</small>
                  </button>
                );
              })}
            </div>
          )}
          <div className="card">
            <div className="card-h">
              <Icon name="trend" />
              <h2>Últimos 12 meses</h2>
              <span className="fin-legend">
                <i className="in" /> recebido <i className="out" /> despesas
              </span>
            </div>
            <Bars data={series} />
          </div>
          <div className="card">
            <div className="card-h">
              <Icon name="money" />
              <h2>Últimos recebimentos</h2>
            </div>
            <div className="fin-recent">
              {rows
                .filter((r) => r.kind === 'receita' && r.status === 'pago')
                .sort((a, b) => (b.when || b.date).localeCompare(a.when || a.date))
                .slice(0, 8)
                .map((r) => (
                  <button key={r.key} onClick={() => setOpen(r)}>
                    <span>
                      <b>{r.who}</b>
                      <small className="muted">
                        {r.num} · {r.desc} · {r.when ? fmtDT(r.when) : fmtDate(r.date)}
                      </small>
                    </span>
                    <b style={{ color: 'var(--ok)' }}>{brl(r.amount)}</b>
                  </button>
                ))}
            </div>
          </div>
        </>
      ) : tab === 'relatorios' ? (
        <>
          <div className="card">
            <div className="card-h">
              <Icon name="trend" />
              <h2>Mês a mês · {year}</h2>
              <button className="btn btn-sm btn-g" style={{ marginLeft: 'auto' }} onClick={exportCsv}>
                <Icon name="file" /> Exportar planilha (CSV)
              </button>
            </div>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th style={{ textAlign: 'right' }}>Vendas</th>
                    <th style={{ textAlign: 'right' }}>Recebido</th>
                    <th style={{ textAlign: 'right' }}>Despesas</th>
                    <th style={{ textAlign: 'right' }}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byMonth.map((m) => (
                    <tr key={m.k}>
                      <td>{monthLabel(m.k)}</td>
                      <td style={{ textAlign: 'right' }}>{m.n}</td>
                      <td style={{ textAlign: 'right', color: 'var(--ok)' }}>{brl(m.i)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--bad)' }}>{brl(m.o)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 650 }}>{brl(m.i - m.o)}</td>
                    </tr>
                  ))}
                  <tr className="fin-total">
                    <td>Total {year}</td>
                    <td style={{ textAlign: 'right' }}>{report.byMonth.reduce((t, m) => t + m.n, 0)}</td>
                    <td style={{ textAlign: 'right' }}>{brl(report.byMonth.reduce((t, m) => t + m.i, 0))}</td>
                    <td style={{ textAlign: 'right' }}>{brl(report.byMonth.reduce((t, m) => t + m.o, 0))}</td>
                    <td style={{ textAlign: 'right' }}>{brl(report.byMonth.reduce((t, m) => t + m.i - m.o, 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="grid fin-2col">
            {(
              [
                ['Receitas por categoria', report.catIn, 'var(--ok)'],
                ['Despesas por categoria', report.catOut, 'var(--bad)'],
              ] as const
            ).map(([t, list, color]) => {
              const tot = list.reduce((s, x) => s + x[1], 0) || 1;
              return (
                <div key={t} className="card">
                  <div className="card-h">
                    <h2>{t}</h2>
                  </div>
                  {list.length === 0 && <p className="muted">Nada pago em {year}.</p>}
                  {list.map(([c, v]) => (
                    <div key={c} className="fin-cat">
                      <span>{c}</span>
                      <b>{brl(v)}</b>
                      <i style={{ width: `${(v / tot) * 100}%`, background: color }} />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      ) : (tab as string) === 'receber' ? (
        <PagamentosLog />
      ) : (
        <>
          <div className="fin-filters">
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por número, cliente, fornecedor, descrição ou valor" />
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Situação">
              <option value="">Todas as situações</option>
              <option value="pago">{(tab as string) === 'pagar' ? 'Pagas' : 'Recebidos'}</option>
              <option value="pendente">Pendentes</option>
              {(tab as string) === 'pagar' && <option value="vencida">Vencidas</option>}
              <option value="cancelado">Canceladas</option>
              {(tab as string) === 'receber' && <option value="expirado">Expiradas</option>}
            </select>
            <select className="input" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoria">
              <option value="">Todas as categorias</option>
              {catsOf.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select className="input" value={sort} onChange={(e) => setSort(e.target.value as any)} aria-label="Ordenar">
              <option value="data_desc">Mais recentes</option>
              <option value="data_asc">Mais antigas / próximos vencimentos</option>
              <option value="valor_desc">Maior valor</option>
              <option value="valor_asc">Menor valor</option>
            </select>
            <button className="btn btn-sm btn-g" onClick={() => setMonth('')} title="Mostrar todos os meses">
              Todos os meses
            </button>
          </div>
          <div className="fin-sum muted">
            {filtered.length} lançamento(s) · total {brl(filtered.reduce((t, r) => t + r.amount, 0))}
            {(tab as string) === 'receber' && ` · recebido ${brl(filtered.filter((r) => r.status === 'pago').reduce((t, r) => t + r.amount, 0))}`}
            {(tab as string) === 'pagar' && ` · em aberto ${brl(filtered.filter((r) => r.status === 'pendente').reduce((t, r) => t + r.amount, 0))}`}
          </div>
          <div className="card" style={{ padding: 0 }}>
            {list(filtered)}
          </div>
        </>
      )}

      {form && <EntryForm initial={form} onClose={() => setForm(null)} onSaved={load} />}
      {open && <Detail row={open} canEdit={canEdit} onClose={() => setOpen(null)} onChanged={load} onEdit={(r) => (setOpen(null), setForm({ ...r.raw }))} />}
    </>
  );
}
