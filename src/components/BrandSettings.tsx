'use client';
/* Configurações › Marca do painel (só o Master): nome, frase, logo/ícone, cor, cantos, login e nomes dos menus. Prévia ao vivo. */
import { useState } from 'react';
import { Icon, Ib } from './Icon';
import { Switch, api, toast } from './ui';
import { useBrand, BrandBlock } from './Brand';
import { NAV } from './Shell';
import { sb } from '@/lib/supabase/browser';
import { Brand, BRAND_COLORS, BRAND_ICONS, DEFAULT_BRAND, brandOf } from '@/lib/brand';

async function upload(file: File) {
  if (!/^image\//.test(file.type)) throw new Error('Envie uma imagem (PNG, JPG, SVG ou WebP).');
  if (file.size > 2 * 1024 * 1024) throw new Error('Imagem muito grande (máximo 2 MB).');
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const path = `marca/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await sb().storage.from('publico').upload(path, file, { upsert: false, contentType: file.type, cacheControl: '31536000' });
  if (error) throw new Error(error.message);
  return sb().storage.from('publico').getPublicUrl(path).data.publicUrl;
}

export function BrandSettings() {
  const { saved, preview, commit } = useBrand();
  const [b, setB] = useState<Brand>(saved);
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const dirty = JSON.stringify(brandOf(b)) !== JSON.stringify(saved);

  const set = (patch: Partial<Brand>) => {
    const next = { ...b, ...patch };
    setB(next);
    preview(brandOf(next)); // o painel inteiro muda na hora (só salva ao clicar em Salvar)
  };
  const setMenu = (k: string, v: string) => set({ menu: { ...b.menu, [k]: v } });

  async function save() {
    setBusy(true);
    try {
      const r = await api('/api/settings', 'PATCH', { brand: b });
      const nb = brandOf(r?.brand || b);
      commit(nb);
      setB(nb);
      toast('Marca do painel salva ✨ já vale para toda a equipe');
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }
  function undo() {
    setB(saved);
    preview(null);
  }
  function reset() {
    set({ ...DEFAULT_BRAND, menu: {} });
    toast('Voltou para o padrão. Clique em Salvar para aplicar.');
  }

  return (
    <div className="card" id="marca">
      <div className="card-h">
        <Ib name="spark" tone="acc" size="sm" />
        <h2>Marca do painel</h2>
        <span className="sp muted" style={{ fontSize: 12 }}>
          só o Master vê e altera · muda para toda a equipe
        </span>
      </div>
      <div className="brand-ed">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div className="grid2">
            <div className="field">
              <label>Nome do painel</label>
              <input className="input" maxLength={40} value={b.name} onChange={(e) => set({ name: e.target.value })} placeholder={DEFAULT_BRAND.name} />
            </div>
            <div className="field">
              <label>Frase abaixo do nome</label>
              <input className="input" maxLength={60} value={b.tagline} onChange={(e) => set({ tagline: e.target.value })} placeholder="Ex.: Central de vendas" />
            </div>
          </div>

          <div className="field">
            <label>Logo (opcional, aparece no menu, no login e na aba do navegador)</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
                {up ? <span className="spin" /> : <Icon name="upload" />}
                {up ? 'Enviando…' : b.logo ? 'Trocar logo' : 'Enviar logo'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (!f) return;
                    setUp(true);
                    try {
                      set({ logo: await upload(f) });
                    } catch (er: any) {
                      toast(er.message);
                    }
                    setUp(false);
                  }}
                />
              </label>
              {b.logo && (
                <button type="button" className="btn btn-sm" onClick={() => set({ logo: '' })}>
                  <Icon name="trash" />
                  Tirar logo
                </button>
              )}
              <small className="muted">Quadrada, PNG sem fundo, até 2 MB.</small>
            </div>
          </div>

          {!b.logo && (
            <div className="field">
              <label>Ícone (quando não há logo)</label>
              <div className="brand-icons">
                {BRAND_ICONS.map((i) => (
                  <button key={i} type="button" className={b.icon === i ? 'on' : ''} onClick={() => set({ icon: i })} aria-label={`Ícone ${i}`} aria-pressed={b.icon === i}>
                    <Icon name={i} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="field">
            <label>Cor principal (botões, destaques e menu)</label>
            <div className="brand-swatches">
              {BRAND_COLORS.map(([c, n]) => (
                <button key={c} type="button" className={`brand-sw ${b.color === c ? 'on' : ''}`} style={{ background: c }} title={n} aria-label={n} aria-pressed={b.color === c} onClick={() => set({ color: c })} />
              ))}
              <input type="color" value={/^#[0-9a-f]{6}$/i.test(b.color) ? b.color : DEFAULT_BRAND.color} onChange={(e) => set({ color: e.target.value })} aria-label="Escolher outra cor" style={{ width: 38, height: 32, border: 0, background: 'none', padding: 0, cursor: 'pointer' }} />
              <input className="input mono" style={{ width: 100 }} value={b.color} onChange={(e) => set({ color: e.target.value })} aria-label="Código da cor" />
            </div>
          </div>

          <div className="grid2">
            <div className="field">
              <label>Cantos</label>
              <select className="input" value={b.radius} onChange={(e) => set({ radius: e.target.value as Brand['radius'] })}>
                <option value="compacto">Mais retos</option>
                <option value="padrao">Padrão</option>
                <option value="suave">Mais arredondados</option>
              </select>
            </div>
            <div className="field">
              <label>Ícone com degradê</label>
              <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
                <Switch checked={b.gradient} onChange={(v) => set({ gradient: v })} label="Ícone com degradê" />
              </div>
            </div>
          </div>

          <div className="grid2">
            <div className="field">
              <label>Título da tela de login</label>
              <input className="input" maxLength={60} value={b.login_title} onChange={(e) => set({ login_title: e.target.value })} />
            </div>
            <div className="field">
              <label>Texto da tela de login</label>
              <input className="input" maxLength={140} value={b.login_sub} onChange={(e) => set({ login_sub: e.target.value })} />
            </div>
          </div>

          <div className="field">
            <button type="button" className="btn btn-sm" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} style={{ alignSelf: 'flex-start' }}>
              <Icon name="menu" />
              {menuOpen ? 'Fechar nomes dos menus' : 'Trocar nomes dos menus'}
              {Object.values(b.menu).filter(Boolean).length > 0 && <span className="badge">{Object.values(b.menu).filter(Boolean).length}</span>}
            </button>
            {menuOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
                <small className="muted">Deixe em branco para usar o nome original.</small>
                {NAV.map(([g, items]) => (
                  <div key={g} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input className="input" style={{ fontWeight: 600, maxWidth: 320 }} maxLength={40} placeholder={`Grupo: ${g}`} value={b.menu['g:' + g] || ''} onChange={(e) => setMenu('g:' + g, e.target.value)} aria-label={`Novo nome do grupo ${g}`} />
                    <div className="brand-menu">
                      {items.map(([href, label]) => (
                        <label key={href}>
                          {label}
                          <input className="input" maxLength={40} placeholder={label} value={b.menu[href] || ''} onChange={(e) => setMenu(href, e.target.value)} />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="row-actions">
            <button className="btn btn-p" onClick={save} disabled={busy || !dirty}>
              <Icon name="check" />
              {busy ? 'Salvando…' : 'Salvar marca'}
            </button>
            {dirty && (
              <button className="btn" onClick={undo} disabled={busy}>
                Desfazer
              </button>
            )}
            <button className="btn btn-sm" onClick={reset} disabled={busy} style={{ marginLeft: 'auto' }}>
              <Icon name="refresh" />
              Voltar ao padrão
            </button>
          </div>
        </div>

        <div className="brand-prev" aria-label="Prévia">
          <small className="muted">Prévia (o painel todo já mostra as mudanças; só vale para a equipe depois de salvar)</small>
          <div className="pv-nav">
            <BrandBlock brand={brandOf(b)} />
            <div className="pv-item on">{b.menu['/conversas'] || 'Conversas'}</div>
            <div className="pv-item">{b.menu['/leads'] || 'Leads e funil'}</div>
            <div className="pv-item">{b.menu['/servicos'] || 'Serviços e preços'}</div>
          </div>
          <button type="button" className="btn btn-p" style={{ justifyContent: 'center' }}>
            Botão principal
          </button>
        </div>
      </div>
    </div>
  );
}
