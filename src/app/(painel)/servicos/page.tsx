'use client';
import { useEffect, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { Switch, toast, brl } from '@/components/ui';
import { sb } from '@/lib/supabase/browser';

const ICONS = ['globe', 'users', 'spark', 'trend', 'phone', 'robot', 'bulb'];
const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(/[^\d,.-]/g, '').replace(',', '.')));

const slugify = (t: string) =>
  String(t || 'servico')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'servico';

/** Cria um serviço novo (vazio ou cópia de outro) com nome e slug únicos. */
async function createService(list: any[], base?: any) {
  const names = new Set(list.map((x) => String(x.name).toLowerCase()));
  const slugs = new Set(list.map((x) => x.slug));
  let name = base ? `${base.name} (cópia)` : 'Novo serviço';
  for (let n = 2; names.has(name.toLowerCase()); n++) name = base ? `${base.name} (cópia ${n})` : `Novo serviço ${n}`;
  let slug = slugify(name);
  for (let n = 2; slugs.has(slug); n++) slug = `${slugify(name)}-${n}`;
  const sort = Math.max(0, ...list.map((x) => Number(x.sort) || 0)) + 1;
  const row: any = base
    ? { ...base, id: undefined, slug, name, active: false, sort, updated_at: new Date().toISOString() }
    : { slug, name, description: '', price_steps: [], bonuses: [], delivery: '', billing: 'Pagamento único', includes: '', active: false, sort };
  delete row.id;
  delete row.created_at;
  const { data, error } = await sb().from('services').insert(row).select('id').single();
  if (error) throw new Error(error.message);
  return data?.id as string;
}

function ServiceCard({ s, i, onSaved, onDuplicate, onDelete, fresh }: { s: any; i: number; onSaved: () => void; onDuplicate: () => void; onDelete: () => void; fresh?: boolean }) {
  const [f, setF] = useState({
    name: s.name,
    description: s.description || '',
    min_price: s.min_price ?? '',
    max_price: s.max_price ?? '',
    steps: (s.price_steps || []).join(', '),
    approval_from: s.approval_from ?? '',
    bonuses: (s.bonuses || []).join('\n'),
    delivery: s.delivery || '',
    billing: s.billing || 'Pagamento único',
    includes: s.includes || '',
    active: s.active,
    monthly_price: s.monthly_price ?? '',
    monthly_min: s.monthly_min ?? '',
    annual_price: s.annual_price ?? '',
    annual_min: s.annual_min ?? '',
    plan_once: s.plan_once ?? true,
    plan_annual: !!s.plan_annual,
    plan_monthly: s.plan_monthly ?? s.monthly_price != null,
    cost_once: s.cost_once ?? '',
    cost_monthly: s.cost_monthly ?? '',
    niches: s.niches || '',
    ai_notes: s.ai_notes || '',
    addon: !!s.addon,
  });
  const [busy, setBusy] = useState(false);
  // a IA só oferece planos ligados e com preço
  const planOk = (g: any) =>
    (g.plan_once && String(g.max_price) !== '' && String(g.min_price) !== '') || (g.plan_annual && String(g.annual_price) !== '') || (g.plan_monthly && String(g.monthly_price) !== '');
  const priced = planOk(f);
  const billingOf = (g: any) => {
    const p = [g.plan_once && String(g.max_price) !== '' ? 'Vitalício (pagamento único)' : '', g.plan_annual && String(g.annual_price) !== '' ? 'Anual' : '', g.plan_monthly && String(g.monthly_price) !== '' ? 'Mensal' : ''].filter(Boolean);
    return p.length ? p.join(' ou ') : g.billing;
  };

  async function save(patch: any = {}) {
    const g = { ...f, ...patch };
    const min = num(String(g.min_price));
    const max = num(String(g.max_price));
    if (min !== null && max !== null && min > max) {
      toast('O preço mínimo não pode ser maior que o máximo.');
      return;
    }
    let steps = String(g.steps)
      .split(/[,;\s]+/)
      .map((x) => num(x))
      .filter((x) => x !== null && !isNaN(x as number)) as number[];
    if (!steps.length && min !== null && max !== null) steps = [max, min];
    steps = Array.from(new Set(steps)).sort((a, b) => b - a);
    setBusy(true);
    const { error } = await sb()
      .from('services')
      .update({
        name: g.name,
        description: g.description,
        min_price: min,
        max_price: max,
        price_steps: steps,
        approval_from: num(String(g.approval_from)),
        bonuses: String(g.bonuses).split('\n').map((x) => x.trim()).filter(Boolean),
        delivery: g.delivery,
        billing: billingOf(g),
        includes: g.includes,
        monthly_price: num(String(g.monthly_price)),
        monthly_min: num(String(g.monthly_min)),
        annual_price: num(String(g.annual_price)),
        annual_min: num(String(g.annual_min)),
        plan_once: !!g.plan_once,
        plan_annual: !!g.plan_annual,
        plan_monthly: !!g.plan_monthly,
        cost_once: num(String(g.cost_once)),
        cost_monthly: num(String(g.cost_monthly)),
        niches: g.niches || null,
        ai_notes: g.ai_notes || null,
        addon: !!g.addon,
        active: !!g.active && planOk(g),
        updated_at: new Date().toISOString(),
      })
      .eq('id', s.id);
    setBusy(false);
    if (error) toast(error.message);
    else {
      toast('Salvo');
      onSaved();
    }
  }

  return (
    <div className="card">
      <div className="card-h" style={{ flexWrap: 'wrap' }}>
        <Ib name={ICONS[i % ICONS.length]} tone={f.active ? 'acc' : 'mut'} size="sm" delay={i * 0.2} />
        <input
          className="svc-name"
          value={f.name}
          autoFocus={fresh}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          onBlur={() => f.name.trim() && f.name !== s.name && save()}
          aria-label="Nome do serviço"
          title="Clique para renomear"
        />
        <span className="sp" style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5 }}>
          {f.active ? 'A IA oferece' : 'Desligado'}
          <Switch
            label={`Ativar ${f.name}`}
            checked={f.active}
            disabled={!priced}
            onChange={(v) => {
              setF({ ...f, active: v });
              save({ active: v });
            }}
          />
        </span>
      </div>
      <div className="formgrid" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <div className="field">
          <label>Prazo de entrega</label>
          <input className="input" value={f.delivery} onChange={(e) => setF({ ...f, delivery: e.target.value })} />
        </div>
        <div className="field">
          <label>Como a IA apresenta</label>
          <div className="svc-billing">{billingOf(f) || '—'}</div>
        </div>
      </div>
      <div className="formgrid" style={{ marginTop: 12 }}>
        <div className="field">
          <label>Descrição (o que a IA fala do serviço)</label>
          <textarea className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </div>
        <div className="field">
          <label>O que está incluso</label>
          <textarea className="input" value={f.includes} onChange={(e) => setF({ ...f, includes: e.target.value })} />
        </div>
        <div className="field">
          <label>Bônus (um por linha, oferecidos antes do desconto)</label>
          <textarea className="input" value={f.bonuses} onChange={(e) => setF({ ...f, bonuses: e.target.value })} />
        </div>
      </div>
      <div className="svc-plan-grid">
        {(
          [
            ['plan_once', 'Vitalício', 'Pagamento único, sem mensalidade', 'max_price', 'min_price'],
            ['plan_annual', 'Anual', 'Pago uma vez por ano', 'annual_price', 'annual_min'],
            ['plan_monthly', 'Mensal', 'Cobrado todo mês', 'monthly_price', 'monthly_min'],
          ] as [string, string, string, string, string][]
        ).map(([on, title, sub, pk, mk]) => {
          const isOn = !!(f as any)[on];
          const price = num(String((f as any)[pk]));
          const min = num(String((f as any)[mk]));
          const cost = on === 'plan_monthly' ? num(String(f.cost_monthly)) || 0 : on === 'plan_annual' ? (num(String(f.cost_monthly)) || 0) * 12 : num(String(f.cost_once)) || 0;
          return (
            <div key={on} className={`svc-plan ${isOn ? 'on' : ''}`}>
              <div className="svc-plan-h">
                <span>
                  <b>{title}</b>
                  <small className="muted">{sub}</small>
                </span>
                <Switch label={`IA oferece o plano ${title}`} checked={isOn} onChange={(v) => setF({ ...f, [on]: v })} />
              </div>
              <div className="svc-plan-f">
                <label className="field">
                  <span>{on === 'plan_once' ? 'Preço inicial' : 'Preço'}</span>
                  <input className="input num" value={(f as any)[pk]} onChange={(e) => setF({ ...f, [pk]: e.target.value })} placeholder="A definir" />
                </label>
                <label className="field">
                  <span>Mínimo (piso)</span>
                  <input className="input num" value={(f as any)[mk]} onChange={(e) => setF({ ...f, [mk]: e.target.value })} placeholder={on === 'plan_once' ? 'A definir' : 'Igual ao preço'} />
                </label>
              </div>
              {on === 'plan_once' && (
                <>
                  <label className="field">
                    <span>Degraus de negociação (do maior para o menor)</span>
                    <input className="input num" value={f.steps} onChange={(e) => setF({ ...f, steps: e.target.value })} placeholder="799, 649, 549, 449, 299" />
                  </label>
                  <label className="field">
                    <span>Precisa da sua aprovação a partir de</span>
                    <input className="input num" value={f.approval_from} onChange={(e) => setF({ ...f, approval_from: e.target.value })} placeholder="Ex.: 449" />
                  </label>
                </>
              )}
              {price !== null && (
                <small className="svc-plan-m">
                  Lucro: <b>{brl((min ?? price) - cost)}</b>
                  {min !== null && min !== price ? <> a <b>{brl(price - cost)}</b></> : null}
                  {on === 'plan_monthly' ? '/mês' : on === 'plan_annual' ? '/ano' : ''}
                </small>
              )}
              {!isOn && <small className="muted">Desligado: a IA não fala deste plano.</small>}
            </div>
          );
        })}
      </div>
      <div className="svc-plans" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <div className="field">
          <label>Nosso custo · único</label>
          <input className="input num" value={f.cost_once} onChange={(e) => setF({ ...f, cost_once: e.target.value })} placeholder="Ex.: 40" />
          <small className="muted">Só a equipe vê (a IA não recebe).</small>
        </div>
        <div className="field">
          <label>Nosso custo · por mês</label>
          <input className="input num" value={f.cost_monthly} onChange={(e) => setF({ ...f, cost_monthly: e.target.value })} placeholder="Ex.: 3" />
        </div>
      </div>
      <div className="formgrid" style={{ marginTop: 12, gridTemplateColumns: '1fr 2fr auto' }}>
        <div className="field">
          <label>Indicado para (nichos)</label>
          <input className="input" value={f.niches} onChange={(e) => setF({ ...f, niches: e.target.value })} placeholder="todos, ou: restaurantes, padarias, bares…" />
        </div>
        <div className="field">
          <label>Como a IA deve oferecer</label>
          <input className="input" value={f.ai_notes} onChange={(e) => setF({ ...f, ai_notes: e.target.value })} placeholder="Ex.: ofereça depois que o cliente gostar da prévia do site" />
        </div>
        <label className="svc-addon" title="Complemento: a IA só oferece depois do serviço principal, um por vez">
          <input type="checkbox" checked={f.addon} onChange={(e) => setF({ ...f, addon: e.target.checked })} /> Complemento
        </label>
      </div>
      {f.plan_once && String(f.max_price) !== '' && (
        <div className="chips" style={{ marginTop: 12, alignItems: 'center' }}>
          {String(f.steps)
            .split(/[,;\s]+/)
            .map((x) => num(x))
            .filter((x) => x)
            .map((v, k) => {
              const needs = f.approval_from !== '' && (v as number) <= Number(num(String(f.approval_from)));
              return (
                <span key={k} className="chip" style={{ ['--t' as any]: needs ? 'var(--warn)' : 'var(--accent)', padding: '5px 10px' }}>
                  {brl(v)}
                  {k === 0 ? ' · início' : needs ? ' · com aprovação' : ''}
                </span>
              );
            })}
        </div>
      )}
      {!priced && <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>Ligue pelo menos um plano (Vitalício, Anual ou Mensal) e preencha o preço para a IA poder oferecer este serviço.</p>}
      <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button data-perm="servicos.editar" className="btn btn-p" disabled={busy} onClick={() => save()}>
          <Icon name="check" />
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
        <button data-perm="servicos.editar" className="btn btn-g" onClick={onDuplicate} title="Cria uma cópia deste serviço (desligada) para você ajustar">
          <Icon name="copy" />
          Duplicar
        </button>
        <button data-perm="servicos.editar" className="btn btn-g" style={{ marginLeft: 'auto', color: 'var(--bad)' }} onClick={onDelete}>
          <Icon name="trash" />
          Excluir
        </button>
      </div>
    </div>
  );
}

/* ---------- atalhos na tabela de resumo: clicar no valor edita ali mesmo ---------- */
const nOr = (v: any) => (v === '' || v == null || isNaN(Number(String(v).replace(',', '.'))) ? null : Number(String(v).replace(',', '.')));
function okPlans(x: any) {
  return (x.plan_once !== false && x.max_price != null && x.min_price != null) || (!!x.plan_annual && x.annual_price != null) || (!!(x.plan_monthly ?? x.monthly_price != null) && x.monthly_price != null);
}
function billingText(x: any) {
  const p = [x.plan_once !== false && x.max_price != null ? 'Vitalício (pagamento único)' : '', x.plan_annual && x.annual_price != null ? 'Anual' : '', (x.plan_monthly ?? x.monthly_price != null) && x.monthly_price != null ? 'Mensal' : ''].filter(Boolean);
  return p.length ? p.join(' ou ') : x.billing;
}
async function quickSave(x: any, patch: any, done: () => void) {
  const g = { ...x, ...patch };
  if (g.min_price != null && g.max_price != null && Number(g.min_price) > Number(g.max_price)) return toast('O mínimo não pode ser maior que o preço inicial.');
  const row: any = { ...patch, billing: billingText(g), updated_at: new Date().toISOString() };
  if ('max_price' in patch || 'min_price' in patch) {
    // degraus: mantém os que cabem na nova faixa e garante início e piso
    const steps = (Array.isArray(x.price_steps) ? x.price_steps : []).map(Number).filter((v: number) => (g.max_price == null || v <= g.max_price) && (g.min_price == null || v >= g.min_price));
    row.price_steps = Array.from(new Set([g.max_price, ...steps, g.min_price].filter((v) => v != null))).sort((a: any, b: any) => b - a);
  }
  // sem nenhum plano com preço, a IA não pode oferecer
  if (!okPlans(g)) row.active = false;
  const { error } = await sb().from('services').update(row).eq('id', x.id);
  if (error) return toast(error.message);
  toast(row.active === false && x.active && !('active' in patch) ? 'Salvo. A IA parou de oferecer (nenhum plano com preço ligado).' : 'Salvo');
  done();
}

function QuickPrice({ x, fields, onSaved, children, plan }: { x: any; fields: [string, string][]; onSaved: () => void; children: React.ReactNode; plan?: string }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<Record<string, string>>({});
  const [on, setOn] = useState(true);
  const start = () => {
    setV(Object.fromEntries(fields.map(([k]) => [k, x[k] == null ? '' : String(x[k])])));
    setOn(plan ? (plan === 'plan_once' ? x.plan_once !== false : plan === 'plan_monthly' ? !!(x.plan_monthly ?? x.monthly_price != null) : !!x[plan]) : true);
    setOpen(true);
  };
  const save = () => {
    const patch: any = Object.fromEntries(fields.map(([k]) => [k, nOr(v[k])]));
    if (plan) patch[plan] = on;
    // preencheu só o preço: o mínimo fica igual (sem desconto)
    if ('min_price' in patch && patch.min_price == null && patch.max_price != null) patch.min_price = patch.max_price;
    quickSave(x, patch, () => {
      setOpen(false);
      onSaved();
    });
  };
  if (!open)
    return (
      <button type="button" className="qcell" onClick={start} title="Clique para editar aqui mesmo">
        {children}
        <Icon name="sliders" />
      </button>
    );
  return (
    <div className="qedit" onKeyDown={(e) => (e.key === 'Escape' ? setOpen(false) : e.key === 'Enter' ? save() : null)}>
      {plan && (
        <label className="qon">
          <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} /> plano ligado
        </label>
      )}
      {fields.map(([k, label], i) => (
        <label key={k}>
          <small>{label}</small>
          <input className="input" inputMode="decimal" autoFocus={i === 0} value={v[k] ?? ''} onChange={(e) => setV({ ...v, [k]: e.target.value })} placeholder="R$" />
        </label>
      ))}
      <span className="qbtns">
        <button type="button" className="btn btn-p btn-sm" onClick={save}>
          <Icon name="check" />
        </button>
        <button type="button" className="btn btn-sm" onClick={() => setOpen(false)} aria-label="Cancelar">
          <Icon name="x" />
        </button>
      </span>
    </div>
  );
}

export default function Servicos() {
  const [list, setList] = useState<any[]>([]);
  const [fresh, setFresh] = useState<string | null>(null);
  async function add(base?: any) {
    try {
      const id = await createService(list, base);
      await load();
      setFresh(id);
      toast(base ? 'Serviço duplicado. Ajuste e clique em Salvar.' : 'Serviço criado. Dê um nome, preencha os preços e clique em Salvar.');
      setTimeout(() => document.getElementById('svc-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function remove(s: any) {
    if (!window.confirm(`Excluir o serviço "${s.name}"? A IA deixa de oferecer. Links de pagamento já criados continuam funcionando.`)) return;
    const { error } = await sb().from('services').delete().eq('id', s.id);
    if (error) toast(error.message);
    else {
      toast('Serviço excluído');
      load();
    }
  }
  const load = async () => {
    const { data } = await sb().from('services').select('*').order('sort');
    setList(data || []);
  };
  useEffect(() => {
    load();
  }, []);
  return (
    <>
      <PageHead title="Serviços e preços" sub="A IA só negocia dentro da faixa de preço que você definir aqui" icon="tag" help="precos">
        <button data-perm="servicos.editar" className="btn btn-p btn-sm" onClick={() => add()}>
          <Icon name="plus" />
          Novo serviço
        </button>
      </PageHead>
      {list.length > 0 && (
        <div className="card svc-sum">
          <div className="card-h">
            <Ib name="money" tone="acc" size="sm" />
            <h2>Resumo de preços e margens</h2>
            <span className="sp muted" style={{ fontSize: 12 }}>Clique em qualquer valor para editar aqui mesmo · a IA só oferece os serviços ligados</span>
          </div>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>IA oferece</th>
                  <th className="num">Vitalício (início → piso)</th>
                  <th className="num">Anual</th>
                  <th className="num">Mensal</th>
                  <th className="num">Nosso custo</th>
                  <th className="num">Lucro no piso</th>
                </tr>
              </thead>
              <tbody>
                {list.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <a href={'#svc-' + x.id} style={{ color: 'inherit' }}>
                        {x.name}
                      </a>
                      {x.addon && (
                        <span className="chip" style={{ ['--t' as any]: 'var(--ai)', marginLeft: 6, height: 18, fontSize: 10.5 }}>
                          complemento
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`qtoggle ${x.active ? 'on' : ''}`}
                        title={x.active ? 'Clique para a IA parar de oferecer' : 'Clique para a IA oferecer'}
                        onClick={() => {
                          if (!x.active && !okPlans(x)) return toast('Defina o preço de pelo menos um plano (clique no valor da coluna) antes de ligar.');
                          quickSave(x, { active: !x.active }, () => (toast(!x.active ? 'A IA passa a oferecer ' + x.name : 'A IA parou de oferecer ' + x.name), load()));
                        }}
                      >
                        {x.active ? 'Sim' : 'Não'}
                      </button>
                    </td>
                    <td className="num">
                      <QuickPrice x={x} plan="plan_once" fields={[['max_price', 'Início'], ['min_price', 'Piso']]} onSaved={load}>
                        {x.plan_once === false ? <span className="muted">desligado</span> : x.max_price ? `${brl(x.max_price)} → ${brl(x.min_price ?? x.max_price)}` : <span className="muted">a definir</span>}
                      </QuickPrice>
                    </td>
                    <td className="num">
                      <QuickPrice x={x} plan="plan_annual" fields={[['annual_price', 'Por ano'], ['annual_min', 'Mínimo']]} onSaved={load}>
                        {x.plan_annual && x.annual_price ? `${brl(x.annual_price)}/ano` : <span className="muted">{x.annual_price ? 'desligado' : '—'}</span>}
                      </QuickPrice>
                    </td>
                    <td className="num">
                      <QuickPrice x={x} plan="plan_monthly" fields={[['monthly_price', 'Por mês'], ['monthly_min', 'Mínimo']]} onSaved={load}>
                        {(x.plan_monthly ?? x.monthly_price != null) && x.monthly_price ? `${brl(x.monthly_price)}/mês` : <span className="muted">{x.monthly_price ? 'desligado' : '—'}</span>}
                      </QuickPrice>
                    </td>
                    <td className="num">
                      <QuickPrice x={x} fields={[['cost_once', 'Único'], ['cost_monthly', 'Por mês']]} onSaved={load}>
                        {x.cost_once || x.cost_monthly ? [x.cost_once ? brl(x.cost_once) : null, x.cost_monthly ? `${brl(x.cost_monthly)}/mês` : null].filter(Boolean).join(' + ') : '—'}
                      </QuickPrice>
                    </td>
                    <td className="num">{x.min_price ? <b>{brl(Number(x.min_price) - Number(x.cost_once || 0))}</b> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="grid">
        {list.map((s, i) => (
          <div key={s.id + ':' + (s.updated_at || '')} id={'svc-' + s.id} style={{ scrollMarginTop: 80 }}>
            <ServiceCard s={s} i={i} onSaved={load} onDuplicate={() => add(s)} onDelete={() => remove(s)} fresh={fresh === s.id} />
          </div>
        ))}
      </div>
    </>
  );
}
