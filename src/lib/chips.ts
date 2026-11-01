/** Cores e nomes dos números de WhatsApp (chips): usados no painel inteiro, para toda a equipe. */
export const CHIP_COLORS = ['#16a34a', '#2563eb', '#9333ea', '#ea580c', '#db2777', '#0891b2', '#ca8a04', '#dc2626', '#4f46e5', '#0d9488'];

export type Chip = { id: string; label: string; phone?: string | null; color?: string | null; created_at?: string };

/** Últimos 4 dígitos do número do chip. */
export function chipFinal(n?: { phone?: string | null } | null) {
  const d = String(n?.phone || '').replace(/\D/g, '');
  return d.length >= 4 ? d.slice(-4) : '';
}

/** "Comercial - 3671" */
export function chipName(n?: Chip | null) {
  if (!n) return '';
  const f = chipFinal(n);
  return f ? `${n.label} - ${f}` : n.label;
}

/** Cor escolhida pela equipe ou uma cor fixa pela ordem do número. */
export function chipColor(n: Chip | null | undefined, index = 0) {
  if (n?.color && /^#[0-9a-f]{6}$/i.test(n.color)) return n.color;
  return CHIP_COLORS[Math.abs(index) % CHIP_COLORS.length];
}
