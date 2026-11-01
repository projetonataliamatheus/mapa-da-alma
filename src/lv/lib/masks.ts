// @ts-nocheck
// Máscaras BR reutilizáveis para inputs (CPF, CNPJ, Telefone, CEP, Moeda)
// Uso: onChange={(e) => setField(maskCPF(e.target.value))}

const onlyDigits = (v: string) => (v || "").replace(/\D/g, "");

export const maskCPF = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

export const maskCNPJ = (v: string) => {
  const d = onlyDigits(v).slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

// (11) 99999-9999 ou (11) 9999-9999
export const maskPhoneBR = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
};

export const maskCEP = (v: string) => {
  const d = onlyDigits(v).slice(0, 8);
  return d.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
};

// Máscara de moeda BR: recebe qualquer string e retorna "1.234,56"
export const maskBRL = (v: string) => {
  const d = onlyDigits(v);
  if (!d) return "";
  const n = parseInt(d, 10) / 100;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Converte "1.234,56" -> 1234.56 (number). Retorna 0 se inválido.
export const parseBRL = (v: string): number => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

// Formata number -> "1.234,56"
export const formatBRL = (n: number | string) => {
  const num = typeof n === "number" ? n : parseBRL(String(n));
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Busca endereço pelo CEP na API pública ViaCEP
export interface ViaCepAddress {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  complemento?: string;
  erro?: boolean;
}

export async function fetchAddressByCep(cep: string): Promise<ViaCepAddress | null> {
  const d = onlyDigits(cep);
  if (d.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as ViaCepAddress;
    if ((data as any).erro) return null;
    return data;
  } catch {
    return null;
  }
}

// Moeda com prefixo "R$ 1.234,56"
export const maskCurrency = (v: string) => {
  const d = onlyDigits(v);
  if (!d) return "";
  const n = parseInt(d, 10) / 100;
  return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// CPF ou CNPJ automaticamente conforme quantidade de dígitos
export const maskCpfCnpj = (v: string) => {
  const d = onlyDigits(v);
  return d.length <= 11 ? maskCPF(v) : maskCNPJ(v);
};

// RG (padrão SP): 00.000.000-0
export const maskRG = (v: string) => {
  const d = onlyDigits(v).slice(0, 9);
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,1})$/, "$1-$2");
};

// Data BR: dd/mm/aaaa
export const maskDateBR = (v: string) => {
  const d = onlyDigits(v).slice(0, 8);
  return d
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})(\d)/, "$1/$2");
};

