// @ts-nocheck
/**
 * Normaliza textos do orçamento aplicando:
 * - Gênero (masculino/feminino) para palavras como Pronto/Pronta, Bem-vindo/Bem-vinda
 * - Substituições genéricas (consultório → negócio, Tripwire → Estratégia Low Ticket,
 *   Agendamento → Conversão)
 * - Substituição do ticket médio em frases do "Pulo do Gato"
 */
export type QuoteGender = "masculino" | "feminino";

const GENDER_RULES: Array<{ m: string; f: string }> = [
  { m: "Pronto", f: "Pronta" },
  { m: "pronto", f: "pronta" },
  { m: "PRONTO", f: "PRONTA" },
  { m: "Bem-vindo", f: "Bem-vinda" },
  { m: "bem-vindo", f: "bem-vinda" },
  { m: "Bem vindo", f: "Bem vinda" },
  { m: "bem vindo", f: "bem vinda" },
  { m: "BEM-VINDO", f: "BEM-VINDA" },
  { m: "Preparado", f: "Preparada" },
  { m: "preparado", f: "preparada" },
  { m: "PREPARADO", f: "PREPARADA" },
  { m: "Decidido", f: "Decidida" },
  { m: "decidido", f: "decidida" },
  { m: "Animado", f: "Animada" },
  { m: "animado", f: "animada" },
];

const NICHE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bConsultórios?\b/g, "Negócio"],
  [/\bconsultórios?\b/g, "negócio"],
  [/\bConsultas?\b/g, "Conversões"],
  [/\bconsultas?\b/g, "conversões"],
  [/\bAgendamentos?\b/g, "Conversões"],
  [/\bagendamentos?\b/g, "conversões"],
  [/\bAgendamento\b/g, "Conversão"],
  [/\bagendamento\b/g, "conversão"],
  [/\bTaxa de Agendamento\b/gi, "Taxa de Conversão"],
  [/\bestratégia Tripwire\b/gi, "Estratégia Low Ticket"],
  [/\bTripwire\b/g, "Estratégia Low Ticket"],
  [/\btripwire\b/g, "estratégia low ticket"],
  [/\bPacientes?\b/g, "clientes"],
  [/\bpacientes?\b/g, "clientes"],
];

function applyGender(text: string, gender: QuoteGender): string {
  if (!text) return text;
  let out = text;
  // Token "Pronto(a)" / "pronto(a)" → escolhe baseado no gênero
  out = out
    .replace(/\bPronto\(a\)\b/g, gender === "feminino" ? "Pronta" : "Pronto")
    .replace(/\bpronto\(a\)\b/g, gender === "feminino" ? "pronta" : "pronto")
    .replace(/\bPRONTO\(A\)\b/g, gender === "feminino" ? "PRONTA" : "PRONTO")
    .replace(/\bBem[- ]vindo\(a\)\b/g, gender === "feminino" ? "Bem-vinda" : "Bem-vindo")
    .replace(/\bBEM[- ]VINDO\(A\)\b/g, gender === "feminino" ? "BEM-VINDA" : "BEM-VINDO");

  if (gender === "feminino") {
    for (const r of GENDER_RULES) {
      out = out.replace(new RegExp(`\\b${r.m}\\b`, "g"), r.f);
    }
  } else {
    // Se for masculino, garantimos que não haja formas femininas de palavras chave
    for (const r of GENDER_RULES) {
      out = out.replace(new RegExp(`\\b${r.f}\\b`, "g"), r.m);
    }
  }
  return out;
}

function applyNiche(text: string): string {
  if (!text) return text;
  let out = text;
  for (const [re, rep] of NICHE_REPLACEMENTS) out = out.replace(re, rep);
  return out;
}

function applyTicket(text: string, ticketMedio?: string | null): string {
  if (!text || !ticketMedio) return text;
  // Substitui qualquer "R$ XX,YY" / "R$ XX" dentro de um trecho que mencione "ticket"
  // Específico para o "Pulo do Gato": "Se o ticket inicial for R$ 79,00"
  return text.replace(
    /(ticket[^R$]{0,40})R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?/gi,
    (_m, p1) => `${p1}${ticketMedio}`,
  );
}

export function normalizeQuoteText(
  text: string,
  gender: QuoteGender = "masculino",
  ticketMedio?: string | null,
): string {
  if (!text) return text;
  let out = text;
  out = applyNiche(out);
  out = applyGender(out, gender);
  out = applyTicket(out, ticketMedio);
  return out;
}
