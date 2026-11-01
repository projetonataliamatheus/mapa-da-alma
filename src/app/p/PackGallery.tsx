'use client';
import { useState } from 'react';

export function PackGallery({ images, name }: { images: string[]; name: string }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <div className="pk-grid">
        {images.map((u, i) => (
          <button key={u + i} type="button" onClick={() => setOpen(u)} aria-label={`Ver prévia ${i + 1} de ${name}`}>
            <img src={u} alt={`${name} — prévia ${i + 1}`} loading={i < 6 ? 'eager' : 'lazy'} />
          </button>
        ))}
      </div>
      {open && (
        <div className="pk-box" role="dialog" aria-label="Prévia ampliada" onClick={() => setOpen(null)}>
          <img src={open} alt="" />
          <button type="button" aria-label="Fechar" onClick={() => setOpen(null)}>
            ✕
          </button>
        </div>
      )}
    </>
  );
}
