'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon, Ib } from '@/components/Icon';
import { api, toast, Switch } from '@/components/ui';
import { sb } from '@/lib/supabase/browser';
import { BLOCKS, FONTS, DEFAULT_DESIGN, mergeDesign } from '@/lib/checkout-design';

type Demo = 'dados' | 'pix' | 'cartao' | 'pago';
const DEVICES: [string, string, number | null][] = [
  ['desk', 'Computador', null],
  ['tab', 'Tablet', 820],
  ['cel', 'Celular', 390],
];
const VIEWS: [Demo, string][] = [
  ['dados', '1. Dados'],
  ['pix', '2. Pix'],
  ['cartao', '2. Cartão'],
  ['pago', '3. Confirmado'],
];

/** Onde cada chave clicável fica guardada nas configurações do checkout. */
const PATHS: Record<string, string> = {
  brand: 'brand',
  success: 'success_message',
  footer: 'footer',
  note_unico: 'unico_note',
  note_mensal: 'mensal_note',
};
function pathOf(k: string) {
  if (PATHS[k]) return PATHS[k].split('.');
  if (k.startsWith('badges.')) return ['design', 'badges', k.split('.')[1]];
  return ['design', ...k.split('.')];
}
function getPath(o: any, p: string[]) {
  return p.reduce((a, k) => (a == null ? a : a[k]), o);
}
function setPath(o: any, p: string[], v: any) {
  const c = structuredClone(o);
  let cur = c;
  for (let i = 0; i < p.length - 1; i++) {
    cur[p[i]] = cur[p[i]] ?? {};
    cur = cur[p[i]];
  }
  cur[p[p.length - 1]] = v;
  return c;
}

const LABELS: Record<string, string> = {
  brand: 'Nome no topo',
  success: 'Mensagem depois do pagamento',
  footer: 'Rodapé',
  note_unico: 'Selo de pagamento único',
  note_mensal: 'Selo de cobrança mensal',
  'texts.secure': 'Selo "pagamento seguro"',
  'texts.eyebrow': 'Chamada acima do título',
  'texts.total_label': 'Rótulo do total',
  'texts.monthly_label': 'Rótulo da mensalidade',
  'texts.inst_text': 'Texto do parcelamento',
  'texts.step1': 'Etapa 1',
  'texts.step2': 'Etapa 2',
  'texts.name_label': 'Campo nome',
  'texts.doc_label': 'Campo CPF/CNPJ',
  'texts.phone_label': 'Campo WhatsApp',
  'texts.cta1': 'Botão continuar',
  'texts.fine1': 'Texto abaixo do botão (dados)',
  'texts.pix_info': 'Explicação do Pix',
  'texts.pix_cta': 'Botão gerar Pix',
  'texts.pix_wait': 'Aguardando Pix',
  'texts.card_cta': 'Botão pagar com cartão',
  'texts.card_fine': 'Texto de segurança do cartão',
  'texts.done_title': 'Título da confirmação',
  'image.caption': 'Legenda da imagem',
  'guarantee.title': 'Título da garantia',
  'guarantee.text': 'Texto da garantia',
  'testimonial.text': 'Depoimento',
  'testimonial.name': 'Nome de quem falou',
  'testimonial.role': 'Cargo / negócio',
};
const VARS: Record<string, string> = {
  'texts.pix_cta': '{valor} vira o valor do link.',
  'texts.card_cta': '{valor} vira o valor do link.',
  'texts.inst_text': '{n} vira o número de parcelas e {parcela} o valor de cada uma.',
};

async function upload(file: File) {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `checkout/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await sb().storage.from('publico').upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw new Error(error.message.includes('not found') ? 'Rode a atualização 006 no Supabase para liberar o envio de imagens.' : error.message);
  return sb().storage.from('publico').getPublicUrl(path).data.publicUrl;
}

function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="field">
      <label>{label}</label>
      {value && <img src={value} alt="" className="ed-thumb" />}
      <div style={{ display: 'flex', gap: 6 }}>
        <input className="input" value={value || ''} placeholder="https://… ou envie um arquivo" onChange={(e) => onChange(e.target.value)} />
        <label className="btn btn-sm" style={{ cursor: 'pointer', flex: 'none' }}>
          <Icon name="upload" />
          {busy ? '…' : 'Enviar'}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 3 * 1024 * 1024) return toast('Imagem muito grande (máx. 3 MB).');
              setBusy(true);
              try {
                onChange(await upload(f));
              } catch (err: any) {
                toast(err.message);
              }
              setBusy(false);
            }}
          />
        </label>
        {value && (
          <button className="iconbtn" onClick={() => onChange('')} aria-label="Remover imagem">
            <Icon name="x" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function CheckoutEditor() {
  const [ck, setCk] = useState<any>(null);
  const [saved, setSaved] = useState('');
  const [hist, setHist] = useState<any[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [demo, setDemo] = useState<Demo>('dados');
  const [device, setDevice] = useState('desk');
  const [billing, setBilling] = useState<'unico' | 'mensal'>('unico');
  const [service, setService] = useState<any>(null);
  const [company, setCompany] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const ckRef = useRef<any>(null);
  ckRef.current = ck;

  useEffect(() => {
    (async () => {
      const s = await api('/api/settings', 'GET');
      const c = { ...s.checkout, design: mergeDesign(s.checkout?.design) };
      setCk(c);
      setSaved(JSON.stringify(c));
      setCompany(s.company || {});
      const { data } = await sb().from('services').select('*').eq('active', true).order('sort').limit(1);
      setService(data?.[0] || null);
    })().catch((e) => toast(e.message));
  }, []);

  const change = useCallback((next: any) => {
    setHist((h) => [...h.slice(-79), ckRef.current]);
    setCk(next);
  }, []);
  const setKey = useCallback((k: string, v: any) => change(setPath(ckRef.current, pathOf(k), v)), [change]);
  const setTheme = (k: string, v: any) => change(setPath(ck, ['design', 'theme', k], v));

  const moveBlock = useCallback(
    (from: string, to: string) => {
      const list = [...ckRef.current.design.blocks];
      const a = list.findIndex((b: any) => b.id === from);
      const [it] = list.splice(a, 1);
      const b = list.findIndex((x: any) => x.id === to);
      list.splice(b, 0, it);
      change(setPath(ckRef.current, ['design', 'blocks'], list));
    },
    [change],
  );
  const shift = (id: string, dir: -1 | 1) => {
    const list = [...ck.design.blocks];
    const i = list.findIndex((b: any) => b.id === id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    change(setPath(ck, ['design', 'blocks'], list));
  };
  const toggleBlock = (id: string, on: boolean) => change(setPath(ck, ['design', 'blocks'], ck.design.blocks.map((b: any) => (b.id === id ? { ...b, on } : b))));

  // mensagens vindas da prévia
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const m = e.data || {};
      if (m.type === 'ck-ready') setReady((r) => r + 1);
      if (m.type === 'ck-select') setSel(m.k);
      if (m.type === 'ck-text') setKey(m.k, m.v);
      if (m.type === 'ck-move') moveBlock(m.from, m.to);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [setKey, moveBlock]);

  const data = useMemo(() => {
    if (!ck) return null;
    const monthly = billing === 'mensal';
    return {
      slug: 'previa',
      status: 'ativo',
      title: service?.name || 'Mapa da Alma Completo',
      description: service?.description || 'O seu Mapa da Alma com as pirâmides do nome.',
      includes: service?.includes || 'Link para ler no celular + PDF',
      amount: Number(service?.max_price) || 49,
      billing,
      max_installments: Number(ck.max_installments) || 1,
      methods: ck.methods?.length ? ck.methods : ['pix', 'card'],
      prefill: { name: '', document: '', phone: '' },
      brand: ck.brand || 'Mapa da Alma',
      accent: ck.accent,
      logo: ck.logo_url,
      note: monthly ? ck.mensal_note : ck.unico_note,
      success: ck.success_message,
      footer: ck.footer,
      company: { document: company.document || '', city: company.city || '', email: '', phone: '' },
      design: ck.design,
    };
  }, [ck, billing, service, company]);

  useEffect(() => {
    if (!ready || !data) return;
    frame.current?.contentWindow?.postMessage({ type: 'ck-state', data, demo, sel }, window.location.origin);
  }, [ready, data, demo, sel]);

  const dirty = ck && JSON.stringify(ck) !== saved;
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function save() {
    setBusy(true);
    try {
      await api('/api/settings', 'PATCH', { checkout: ck });
      setSaved(JSON.stringify(ck));
      toast('Checkout publicado. Todos os links já usam o novo visual.');
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }
  function undo() {
    if (!hist.length) return;
    setCk(hist[hist.length - 1]);
    setHist(hist.slice(0, -1));
  }
  function reset() {
    if (!window.confirm('Voltar o visual e os textos para o padrão? (Nome, logo e cor continuam.)')) return;
    change({ ...ck, design: structuredClone(DEFAULT_DESIGN) });
  }

  if (!ck || !data) return <div className="card">Carregando editor…</div>;
  const th = ck.design.theme;
  const width = DEVICES.find((d) => d[0] === device)?.[2];

  /* ---------- painel de propriedades ---------- */
  const textField = (k: string, rows = 2) => (
    <div className="field" key={k}>
      <label>{LABELS[k] || k}</label>
      <textarea className="input" rows={rows} value={getPath(ck, pathOf(k)) ?? ''} onChange={(e) => setKey(k, e.target.value)} />
      {VARS[k] && <small className="muted">{VARS[k]}</small>}
    </div>
  );
  const group = sel ? (sel.startsWith('block.') ? sel.slice(6) : sel.split('.')[0]) : null;
  let props: React.ReactNode;
  if (!sel) props = <p className="muted">Clique em qualquer texto, imagem, botão ou bloco da prévia para editar. Textos também podem ser editados direto na página.</p>;
  else if (sel.startsWith('link.')) props = <p className="muted">Este texto vem de cada link de pagamento (nome, descrição e itens do serviço). Edite em <b>Links de pagamento</b> ou em <b>Serviços e preços</b>.</p>;
  else if (group === 'logo' || sel === 'brand')
    props = (
      <>
        {textField('brand', 1)}
        <ImageField label="Logo" value={ck.logo_url || ''} onChange={(v) => change({ ...ck, logo_url: v })} />
        <div className="field">
          <label>Cor principal</label>
          <input type="color" className="ed-color" value={ck.accent || '#e8562a'} onChange={(e) => change({ ...ck, accent: e.target.value })} />
        </div>
      </>
    );
  else if (group === 'image')
    props = (
      <>
        <ImageField label="Imagem" value={ck.design.image.url} onChange={(v) => setKey('image.url', v)} />
        {textField('image.caption', 1)}
      </>
    );
  else if (group === 'guarantee') props = [textField('guarantee.title', 1), textField('guarantee.text', 3)];
  else if (group === 'testimonial')
    props = (
      <>
        {textField('testimonial.text', 3)}
        {textField('testimonial.name', 1)}
        {textField('testimonial.role', 1)}
        <ImageField label="Foto" value={ck.design.testimonial.photo} onChange={(v) => setKey('testimonial.photo', v)} />
      </>
    );
  else if (group === 'badges')
    props = (
      <div className="field">
        <label>Selos (um por linha)</label>
        <textarea className="input" rows={4} value={ck.design.badges.join('\n')} onChange={(e) => change(setPath(ck, ['design', 'badges'], e.target.value.split('\n').slice(0, 6)))} />
      </div>
    );
  else if (group === 'total' || sel.startsWith('note_')) props = [textField('texts.total_label', 1), textField('texts.monthly_label', 1), textField('note_unico', 1), textField('note_mensal', 1)];
  else if (group === 'installments') props = textField('texts.inst_text', 2);
  else if (group === 'desc' || group === 'includes') props = <p className="muted">Este bloco mostra a descrição e os itens de cada link. Você pode esconder ou mudar a ordem dele.</p>;
  else props = textField(sel, sel.includes('fine') || sel.includes('info') || sel === 'success' ? 3 : 2);

  const blockId = sel?.startsWith('block.') ? sel.slice(6) : BLOCKS.some((b) => b[0] === group) ? group : null;

  return (
    <div className="ed">
      <div className="ed-bar">
        <div className="ed-title">
          <Ib name="spark" tone="acc" size="sm" />
          <div>
            <b>Editor do checkout</b>
            <small>{dirty ? 'Alterações não publicadas' : 'Tudo publicado'}</small>
          </div>
        </div>
        <div className="seg" role="group" aria-label="Tela">
          {VIEWS.map(([k, l]) => (
            <button key={k} aria-pressed={demo === k} onClick={() => setDemo(k)}>
              {l}
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Cobrança de exemplo">
          <button aria-pressed={billing === 'unico'} onClick={() => setBilling('unico')}>
            Único
          </button>
          <button aria-pressed={billing === 'mensal'} onClick={() => setBilling('mensal')}>
            Mensal
          </button>
        </div>
        <div className="seg" role="group" aria-label="Aparelho">
          {DEVICES.map(([k, l]) => (
            <button key={k} aria-pressed={device === k} onClick={() => setDevice(k)}>
              {l}
            </button>
          ))}
        </div>
        <span className="sp" />
        <button className="btn btn-g btn-sm" onClick={undo} disabled={!hist.length}>
          <Icon name="refresh" />
          Desfazer
        </button>
        <button className="btn btn-g btn-sm" onClick={reset}>
          Padrão
        </button>
        <button className="btn btn-p btn-sm" onClick={save} disabled={busy || !dirty}>
          <Icon name="check" />
          {busy ? 'Publicando…' : 'Publicar'}
        </button>
          <a className="btn btn-g btn-sm" href="/pagar/previa" target="_blank" rel="noreferrer" title="Abre o checkout publicado com o Mapa da Alma Completo, sem cobrar (para ver e enviar para alguém revisar)"><Icon name="eye" />Link de prévia</a>
      </div>

      <div className="ed-body">
        <aside className="ed-side">
          <section>
            <h3>Estrutura</h3>
            <p className="muted" style={{ fontSize: 12 }}>
              Arraste para mudar a ordem (aqui ou na prévia). O olho mostra ou esconde.
            </p>
            <ul className="ed-blocks">
              {ck.design.blocks.map((b: any, i: number) => (
                <li
                  key={b.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', b.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const from = e.dataTransfer.getData('text/plain');
                    if (from && from !== b.id) moveBlock(from, b.id);
                  }}
                  className={`${sel === 'block.' + b.id ? 'on' : ''} ${b.on ? '' : 'hid'}`}
                  onClick={() => setSel('block.' + b.id)}
                >
                  <span className="grip" aria-hidden="true">
                    ⋮⋮
                  </span>
                  <span className="nm">{BLOCKS.find((x) => x[0] === b.id)?.[1]}</span>
                  <button className="iconbtn" aria-label="Subir" disabled={i === 0} onClick={(e) => (e.stopPropagation(), shift(b.id, -1))}>
                    ↑
                  </button>
                  <button
                    className="iconbtn"
                    aria-label={b.on ? 'Esconder' : 'Mostrar'}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBlock(b.id, !b.on);
                    }}
                  >
                    <Icon name={b.on ? 'eye' : 'x'} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3>Estilo</h3>
            <div className="field">
              <label>Cor principal</label>
              <input type="color" className="ed-color" value={ck.accent || '#e8562a'} onChange={(e) => change({ ...ck, accent: e.target.value })} />
            </div>
            <div className="field">
              <label>Fundo</label>
              <select className="input" value={th.bg_style} onChange={(e) => setTheme('bg_style', e.target.value)}>
                <option value="mistico">Místico (céu estrelado e símbolos flutuando)</option>
                <option value="blobs">Luzes suaves na cor principal</option>
                <option value="solid">Cor sólida</option>
                <option value="gradient">Degradê</option>
                <option value="image">Imagem</option>
              </select>
            </div>
            {th.bg_style !== 'image' && (
              <div className="field" style={{ display: 'flex', gap: 8 }}>
                <input type="color" className="ed-color" value={th.bg} onChange={(e) => setTheme('bg', e.target.value)} aria-label="Cor do fundo" />
                {th.bg_style === 'gradient' && <input type="color" className="ed-color" value={th.bg2} onChange={(e) => setTheme('bg2', e.target.value)} aria-label="Segunda cor" />}
              </div>
            )}
            {th.bg_style === 'image' && <ImageField label="Imagem de fundo" value={th.bg_image} onChange={(v) => setTheme('bg_image', v)} />}
            <div className="field">
              <label>Fonte</label>
              <select className="input" value={th.font} onChange={(e) => setTheme('font', e.target.value)}>
                {FONTS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Card do produto (fundo e textos)</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 12 }}>
                <span>Fundo <input type="color" className="ed-color" value={th.card_bg || '#ffffff'} onChange={(e) => setTheme('card_bg', e.target.value)} aria-label="Fundo do card" /></span>
                <span>Título <input type="color" className="ed-color" value={th.title_color || '#2a1259'} onChange={(e) => setTheme('title_color', e.target.value)} aria-label="Cor do título" /></span>
                <span>Texto <input type="color" className="ed-color" value={th.card_text || '#3b3150'} onChange={(e) => setTheme('card_text', e.target.value)} aria-label="Cor do texto" /></span>
              </div>
            </div>
            <div className="field">
              <label>Tamanho do título: {th.title_size || 34}px</label>
              <input type="range" min={20} max={52} value={th.title_size || 34} onChange={(e) => setTheme('title_size', Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div className="field">
              <label>Tamanho do texto: {th.text_size || 15.5}px</label>
              <input type="range" min={12} max={22} step={0.5} value={th.text_size || 15.5} onChange={(e) => setTheme('text_size', Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div className="field">
              <label>Fonte do título</label>
              <select className="input" value={th.title_font || ''} onChange={(e) => setTheme('title_font', e.target.value)}>
                <option value="">A mesma do texto</option>
                {['Cinzel', 'Cormorant Garamond', 'Playfair Display', 'Marcellus', 'Lora', 'DM Serif Display', ...FONTS].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Alinhamento do card</label>
              <div className="seg" role="group">
                <button aria-pressed={(th.align || 'left') === 'left'} onClick={() => setTheme('align', 'left')}>À esquerda</button>
                <button aria-pressed={th.align === 'center'} onClick={() => setTheme('align', 'center')}>Centralizado</button>
              </div>
            </div>
            <div className="field">
              <label>Cantos dos cartões: {th.radius}px</label>
              <input type="range" min={0} max={32} value={th.radius} onChange={(e) => setTheme('radius', Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div className="field">
              <label>Cantos dos botões: {th.btn_radius}px</label>
              <input type="range" min={0} max={28} value={th.btn_radius} onChange={(e) => setTheme('btn_radius', Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div className="field">
              <label>Disposição</label>
              <div className="seg" role="group">
                <button aria-pressed={th.layout === 'split'} onClick={() => setTheme('layout', 'split')}>
                  Lado a lado
                </button>
                <button aria-pressed={th.layout === 'stack'} onClick={() => setTheme('layout', 'stack')}>
                  Uma coluna
                </button>
              </div>
            </div>
            {(
              [
                ['shadow', 'Sombras'],
                ['show_secure', 'Selo "pagamento seguro" no topo'],
                ['show_steps', 'Mostrar etapas 1 e 2'],
              ] as [string, string][]
            ).map(([k, l]) => (
              <label key={k} className="ed-sw">
                <Switch label={l} checked={!!th[k]} onChange={(v) => setTheme(k, v)} />
                {l}
              </label>
            ))}
          </section>
        </aside>

        <div className="ed-stage">
          <div className="ed-frame" style={{ width: width ? width : '100%' }}>
            <iframe ref={frame} src="/pagar/editor-preview" title="Prévia do checkout" />
          </div>
        </div>

        <aside className="ed-side ed-props">
          <section>
            <h3>{sel ? LABELS[sel] || (blockId ? BLOCKS.find((b) => b[0] === blockId)?.[1] : sel.startsWith('link.') ? 'Texto do link' : group === 'logo' ? 'Logo e nome' : 'Elemento') : 'Propriedades'}</h3>
            {blockId && (
              <div className="ed-blockbar">
                <label className="ed-sw">
                  <Switch label="Mostrar bloco" checked={!!ck.design.blocks.find((b: any) => b.id === blockId)?.on} onChange={(v) => toggleBlock(blockId, v)} />
                  Mostrar este bloco
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-g" onClick={() => shift(blockId, -1)}>
                    ↑ Subir
                  </button>
                  <button className="btn btn-sm btn-g" onClick={() => shift(blockId, 1)}>
                    ↓ Descer
                  </button>
                </div>
              </div>
            )}
            <div className="grid" style={{ gap: 12 }}>
              {props}
            </div>
          </section>
          <section>
            <h3>Dicas</h3>
            <ul className="muted" style={{ fontSize: 12.5, paddingLeft: 18, margin: 0, display: 'grid', gap: 6 }}>
              <li>Troque a tela no topo (Dados, Pix, Cartão, Confirmado) para editar cada etapa.</li>
              <li>Nada muda para os clientes até você clicar em Publicar.</li>
              <li>Nome do serviço, descrição e itens vêm de cada link.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
