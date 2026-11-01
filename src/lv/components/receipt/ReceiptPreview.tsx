// @ts-nocheck
"use client";
import { forwardRef } from "react";
import { formatBRL, formatDateBR } from "@/lv/lib/receiptPdf";
import { SIGNATURE_FONT_FAMILY, toSignatureCase } from "@/lv/lib/signatureFont";

export interface ReceiptProduct {
  id: string;
  description: string;
  amount: number;
}

export interface ReceiptSection {
  id: "header" | "receipt-info" | "payer" | "beneficiary" | "products" | "observations";
  enabled: boolean;
  title: string;
}

export type ReceiptLayout =
  | "apple-blue"
  | "apple-green"
  | "apple-black"
  | "apple-gray"
  | "default"
  | "minimal"
  | "emerald-card"
  | "executive-dark"
  | "badge-modern"
  | "gradient-sidebar";

export interface ReceiptData {
  title: string;
  receiptNumber: string;
  paymentDate: string; // YYYY-MM-DD
  payerName: string;
  payerDocument: string;
  payerState: string;
  payerEmail?: string;
  beneficiaryName: string;
  beneficiaryDocument: string;
  beneficiaryEmail: string;
  beneficiaryCompany?: string;
  beneficiarySignatureName?: string;
  city?: string;
  reference?: string;
  paymentStatus?: string;
  products: ReceiptProduct[];
  observations: string;
  sections: ReceiptSection[];
  layout?: ReceiptLayout;
  labels: {
    issueDate: string;
    receiptNumber: string;
    name: string;
    document: string;
    state: string;
    email: string;
    total: string;
    receiptInfo: string;
    payer: string;
    beneficiary: string;
    products: string;
    observations: string;
  };
}

export const LAYOUT_OPTIONS: { id: ReceiptLayout; name: string; desc: string }[] = [
  { id: "apple-blue", name: "Premium Apple · Azul", desc: "Faixa gradiente azul, cartão de valor destacado" },
  { id: "apple-green", name: "Premium Apple · Verde", desc: "Mesma diagramação em verde esmeralda" },
  { id: "apple-black", name: "Premium Apple · Preto", desc: "Elegante em preto grafite" },
  { id: "apple-gray", name: "Premium Apple · Cinza", desc: "Corporativo em cinza chumbo" },
  { id: "default", name: "Padrão", desc: "Limpo e neutro, como a maquininha" },
  { id: "minimal", name: "Minimal Apple", desc: "Whitespace generoso, traço verde fino" },
  { id: "emerald-card", name: "Emerald Card", desc: "Cartão branco sobre fundo verde gradiente" },
  { id: "executive-dark", name: "Executivo Dark", desc: "Cabeçalho preto com selo verde" },
  { id: "badge-modern", name: "Badge Modern", desc: "Barra lateral verde com selo de valor" },
  { id: "gradient-sidebar", name: "Sidebar Gradient", desc: "Coluna verde com dados, conteúdo branco" },
];

export const APPLE_THEMES = {
  "apple-blue":  { start: "#1e40af", end: "#3b82f6", accent: "#2563eb", soft: "#eff6ff", ring: "#dbeafe", text: "#1e3a8a", chip: "#2563eb" },
  "apple-green": { start: "#065f46", end: "#10b981", accent: "#059669", soft: "#ecfdf5", ring: "#d1fae5", text: "#064e3b", chip: "#059669" },
  "apple-black": { start: "#0a0a0a", end: "#2d2d2d", accent: "#111827", soft: "#f5f5f5", ring: "#e5e5e5", text: "#0a0a0a", chip: "#111827" },
  "apple-gray":  { start: "#334155", end: "#64748b", accent: "#475569", soft: "#f1f5f9", ring: "#e2e8f0", text: "#1e293b", chip: "#475569" },
} as const;

interface Props {
  data: ReceiptData;
}

const APPLE_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Helvetica Neue", Arial, sans-serif';

const ReceiptPreview = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const layout = data.layout || "default";
  const total = data.products.reduce((s, p) => s + (p.amount || 0), 0);

  const sharedProps = { data, total };

  return (
    <div ref={ref}>
      {(layout === "apple-blue" || layout === "apple-green" || layout === "apple-black" || layout === "apple-gray") && (
        <PremiumAppleLayout data={data} total={total} themeKey={layout} />
      )}
      {layout === "default" && <DefaultLayout {...sharedProps} />}
      {layout === "minimal" && <MinimalLayout {...sharedProps} />}
      {layout === "emerald-card" && <EmeraldCardLayout {...sharedProps} />}
      {layout === "executive-dark" && <ExecutiveDarkLayout {...sharedProps} />}
      {layout === "badge-modern" && <BadgeModernLayout {...sharedProps} />}
      {layout === "gradient-sidebar" && <GradientSidebarLayout {...sharedProps} />}
    </div>
  );
});

ReceiptPreview.displayName = "ReceiptPreview";
export default ReceiptPreview;

/* ===========================================================
   Shared helpers
   =========================================================== */

interface LayoutProps {
  data: ReceiptData;
  total: number;
}

const PAGE: React.CSSProperties = {
  width: "595px",
  minHeight: "842px",
  fontFamily: APPLE_FONT,
  fontSize: "12px",
  lineHeight: 1.5,
  color: "#111",
  background: "#fff",
  position: "relative",
};

function enabled(data: ReceiptData, id: ReceiptSection["id"]) {
  return data.sections.find((s) => s.id === id)?.enabled;
}
function titleFor(data: ReceiptData, id: ReceiptSection["id"], fallback: string) {
  return data.sections.find((s) => s.id === id)?.title || fallback;
}

function Row({ label, value, bold, labelColor = "#6b7280" }: { label: string; value: string; bold?: boolean; labelColor?: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12, marginBottom: 4, fontSize: 11 }}>
      <span style={{ color: labelColor }}>{label}</span>
      <span style={{ color: "#111", fontWeight: bold ? 600 : 400 }}>{value || "—"}</span>
    </div>
  );
}

function BrandFooter({ tone = "light" }: { tone?: "light" | "dark" | "emerald" }) {
  const color = tone === "dark" ? "#9ca3af" : tone === "emerald" ? "#065f46" : "#6b7280";
  const accent = "#10b981";
  return (
    <div
      style={{
        marginTop: 32,
        paddingTop: 16,
        borderTop: `1px solid ${tone === "dark" ? "#1f2937" : "#e5e7eb"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 9.5,
        color,
        letterSpacing: 0.3,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: accent, display: "inline-block", boxShadow: `0 0 0 3px ${accent}22` }} />
        <span style={{ fontWeight: 600, color: tone === "dark" ? "#fff" : "#111" }}>Matheus Rangel</span>
        <span style={{ opacity: 0.7 }}>·</span>
        <span>Recibo Oficial</span>
      </div>
      <span style={{ opacity: 0.8 }}>matheusrangel.com.br</span>
    </div>
  );
}

/* ===========================================================
   1. DEFAULT — current plain look
   =========================================================== */

function DefaultLayout({ data, total }: LayoutProps) {
  return (
    <div style={{ ...PAGE, padding: "40px 48px", fontFamily: "Arial, Helvetica, sans-serif" }}>
      {enabled(data, "header") && (
        <div style={{ paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid #d1d5db" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{data.title}</h1>
        </div>
      )}
      {enabled(data, "receipt-info") && (
        <Block title={titleFor(data, "receipt-info", "Dados do recibo")}>
          <Row label={data.labels.issueDate} value={formatDateBR(data.paymentDate)} />
          <Row label={data.labels.receiptNumber} value={data.receiptNumber} bold />
        </Block>
      )}
      {enabled(data, "payer") && (
        <Block title={titleFor(data, "payer", "Dados do pagador")}>
          <Row label={data.labels.name} value={data.payerName} />
          <Row label={data.labels.document} value={data.payerDocument} bold />
          <Row label={data.labels.state} value={data.payerState} />
        </Block>
      )}
      {enabled(data, "beneficiary") && (
        <Block title={titleFor(data, "beneficiary", "Dados do beneficiário")}>
          <Row label={data.labels.name} value={data.beneficiaryName} />
          <Row label={data.labels.document} value={data.beneficiaryDocument} bold />
          <Row label={data.labels.email} value={data.beneficiaryEmail} />
        </Block>
      )}
      {enabled(data, "products") && <ProductsBlock data={data} total={total} accent="#111" />}
      {enabled(data, "observations") && data.observations && (
        <Block title={titleFor(data, "observations", "Observações")}>
          <p style={{ fontSize: 11, color: "#374151", whiteSpace: "pre-line", margin: 0 }}>{data.observations}</p>
        </Block>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #d1d5db" }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px 0" }}>{title}</h2>
      {children}
    </div>
  );
}

function ProductsBlock({ data, total, accent }: { data: ReceiptData; total: number; accent: string }) {
  return (
    <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #d1d5db" }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px 0" }}>
        {titleFor(data, "products", "Produtos")}
      </h2>
      {data.products.map((p) => (
        <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 6, fontSize: 11 }}>
          <span style={{ color: "#374151", flex: 1, whiteSpace: "pre-line" }}>{p.description}</span>
          <span style={{ color: "#111", fontWeight: 500 }}>{formatBRL(p.amount)}</span>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 12, paddingTop: 8, borderTop: "1px solid #e5e7eb" }}>
        <span style={{ fontWeight: 700, color: accent }}>{data.labels.total}</span>
        <span style={{ fontWeight: 700, color: accent }}>{formatBRL(total)}</span>
      </div>
    </div>
  );
}

/* ===========================================================
   2. MINIMAL — Apple-style, thin emerald rule, airy
   =========================================================== */

function MinimalLayout({ data, total }: LayoutProps) {
  return (
    <div style={{ ...PAGE, padding: "56px 56px 40px" }}>
      {/* Thin emerald rule */}
      <div style={{ width: 36, height: 2, background: "#10b981", borderRadius: 2, marginBottom: 28 }} />
      {enabled(data, "header") && (
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#10b981", fontWeight: 600, margin: 0 }}>
            Recibo
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 600, margin: "6px 0 0", letterSpacing: -0.5 }}>{data.title}</h1>
        </div>
      )}

      {enabled(data, "receipt-info") && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
          <Mini label={data.labels.issueDate.replace(":", "")} value={formatDateBR(data.paymentDate)} />
          <Mini label={data.labels.receiptNumber.replace(":", "")} value={data.receiptNumber} mono />
        </div>
      )}

      {(enabled(data, "payer") || enabled(data, "beneficiary")) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
          {enabled(data, "payer") && (
            <MiniGroup title={titleFor(data, "payer", "Pagador")}>
              <MiniLine label={data.labels.name} value={data.payerName} />
              <MiniLine label={data.labels.document} value={data.payerDocument} />
              <MiniLine label={data.labels.state} value={data.payerState} />
            </MiniGroup>
          )}
          {enabled(data, "beneficiary") && (
            <MiniGroup title={titleFor(data, "beneficiary", "Beneficiário")}>
              <MiniLine label={data.labels.name} value={data.beneficiaryName} />
              <MiniLine label={data.labels.document} value={data.beneficiaryDocument} />
              <MiniLine label={data.labels.email} value={data.beneficiaryEmail} />
            </MiniGroup>
          )}
        </div>
      )}

      {enabled(data, "products") && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#6b7280", fontWeight: 600, margin: "0 0 12px" }}>
            {titleFor(data, "products", "Produtos")}
          </p>
          {data.products.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6", fontSize: 12 }}>
              <span style={{ color: "#374151", flex: 1, whiteSpace: "pre-line", paddingRight: 16 }}>{p.description}</span>
              <span style={{ color: "#111", fontWeight: 500 }}>{formatBRL(p.amount)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 16 }}>
            <span style={{ fontSize: 11, color: "#6b7280", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600 }}>
              {data.labels.total}
            </span>
            <span style={{ fontSize: 24, fontWeight: 600, color: "#059669", letterSpacing: -0.5 }}>{formatBRL(total)}</span>
          </div>
        </div>
      )}

      {enabled(data, "observations") && data.observations && (
        <div style={{ marginTop: 24, padding: "16px 18px", background: "#f9fafb", borderRadius: 10, borderLeft: "3px solid #10b981" }}>
          <p style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#10b981", fontWeight: 700, margin: "0 0 6px" }}>
            {titleFor(data, "observations", "Observações")}
          </p>
          <p style={{ fontSize: 11, color: "#374151", whiteSpace: "pre-line", margin: 0, lineHeight: 1.6 }}>{data.observations}</p>
        </div>
      )}

      <BrandFooter />
    </div>
  );
}

function Mini({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "#9ca3af", fontWeight: 600, margin: "0 0 4px" }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 500, margin: 0, fontFamily: mono ? "'SF Mono', Menlo, monospace" : APPLE_FONT, wordBreak: "break-all" }}>{value || "—"}</p>
    </div>
  );
}
function MiniGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#10b981", fontWeight: 700, margin: "0 0 10px" }}>{title}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{children}</div>
    </div>
  );
}
function MiniLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ fontSize: 11 }}>
      <span style={{ color: "#9ca3af", marginRight: 6 }}>{label}</span>
      <span style={{ color: "#111", fontWeight: 500 }}>{value || "—"}</span>
    </div>
  );
}

/* ===========================================================
   3. EMERALD CARD — white card on green gradient background
   =========================================================== */

function EmeraldCardLayout({ data, total }: LayoutProps) {
  return (
    <div style={{ ...PAGE, padding: 28, background: "linear-gradient(135deg, #064e3b 0%, #047857 55%, #10b981 100%)" }}>
      <div style={{ background: "#fff", borderRadius: 18, padding: "36px 40px", boxShadow: "0 24px 60px -20px rgba(0,0,0,0.4)" }}>
        {enabled(data, "header") && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, paddingBottom: 18, borderBottom: "1px solid #f3f4f6" }}>
            <div>
              <p style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#10b981", fontWeight: 700, margin: 0 }}>Recibo de Venda</p>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: "6px 0 0", letterSpacing: -0.5 }}>{data.title}</h1>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 9, color: "#9ca3af", margin: 0, letterSpacing: 1, textTransform: "uppercase" }}>{data.labels.issueDate.replace(":", "")}</p>
              <p style={{ fontSize: 14, fontWeight: 600, margin: "2px 0 0" }}>{formatDateBR(data.paymentDate)}</p>
            </div>
          </div>
        )}

        {enabled(data, "receipt-info") && (
          <div style={{ background: "#ecfdf5", padding: "12px 16px", borderRadius: 10, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "#065f46", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>{data.labels.receiptNumber}</span>
            <span style={{ fontSize: 11, fontFamily: "'SF Mono', Menlo, monospace", color: "#065f46", fontWeight: 600 }}>{data.receiptNumber}</span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          {enabled(data, "payer") && (
            <CardGroup title={titleFor(data, "payer", "Pagador")}>
              <CardLine label={data.labels.name} value={data.payerName} />
              <CardLine label={data.labels.document} value={data.payerDocument} />
              <CardLine label={data.labels.state} value={data.payerState} />
            </CardGroup>
          )}
          {enabled(data, "beneficiary") && (
            <CardGroup title={titleFor(data, "beneficiary", "Beneficiário")}>
              <CardLine label={data.labels.name} value={data.beneficiaryName} />
              <CardLine label={data.labels.document} value={data.beneficiaryDocument} />
              <CardLine label={data.labels.email} value={data.beneficiaryEmail} />
            </CardGroup>
          )}
        </div>

        {enabled(data, "products") && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#6b7280", fontWeight: 600, margin: "0 0 10px" }}>{titleFor(data, "products", "Produtos")}</p>
            {data.products.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed #e5e7eb", fontSize: 11 }}>
                <span style={{ flex: 1, color: "#374151", whiteSpace: "pre-line" }}>{p.description}</span>
                <span style={{ fontWeight: 500 }}>{formatBRL(p.amount)}</span>
              </div>
            ))}
            <div style={{ marginTop: 14, padding: "14px 18px", background: "linear-gradient(135deg, #065f46, #10b981)", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff" }}>
              <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600, opacity: 0.9 }}>{data.labels.total}</span>
              <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>{formatBRL(total)}</span>
            </div>
          </div>
        )}

        {enabled(data, "observations") && data.observations && (
          <div style={{ fontSize: 10.5, color: "#6b7280", whiteSpace: "pre-line", lineHeight: 1.6 }}>
            <span style={{ fontWeight: 700, color: "#065f46" }}>{titleFor(data, "observations", "Observações")} · </span>
            {data.observations}
          </div>
        )}

        <BrandFooter />
      </div>
    </div>
  );
}

function CardGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#f9fafb", padding: 14, borderRadius: 10 }}>
      <p style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "#10b981", fontWeight: 700, margin: "0 0 8px" }}>{title}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{children}</div>
    </div>
  );
}
function CardLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ fontSize: 10.5 }}>
      <p style={{ color: "#9ca3af", margin: 0, fontSize: 9 }}>{label}</p>
      <p style={{ color: "#111", fontWeight: 500, margin: 0 }}>{value || "—"}</p>
    </div>
  );
}

/* ===========================================================
   4. EXECUTIVE DARK — dark header band, emerald seal
   =========================================================== */

function ExecutiveDarkLayout({ data, total }: LayoutProps) {
  return (
    <div style={{ ...PAGE }}>
      {/* Dark band */}
      <div style={{ background: "#0a0a0a", color: "#fff", padding: "32px 48px 40px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: 999, background: "radial-gradient(circle, rgba(16,185,129,0.25), transparent 70%)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#10b981", fontWeight: 700, margin: 0 }}>Recibo Oficial</p>
            <h1 style={{ fontSize: 26, fontWeight: 600, margin: "8px 0 0", letterSpacing: -0.5, color: "#fff" }}>{data.title}</h1>
          </div>
          <div style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)", padding: "10px 14px", borderRadius: 10, textAlign: "right" }}>
            <p style={{ fontSize: 9, color: "#6ee7b7", margin: 0, letterSpacing: 1, textTransform: "uppercase" }}>{data.labels.total}</p>
            <p style={{ fontSize: 18, fontWeight: 700, margin: "2px 0 0", color: "#fff", letterSpacing: -0.3 }}>{formatBRL(total)}</p>
          </div>
        </div>
        {enabled(data, "receipt-info") && (
          <div style={{ display: "flex", gap: 32, marginTop: 24, fontSize: 10, color: "#9ca3af" }}>
            <div>
              <span style={{ display: "block", color: "#6b7280", letterSpacing: 1, textTransform: "uppercase", fontSize: 9 }}>{data.labels.issueDate.replace(":", "")}</span>
              <span style={{ color: "#fff", fontSize: 12, fontWeight: 500 }}>{formatDateBR(data.paymentDate)}</span>
            </div>
            <div>
              <span style={{ display: "block", color: "#6b7280", letterSpacing: 1, textTransform: "uppercase", fontSize: 9 }}>{data.labels.receiptNumber.replace(":", "")}</span>
              <span style={{ color: "#fff", fontSize: 11, fontFamily: "'SF Mono', Menlo, monospace" }}>{data.receiptNumber}</span>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "32px 48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, marginBottom: 28 }}>
          {enabled(data, "payer") && (
            <DarkGroup title={titleFor(data, "payer", "Pagador")}>
              <DarkLine label={data.labels.name} value={data.payerName} />
              <DarkLine label={data.labels.document} value={data.payerDocument} />
              <DarkLine label={data.labels.state} value={data.payerState} />
            </DarkGroup>
          )}
          {enabled(data, "beneficiary") && (
            <DarkGroup title={titleFor(data, "beneficiary", "Beneficiário")}>
              <DarkLine label={data.labels.name} value={data.beneficiaryName} />
              <DarkLine label={data.labels.document} value={data.beneficiaryDocument} />
              <DarkLine label={data.labels.email} value={data.beneficiaryEmail} />
            </DarkGroup>
          )}
        </div>

        {enabled(data, "products") && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#10b981", fontWeight: 700, margin: "0 0 12px" }}>
              {titleFor(data, "products", "Produtos")}
            </p>
            {data.products.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6", fontSize: 11.5 }}>
                <span style={{ color: "#374151", flex: 1, whiteSpace: "pre-line", paddingRight: 16 }}>{p.description}</span>
                <span style={{ fontWeight: 500 }}>{formatBRL(p.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {enabled(data, "observations") && data.observations && (
          <div style={{ background: "#0a0a0a", color: "#d1d5db", padding: "16px 18px", borderRadius: 10, fontSize: 10.5, whiteSpace: "pre-line", lineHeight: 1.6, marginTop: 20 }}>
            <span style={{ color: "#10b981", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", fontSize: 9 }}>{titleFor(data, "observations", "Observações")}</span>
            <p style={{ margin: "6px 0 0" }}>{data.observations}</p>
          </div>
        )}

        <BrandFooter />
      </div>
    </div>
  );
}

function DarkGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#10b981", fontWeight: 700, margin: "0 0 10px" }}>{title}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}
function DarkLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ fontSize: 11 }}>
      <p style={{ color: "#9ca3af", margin: 0, fontSize: 9, letterSpacing: 0.5 }}>{label}</p>
      <p style={{ color: "#111", fontWeight: 500, margin: 0 }}>{value || "—"}</p>
    </div>
  );
}

/* ===========================================================
   5. BADGE MODERN — left emerald vertical bar + big total badge
   =========================================================== */

function BadgeModernLayout({ data, total }: LayoutProps) {
  const initials = (data.beneficiaryName || "MR")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div style={{ ...PAGE, display: "flex" }}>
      {/* Left emerald rail */}
      <div style={{ width: 14, background: "linear-gradient(180deg, #10b981, #047857)" }} />

      <div style={{ flex: 1, padding: "40px 44px" }}>
        {enabled(data, "header") && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #10b981, #065f46)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, letterSpacing: 0.5 }}>
                {initials}
              </div>
              <div>
                <p style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#10b981", fontWeight: 700, margin: 0 }}>Recibo</p>
                <h1 style={{ fontSize: 20, fontWeight: 600, margin: "2px 0 0", letterSpacing: -0.3 }}>{data.title}</h1>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 9, color: "#9ca3af", margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>Pago em</p>
              <p style={{ fontSize: 14, fontWeight: 600, margin: "2px 0 0" }}>{formatDateBR(data.paymentDate)}</p>
            </div>
          </div>
        )}

        {/* Big total badge */}
        {enabled(data, "products") && (
          <div style={{ background: "#f0fdf4", border: "1px solid #d1fae5", borderRadius: 16, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <p style={{ fontSize: 10, color: "#059669", margin: 0, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>{data.labels.total}</p>
              <p style={{ fontSize: 28, fontWeight: 700, margin: "4px 0 0", color: "#065f46", letterSpacing: -1 }}>{formatBRL(total)}</p>
            </div>
            {enabled(data, "receipt-info") && (
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 9, color: "#6b7280", margin: 0, letterSpacing: 1, textTransform: "uppercase" }}>{data.labels.receiptNumber.replace(":", "")}</p>
                <p style={{ fontSize: 10, fontFamily: "'SF Mono', Menlo, monospace", color: "#065f46", margin: "2px 0 0", wordBreak: "break-all", maxWidth: 220 }}>{data.receiptNumber}</p>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          {enabled(data, "payer") && (
            <MiniGroup title={titleFor(data, "payer", "Pagador")}>
              <MiniLine label={data.labels.name} value={data.payerName} />
              <MiniLine label={data.labels.document} value={data.payerDocument} />
              <MiniLine label={data.labels.state} value={data.payerState} />
            </MiniGroup>
          )}
          {enabled(data, "beneficiary") && (
            <MiniGroup title={titleFor(data, "beneficiary", "Beneficiário")}>
              <MiniLine label={data.labels.name} value={data.beneficiaryName} />
              <MiniLine label={data.labels.document} value={data.beneficiaryDocument} />
              <MiniLine label={data.labels.email} value={data.beneficiaryEmail} />
            </MiniGroup>
          )}
        </div>

        {enabled(data, "products") && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#6b7280", fontWeight: 600, margin: "0 0 10px" }}>{titleFor(data, "products", "Produtos")}</p>
            {data.products.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6", fontSize: 11 }}>
                <span style={{ flex: 1, color: "#374151", whiteSpace: "pre-line" }}>{p.description}</span>
                <span style={{ fontWeight: 500 }}>{formatBRL(p.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {enabled(data, "observations") && data.observations && (
          <p style={{ fontSize: 10.5, color: "#6b7280", whiteSpace: "pre-line", lineHeight: 1.6, margin: 0 }}>
            <span style={{ fontWeight: 700, color: "#065f46" }}>{titleFor(data, "observations", "Observações")} · </span>
            {data.observations}
          </p>
        )}

        <BrandFooter />
      </div>
    </div>
  );
}

/* ===========================================================
   6. GRADIENT SIDEBAR — emerald sidebar with metadata
   =========================================================== */

function GradientSidebarLayout({ data, total }: LayoutProps) {
  return (
    <div style={{ ...PAGE, display: "flex" }}>
      {/* Sidebar */}
      <div style={{ width: 200, background: "linear-gradient(180deg, #065f46 0%, #047857 50%, #10b981 100%)", color: "#fff", padding: "36px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#a7f3d0", fontWeight: 700, margin: 0 }}>Recibo</p>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: "8px 0 28px", letterSpacing: -0.3, lineHeight: 1.2 }}>{data.title}</h1>

          <SideField label={data.labels.issueDate.replace(":", "")} value={formatDateBR(data.paymentDate)} />
          <SideField label={data.labels.receiptNumber.replace(":", "")} value={data.receiptNumber} mono />
          <SideField label={data.labels.total} value={formatBRL(total)} highlight />
        </div>

        <div style={{ fontSize: 9, color: "#a7f3d0", letterSpacing: 0.5, lineHeight: 1.5 }}>
          <p style={{ margin: 0, fontWeight: 700, color: "#fff", fontSize: 11 }}>Matheus Rangel</p>
          <p style={{ margin: "2px 0 0" }}>matheusrangel.com.br</p>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: "40px 36px" }}>
        {enabled(data, "payer") && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#10b981", fontWeight: 700, margin: "0 0 10px" }}>
              {titleFor(data, "payer", "Pagador")}
            </p>
            <p style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px", letterSpacing: -0.3 }}>{data.payerName || "—"}</p>
            <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>
              {data.payerDocument} {data.payerState ? `· ${data.payerState}` : ""}
            </p>
          </div>
        )}

        {enabled(data, "beneficiary") && (
          <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid #e5e7eb" }}>
            <p style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#10b981", fontWeight: 700, margin: "0 0 6px" }}>
              {titleFor(data, "beneficiary", "Beneficiário")}
            </p>
            <p style={{ fontSize: 12, margin: 0, color: "#374151" }}>{data.beneficiaryName}</p>
            <p style={{ fontSize: 10.5, color: "#6b7280", margin: "2px 0 0" }}>{data.beneficiaryDocument} · {data.beneficiaryEmail}</p>
          </div>
        )}

        {enabled(data, "products") && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#6b7280", fontWeight: 600, margin: "0 0 12px" }}>{titleFor(data, "products", "Produtos")}</p>
            {data.products.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6", fontSize: 11.5 }}>
                <span style={{ flex: 1, color: "#374151", whiteSpace: "pre-line", paddingRight: 12 }}>{p.description}</span>
                <span style={{ fontWeight: 500 }}>{formatBRL(p.amount)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, padding: "10px 14px", background: "#ecfdf5", borderRadius: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#065f46", letterSpacing: 1, textTransform: "uppercase" }}>{data.labels.total}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#065f46" }}>{formatBRL(total)}</span>
            </div>
          </div>
        )}

        {enabled(data, "observations") && data.observations && (
          <p style={{ fontSize: 10.5, color: "#6b7280", whiteSpace: "pre-line", lineHeight: 1.6, margin: "0 0 12px" }}>
            <span style={{ fontWeight: 700, color: "#065f46" }}>{titleFor(data, "observations", "Observações")} · </span>
            {data.observations}
          </p>
        )}
      </div>
    </div>
  );
}

function SideField({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "#a7f3d0", fontWeight: 600, margin: "0 0 4px" }}>{label}</p>
      <p style={{
        fontSize: highlight ? 18 : 12,
        fontWeight: highlight ? 700 : 500,
        margin: 0,
        color: "#fff",
        wordBreak: "break-all",
        fontFamily: mono ? "'SF Mono', Menlo, monospace" : APPLE_FONT,
        letterSpacing: highlight ? -0.3 : 0,
      }}>{value || "—"}</p>
    </div>
  );
}

/* ===========================================================
   7. PREMIUM APPLE — reference layout (blue/green/black/gray)
   =========================================================== */

function numToWordsBRL(n: number): string {
  if (!Number.isFinite(n)) return "";
  const reais = Math.floor(n);
  const cents = Math.round((n - reais) * 100);
  const under20 = ["zero","um","dois","três","quatro","cinco","seis","sete","oito","nove","dez","onze","doze","treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove"];
  const tens = ["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
  const hundreds = ["","cento","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];
  const toWords = (num: number): string => {
    if (num < 20) return under20[num];
    if (num < 100) { const t = Math.floor(num/10), u = num%10; return u ? `${tens[t]} e ${under20[u]}` : tens[t]; }
    if (num === 100) return "cem";
    if (num < 1000) { const h = Math.floor(num/100), r = num%100; return r ? `${hundreds[h]} e ${toWords(r)}` : hundreds[h]; }
    if (num < 1_000_000) {
      const m = Math.floor(num/1000), r = num%1000;
      const mw = m === 1 ? "mil" : `${toWords(m)} mil`;
      return r ? `${mw}${r < 100 ? " e " : ", "}${toWords(r)}` : mw;
    }
    return String(num);
  };
  const reaisStr = `${toWords(reais)} ${reais === 1 ? "real" : "reais"}`;
  const centsStr = cents > 0 ? ` e ${toWords(cents)} ${cents === 1 ? "centavo" : "centavos"}` : "";
  return `${reaisStr}${centsStr}`;
}

type AppleThemeKey = "apple-blue" | "apple-green" | "apple-black" | "apple-gray";

function PremiumAppleLayout({ data, total, themeKey }: { data: ReceiptData; total: number; themeKey: AppleThemeKey }) {
  const t = APPLE_THEMES[themeKey];
  const gradient = `linear-gradient(135deg, ${t.start} 0%, ${t.end} 100%)`;
  const paidLabel = (data.paymentStatus || "PAGO").toUpperCase();
  const company = data.beneficiaryCompany || data.beneficiaryName || "";
  const signName = data.beneficiarySignatureName || data.beneficiaryName || "";
  const city = data.city || data.payerState || "";
  const dateFmt = formatDateBR(data.paymentDate);
  const dateLong = (() => {
    if (!data.paymentDate) return dateFmt;
    try {
      const [y,m,d] = data.paymentDate.split("-").map(Number);
      const dt = new Date(y, (m||1)-1, d||1);
      return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    } catch { return dateFmt; }
  })();

  return (
    <div style={{ ...PAGE, padding: 26, background: "#f1f5f9", fontFamily: APPLE_FONT }}>
      <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 30px 60px -30px rgba(0,0,0,0.25)" }}>
        {/* HEADER BANNER */}
        <div style={{ background: gradient, color: "#fff", padding: "28px 36px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: 999, background: "rgba(255,255,255,0.12)" }} />
          <div style={{ position: "absolute", bottom: -80, right: 40, width: 160, height: 160, borderRadius: 999, background: "rgba(255,255,255,0.08)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
            <div>
              <p style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.85)", fontWeight: 700, margin: 0 }}>
                {company.toUpperCase()}
              </p>
              <h1 style={{ fontSize: 26, fontWeight: 700, margin: "8px 0 4px", letterSpacing: -0.6 }}>{data.title || "Recibo de Pagamento"}</h1>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", margin: 0 }}>
                {data.beneficiaryDocument ? (isCNPJ(data.beneficiaryDocument) ? "CNPJ " : "CPF ") + data.beneficiaryDocument : ""}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.85)", fontWeight: 700, margin: 0 }}>Nº do Recibo</p>
              <p style={{ fontSize: 22, fontWeight: 700, margin: "6px 0 4px", letterSpacing: -0.3 }}>#{shortNumber(data.receiptNumber)}</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", margin: 0 }}>{dateLong}</p>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: "26px 36px 32px" }}>
          {/* VALUE CARD */}
          {enabled(data, "products") && (
            <div style={{ background: t.soft, border: `1px solid ${t.ring}`, borderRadius: 16, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: t.text, fontWeight: 700, margin: 0, opacity: 0.75 }}>Valor Recebido</p>
                <p style={{ fontSize: 32, fontWeight: 700, margin: "6px 0 0", color: t.accent, letterSpacing: -1 }}>{formatBRL(total)}</p>
                <p style={{ fontSize: 11, color: t.text, opacity: 0.7, margin: "4px 0 0", fontStyle: "italic" }}>
                  ({numToWordsBRL(total)})
                </p>
              </div>
              <div style={{ background: t.chip, color: "#fff", padding: "8px 16px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                ✓ {paidLabel}
              </div>
            </div>
          )}

          {/* PAYER + BENEFICIARY */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            {enabled(data, "payer") && (
              <ApplePartyCard title="Pagador" theme={t}>
                <p style={{ fontSize: 13, fontWeight: 700, margin: "2px 0 6px", color: "#111" }}>{data.payerName || "—"}</p>
                {data.payerDocument && <p style={{ fontSize: 10.5, color: "#6b7280", margin: 0 }}>{(isCNPJ(data.payerDocument) ? "CNPJ: " : "CPF: ") + data.payerDocument}</p>}
                {data.payerEmail && <p style={{ fontSize: 10.5, color: "#6b7280", margin: "2px 0 0" }}>{data.payerEmail}</p>}
                {!data.payerEmail && data.payerState && <p style={{ fontSize: 10.5, color: "#6b7280", margin: "2px 0 0" }}>{data.payerState}</p>}
              </ApplePartyCard>
            )}
            {enabled(data, "beneficiary") && (
              <ApplePartyCard title="Beneficiário" theme={t}>
                <p style={{ fontSize: 13, fontWeight: 700, margin: "2px 0 6px", color: "#111" }}>{(data.beneficiaryCompany || data.beneficiaryName || "—").toUpperCase()}</p>
                {data.beneficiaryDocument && <p style={{ fontSize: 10.5, color: "#6b7280", margin: 0 }}>{(isCNPJ(data.beneficiaryDocument) ? "CNPJ: " : "CPF: ") + data.beneficiaryDocument}</p>}
                {data.beneficiaryEmail && <p style={{ fontSize: 10.5, color: "#6b7280", margin: "2px 0 0" }}>{data.beneficiaryEmail}</p>}
              </ApplePartyCard>
            )}
          </div>

          {/* REFERENTE A */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
            <p style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: "uppercase", color: "#9ca3af", fontWeight: 700, margin: "0 0 6px" }}>Referente a</p>
            <p style={{ fontSize: 12, color: "#111", margin: 0 }}>
              {data.reference || data.products.map(p => p.description).filter(Boolean).join(" — ") || "—"}
            </p>
          </div>

          {/* Quitação paragraph */}
          <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.7, margin: "0 0 28px" }}>
            Recebemos de <strong style={{ color: "#111" }}>{data.payerName || "—"}</strong>
            {data.payerDocument ? ` (${data.payerDocument})` : ""} a importância acima descrita, dando por meio deste{" "}
            <strong style={{ color: "#111" }}>plena, geral e irrevogável quitação</strong> do referido valor, para que não haja mais nada a reclamar em juízo ou fora dele.
          </p>

          {/* Signature */}
          <div style={{ textAlign: "center", margin: "24px 0 8px" }}>
            <p data-receipt-signature style={{ fontFamily: SIGNATURE_FONT_FAMILY, fontSize: 38, lineHeight: 1.1, color: "#111", margin: "0 auto 2px", whiteSpace: "nowrap" }}>
              {toSignatureCase(signName)}
            </p>
            <div style={{ width: 220, height: 1, background: "#111", margin: "6px auto 8px" }} />
            <p style={{ fontSize: 11, fontWeight: 700, margin: 0, color: "#111", letterSpacing: 0.5 }}>{company}</p>
          </div>

          {enabled(data, "observations") && data.observations && (
            <div style={{ marginTop: 20, padding: "12px 16px", background: t.soft, borderRadius: 10, borderLeft: `3px solid ${t.accent}` }}>
              <p style={{ fontSize: 10.5, color: "#374151", whiteSpace: "pre-line", margin: 0, lineHeight: 1.6 }}>{data.observations}</p>
            </div>
          )}
        </div>

        {/* FOOTER BANNER */}
        <div style={{ background: gradient, color: "#fff", padding: "14px 36px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
          <span>{city ? `${city}, ` : ""}{dateLong}</span>
          <span>Recibo #{shortNumber(data.receiptNumber)} · matheusrangel.com.br</span>
        </div>
      </div>
    </div>
  );
}

function ApplePartyCard({ title, theme, children }: { title: string; theme: typeof APPLE_THEMES[AppleThemeKey]; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 18px" }}>
      <p style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: "uppercase", color: "#9ca3af", fontWeight: 700, margin: 0 }}>{title}</p>
      {children}
    </div>
  );
}

function isCNPJ(doc: string) {
  const digits = (doc || "").replace(/\D/g, "");
  return digits.length > 11;
}
function shortNumber(n: string) {
  if (!n) return "00001";
  const digits = n.replace(/\D/g, "");
  const short = digits.slice(-5).padStart(5, "0");
  return short;
}
