// @ts-nocheck
"use client";
/**
 * Input com máscara — reutiliza o Input do shadcn e aplica um formatter.
 * Não altera o value armazenado no state pelo consumidor além do que o
 * formatter definir; o consumidor decide o formato persistido.
 */
import { forwardRef } from "react";
import { Input } from "@/lv/components/ui/input";
import { maskCurrency, maskPhoneBR, maskCPF, maskCNPJ, maskCpfCnpj, maskRG, maskDateBR } from "@/lv/lib/masks";

type MaskKind = "currency" | "phone" | "cpf" | "cnpj" | "cpfcnpj" | "rg" | "date";

const MASKS: Record<MaskKind, (s: string) => string> = {
  currency: maskCurrency,
  phone: maskPhoneBR,
  cpf: maskCPF,
  cnpj: maskCNPJ,
  cpfcnpj: maskCpfCnpj,
  rg: maskRG,
  date: maskDateBR,
};

interface MaskedInputProps extends Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> {
  mask: MaskKind;
  value: string;
  onValueChange: (masked: string) => void;
}

const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, value, onValueChange, ...rest }, ref) => {
    const fmt = MASKS[mask];
    return (
      <Input
        ref={ref}
        inputMode={mask === "currency" || mask === "phone" || mask === "cpf" || mask === "cnpj" || mask === "cpfcnpj" || mask === "date" ? "numeric" : "text"}
        value={fmt(value ?? "")}
        onChange={(e) => onValueChange(fmt(e.target.value))}
        {...rest}
      />
    );
  }
);
MaskedInput.displayName = "MaskedInput";

export default MaskedInput;
