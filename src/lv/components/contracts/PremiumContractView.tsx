// @ts-nocheck
"use client";
import type { ReactNode } from "react";
import { CONTRACT_THEME_TOKENS, type ContractTheme } from "@/lv/components/contracts/ContractPrintTemplate";
import { SIGNATURE_FONT_FAMILY, toSignatureCase } from "@/lv/lib/signatureFont";

export interface PremiumPartyInfo {
  name: string;
  document?: string;
  responsible?: string;
  email?: string;
  phone?: string;
  address?: string;
  cityUf?: string;
}

interface PremiumContractViewProps {
  theme: ContractTheme;
  title: string;
  number: string;
  date: string;
  client: PremiumPartyInfo;
  contractor: PremiumPartyInfo;
  body: string;
  clientSignatureImg?: string | null;
  providerSignatureImg?: string | null;
  documentHash?: string | null;
  signed?: boolean;
}

interface ClauseBlock {
  title: string;
  body: string[];
}

const normalizeMarkdown = (text: string) =>
  (text || "")
    .replace(/\\\*/g, "*")
    .replace(/\\_/g, "_")
    .replace(/\r\n/g, "\n");

const stripMarkdownHeading = (text: string) => text.replace(/^\s{0,3}#{1,6}\s*/, "").trim();

const cleanTitle = (text: string) => stripMarkdownHeading(text).replace(/\*/g, "").trim();

const isClauseLine = (line: string) => /^\s*(CLÁUSULA|CLAUSULA)\s+/i.test(cleanTitle(line));

const isHorizontalSeparator = (line: string) => /^[-–—_]{3,}$/.test(line.trim());

const isPartyMetaLine = (line: string) => {
  const s = cleanTitle(line).toUpperCase();
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

function parseClauses(text: string): ClauseBlock[] {
  const lines = normalizeMarkdown(text).split("\n");
  const firstClause = lines.findIndex(isClauseLine);
  const start = firstClause >= 0 ? firstClause : 0;
  const blocks: ClauseBlock[] = [];
  let current: ClauseBlock | null = null;

  const flush = () => {
    if (current && (current.title || current.body.some((line) => line.trim()))) blocks.push(current);
    current = null;
  };

  for (let i = start; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (isClauseLine(line)) {
      flush();
      current = { title: cleanTitle(line), body: [] };
      continue;
    }
    if (isPartyMetaLine(line)) continue;
    if (isHorizontalSeparator(line)) continue;
    if (!current) current = { title: firstClause >= 0 ? "" : "Contrato", body: [] };
    current.body.push(raw);
  }
  flush();
  return blocks.length ? blocks : [{ title: "Contrato", body: lines }];
}

function InlineText({ text }: { text: string }) {
  const normalized = normalizeMarkdown(text);
  const parts = normalized.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={idx}>{part.slice(2, -2)}</strong>;
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
}

function ClauseBody({ lines }: { lines: string[] }) {
  const nodes: ReactNode[] = [];
  let paragraph: string[] = [];

  const pushParagraph = () => {
    if (!paragraph.length) return;
    nodes.push(
      <p key={`p-${nodes.length}`} className="mb-3 text-[13px] leading-7 text-slate-700 last:mb-0">
        {paragraph.map((line, idx) => (
          <span key={idx}>
            {idx > 0 && <br />}
            <InlineText text={line.trim()} />
          </span>
        ))}
      </p>,
    );
    paragraph = [];
  };

  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) {
      pushParagraph();
      return;
    }
    if (/^[•-]\s+/.test(line)) {
      pushParagraph();
      nodes.push(
        <div key={`b-${nodes.length}`} className="mb-1.5 flex gap-2 text-[13px] leading-6 text-slate-700">
          <span className="mt-[1px] font-bold" style={{ color: "var(--contract-accent)" }}>•</span>
          <span><InlineText text={line.replace(/^[•-]\s+/, "")} /></span>
        </div>,
      );
      return;
    }
    paragraph.push(raw);
  });
  pushParagraph();

  return <>{nodes}</>;
}

function PartyCard({ role, party, highlighted }: { role: string; party: PremiumPartyInfo; highlighted?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${highlighted ? "border-[var(--contract-ring)] bg-[var(--contract-soft)]" : "border-slate-200 bg-white"}`}>
      <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.22em]" style={{ color: "var(--contract-accent)" }}>{role}</div>
      <div className="mb-2 text-[16px] font-extrabold leading-snug text-slate-950">{party.name || "—"}</div>
      {party.document && <InfoRow label="CNPJ/CPF" value={party.document} />}
      {party.responsible && party.responsible !== party.name && <InfoRow label="Representante" value={party.responsible} />}
      {party.email && <InfoRow label="E-mail" value={party.email} />}
      {party.phone && <InfoRow label="Telefone" value={party.phone} />}
      {party.address && <InfoRow label="Endereço" value={`${party.address}${party.cityUf ? ` — ${party.cityUf}` : ""}`} />}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-[12px] leading-6 text-slate-600">
      <strong className="font-bold text-slate-950">{label}:</strong> {value}
    </div>
  );
}

export function PremiumContractView({
  theme,
  title,
  number,
  date,
  client,
  contractor,
  body,
  clientSignatureImg,
  providerSignatureImg,
  documentHash,
  signed,
}: PremiumContractViewProps) {
  const t = CONTRACT_THEME_TOKENS[theme];
  const clauses = parseClauses(body);
  const subtitle = [contractor.document ? `CNPJ ${contractor.document}` : "", contractor.cityUf].filter(Boolean).join(" · ");

  return (
    <article
      className="mx-auto overflow-hidden rounded-[26px] bg-white pb-2 shadow-2xl shadow-slate-300/60 ring-1 ring-slate-200"
      style={{
        maxWidth: 860,
        ["--contract-start" as string]: t.start,
        ["--contract-end" as string]: t.end,
        ["--contract-accent" as string]: t.accent,
        ["--contract-soft" as string]: t.soft,
        ["--contract-ring" as string]: t.ring,
      }}
    >
      <section className="relative overflow-hidden px-7 py-9 text-white sm:px-11" style={{ background: `linear-gradient(135deg, ${t.start} 0%, ${t.end} 100%)` }}>
        <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-white/20 blur-[1px]" />
        <div className="absolute right-28 top-14 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 right-14 h-28 w-28 rounded-full bg-white/10" />
        <div className="relative z-10 max-w-[68%] text-[11px] font-bold uppercase tracking-[0.25em] opacity-90">{contractor.name} · Contrato Digital</div>
        <h2 className="relative z-10 mt-2 max-w-[72%] text-[25px] font-extrabold leading-tight sm:text-[30px]">{title}</h2>
        {subtitle && <div className="relative z-10 mt-2 text-[12.5px] opacity-90">{subtitle}</div>}
        <div className="absolute right-7 top-8 z-10 text-right sm:right-11">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] opacity-80">Nº do Contrato</div>
          <div className="mt-1 text-[28px] font-black leading-none">{number}</div>
          <div className="mt-1 text-[12px] opacity-90">{date}</div>
          <div className="mt-3 inline-flex rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-white" style={{ background: signed ? "#10b981" : "rgba(255,255,255,.18)" }}>
            {signed ? "✓ Assinado" : "Aguardando assinatura"}
          </div>
        </div>
      </section>

      <section className="grid gap-4 px-5 pt-6 sm:grid-cols-2 sm:px-8">
        <PartyCard role="Contratante" party={client} highlighted />
        <PartyCard role="Contratada" party={contractor} />
      </section>

      <section className="space-y-3 px-5 py-6 sm:px-8">
        {clauses.map((clause, idx) => (
          <div key={`${clause.title}-${idx}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {clause.title && <h3 className="mb-3 text-[12px] font-black uppercase tracking-[0.12em]" style={{ color: t.accent }}>{clause.title}</h3>}
            <ClauseBody lines={clause.body} />
          </div>
        ))}
      </section>

      <section className="px-5 pb-6 sm:px-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <SignatureBox label="Contratante" name={client.name} signatureName={client.responsible || client.name} img={clientSignatureImg} />
          <SignatureBox label="Contratada" name={contractor.name} signatureName={contractor.responsible || contractor.name} img={providerSignatureImg} />
        </div>
      </section>

      <section className="px-5 pb-5 sm:px-6">
        <div className="flex flex-col gap-2 rounded-2xl px-5 py-4 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between" style={{ background: `linear-gradient(135deg, ${t.start} 0%, ${t.end} 100%)` }}>
          <div className="text-[12px] font-semibold">{contractor.cityUf || ""}{contractor.cityUf && date ? ", " : ""}{date}</div>
          <div className="text-[12px] font-semibold opacity-95">Contrato {number}</div>
        </div>
        {documentHash && <div className="mt-3 break-all text-center font-mono text-[10px] text-slate-400">HASH · {documentHash.slice(0, 48)}…</div>}
      </section>
    </article>
  );
}

function SignatureBox({ label, name, signatureName, img, signed }: { label: string; name: string; signatureName?: string; img?: string | null; signed?: boolean }) {
  const handwritten = toSignatureCase(signatureName || name);
  const showHandwritten = Boolean(handwritten) && (signed || Boolean(img));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <div className="flex h-24 items-end justify-center">
        {showHandwritten ? (
          <span className="pb-2 text-slate-900" style={{ fontFamily: SIGNATURE_FONT_FAMILY, fontSize: 40, lineHeight: 1.1 }}>{handwritten}</span>
        ) : (
          <span className="pb-3 text-[12px] italic text-slate-400">Aguardando assinatura</span>
        )}
      </div>
      <div className="mt-2 border-t border-slate-300 pt-3 text-[12px] text-slate-700">
        <strong className="text-slate-950">{name || "—"}</strong>
        <div className="mt-0.5 text-[10px] font-extrabold uppercase tracking-[0.18em]" style={{ color: "var(--contract-accent)" }}>{label}</div>
      </div>
    </div>
  );
}