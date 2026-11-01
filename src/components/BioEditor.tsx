'use client';
/* Editor do Link na bio: usado pela equipe no painel e pelo cliente no link de edição. Mostra a página ao vivo ao lado. */
import { useRef, useState } from 'react';
import { BioPage } from './BioPage';
import { BioData, BioButton, THEMES, THEME_PRESET, FONTS, PALETTE, LIMITS, newId } from '@/lib/bio';
import { BUTTON_TYPES, BTN, NICHE } from '@/lib/bio-icons';

const Svg = ({ d, s = 18 }: { d: string; s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />
);
const SOCIAL_TYPES = ['instagram', 'whatsapp', 'tiktok', 'facebook', 'youtube', 'site', 'email'];

/** Reduz a imagem no próprio aparelho antes de enviar (páginas leves e armazenamento barato). */
export async function shrinkImage(file: File, max = 1080, square = false): Promise<File> {
  if (!/^image\//.test(file.type) || /gif|svg/.test(file.type)) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = bad;
      i.src = url;
    });
    let sx = 0,
      sy = 0,
      sw = img.naturalWidth,
      sh = img.naturalHeight;
    if (square) {
      const m = Math.min(sw, sh);
      sx = (sw - m) / 2;
      sy = (sh - m) / 2;
      sw = sh = m;
    }
    const scale = Math.min(1, max / Math.max(sw, sh));
    const c = document.createElement('canvas');
    c.width = Math.round(sw * scale);
    c.height = Math.round(sh * scale);
    c.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    const blob: Blob | null = await new Promise((ok) => c.toBlob(ok, 'image/webp', 0.82));
    const out = blob && blob.type === 'image/webp' ? blob : await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', 0.84));
    if (!out) return file;
    return new File([out], file.name.replace(/\.\w+$/, '') + (out.type === 'image/webp' ? '.webp' : '.jpg'), { type: out.type });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ImagePick({ value, onPick, onClear, label, round, upload, square }: { value: string; onPick: (u: string) => void; onClear: () => void; label: string; round?: boolean; upload: (f: File) => Promise<string>; square?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function go(f?: File | null) {
    if (!f) return;
    setErr('');
    setBusy(true);
    try {
      onPick(await upload(await shrinkImage(f, square ? 600 : 1280, square)));
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  }
  return (
    <div className="be-img">
      <button type="button" className={`be-thumb ${round ? 'round' : ''}`} onClick={() => ref.current?.click()} style={value ? { backgroundImage: `url("${value}")` } : undefined} aria-label={label}>
        {busy ? <span className="spin" /> : !value && <Svg d='<path d="M12 5v14M5 12h14"/>' />}
      </button>
      <div>
        <b>{label}</b>
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <button type="button" className="btn btn-sm" onClick={() => ref.current?.click()} disabled={busy}>
            {value ? 'Trocar' : 'Enviar'}
          </button>
          {value && (
            <button type="button" className="btn btn-sm btn-g" onClick={onClear}>
              Remover
            </button>
          )}
        </div>
        {err && <small style={{ color: 'var(--bad)' }}>{err}</small>}
      </div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => (go(e.target.files?.[0]), (e.target.value = ''))} />
    </div>
  );
}

const TABS: [string, string][] = [
  ['perfil', 'Perfil'],
  ['botoes', 'Botões'],
  ['visual', 'Aparência'],
  ['info', 'Endereço e horário'],
  ['fotos', 'Fotos'],
];

export function BioEditor({ value, onChange, upload, client }: { value: BioData; onChange: (d: BioData) => void; upload: (f: File) => Promise<string>; client?: boolean }) {
  const d = value;
  const [tab, setTab] = useState('perfil');
  const [view, setView] = useState(false);
  const set = (p: Partial<BioData>) => onChange({ ...d, ...p });
  const setBtn = (id: string, p: Partial<BioButton>) => set({ buttons: d.buttons.map((b) => (b.id === id ? { ...b, ...p } : b)) });
  const move = (i: number, dir: number) => {
    const a = [...d.buttons];
    const j = i + dir;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    set({ buttons: a });
  };
  const galRef = useRef<HTMLInputElement>(null);
  const [galBusy, setGalBusy] = useState(false);
  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setGalBusy(true);
    const room = LIMITS.gallery - d.gallery.length;
    const out: string[] = [];
    for (const f of Array.from(files).slice(0, room)) {
      try {
        out.push(await upload(await shrinkImage(f, 1080)));
      } catch {}
    }
    set({ gallery: [...d.gallery, ...out] });
    setGalBusy(false);
  }

  return (
    <div className={`be ${view ? 'show-view' : ''}`}>
      <div className="be-form">
        <div className="be-tabs" role="tablist">
          {TABS.map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </div>

        {tab === 'perfil' && (
          <div className="be-sec">
            <ImagePick label="Logo ou foto de perfil" round square value={d.avatar} upload={upload} onPick={(u) => set({ avatar: u })} onClear={() => set({ avatar: '' })} />
            {(['capa', 'luxo', 'elegante'].includes(d.theme) || d.cover) && (
              <ImagePick label={d.theme === 'elegante' ? 'Foto grande do topo (pessoa ou espaço)' : 'Foto de capa (o espaço, a fachada)'} value={d.cover} upload={upload} onPick={(u) => set({ cover: u })} onClear={() => set({ cover: '' })} />
            )}
            <ImagePick label="Logo com o nome (opcional, PNG sem fundo)" value={d.logo} upload={upload} onPick={(u) => set({ logo: u })} onClear={() => set({ logo: '' })} />
            <div className="formgrid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="field">
                <label>Nome</label>
                <input className="input" value={d.name} maxLength={60} onChange={(e) => set({ name: e.target.value })} />
              </div>
              <div className="field">
                <label>Linha abaixo do nome</label>
                <input className="input" value={d.subtitle} maxLength={50} onChange={(e) => set({ subtitle: e.target.value })} placeholder="Ex.: Designer de sobrancelhas" />
              </div>
            </div>
            <div className="field">
              <label>
                Frase curta <small className="muted">{d.tagline.length}/{LIMITS.tagline}</small>
              </label>
              <textarea className="input" rows={2} maxLength={LIMITS.tagline} value={d.tagline} onChange={(e) => set({ tagline: e.target.value })} placeholder="Ex.: Sorrisos bonitos e saudáveis em Campinas" />
            </div>
            <div className="field">
              <label>
                Texto "sobre" (aparece depois dos botões) <small className="muted">{(d.about || '').length}/300</small>
              </label>
              <textarea className="input" rows={3} maxLength={300} value={d.about} onChange={(e) => set({ about: e.target.value })} placeholder="Ex.: Nosso espaço foi preparado para você se sentir em casa…" />
            </div>
            <div className="field">
              <label>Redes sociais {d.theme === 'luxo' ? '(barra de ícones no fim; o WhatsApp fica em destaque no meio)' : '(ícones redondos abaixo do nome)'}</label>
              <div className="be-list">
                {d.socials.map((s, i) => (
                  <div key={i} className="be-soc">
                    <select className="input" value={s.type} onChange={(e) => set({ socials: d.socials.map((x, k) => (k === i ? { ...x, type: e.target.value } : x)) })}>
                      {SOCIAL_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {BUTTON_TYPES.find((b) => b[0] === t)?.[1] || t}
                        </option>
                      ))}
                    </select>
                    <input className="input" value={s.value} placeholder={BUTTON_TYPES.find((b) => b[0] === s.type)?.[3]} onChange={(e) => set({ socials: d.socials.map((x, k) => (k === i ? { ...x, value: e.target.value } : x)) })} />
                    <button type="button" className="iconbtn" aria-label="Remover" onClick={() => set({ socials: d.socials.filter((_, k) => k !== i) })}>
                      ✕
                    </button>
                  </div>
                ))}
                {d.socials.length < 8 && (
                  <button type="button" className="btn btn-sm btn-g" onClick={() => set({ socials: [...d.socials, { type: d.socials.some((s) => s.type === 'instagram') ? 'tiktok' : 'instagram', value: '' }] })}>
                    + Adicionar rede
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'botoes' && (
          <div className="be-sec">
            <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
              Use as setas para mudar a ordem. "Destaque" deixa o botão na cor da marca (use no principal, normalmente o WhatsApp).
            </p>
            {d.buttons.map((b, i) => {
              const t = BUTTON_TYPES.find((x) => x[0] === b.type) || BUTTON_TYPES[BUTTON_TYPES.length - 1];
              return (
                <div key={b.id} className={`be-btn ${b.on === false ? 'off' : ''}`}>
                  <div className="be-btn-h">
                    <span className="be-btn-i">
                      <Svg d={BTN[t[2]] || BTN.link} />
                    </span>
                    <select
                      className="input"
                      value={b.type}
                      onChange={(e) => {
                        const nt = BUTTON_TYPES.find((x) => x[0] === e.target.value)!;
                        setBtn(b.id, { type: nt[0], label: !b.label || BUTTON_TYPES.some((x) => x[1] === b.label) ? nt[1] : b.label });
                      }}
                    >
                      {BUTTON_TYPES.map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="iconbtn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">
                      ↑
                    </button>
                    <button type="button" className="iconbtn" onClick={() => move(i, 1)} disabled={i === d.buttons.length - 1} aria-label="Descer">
                      ↓
                    </button>
                    <button type="button" className="iconbtn" onClick={() => set({ buttons: d.buttons.filter((x) => x.id !== b.id) })} aria-label="Apagar botão">
                      ✕
                    </button>
                  </div>
                  <input className="input" value={b.label} maxLength={50} placeholder="Texto do botão" onChange={(e) => setBtn(b.id, { label: e.target.value })} />
                  <input className="input" value={b.value} placeholder={t[3]} onChange={(e) => setBtn(b.id, { value: e.target.value })} />
                  <div className="be-btn-f">
                    <label>
                      <input type="checkbox" checked={!!b.highlight} onChange={(e) => setBtn(b.id, { highlight: e.target.checked })} /> Destaque
                    </label>
                    <label>
                      <input type="checkbox" checked={b.on !== false} onChange={(e) => setBtn(b.id, { on: e.target.checked })} /> Mostrar
                    </label>
                  </div>
                </div>
              );
            })}
            {d.buttons.length < LIMITS.buttons ? (
              <div className="be-add">
                {BUTTON_TYPES.filter(([k]) => !d.buttons.some((b) => b.type === k) || ['link', 'site'].includes(k))
                  .slice(0, 10)
                  .map(([k, l, ic]) => (
                    <button key={k} type="button" className="btn btn-sm btn-g" onClick={() => set({ buttons: [...d.buttons, { id: newId(), type: k, label: l, value: '', on: true }] })}>
                      <Svg d={BTN[ic]} s={15} /> {l}
                    </button>
                  ))}
              </div>
            ) : (
              <small className="muted">Máximo de {LIMITS.buttons} botões.</small>
            )}
          </div>
        )}

        {tab === 'visual' && (
          <div className="be-sec">
            <div className="field">
              <label>Tema</label>
              <div className="be-themes">
                {THEMES.map(([k, l, desc]) => (
                  <button key={k} type="button" className={`be-theme ${d.theme === k ? 'on' : ''}`} onClick={() => set({ theme: k, ...(THEME_PRESET[k] && d.theme !== k ? THEME_PRESET[k] : {}) })} title={desc}>
                    <span className={`be-theme-sw sw-${k}`} style={{ ['--c' as any]: d.color, ['--c2' as any]: d.color2 }}>
                      <i />
                      <i />
                      <i />
                    </span>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Cor principal</label>
              <div className="be-colors">
                {PALETTE.map((c) => (
                  <button key={c} type="button" className={`swatch ${d.color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ color: c })} aria-label={c} />
                ))}
                <input type="color" value={d.color} onChange={(e) => set({ color: e.target.value })} aria-label="Outra cor" />
              </div>
            </div>
            <div className="field">
              <label>Cor de apoio (degradês e luzes)</label>
              <div className="be-colors">
                {PALETTE.map((c) => (
                  <button key={c} type="button" className={`swatch ${d.color2 === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ color2: c })} aria-label={c} />
                ))}
                <input type="color" value={d.color2} onChange={(e) => set({ color2: e.target.value })} aria-label="Outra cor" />
              </div>
            </div>
            <div className="formgrid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="field">
                <label>Fonte</label>
                <select className="input" value={d.font} onChange={(e) => set({ font: e.target.value })}>
                  {FONTS.map(([f, l]) => (
                    <option key={f} value={f}>
                      {l} ({f})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Ícones do fundo</label>
                <select className="input" value={d.niche} onChange={(e) => set({ niche: e.target.value })}>
                  {Object.entries(NICHE).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>
              <input type="checkbox" checked={d.floating !== false} onChange={(e) => set({ floating: e.target.checked })} /> Mostrar ícones flutuando no fundo
            </label>
          </div>
        )}

        {tab === 'info' && (
          <div className="be-sec">
            <div className="field">
              <label>Endereço (abre no Google Maps)</label>
              <input className="input" value={d.address} onChange={(e) => set({ address: e.target.value })} placeholder="Rua, número, bairro, cidade" />
            </div>
            <div className="field">
              <label>Horário de funcionamento</label>
              <textarea className="input" rows={4} value={d.hours} onChange={(e) => set({ hours: e.target.value })} placeholder={'Seg a sex: 9h às 18h\nSábado: 9h às 13h'} />
            </div>
            <small className="muted">Deixe em branco o que não quiser mostrar.</small>
          </div>
        )}

        {tab === 'fotos' && (
          <div className="be-sec">
            <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
              Até {LIMITS.gallery} fotos (ambiente, trabalhos, produtos). Elas ficam numa grade e abrem em tela cheia.
            </p>
            <div className="be-gal">
              {d.gallery.map((g, i) => (
                <div key={g} className="be-gal-i" style={{ backgroundImage: `url("${g}")` }}>
                  <button type="button" onClick={() => set({ gallery: d.gallery.filter((_, k) => k !== i) })} aria-label="Remover foto">
                    ✕
                  </button>
                </div>
              ))}
              {d.gallery.length < LIMITS.gallery && (
                <button type="button" className="be-gal-add" onClick={() => galRef.current?.click()} disabled={galBusy}>
                  {galBusy ? <span className="spin" /> : '+ Fotos'}
                </button>
              )}
            </div>
            <input ref={galRef} type="file" accept="image/*" multiple hidden onChange={(e) => (addPhotos(e.target.files), (e.target.value = ''))} />
          </div>
        )}
        {client && <p className="muted" style={{ fontSize: 12 }}>As mudanças só vão para a página quando você clicar em Salvar.</p>}
      </div>

      <div className="be-view">
        <div className="be-phone">
          <div className="be-phone-in">
            <BioPage d={d} mode="editor" />
          </div>
        </div>
      </div>
      <button type="button" className="be-toggle btn btn-p" onClick={() => setView(!view)}>
        {view ? 'Voltar a editar' : 'Ver como fica'}
      </button>
    </div>
  );
}
