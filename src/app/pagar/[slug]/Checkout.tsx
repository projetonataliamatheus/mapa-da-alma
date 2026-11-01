'use client';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_DESIGN, Design, fill } from '@/lib/checkout-design';

const P: Record<string, string> = {
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  pix: '<path d="M12 3l9 9-9 9-9-9z"/><path d="M8.5 12h7"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z"/><path d="M8.8 12l2.2 2.2 4.2-4.4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  repeat: '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
};
const I = ({ n, s = 18 }: { n: string; s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: P[n] }} />
);

/* ---------- modo edição (Editor visual) ---------- */
export type Ed = { sel: string | null; onSel: (k: string) => void; onText: (k: string, v: string) => void; onMove: (from: string, to: string) => void };
const EdCtx = createContext<Ed | null>(null);
const useEd = () => useContext(EdCtx);

/** Texto editável: no editor vira clicável e editável direto na página. */
function T({ k, v, as = 'span', className, style }: { k: string; v: string; as?: any; className?: string; style?: any }) {
  const ed = useEd();
  const Tag = as;
  if (!ed) return <Tag className={className} style={style}>{v}</Tag>;
  const editable = !k.startsWith('link.');
  return (
    <Tag
      key={v}
      data-k={k}
      className={`${className || ''} ${ed.sel === k ? 'ck-sel' : ''}`}
      style={style}
      contentEditable={editable}
      suppressContentEditableWarning
      spellCheck={false}
      onClick={(e: any) => {
        e.preventDefault();
        e.stopPropagation();
        ed.onSel(k);
      }}
      onKeyDown={(e: any) => {
        if (e.key === 'Enter' && !e.shiftKey && as !== 'p') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onBlur={(e: any) => editable && e.currentTarget.innerText !== v && ed.onText(k, e.currentTarget.innerText)}
    >
      {v}
    </Tag>
  );
}

/** Elemento clicável (imagem, logo, bloco) que abre as propriedades no editor. */
function S({ k, children, className, as = 'div', style }: { k: string; children: React.ReactNode; className?: string; as?: any; style?: any }) {
  const ed = useEd();
  const Tag = as;
  if (!ed) return <Tag className={className} style={style}>{children}</Tag>;
  return (
    <Tag
      data-k={k}
      className={`${className || ''} ${ed.sel === k ? 'ck-sel' : ''}`}
      style={style}
      onClick={(e: any) => {
        if ((e.target as HTMLElement).closest('[contenteditable="true"]')) return;
        e.preventDefault();
        e.stopPropagation();
        ed.onSel(k);
      }}
    >
      {children}
    </Tag>
  );
}

/** Cor do texto sobre a cor principal (verde-água claro pede texto escuro) e um tom mais forte para textos coloridos. */
function readableOn(hex: string) {
  const m = String(hex).replace('#', '').match(/^([0-9a-f]{6}|[0-9a-f]{3})$/i);
  if (!m) return { fg: '#fff', deep: hex };
  const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.45 ? { fg: '#0b2a22', deep: `color-mix(in srgb, ${hex} 45%, #0b1220)` } : { fg: '#fff', deep: hex };
}

const brl = (v: number) => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const digits = (v: string) => v.replace(/\D/g, '');
function maskDoc(v: string) {
  const d = digits(v).slice(0, 14);
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
}
function maskPhone(v: string) {
  const d = digits(v).replace(/^55(?=\d{10,11}$)/, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}
const maskCard = (v: string) => digits(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
const maskExp = (v: string) => digits(v).slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2');
const maskCep = (v: string) => digits(v).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
function brand(n: string) {
  const d = digits(n);
  if (/^4/.test(d)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'Amex';
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(d)) return 'Elo';
  if (/^(606282|3841)/.test(d)) return 'Hipercard';
  return '';
}

type Data = {
  slug: string;
  status: string;
  title: string;
  description?: string;
  includes?: string;
  amount: number;
  billing: 'unico' | 'mensal';
  max_installments: number;
  methods: string[];
  prefill: { name: string; document: string; phone: string };
  brand: string;
  accent: string;
  logo?: string;
  note: string;
  success: string;
  footer: string;
  company: { document: string; city: string; email: string; phone: string };
  design?: Design;
};
export type CheckoutData = Data;
export type DemoView = 'dados' | 'pix' | 'cartao' | 'pago';

function Success({ data, d }: { data: Data; d: Design }) {
  return (
    <div className="ck-done">
      <svg className="ck-tick" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="29" />
        <path d="M19 33l9 9 17-19" />
      </svg>
      <T k="texts.done_title" v={d.texts.done_title} as="h2" />
      <T k="success" v={data.success} as="p" />
      <div className="ck-done-sum">
        <span>{data.title}</span>
        <b>
          {brl(data.amount)}
          {data.billing === 'mensal' ? '/mês' : ''}
        </b>
      </div>
      <p className="ck-fine">O recibo do pagamento chega no seu WhatsApp em instantes.</p>
    </div>
  );
}

const DEMO_QR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" shape-rendering="crispEdges"><rect width="21" height="21" fill="#fff"/><path d="M0 0h7v7H0zM14 0h7v7h-7zM0 14h7v7H0z" fill="#111"/><path d="M1 1h5v5H1zM15 1h5v5h-5zM1 15h5v5H1z" fill="#fff"/><path d="M2 2h3v3H2zM16 2h3v3h-3zM2 16h3v3H2zM9 1h2v2H9zM8 5h3v2H8zM10 9h4v2h-4zM8 12h2v4H8zM12 13h3v2h-3zM16 9h4v2h-4zM15 16h2v3h-2zM18 14h2v2h-2zM11 17h3v3h-3zM9 9h1v1H9z" fill="#111"/></svg>',
  );

export function Checkout({ data, edit, demo }: { data: Data; edit?: Ed; demo?: DemoView }) {
  const d: Design = data.design || (DEFAULT_DESIGN as Design);
  const [status, setStatus] = useState(demo === 'pago' ? 'pago' : data.status);
  const [step, setStep] = useState<1 | 2>(demo && demo !== 'dados' ? 2 : 1);
  const [method, setMethod] = useState<'pix' | 'card'>(demo === 'cartao' ? 'card' : data.methods.includes('pix') ? 'pix' : 'card');
  const [f, setF] = useState({
    name: data.prefill.name || '',
    document: maskDoc(data.prefill.document || ''),
    phone: maskPhone(data.prefill.phone || ''),
    email: '',
    number: '',
    holder: '',
    expiry: '',
    ccv: '',
    cep: '',
    addr: '',
    installments: 1,
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [pix, setPix] = useState<{ image: string; payload: string } | null>(demo === 'pix' ? { image: DEMO_QR, payload: '00020126580014BR.GOV.BCB.PIX0136exemplo-de-codigo-pix-copia-e-cola5204000053039865406549.005802BR6304ABCD' } : null);
  const [copied, setCopied] = useState(false);
  const [flip, setFlip] = useState(false);
  const poll = useRef<any>(null);
  const includes = useMemo(() => String(data.includes || '').split(/\n|;|•/).map((x) => x.trim()).filter(Boolean).slice(0, 8), [data.includes]);
  const monthly = data.billing === 'mensal';

  useEffect(() => {
    if (demo || status !== 'ativo') return;
    const check = async () => {
      try {
        const r = await fetch(`/api/checkout/${data.slug}/status`, { cache: 'no-store' }).then((x) => x.json());
        if (r.status === 'pago') setStatus('pago');
      } catch {}
    };
    if (pix) poll.current = setInterval(check, 4000);
    return () => clearInterval(poll.current);
  }, [pix, status, data.slug]);

  const set = (k: string, v: any) => setF((o) => ({ ...o, [k]: v }));
  function nextStep(e: React.FormEvent) {
    e.preventDefault();
    if (edit) return;
    setErr('');
    if (f.name.trim().split(/\s+/).length < 2) return setErr('Informe seu nome completo.');
    const d = digits(f.document);
    if (d.length !== 11 && d.length !== 14) return setErr('Informe um CPF ou CNPJ válido.');
    if (digits(f.phone).length < 10) return setErr('Informe seu WhatsApp com DDD.');
    setStep(2);
  }
  async function pay(e?: React.FormEvent) {
    e?.preventDefault();
    if (edit) return;
    setErr('');
    setBusy(true);
    try {
      const body: any = { method, name: f.name, document: f.document, phone: f.phone, email: f.email };
      if (method === 'card') Object.assign(body, { card: { holderName: f.holder, number: f.number, expiry: f.expiry, ccv: f.ccv }, postalCode: f.cep, addressNumber: f.addr, installments: f.installments });
      const r = await fetch(`/api/checkout/${data.slug}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Não foi possível concluir.');
      if (j.kind === 'paid') setStatus('pago');
      else if (j.kind === 'pix') setPix({ image: j.image, payload: j.payload });
      else if (j.kind === 'processing') {
        setErr('Pagamento em análise pelo banco. Assim que for aprovado, você recebe a confirmação no WhatsApp.');
        setPix(null);
        poll.current = setInterval(async () => {
          const s = await fetch(`/api/checkout/${data.slug}/status`, { cache: 'no-store' }).then((x) => x.json());
          if (s.status === 'pago') setStatus('pago');
        }, 4000);
      }
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  }
  async function copy() {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.payload);
    } catch {
      const t = document.getElementById('ck-payload') as HTMLTextAreaElement | null;
      t?.select();
      document.execCommand?.('copy');
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const inst = Math.max(1, Math.min(data.max_installments || 1, 12));
  const cardBrand = brand(f.number);
  const th = d.theme;
  const onAccent = readableOn(data.accent || '#e8562a');
  const valor = brl(data.amount) + (monthly ? '/mês' : '');
  const bg =
    th.bg_style === 'solid'
      ? { background: th.bg }
      : th.bg_style === 'gradient'
        ? { background: `linear-gradient(135deg, ${th.bg}, ${th.bg2})` }
        : th.bg_style === 'image' && th.bg_image
          ? { background: `linear-gradient(rgba(255,255,255,.55), rgba(255,255,255,.75)), url("${th.bg_image}") center/cover fixed` }
          : { ['--bg' as any]: th.bg };
  const fontUrl = th.font && th.font !== 'Geist' ? `https://fonts.googleapis.com/css2?family=${encodeURIComponent(th.font)}:wght@400;500;600;700&display=swap` : null;

  const block = (id: string) => {
    switch (id) {
      case 'desc':
        return data.description ? <T k="link.description" v={data.description} as="p" className="ck-desc" /> : null;
      case 'includes':
        return includes.length > 0 ? (
          <S k="link.includes" as="ul" className="ck-list">
            {includes.map((x, i) => (
              <li key={i} className="ck-in" style={{ ['--d' as any]: `${120 + i * 60}ms` }}>
                <span>
                  <I n="check" s={14} />
                </span>
                {x}
              </li>
            ))}
          </S>
        ) : null;
      case 'total':
        return (
          <div className="ck-total">
            <div className="ck-total-v">
              <T k={monthly ? 'texts.monthly_label' : 'texts.total_label'} v={monthly ? d.texts.monthly_label : d.texts.total_label} as="small" />
              <strong>
                {brl(data.amount)}
                {monthly && <em>/mês</em>}
              </strong>
            </div>
            <span className="ck-badge">
              <I n={monthly ? 'repeat' : 'shield'} s={14} />
              <T k={monthly ? 'note_mensal' : 'note_unico'} v={data.note} />
            </span>
          </div>
        );
      case 'installments':
        return !monthly && inst > 1 && data.methods.includes('card') ? <T k="texts.inst_text" v={edit ? d.texts.inst_text : fill(d.texts.inst_text, { n: inst, parcela: brl(data.amount / inst) })} as="p" className="ck-sub" /> : null;
      case 'image':
        return (
          <S k="image" as="figure" className="ck-img" style={{ margin: 0 }}>
            {d.image.url ? <img src={d.image.url} alt={d.image.caption || ''} /> : edit ? <div className="ck-ph">Clique para escolher uma imagem</div> : null}
            {d.image.caption && <T k="image.caption" v={d.image.caption} as="figcaption" />}
          </S>
        );
      case 'guarantee':
        return (
          <S k="guarantee" className="ck-guar">
            <span>
              <I n="shield" s={22} />
            </span>
            <div>
              <T k="guarantee.title" v={d.guarantee.title} as="b" />
              <T k="guarantee.text" v={d.guarantee.text} as="p" />
            </div>
          </S>
        );
      case 'testimonial':
        return (
          <S k="testimonial" className="ck-testi">
            <T k="testimonial.text" v={`“${d.testimonial.text.replace(/^“|”$/g, '')}”`} as="p" />
            <footer>
              {d.testimonial.photo ? <img src={d.testimonial.photo} alt="" /> : <span className="ck-av">{(d.testimonial.name || '?').slice(0, 1)}</span>}
              <span>
                <T k="testimonial.name" v={d.testimonial.name} as="b" />
                <T k="testimonial.role" v={d.testimonial.role} as="small" />
              </span>
            </footer>
          </S>
        );
      case 'badges':
        return d.badges.length ? (
          <S k="badges" className="ck-badges">
            {d.badges.map((b, i) => (
              <span key={i}>
                <I n="check" s={13} />
                <T k={`badges.${i}`} v={b} />
              </span>
            ))}
          </S>
        ) : null;
    }
    return null;
  };

  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const visibleBlocks = d.blocks.filter((b) => b.on);

  return (
    <EdCtx.Provider value={edit || null}>
    <div
      className={`ck ${th.layout === 'stack' ? 'stack' : ''} ${th.shadow ? '' : 'noshadow'} ${edit ? 'editing' : ''}`}
      style={{ ['--ck' as any]: data.accent || '#e8562a', ['--ck-on' as any]: onAccent.fg, ['--ck-deep' as any]: onAccent.deep, ['--ck-r' as any]: th.radius + 'px', ['--ck-br' as any]: th.btn_radius + 'px', ['--ck-font' as any]: `'${th.font || 'Geist'}'`, ...bg }}
      onSubmitCapture={edit ? (e) => e.preventDefault() : undefined}
    >
      {fontUrl && <link rel="stylesheet" href={fontUrl} />}
      {(th.bg_style === 'blobs' || !th.bg_style) && (
        <div className="ck-bg" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      )}
      <header className="ck-top">
        <S k="logo" className="ck-brand">
          {data.logo ? <img src={data.logo} alt="" /> : <span className="ck-mark">{(data.brand || 'P').slice(0, 1)}</span>}
          <T k="brand" v={data.brand} as="b" />
        </S>
        {th.show_secure && (
          <span className="ck-secure">
            <I n="lock" s={15} /> <T k="texts.secure" v={d.texts.secure} />
          </span>
        )}
      </header>

      <main className="ck-wrap">
        <section className="ck-sum ck-in" style={{ ['--d' as any]: '0ms' }}>
          <T k="texts.eyebrow" v={d.texts.eyebrow} className="ck-eyebrow" />
          <T k="link.title" v={data.title} as="h1" />
          <div className="ck-blocks">
            {visibleBlocks.map((b) => {
              const el = block(b.id);
              if (!el && !edit) return null;
              if (!edit) return <div key={b.id}>{el}</div>;
              return (
                <div
                  key={b.id}
                  className={`ck-block ${edit.sel === 'block.' + b.id ? 'ck-sel' : ''} ${over === b.id && drag !== b.id ? 'drop-before' : ''}`}
                  data-k={'block.' + b.id}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('[data-k]') !== e.currentTarget) return;
                    edit.onSel('block.' + b.id);
                  }}
                  onDragOver={(e) => {
                    if (!drag) return;
                    e.preventDefault();
                    setOver(b.id);
                  }}
                  onDragLeave={() => setOver(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (drag && drag !== b.id) edit.onMove(drag, b.id);
                    setDrag(null);
                    setOver(null);
                  }}
                >
                  <span
                    className="ck-grip"
                    draggable
                    title="Arraste para mudar a ordem"
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', b.id);
                      setDrag(b.id);
                    }}
                    onDragEnd={() => {
                      setDrag(null);
                      setOver(null);
                    }}
                  >
                    ⋮⋮
                  </span>
                  {el || <div className="ck-ph" style={{ padding: 10, color: '#6b7484', fontSize: 13 }}>{b.id === 'desc' ? 'Descrição vem de cada link' : b.id === 'includes' ? 'Itens inclusos vêm de cada link' : 'Aparece quando houver parcelamento'}</div>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="ck-card ck-in" style={{ ['--d' as any]: '90ms' }}>
          {status === 'pago' ? (
            <Success data={data} d={d} />
          ) : status !== 'ativo' ? (
            <div className="ck-msg">
              <h2>{status === 'expirado' ? 'Este link expirou' : 'Este link não está mais disponível'}</h2>
              <p>Peça um novo link para quem te atendeu. Leva só um instante.</p>
            </div>
          ) : (
            <>
              {th.show_steps && (
                <ol className="ck-steps" aria-label="Etapas">
                  <li className={step === 1 ? 'on' : 'done'}>
                    <i className="ck-step-n">{step > 1 ? <I n="check" s={13} /> : 1}</i>
                    <T k="texts.step1" v={d.texts.step1} className="ck-step-t" />
                  </li>
                  <li className={step === 2 ? 'on' : ''}>
                    <i className="ck-step-n">2</i>
                    <T k="texts.step2" v={d.texts.step2} className="ck-step-t" />
                  </li>
                </ol>
              )}

              {step === 1 ? (
                <form onSubmit={nextStep} className="ck-form ck-fade" key="s1">
                  <label className="ck-field">
                    <T k="texts.name_label" v={d.texts.name_label} />
                    <input value={f.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" placeholder="Como está no seu documento" required />
                  </label>
                  <label className="ck-field">
                    <T k="texts.doc_label" v={d.texts.doc_label} />
                    <input value={f.document} onChange={(e) => set('document', maskDoc(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" required />
                  </label>
                  <label className="ck-field">
                    <T k="texts.phone_label" v={d.texts.phone_label} />
                    <input value={f.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} inputMode="tel" autoComplete="tel" placeholder="(19) 99999-9999" required />
                  </label>
                  {err && <p className="ck-err">{err}</p>}
                  <button className="ck-btn">
                    <T k="texts.cta1" v={d.texts.cta1} />
                  </button>
                  <T k="texts.fine1" v={d.texts.fine1} as="p" className="ck-fine" />
                  <p className="ck-fine" style={{ marginTop: 4 }}>
                    Ao continuar, você concorda com os{' '}
                    <a href="/termos" target="_blank" rel="noopener noreferrer">
                      Termos de uso
                    </a>{' '}
                    e a{' '}
                    <a href="/privacidade" target="_blank" rel="noopener noreferrer">
                      Política de privacidade
                    </a>
                    .
                  </p>
                </form>
              ) : (
                <div className="ck-fade" key="s2">
                  {!pix && data.methods.length > 1 && (
                    <div className="ck-tabs" role="tablist" data-on={method}>
                      <i className="ck-tab-ind" />
                      {data.methods.includes('pix') && (
                        <button role="tab" aria-selected={method === 'pix'} onClick={() => (setMethod('pix'), setErr(''))}>
                          <I n="pix" /> Pix
                        </button>
                      )}
                      {data.methods.includes('card') && (
                        <button role="tab" aria-selected={method === 'card'} onClick={() => (setMethod('card'), setErr(''))}>
                          <I n="card" /> Cartão<span className="lg">&nbsp;de crédito</span>
                        </button>
                      )}
                    </div>
                  )}

                  {method === 'pix' ? (
                    pix ? (
                      <div className="ck-pix ck-fade">
                        <div className="ck-qr">
                          <img src={pix.image.startsWith('data:') ? pix.image : `data:image/png;base64,${pix.image}`} alt="QR Code do Pix" />
                          <span className="ck-scan" aria-hidden="true" />
                        </div>
                        <p className="ck-wait">
                          <span className="ck-dot" /> <T k="texts.pix_wait" v={d.texts.pix_wait} />
                        </p>
                        <p className="ck-sub">Abra o app do seu banco, escolha Pix e leia o QR Code, ou copie o código abaixo.</p>
                        <textarea id="ck-payload" readOnly value={pix.payload} className="ck-payload" aria-label="Pix copia e cola" />
                        <button className="ck-btn" onClick={copy}>
                          <I n={copied ? 'check' : 'copy'} /> {copied ? 'Código copiado' : 'Copiar código Pix'}
                        </button>
                        <p className="ck-fine">A confirmação aparece aqui sozinha em poucos segundos depois de pagar.</p>
                      </div>
                    ) : (
                      <div className="ck-form">
                        <div className="ck-pixinfo">
                          <I n="clock" />
                          <T k="texts.pix_info" v={d.texts.pix_info} as="p" />
                        </div>
                        {err && <p className="ck-err">{err}</p>}
                        <button className="ck-btn" onClick={() => pay()} disabled={busy}>
                          {busy ? <span className="ck-spin" /> : <I n="pix" />}
                          {busy ? 'Gerando Pix…' : <T k="texts.pix_cta" v={edit ? d.texts.pix_cta : fill(d.texts.pix_cta, { valor: brl(data.amount) })} />}
                        </button>
                        <button className="ck-link" onClick={() => setStep(1)}>
                          <I n="back" s={15} /> Voltar aos dados
                        </button>
                      </div>
                    )
                  ) : (
                    <form className="ck-form" onSubmit={pay}>
                      <div className={`ck-cc ${flip ? 'flip' : ''}`} aria-hidden="true">
                        <div className="ck-cc-in">
                          <div className="ck-cc-front">
                            <div className="ck-cc-row">
                              <span className="ck-chip" />
                              <b>{cardBrand}</b>
                            </div>
                            <div className="ck-cc-num">{f.number || '•••• •••• •••• ••••'}</div>
                            <div className="ck-cc-row">
                              <span>{f.holder.toUpperCase() || 'NOME NO CARTÃO'}</span>
                              <span>{f.expiry || 'MM/AA'}</span>
                            </div>
                          </div>
                          <div className="ck-cc-back">
                            <span className="ck-cc-strip" />
                            <span className="ck-cc-cvv">{f.ccv || '•••'}</span>
                          </div>
                        </div>
                      </div>
                      <label className="ck-field">
                        <span>Número do cartão</span>
                        <input value={f.number} onChange={(e) => set('number', maskCard(e.target.value))} inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" required />
                      </label>
                      <label className="ck-field">
                        <span>Nome impresso no cartão</span>
                        <input value={f.holder} onChange={(e) => set('holder', e.target.value)} autoComplete="cc-name" required />
                      </label>
                      <div className="ck-two">
                        <label className="ck-field">
                          <span>Validade</span>
                          <input value={f.expiry} onChange={(e) => set('expiry', maskExp(e.target.value))} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" required />
                        </label>
                        <label className="ck-field">
                          <span>CVV</span>
                          <input value={f.ccv} onFocus={() => setFlip(true)} onBlur={() => setFlip(false)} onChange={(e) => set('ccv', digits(e.target.value).slice(0, 4))} inputMode="numeric" autoComplete="cc-csc" placeholder="123" required />
                        </label>
                      </div>
                      <label className="ck-field">
                        <span>E-mail</span>
                        <input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" placeholder="voce@email.com" required />
                      </label>
                      <div className="ck-two">
                        <label className="ck-field">
                          <span>CEP do titular</span>
                          <input value={f.cep} onChange={(e) => set('cep', maskCep(e.target.value))} inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" required />
                        </label>
                        <label className="ck-field">
                          <span>Número</span>
                          <input value={f.addr} onChange={(e) => set('addr', e.target.value)} placeholder="123" required />
                        </label>
                      </div>
                      {!monthly && inst > 1 && (
                        <label className="ck-field">
                          <span>Parcelas</span>
                          <select value={f.installments} onChange={(e) => set('installments', Number(e.target.value))}>
                            {Array.from({ length: inst }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>
                                {n}x de {brl(data.amount / n)}
                                {n === 1 ? ' (à vista)' : ''}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      {err && <p className="ck-err">{err}</p>}
                      <button className="ck-btn" disabled={busy}>
                        {busy ? <span className="ck-spin" /> : <I n="lock" />}
                        {busy ? 'Processando…' : <T k="texts.card_cta" v={edit ? d.texts.card_cta : fill(d.texts.card_cta, { valor })} />}
                      </button>
                      <button type="button" className="ck-link" onClick={() => setStep(1)}>
                        <I n="back" s={15} /> Voltar aos dados
                      </button>
                      <T k="texts.card_fine" v={d.texts.card_fine} as="p" className="ck-fine" />
                    </form>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </main>
      <footer className="ck-foot">
        <span>
          <I n="shield" s={14} /> <T k="footer" v={data.footer} />
        </span>
        <span>{[data.brand, data.company.document && `CNPJ/CPF ${data.company.document}`, data.company.city].filter(Boolean).join(' · ')}</span>
      </footer>
    </div>
    </EdCtx.Provider>
  );
}
