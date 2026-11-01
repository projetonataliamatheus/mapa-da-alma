// @ts-nocheck
/** Helpers for contract rendering + hashing */

export function renderTemplate(body: string, vars: Record<string, any>): string {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const parts = path.split(".");
    let cur: any = vars;
    for (const p of parts) {
      if (cur == null) return `{{${path}}}`;
      cur = cur[p];
    }
    return cur == null || cur === "" ? `_______________` : String(cur);
  });
}

export async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function fetchClientIp(): Promise<string> {
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const j = await r.json();
    return j.ip || "";
  } catch {
    return "";
  }
}

export const CONTRACT_STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado ao cliente",
  assinado_cliente: "Assinado pelo cliente",
  assinado_todos: "Assinado por ambos",
  cancelado: "Cancelado",
};

export const CONTRACT_STATUS_TONE: Record<string, string> = {
  rascunho: "bg-slate-500/15 text-slate-300 ring-slate-400/30",
  enviado: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  assinado_cliente: "bg-sky-500/15 text-sky-300 ring-sky-400/30",
  assinado_todos: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
  cancelado: "bg-rose-500/15 text-rose-300 ring-rose-400/30",
};

export function buildVariables(client: any, contract: any) {
  return {
    cliente: {
      nome: client?.name || contract.client_name || "",
      documento: client?.cpf_cnpj || client?.document || contract.client_document || "",
      email: client?.email || contract.client_email || "",
      telefone: client?.phone || client?.whatsapp || contract.client_phone || "",
      endereco: client?.address || contract.client_address || "",
    },
    prestador: {
      nome: contract.contractor_name || "Matheus Rangel",
      documento: contract.contractor_document || "",
      email: contract.contractor_email || "atendimento@matheusrangel.com.br",
    },
    servico: {
      valor: contract.service_value != null
        ? Number(contract.service_value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : "",
      pagamento: contract.payment_terms || "",
      escopo: contract.service_scope || "",
      duracao: contract.duration_months || "",
    },
    data: {
      hoje: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
    },
  };
}
