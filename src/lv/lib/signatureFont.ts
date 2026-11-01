// @ts-nocheck
/** URL da fonte manuscrita usada como representação de assinatura */
const FONT_PATH = "/fonts/brother-signature.otf";

export const SIGNATURE_FONT_URL =
  typeof window !== "undefined" ? `${window.location.origin}${FONT_PATH}` : FONT_PATH;

/** Nome da família a ser usada em style/fontFamily */
export const SIGNATURE_FONT_FAMILY = "'Brother Signature', 'Segoe Script', cursive";

/** CSS @font-face — para injetar em janelas de impressão / documentos externos */
export const SIGNATURE_FONT_FACE_CSS = `@font-face{font-family:'Brother Signature';src:url('${SIGNATURE_FONT_URL}') format('opentype');font-display:swap;}`;

/**
 * Regra de ouro: a assinatura sempre exibe o nome com apenas a
 * primeira letra de cada palavra em maiúscula.
 * "MATHEUS RANGEL" -> "Matheus Rangel"
 */
export function toSignatureCase(name?: string | null): string {
  if (!name) return "";
  return name
    .trim()
    .toLocaleLowerCase("pt-BR")
    .split(/\s+/)
    .map((w) => {
      // preserva partículas comuns em minúsculo (da, de, do, dos, das, e)
      if (["da", "de", "do", "dos", "das", "e"].includes(w)) return w;
      return w.charAt(0).toLocaleUpperCase("pt-BR") + w.slice(1);
    })
    .join(" ");
}
