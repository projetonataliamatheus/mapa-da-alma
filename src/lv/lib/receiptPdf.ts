// @ts-nocheck
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { SIGNATURE_FONT_FACE_CSS } from "@/lv/lib/signatureFont";

async function waitForSignatureFont() {
  try {
    await document.fonts.load("40px 'Brother Signature'");
    await document.fonts.ready;
  } catch {
    /* O fallback manuscrito continua disponível se o navegador não expuser FontFaceSet. */
  }
}

export async function downloadReceiptPdf(element: HTMLElement, filename: string) {
  await waitForSignatureFont();

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    onclone: (clonedDocument) => {
      // A métrica vertical da fonte manuscrita muda no canvas. Corrige somente
      // a exportação, sem alterar a posição já aprovada na pré-visualização.
      clonedDocument.querySelectorAll<HTMLElement>("[data-receipt-signature]").forEach((signature) => {
        signature.style.transform = "translateY(-10px)";
      });
    },
  });
  const imgData = canvas.toDataURL("image/png");

  // Página única: o PDF assume exatamente a proporção do recibo renderizado
  const pageWidth = 210; // mm (largura A4)
  const pageHeight = (canvas.height * pageWidth) / canvas.width;

  const pdf = new jsPDF({
    unit: "mm",
    format: [pageWidth, pageHeight],
    orientation: pageHeight >= pageWidth ? "portrait" : "landscape",
  });
  pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
  pdf.save(filename);
}

export async function printReceipt(element: HTMLElement, title = "Recibo") {
  // Abre imediatamente dentro do clique para não perder a permissão de pop-up.
  const printWindow = window.open("", "_blank", "width=900,height=1000");
  if (!printWindow) throw new Error("Permita pop-ups no navegador para imprimir o recibo.");

  await waitForSignatureFont();

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${title.replace(/[<>]/g, "")}</title>
        <style>
          ${SIGNATURE_FONT_FACE_CSS}
          @page { margin: 0; size: auto; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          html, body { margin: 0; padding: 0; background: #fff; }
          body { display: flex; justify-content: center; }
          [data-receipt-print-root] { width: 595px; }
        </style>
      </head>
      <body><div data-receipt-print-root>${element.outerHTML}</div></body>
    </html>`);
  printWindow.document.close();

  await printWindow.document.fonts.load("40px 'Brother Signature'");
  await printWindow.document.fonts.ready;
  printWindow.focus();
  printWindow.print();
}

export function sanitizeFilename(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

export function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDateBR(iso: string) {
  // iso "YYYY-MM-DD" → "DD/MM/YYYY"
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function generateReceiptNumber() {
  // Random 20-digit number to mimic the maquininha format
  let s = "";
  for (let i = 0; i < 20; i++) s += Math.floor(Math.random() * 10).toString();
  return s;
}
