// @ts-nocheck
"use client";
/**
 * Página pública de contrato — /contrato/:token
 *
 * Fluxo de assinatura (regra fixa):
 *   1. CONTRATADA (Empresa) assina primeiro — pode ser pelo mesmo link no celular/desktop.
 *   2. CONTRATANTE (Cliente) assina depois — informa Nome Completo + CPF junto com a assinatura.
 *   3. Após as duas assinaturas o contrato é bloqueado e disponível para download.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "@/lv/shims/router";
import { db } from "@/lv/lib/supabaseClient";
import { Button } from "@/lv/components/ui/button";
import { Input } from "@/lv/components/ui/input";
import { Label } from "@/lv/components/ui/label";
import { Checkbox } from "@/lv/components/ui/checkbox";
import { toast } from "@/lv/hooks/use-toast";
import { SignaturePad } from "@/lv/components/contracts/SignaturePad";
import { sha256, fetchClientIp, CONTRACT_STATUS_LABEL, buildVariables, renderTemplate } from "@/lv/lib/contracts";
import { FileSignature, ShieldCheck, Building2, User, Printer, Loader2, Check } from "lucide-react";
import { renderContractPrintHtml, contractBodyToHtml, ContractThemeDots, type ContractTheme } from "@/lv/components/contracts/ContractPrintTemplate";
import { PremiumContractView } from "@/lv/components/contracts/PremiumContractView";
import { maskCpfCnpj } from "@/lv/lib/masks";
import { notifyAdminEvent } from "@/lv/lib/publicAdminEvents";

interface PartyInfo {
  name: string;
  document?: string;
  responsible?: string;
  email?: string;
  phone?: string;
  address?: string;
  cityUf?: string;
}

export default function PublicContract() {
  const { token } = useParams<{ token: string }>();
  const [contract, setContract] = useState<any>(null);
  const [empresa, setEmpresa] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Contratada (Empresa) — assinatura
  const [providerSig, setProviderSig] = useState<string | null>(null);
  const [acceptedProvider, setAcceptedProvider] = useState(false);

  // Contratante (Cliente) — dados + assinatura
  const [clientFullName, setClientFullName] = useState("");
  const [clientCpf, setClientCpf] = useState("");
  const [clientSig, setClientSig] = useState<string | null>(null);
  const [acceptedClient, setAcceptedClient] = useState(false);

  const [busy, setBusy] = useState(false);
  const [liveTheme, setLiveTheme] = useState<ContractTheme>("apple-blue");
  const viewNotifiedRef = useRef(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    const [{ data: c, error }, { data: e }] = await Promise.all([
      db.from("contracts").select("*").eq("token", token).maybeSingle(),
      db.from("empresa_contratada_config").select("*").limit(1).maybeSingle(),
    ]);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    let effectiveContract = c;
    if ((c as any)?.template_id) {
      const { data: template } = await db
        .from("contract_templates")
        .select("body")
        .eq("id", (c as any).template_id)
        .maybeSingle();
      if ((template as any)?.body) {
        effectiveContract = {
          ...(c as any),
          body: renderTemplate((template as any).body, buildVariables({
            name: (c as any).client_name,
            cpf_cnpj: (c as any).client_document,
            email: (c as any).client_email,
            phone: (c as any).client_phone,
            address: (c as any).client_address,
          }, c)),
        };
      }
    }
    setContract(effectiveContract);
    setLiveTheme((((c as any)?.variables as any)?.print_theme as ContractTheme) || "apple-blue");
    setEmpresa(e);
    if (c && !viewNotifiedRef.current) {
      viewNotifiedRef.current = true;
      notifyAdminEvent({
        type: "contract_viewed",
        title: `Contrato aberto — ${c.client_name || "Cliente"}`,
        message: c.title || "O link do contrato foi aberto.",
        metadata: { contract_id: c.id, token: c.token, client_id: c.client_id },
      });
    }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  // Fase da assinatura
  const phase: "provider" | "client" | "done" | "canceled" = useMemo(() => {
    if (!contract) return "provider";
    if (contract.status === "cancelado") return "canceled";
    if (!contract.provider_signed_at) return "provider";
    if (!contract.client_signed_at) return "client";
    return "done";
  }, [contract]);

  const theme: ContractTheme = liveTheme;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando contrato...
        </div>
      </div>
    );
  }
  if (!contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md text-center bg-white rounded-2xl shadow-sm border p-8">
          <FileSignature className="h-10 w-10 mx-auto text-rose-500 mb-2" />
          <div className="font-semibold text-slate-900">Contrato não encontrado</div>
          <div className="text-sm text-slate-500 mt-1">Verifique o link recebido.</div>
        </div>
      </div>
    );
  }

  const clientDisplayName = contract.client_name || "Cliente";
  const composedClientAddress = contract.client_address || "";

  const clientParty: PartyInfo = {
    name: clientDisplayName,
    document: contract.client_document || clientCpf || "",
    responsible: clientFullName || contract.client_name || "",
    email: contract.client_email || "",
    phone: contract.client_phone || "",
    address: composedClientAddress,
  };
  const contractorParty: PartyInfo = {
    name: empresa?.razao_social || contract.contractor_name || "Matheus Rangel",
    document: empresa?.documento || contract.contractor_document || "",
    responsible: empresa?.representante || "",
    email: empresa?.email || contract.contractor_email || "atendimento@matheusrangel.com.br",
    phone: empresa?.whatsapp || "",
    address: empresa?.endereco || "",
    cityUf: empresa?.cidade_uf || "",
  };

  const numberLabel = "#" + String(contract.id).replace(/-/g, "").slice(-6).toUpperCase();
  const dateLabel = new Date(contract.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  // ---- Assinaturas ----
  const submitProvider = async () => {
    if (!providerSig) return toast({ title: "Desenhe a assinatura da Contratada", variant: "destructive" });
    if (!acceptedProvider) return toast({ title: "Confirme os termos para prosseguir", variant: "destructive" });
    setBusy(true);
    try {
      const ip = await fetchClientIp();
      const hash = await sha256((contract.body || "") + "|contratada|" + providerSig);
      const { error } = await db.from("contracts").update({
        provider_signature: providerSig,
        provider_signed_at: new Date().toISOString(),
        provider_ip: ip,
        provider_user_agent: navigator.userAgent,
        document_hash: hash,
        status: "enviado",
      }).eq("token", token!);
      if (error) throw error;
      notifyAdminEvent({
        type: "contract_signed",
        title: `Empresa assinou — ${contract.client_name || "Cliente"}`,
        message: "Assinatura da Contratada registrada. Aguardando cliente.",
        metadata: { contract_id: contract.id, token: contract.token, party: "provider" },
      });
      toast({ title: "Assinatura da Contratada registrada ✓", description: "Agora envie o link para o cliente assinar." });
      await load();
    } catch (e: any) {
      toast({ title: "Erro ao assinar", description: e.message || String(e), variant: "destructive" });
    } finally { setBusy(false); }
  };

  const submitClient = async () => {
    if (!clientFullName.trim()) return toast({ title: "Informe o Nome Completo", variant: "destructive" });
    if (clientCpf.replace(/\D/g, "").length < 11) return toast({ title: "CPF inválido", variant: "destructive" });
    if (!clientSig) return toast({ title: "Desenhe sua assinatura", variant: "destructive" });
    if (!acceptedClient) return toast({ title: "Confirme os termos para prosseguir", variant: "destructive" });
    setBusy(true);
    try {
      const ip = await fetchClientIp();
      const hash = await sha256((contract.body || "") + "|cliente|" + clientSig + "|" + clientCpf);
      const { error } = await db.from("contracts").update({
        client_signature: clientSig,
        client_signed_at: new Date().toISOString(),
        client_ip: ip,
        client_user_agent: navigator.userAgent,
        client_name: clientFullName.trim(),
        client_document: clientCpf,
        document_hash: hash,
        status: "assinado_todos",
      }).eq("token", token!);
      if (error) throw error;
      notifyAdminEvent({
        type: "contract_signed",
        title: `Cliente assinou — ${clientFullName}`,
        message: contract.title || "Contrato assinado por ambas as partes.",
        metadata: { contract_id: contract.id, token: contract.token, party: "client", cpf: clientCpf },
      });
      toast({ title: "Contrato assinado com sucesso ✓", description: "Ambas as partes assinaram." });
      await load();
    } catch (e: any) {
      toast({ title: "Erro ao assinar", description: e.message || String(e), variant: "destructive" });
    } finally { setBusy(false); }
  };

  const openPrint = () => {
    const html = renderContractPrintHtml(theme, {
      title: contract.title,
      number: numberLabel,
      date: dateLabel,
      clientName: clientParty.name,
      clientDocument: clientParty.document,
      clientResponsible: clientParty.responsible,
      clientAddress: clientParty.address,
      clientEmail: clientParty.email,
      clientPhone: clientParty.phone,
      contractorName: contractorParty.name,
      contractorDocument: contractorParty.document,
      contractorResponsible: contractorParty.responsible,
      contractorAddress: contractorParty.address,
      contractorCityUf: contractorParty.cityUf,
      contractorEmail: contractorParty.email,
      contractorPhone: contractorParty.phone,
      bodyHtml: contractBodyToHtml(contract.body || ""),
      clientSignatureImg: contract.client_signature,
      providerSignatureImg: contract.provider_signature,
    });
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open(); w.document.write(html); w.document.close();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 py-6 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <header className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-medium">
            <ShieldCheck className="h-3.5 w-3.5" /> Assinatura digital com validade jurídica (MP 2.200-2)
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-3">{contract.title}</h1>
          <div className="text-xs text-slate-500 mt-1">
            Status: {CONTRACT_STATUS_LABEL[contract.status] || contract.status}
          </div>
        </header>

        {/* Passos visuais */}
        <div className="flex items-center justify-center gap-3 text-[11px] font-medium">
          <PhaseBadge label="Contratada assina" active={phase === "provider"} done={!!contract.provider_signed_at} />
          <div className="w-6 h-[2px] bg-slate-200" />
          <PhaseBadge label="Cliente assina" active={phase === "client"} done={!!contract.client_signed_at} />
          <div className="w-6 h-[2px] bg-slate-200" />
          <PhaseBadge label="Concluído" active={phase === "done"} done={phase === "done"} />
        </div>

        {/* Prévia premium colorida — renderização nativa, sem iframe e sem fallback de texto simples */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Printer className="h-4 w-4 text-slate-500" /> Prévia premium do contrato
            </div>
            <ContractThemeDots value={theme} onChange={setLiveTheme} />
          </div>
          <div className="overflow-x-auto rounded-[28px] bg-white p-0 shadow-2xl shadow-slate-200/80 ring-1 ring-slate-200">
            <PremiumContractView
              theme={theme}
              title={contract.title}
              number={numberLabel}
              date={dateLabel}
              client={clientParty}
              contractor={contractorParty}
              body={contract.body || ""}
              clientSignatureImg={contract.client_signature || (phase === "client" ? clientSig : null)}
              providerSignatureImg={contract.provider_signature || (phase === "provider" ? providerSig : null)}
              documentHash={contract.document_hash}
              signed={phase === "done"}
            />
          </div>
        </section>

        {/* Blocos de ação por fase */}
        {phase === "canceled" && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
            <div className="font-semibold text-rose-900">Contrato cancelado</div>
            <div className="text-sm text-rose-700 mt-1">Este contrato não pode mais ser assinado.</div>
          </div>
        )}

        {phase === "provider" && (
          <div className="rounded-2xl border-2 border-emerald-300 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[15px] font-bold text-slate-900">Assinatura da Contratada (Empresa)</div>
                <div className="text-[12.5px] text-slate-600">
                  Esta é a <strong>1ª assinatura</strong>. Assine no computador, tablet ou celular.
                </div>
              </div>
            </div>
            <SignaturePad value={providerSig} onChange={setProviderSig} height={180} />
            <label className="flex items-start gap-2 text-[12.5px] text-slate-700 cursor-pointer">
              <Checkbox checked={acceptedProvider} onCheckedChange={(v) => setAcceptedProvider(!!v)} className="mt-0.5" />
              <span>
                Confirmo que sou representante da <strong>{contractorParty.name}</strong> e autorizo o registro do IP, data/hora e hash SHA-256 do documento.
              </span>
            </label>
            <div className="flex justify-end">
              <Button onClick={submitProvider} disabled={busy} className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white">
                {busy ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Registrando...</> : <><Check className="h-4 w-4 mr-1.5" /> Assinar como Contratada</>}
              </Button>
            </div>
          </div>
        )}

        {phase === "client" && (
          <div className="rounded-2xl border-2 border-indigo-300 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <User className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[15px] font-bold text-slate-900">Assinatura do Contratante (Cliente)</div>
                <div className="text-[12.5px] text-slate-600">
                  Informe seus dados e assine na tela. Estes dados ficam registrados junto com sua assinatura no contrato.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px]">Nome Completo *</Label>
                <Input value={clientFullName} onChange={(e) => setClientFullName(e.target.value)} placeholder="Como está no documento" />
              </div>
              <div>
                <Label className="text-[12px]">CPF *</Label>
                <Input value={clientCpf} onChange={(e) => setClientCpf(maskCpfCnpj(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" />
              </div>
            </div>

            <SignaturePad value={clientSig} onChange={setClientSig} height={180} />

            <label className="flex items-start gap-2 text-[12.5px] text-slate-700 cursor-pointer">
              <Checkbox checked={acceptedClient} onCheckedChange={(v) => setAcceptedClient(!!v)} className="mt-0.5" />
              <span>
                Declaro que li integralmente o contrato acima e concordo com todos os seus termos.
                Autorizo o registro do meu IP, data/hora e hash SHA-256 do documento para fins de validade jurídica.
              </span>
            </label>

            <div className="flex justify-end">
              <Button onClick={submitClient} disabled={busy} className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white">
                {busy ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Registrando...</> : <><Check className="h-4 w-4 mr-1.5" /> Assinar Contrato</>}
              </Button>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6 text-center space-y-3">
            <ShieldCheck className="h-10 w-10 text-emerald-600 mx-auto" />
            <div className="font-semibold text-emerald-900">Contrato assinado por ambas as partes</div>
            <div className="text-sm text-emerald-700">
              Contratada em {contract.provider_signed_at ? new Date(contract.provider_signed_at).toLocaleString("pt-BR") : "—"} ·
              Cliente em {contract.client_signed_at ? new Date(contract.client_signed_at).toLocaleString("pt-BR") : "—"}.
            </div>
            <div className="flex justify-center gap-2 pt-1">
              <Button onClick={openPrint} className="rounded-full bg-slate-900 hover:bg-slate-800 text-white">
                <Printer className="h-4 w-4 mr-1.5" /> Imprimir / Baixar PDF
              </Button>
            </div>
          </div>
        )}

        <div className="text-center text-[11px] text-slate-400 pt-4">
          Documento seguro · {contractorParty.name} · Sistema de Contratos Digitais
        </div>
      </div>
    </div>
  );
}

function PhaseBadge({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  const cls = done
    ? "bg-emerald-600 text-white ring-emerald-200"
    : active
      ? "bg-indigo-600 text-white ring-indigo-200"
      : "bg-slate-100 text-slate-400 ring-slate-200";
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-6 w-6 rounded-full ring-2 flex items-center justify-center ${cls}`}>
        {done ? <Check className="h-3.5 w-3.5" /> : <span className="text-[10px] font-bold">●</span>}
      </div>
      <span className={done || active ? "text-slate-900" : "text-slate-400"}>{label}</span>
    </div>
  );
}
