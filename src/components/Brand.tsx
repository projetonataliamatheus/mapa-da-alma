'use client';
/* Marca do painel no navegador: nome, ícone/logo e cores. A tela de Configurações troca ao vivo (prévia) e salva. */
import { createContext, useContext, useEffect, useState } from 'react';
import { Icon } from './Icon';
import { Brand, DEFAULT_BRAND, brandCss } from '@/lib/brand';

type Ctx = { brand: Brand; saved: Brand; preview: (b: Brand | null) => void; commit: (b: Brand) => void };
const BrandCtx = createContext<Ctx>({ brand: DEFAULT_BRAND, saved: DEFAULT_BRAND, preview: () => {}, commit: () => {} });
export const useBrand = () => useContext(BrandCtx);

export function BrandProvider({ initial, children }: { initial: Brand; children: React.ReactNode }) {
  const [saved, setSaved] = useState<Brand>(initial);
  const [draft, setDraft] = useState<Brand | null>(null);
  const brand = draft || saved;
  useEffect(() => {
    // aba do navegador e ícone acompanham a marca
    if (!document.title || document.title === saved.name || document.title === DEFAULT_BRAND.name) document.title = brand.name;
    if (brand.logo) {
      let l = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
      if (!l) {
        l = document.createElement('link');
        l.rel = 'icon';
        document.head.appendChild(l);
      }
      l.href = brand.logo;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand.name, brand.logo]);
  return (
    <BrandCtx.Provider value={{ brand, saved, preview: setDraft, commit: (b) => (setSaved(b), setDraft(null)) }}>
      <style id="brand-css" dangerouslySetInnerHTML={{ __html: brandCss(brand) }} />
      {children}
    </BrandCtx.Provider>
  );
}

/** Ícone/logo + nome + frase da marca (menu lateral e login). */
export function BrandBlock({ brand: b }: { brand?: Brand }) {
  const ctx = useBrand();
  const brand = b || ctx.brand;
  return (
    <div className="brand">
      {brand.logo ? (
        <span className="brand-mark brand-logo">
          <img src={brand.logo} alt="" />
        </span>
      ) : (
        <span className="brand-mark">
          <Icon name={brand.icon || 'radar'} />
        </span>
      )}
      <div style={{ minWidth: 0 }}>
        <b>{brand.name}</b>
        {brand.tagline && <small>{brand.tagline}</small>}
      </div>
    </div>
  );
}
