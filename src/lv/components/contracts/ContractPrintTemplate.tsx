// @ts-nocheck
"use client";
import { SIGNATURE_FONT_FACE_CSS, SIGNATURE_FONT_FAMILY, toSignatureCase } from "@/lv/lib/signatureFont";
/**
 * Modelo de impressão / PDF para contratos — Premium Apple (Azul, Verde, Preto, Cinza).
 * Layout idêntico ao modelo de referência: hero com círculos decorativos + badge
 * "✓ ASSINADO", partes em cartões lado a lado, cada cláusula em seu próprio card,
 * toolbar superior com botão Imprimir + bolinhas para trocar a cor antes de imprimir.
 */
import type { ReactNode } from "react";

export type ContractTheme = "apple-blue" | "apple-green" | "apple-black" | "apple-gray";

export const CONTRACT_THEMES: { id: ContractTheme; name: string; desc: string; swatch: string }[] = [
  { id: "apple-blue",  name: "Premium Apple · Azul",  desc: "Faixa gradiente azul, cartão de valor destacado", swatch: "linear-gradient(135deg,#1e3a8a,#3b82f6)" },
  { id: "apple-green", name: "Premium Apple · Verde", desc: "Mesma diagramação em verde esmeralda",           swatch: "linear-gradient(135deg,#065f46,#10b981)" },
  { id: "apple-black", name: "Premium Apple · Preto", desc: "Elegante em preto grafite",                       swatch: "linear-gradient(135deg,#0a0a0a,#2d2d2d)" },
  { id: "apple-gray",  name: "Premium Apple · Cinza", desc: "Corporativo em cinza chumbo",                     swatch: "linear-gradient(135deg,#334155,#64748b)" },
];

export const CONTRACT_THEME_TOKENS: Record<ContractTheme, { start: string; end: string; accent: string; soft: string; ring: string; text: string; chip: string }> = {
  "apple-blue":  { start: "#1e3a8a", end: "#3b82f6", accent: "#2563eb", soft: "#eff6ff", ring: "#dbeafe", text: "#1e3a8a", chip: "#10b981" },
  "apple-green": { start: "#064e3b", end: "#10b981", accent: "#059669", soft: "#ecfdf5", ring: "#d1fae5", text: "#064e3b", chip: "#10b981" },
  "apple-black": { start: "#0a0a0a", end: "#2d2d2d", accent: "#111827", soft: "#f5f5f5", ring: "#e5e5e5", text: "#0a0a0a", chip: "#10b981" },
  "apple-gray":  { start: "#334155", end: "#64748b", accent: "#475569", soft: "#f1f5f9", ring: "#e2e8f0", text: "#1e293b", chip: "#10b981" },
};

const FONT = `-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Helvetica Neue", Arial, sans-serif`;

interface ContractPrintData {
  title: string;
  number: string;
  date: string;
  clientName: string;
  clientDocument?: string;
  clientResponsible?: string;
  clientAddress?: string;
  clientEmail?: string;
  clientPhone?: string;
  contractorName: string;
  contractorDocument?: string;
  contractorResponsible?: string;
  contractorAddress?: string;
  contractorEmail?: string;
  contractorPhone?: string;
  contractorCityUf?: string;
  contractorWebsite?: string;
  planName?: string;
  totalValue?: string;
  clientSignatureImg?: string | null;
  providerSignatureImg?: string | null;
  bodyHtml: string;
  documentHash?: string;
  isSigned?: boolean;
}

interface ContractPrintOptions {
  /** Mostra a barra superior com bolinhas de cor + botão imprimir. */
  toolbar?: boolean;
  /** Remove respiros externos para embutir o mesmo contrato dentro da página pública. */
  embedded?: boolean;
}

const swatchDot = (id: ContractTheme) => {
  const t = CONTRACT_THEME_TOKENS[id];
  return `background: linear-gradient(135deg, ${t.start}, ${t.end});`;
};

export function renderContractPrintHtml(theme: ContractTheme, data: ContractPrintData, options: ContractPrintOptions = {}): string {
  const t = CONTRACT_THEME_TOKENS[theme];
  const signed = data.isSigned !== false && !!data.clientSignatureImg;
  const showToolbar = options.toolbar !== false;
  const embedded = !!options.embedded;

  // Subtitle "CNPJ ... · Cidade/UF"
  const subLine = [data.contractorDocument ? `CNPJ ${data.contractorDocument}` : "", data.contractorCityUf]
    .filter(Boolean).join(" · ");

  const dots = CONTRACT_THEMES.map(th => `
    <button data-theme="${th.id}" title="${th.name}" class="dot ${th.id === theme ? "active" : ""}" style="${swatchDot(th.id)}"></button>
  `).join("");

  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8" />
<title>${escapeHtml(data.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  ${SIGNATURE_FONT_FACE_CSS}
  :root {
    --t-start: ${t.start};
    --t-end: ${t.end};
    --t-accent: ${t.accent};
    --t-soft: ${t.soft};
    --t-ring: ${t.ring};
  }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  html, body { margin:0; padding:0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { background:${embedded ? "transparent" : "#f1f5f9"}; font-family:${FONT}; color:#0f172a; padding-top:${showToolbar ? "56px" : "0"}; }

  /* Toolbar */
  .toolbar { position:fixed; top:0; left:0; right:0; height:56px; background:#0f172a; color:#fff; display:flex; align-items:center; justify-content:space-between; padding: 0 20px; z-index: 999; box-shadow: 0 6px 20px rgba(0,0,0,.15); }
  .toolbar .brand { font-size:13px; font-weight:600; letter-spacing:.3px; opacity:.9; }
  .toolbar .actions { display:flex; align-items:center; gap:14px; }
  .toolbar .dots { display:flex; align-items:center; gap:10px; }
  .toolbar .dot { width:30px; height:30px; border-radius:999px; border:2px solid rgba(255,255,255,0.35); cursor:pointer; transition: transform .15s, border-color .15s, box-shadow .15s; padding:0; }
  .toolbar .dot:hover { transform: scale(1.12); }
  .toolbar .dot.active { border-color:#fff; box-shadow: 0 0 0 3px rgba(255,255,255,0.3); transform: scale(1.08); }
  .toolbar .btn { background:#fff; color:#0f172a; border:0; padding:9px 18px; border-radius:999px; font-weight:600; font-size:13px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; }
  .toolbar .btn:hover { background:#f1f5f9; }

  .page { max-width: 860px; margin: ${embedded ? "0 auto" : "24px auto"}; background:#fff; border-radius: 22px; overflow:hidden; box-shadow: 0 30px 60px -20px rgba(15,23,42,0.18); padding-bottom: 8px; }

  @page { size: A4; margin: 10mm; }

  @media print {
    html, body { background:#fff !important; padding-top:0 !important; }
    body { padding-top:0 !important; }
    .toolbar { display:none !important; }
    .page { box-shadow:none !important; margin:0 auto !important; border-radius:0 !important; max-width:100% !important; width:100% !important; }
    .hero { border-radius:0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .hero, .footer, .party-card.contratante, .clause-card, .party-card, .value-card, .sign .col, .hero .status { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .clause-card, .party-card, .value-card, .sign .col { break-inside: avoid; page-break-inside: avoid; }
    .hero .c1, .hero .c2, .hero .c3 { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }

  /* HERO */
  .hero { background: linear-gradient(135deg, var(--t-start) 0%, var(--t-end) 100%); color:#fff; padding: 38px 44px 34px; position:relative; overflow:hidden; border-radius: 22px 22px 0 0; }
  .hero .c1 { position:absolute; width:340px; height:340px; border-radius:50%; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.22), rgba(255,255,255,0) 60%); top:-90px; right:-80px; }
  .hero .c2 { position:absolute; width:180px; height:180px; border-radius:50%; background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.12), rgba(255,255,255,0) 60%); top:60px; right:160px; }
  .hero .c3 { position:absolute; width:120px; height:120px; border-radius:50%; background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.10), rgba(255,255,255,0) 60%); bottom:-30px; right:60px; }
  .hero .kicker { font-size:11px; letter-spacing:3px; text-transform:uppercase; opacity:.9; font-weight:600; position:relative; }
  .hero h1 { font-size: 30px; font-weight:700; margin:8px 0 6px; letter-spacing:-0.5px; line-height:1.2; position:relative; max-width: 70%; }
  .hero .sub { font-size:12.5px; opacity:.92; position:relative; }
  .hero .badge { position:absolute; top: 38px; right: 44px; text-align:right; z-index: 2; }
  .hero .badge .lbl { font-size:10px; letter-spacing:2.5px; text-transform:uppercase; opacity:.85; font-weight:600; }
  .hero .badge .num { font-size: 30px; font-weight:800; margin-top:2px; letter-spacing:-.5px; }
  .hero .badge .date { font-size:12px; opacity:.9; margin-top:2px; }
  .hero .status { display:inline-flex; align-items:center; gap:6px; margin-top:10px; background:${signed ? "#10b981" : "rgba(255,255,255,0.18)"}; color:#fff; padding:6px 14px; border-radius:999px; font-size:11.5px; font-weight:700; letter-spacing:.5px; }
  .hero .status svg { width:12px; height:12px; }

  /* Parties */
  .parties { margin: 22px 32px 0; display:grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .party-card { border:1px solid #e2e8f0; border-radius: 14px; padding: 16px 18px; background:#fff; }
  .party-card.contratante { background: var(--t-soft); border-color: var(--t-ring); }
  .party-card .role { font-size:10.5px; letter-spacing:2.5px; text-transform:uppercase; font-weight:700; color: var(--t-accent); margin-bottom:8px; }
  .party-card .name { font-size:15px; font-weight:700; color:#0f172a; margin-bottom:6px; }
  .party-card .row { font-size:12px; color:#334155; line-height:1.7; }
  .party-card .row strong { color:#0f172a; font-weight:700; }

  /* Body clauses as cards */
  .body { padding: 22px 32px 8px; }
  .clause-card { border:1px solid #e2e8f0; border-radius: 14px; padding: 16px 20px; background:#fff; margin-bottom: 12px; }
  .clause-card h3 { font-size: 12px; font-weight:800; text-transform:uppercase; letter-spacing:1.2px; color: var(--t-accent); margin: 0 0 10px; }
  .clause-card p { margin: 0 0 8px; font-size: 13px; line-height:1.75; color:#1f2937; }
  .clause-card p:last-child { margin-bottom:0; }
  .clause-card strong { color:#0f172a; font-weight:700; }

  /* Signatures */
  .sign { padding: 8px 32px 24px; }
  .sign .row { display:grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 8px; }
  .sign .col { text-align:center; border:1px solid #e2e8f0; border-radius:14px; padding:14px; background:#fff; }
  .sign .pad { height: 80px; display:flex; align-items:flex-end; justify-content:center; }
  .sign .handsign { font-family: ${SIGNATURE_FONT_FAMILY}; font-size: 40px; line-height: 1.1; color: #0f172a; padding-bottom: 4px; white-space: nowrap; }
  .sign img { max-height: 80px; object-fit:contain; }
  .sign .line { border-top: 1.5px solid #94a3b8; margin-top: 6px; padding-top: 8px; font-size: 12px; }
  .sign .role { font-size: 10.5px; color: var(--t-accent); text-transform:uppercase; letter-spacing:1.5px; font-weight:700; }

  /* Footer band */
  .footer-wrap { padding: 10px 24px 20px; }
  .footer { background: linear-gradient(135deg, var(--t-start) 0%, var(--t-end) 100%); color:#fff; padding: 14px 22px; display:flex; align-items:center; justify-content:space-between; font-size: 12px; letter-spacing:.2px; border-radius: 14px; box-shadow: 0 10px 24px -12px rgba(15,23,42,.35); }
  .footer .lft { display:flex; align-items:center; gap:8px; font-weight:600; }
  .footer .rgt { display:flex; align-items:center; gap:8px; opacity:.95; font-weight:500; }
  .footer .sep { opacity:.55; margin: 0 4px; }
  .footer .pin { display:inline-flex; width:14px; height:14px; align-items:center; justify-content:center; }
  .footer .pin svg { width:14px; height:14px; }
  .hash { text-align:center; font-family:'JetBrains Mono', monospace; font-size:10px; color:#94a3b8; padding: 4px 24px 16px; letter-spacing:.5px; }
</style>
</head><body>

${showToolbar ? `<div class="toolbar">
  <div class="brand">${escapeHtml(data.contractorName)} · Contrato Digital</div>
  <div class="actions">
    <div class="dots" id="dots">${dots}</div>
    <button class="btn" onclick="window.print()">🖨️ Imprimir</button>
  </div>
</div>` : ""}

<div class="page">
  <div class="hero">
    <div class="c1"></div><div class="c2"></div><div class="c3"></div>
    <div class="kicker">${escapeHtml(data.contractorName)} · Contrato Digital</div>
    <h1>${escapeHtml(data.title)}</h1>
    ${subLine ? `<div class="sub">${escapeHtml(subLine)}</div>` : ""}
    <div class="badge">
      <div class="lbl">Nº do Contrato</div>
      <div class="num">${escapeHtml(data.number)}</div>
      <div class="date">${escapeHtml(data.date)}</div>
      <div class="status">
        ${signed
          ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> ASSINADO`
          : `AGUARDANDO ASSINATURA`}
      </div>
    </div>
  </div>

  <div class="parties">
    <div class="party-card contratante">
      <div class="role">Contratante</div>
      <div class="name">${escapeHtml(data.clientName)}</div>
      ${data.clientDocument ? `<div class="row"><strong>CNPJ/CPF:</strong> ${escapeHtml(data.clientDocument)}</div>` : ""}
      ${data.clientResponsible && data.clientResponsible !== data.clientName ? `<div class="row"><strong>Representante:</strong> ${escapeHtml(data.clientResponsible)}</div>` : ""}
      ${data.clientEmail ? `<div class="row"><strong>E-mail:</strong> ${escapeHtml(data.clientEmail)}</div>` : ""}
      ${data.clientPhone ? `<div class="row"><strong>Telefone:</strong> ${escapeHtml(data.clientPhone)}</div>` : ""}
      ${data.clientAddress ? `<div class="row"><strong>Endereço:</strong> ${escapeHtml(data.clientAddress)}</div>` : ""}
    </div>
    <div class="party-card">
      <div class="role">Contratada</div>
      <div class="name">${escapeHtml(data.contractorName)}</div>
      ${data.contractorDocument ? `<div class="row"><strong>CNPJ/CPF:</strong> ${escapeHtml(data.contractorDocument)}</div>` : ""}
      ${data.contractorResponsible ? `<div class="row"><strong>Representante:</strong> ${escapeHtml(data.contractorResponsible)}</div>` : ""}
      ${data.contractorEmail ? `<div class="row"><strong>E-mail:</strong> ${escapeHtml(data.contractorEmail)}</div>` : ""}
      ${data.contractorPhone ? `<div class="row"><strong>Telefone:</strong> ${escapeHtml(data.contractorPhone)}</div>` : ""}
      ${data.contractorAddress ? `<div class="row"><strong>Endereço:</strong> ${escapeHtml(data.contractorAddress)}${data.contractorCityUf ? " — " + escapeHtml(data.contractorCityUf) : ""}</div>` : ""}
    </div>
  </div>

  <div class="body">
    ${data.bodyHtml}
  </div>

  <div class="sign">
    <div class="row">
      <div class="col">
        <div class="pad">${data.clientSignatureImg ? `<span class="handsign">${escapeHtml(toSignatureCase(data.clientResponsible || data.clientName))}</span>` : `<span style="font-size:11px;color:#94a3b8;font-style:italic;">Aguardando assinatura</span>`}</div>
        <div class="line">
          <div><strong>${escapeHtml(data.clientName)}</strong></div>
          <div class="role">Contratante</div>
        </div>
      </div>
      <div class="col">
        <div class="pad">${data.providerSignatureImg ? `<span class="handsign">${escapeHtml(toSignatureCase(data.contractorResponsible || data.contractorName))}</span>` : `<span style="font-size:11px;color:#94a3b8;font-style:italic;">Aguardando assinatura</span>`}</div>
        <div class="line">
          <div><strong>${escapeHtml(data.contractorName)}</strong></div>
          <div class="role">Contratada</div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer-wrap">
    <div class="footer">
      <div class="lft">
        <span class="pin"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-7.58 7-13a7 7 0 1 0-14 0c0 5.42 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg></span>
        <span>${escapeHtml(data.contractorCityUf || "")}${data.contractorCityUf && data.date ? ", " : ""}${escapeHtml(data.date || "")}</span>
      </div>
      <div class="rgt">
        <span><strong>Contrato ${escapeHtml(data.number || "")}</strong></span>
        ${data.contractorWebsite ? `<span class="sep">·</span><span>${escapeHtml(data.contractorWebsite)}</span>` : ""}
      </div>
    </div>
    ${data.documentHash ? `<div class="hash">HASH · ${escapeHtml(data.documentHash.slice(0, 40))}…</div>` : ""}
  </div>
</div>

<script>
  // Troca de tema em tempo real (sem recarregar) — apenas atualiza as variáveis CSS.
  const THEME_TOKENS = ${JSON.stringify(CONTRACT_THEME_TOKENS)};
  document.getElementById("dots")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button.dot");
    if (!btn) return;
    const th = btn.getAttribute("data-theme");
    const tok = THEME_TOKENS[th];
    if (!tok) return;
    const r = document.documentElement.style;
    r.setProperty("--t-start",  tok.start);
    r.setProperty("--t-end",    tok.end);
    r.setProperty("--t-accent", tok.accent);
    r.setProperty("--t-soft",   tok.soft);
    r.setProperty("--t-ring",   tok.ring);
    document.querySelectorAll("#dots .dot").forEach(d => d.classList.remove("active"));
    btn.classList.add("active");
    // Sinaliza ao opener (a prévia dentro do admin acompanha a mesma cor)
    if (window.opener && !window.opener.closed) {
      try { window.opener.postMessage({ type: "contract-theme-change", theme: th }, "*"); } catch(_){}
    }
  });
</script>

</body></html>`;
}

function escapeHtml(s: string | undefined | null): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const normalizeContractText = (text: string) =>
  (text || "")
    .replace(/\\\*/g, "*")
    .replace(/\\_/g, "_")
    .replace(/\r\n/g, "\n");

const stripMarkdownHeading = (line: string) =>
  line.replace(/^\s{0,3}#{1,6}\s*/, "").trim();

const cleanStructuralLine = (line: string) =>
  stripMarkdownHeading(line)
    .replace(/\*/g, "")
    .trim();

const isHorizontalSeparator = (line: string) => /^[-–—_]{3,}$/.test(line.trim());

/**
 * Converte o corpo do contrato (markdown-lite) para HTML.
 * Cada CLÁUSULA vira um card independente (.clause-card). O restante do texto
 * (bloco de "CONTRATANTE:" / "CONTRATADA:" no topo) é descartado porque as
 * partes já aparecem em cartões dedicados no hero.
 */
export function contractBodyToHtml(text: string): string {
  const lines = normalizeContractText(text).split("\n");
  const inline = (s: string) =>
    escapeHtml(stripMarkdownHeading(s)).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Detecta linhas de cláusula mesmo quando estão em Markdown (# / ##) ou **negrito**.
  const isClauseLine = (l: string) =>
    /^\s*(CLÁUSULA|CLAUSULA)\s+/i.test(cleanStructuralLine(l));
  // Detecta linhas de dados de partes (bloco de topo do contrato) para descartá-las,
  // já que Contratante/Contratada aparecem em cartões dedicados.
  const isPartyMetaLine = (l: string) => {
    const s = cleanStructuralLine(l).toUpperCase();
    if (!s) return false;
    return (
      s === "CONTRATANTE" ||
      s === "CONTRATADA" ||
      s.startsWith("CONTRATO DE ") ||
      s.startsWith("EMPRESA") ||
      s.startsWith("RAZÃO SOCIAL") ||
      s.startsWith("RAZAO SOCIAL") ||
      s.startsWith("CPF/CNPJ") ||
      s.startsWith("CNPJ") ||
      s.startsWith("CPF") ||
      s.startsWith("RESPONSÁVEL") ||
      s.startsWith("RESPONSAVEL") ||
      s.startsWith("E-MAIL") ||
      s.startsWith("EMAIL") ||
      s.startsWith("TELEFONE") ||
      s.startsWith("WHATSAPP") ||
      s.startsWith("ENDEREÇO") ||
      s.startsWith("ENDERECO")
    );
  };

  // Encontra o índice da primeira "CLÁUSULA" — tudo antes é ignorado
  const firstClauseIdx = lines.findIndex(isClauseLine);
  const start = firstClauseIdx >= 0 ? firstClauseIdx : 0;

  const cards: string[] = [];
  let curTitle = "";
  let curBody: string[] = [];

  const flush = () => {
    if (!curTitle && curBody.length === 0) return;
    const paras: string[] = [];
    let buf: string[] = [];
    const pushPara = () => {
      if (buf.length) { paras.push(`<p>${buf.map(inline).join("<br/>")}</p>`); buf = []; }
    };
    for (const l of curBody) {
      if (!l.trim()) pushPara();
      else buf.push(l);
    }
    pushPara();
    // Remove os asteriscos do título antes de renderizar (fica em caixa alta pelo CSS)
    const cleanTitle = curTitle.replace(/\*/g, "").trim();
    cards.push(`<div class="clause-card">${cleanTitle ? `<h3>${inline(cleanTitle)}</h3>` : ""}${paras.join("")}</div>`);
    curTitle = ""; curBody = [];
  };

  for (let i = start; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (isClauseLine(line)) {
      flush();
      curTitle = cleanStructuralLine(line);
    } else if (isPartyMetaLine(line)) {
      // Descarta linhas remanescentes de dados de partes que porventura estejam entre cláusulas
      continue;
    } else if (isHorizontalSeparator(line)) {
      continue;
    } else {
      curBody.push(raw);
    }
  }
  flush();

  // Se nenhuma cláusula foi detectada, cai em fallback simples: um único card
  if (cards.length === 0) {
    const html = lines.map((l) => l.trim() ? `<p>${inline(l)}</p>` : "").join("");
    return `<div class="clause-card">${html}</div>`;
  }
  return cards.join("\n");
}

/* -------------------- Picker component -------------------- */

interface PickerProps {
  value: ContractTheme;
  onChange: (v: ContractTheme) => void;
  className?: string;
}

export function ContractThemePicker({ value, onChange, className }: PickerProps) {
  return (
    <div className={className}>
      <div className="text-xs uppercase font-semibold text-slate-500 mb-2 tracking-wide">
        Modelo visual do PDF / Impressão
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {CONTRACT_THEMES.map((t) => {
          const active = t.id === value;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={
                "text-left rounded-xl border p-2.5 transition-all bg-white hover:shadow-sm " +
                (active ? "border-emerald-500 ring-2 ring-emerald-500/30 shadow" : "border-slate-200")
              }
            >
              <div className="h-10 rounded-lg mb-2" style={{ background: t.swatch }} />
              <div className="text-[12px] font-semibold text-slate-800 leading-tight">{t.name}</div>
              <div className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">{t.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------- Inline color dots (accompany Imprimir button) -------------------- */

interface DotsProps {
  value: ContractTheme;
  onChange: (v: ContractTheme) => void;
  className?: string;
}

/** Pequenas bolinhas coloridas que aparecem ao lado do botão de imprimir. */
export function ContractThemeDots({ value, onChange, className }: DotsProps) {
  return (
    <div className={"inline-flex items-center gap-1.5 " + (className || "")}>
      {CONTRACT_THEMES.map((th) => {
        const active = th.id === value;
        return (
          <button
            key={th.id}
            type="button"
            title={th.name}
            onClick={() => onChange(th.id)}
            className={
              "w-9 h-9 rounded-full border-2 transition-all shadow-md " +
              (active ? "border-slate-900 ring-2 ring-slate-900/25 scale-110" : "border-white ring-1 ring-slate-300 hover:scale-105")
            }
            style={{ background: th.swatch }}
          />
        );
      })}
    </div>
  );
}
