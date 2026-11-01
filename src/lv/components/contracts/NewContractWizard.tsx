// @ts-nocheck
"use client";
import { getPaymentsBaseUrl } from "@/lv/lib/domainUtils";
/**
 * Wizard de 3 etapas para criação de contrato:
 *  1. Dados do Cliente  (busca existente OU cria novo, com máscaras + CEP)
 *  2. Modelos & Tipo    (escolhe entre os 4 templates cadastrados)
 *  3. Contrato & Assinatura (prévia + assinatura CONTRATANTE + CONTRATADA + imprimir)
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { db } from "@/lv/lib/supabaseClient";
import { X } from "lucide-react";
import { Button } from "@/lv/components/ui/button";
import { Input } from "@/lv/components/ui/input";
import { Label } from "@/lv/components/ui/label";
import { Textarea } from "@/lv/components/ui/textarea";
import { toast } from "@/lv/hooks/use-toast";
import {
  Search, User, ArrowLeft, ArrowRight, Check, Printer, FileSignature, Loader2, Copy, MessageCircle, Link2, ExternalLink,
} from "lucide-react";
import { cn } from "@/lv/lib/utils";
import { SignaturePad } from "@/lv/components/contracts/SignaturePad";
import { SIGNATURE_FONT_FAMILY, toSignatureCase } from "@/lv/lib/signatureFont";
import { maskCpfCnpj, maskPhoneBR, maskCEP, maskCurrency, parseBRL, formatBRL, fetchAddressByCep } from "@/lv/lib/masks";
import { SERVICE_TYPES, getServiceTypeMeta, type ServiceTypeKey } from "@/lv/lib/serviceTypes";
import { renderTemplate, buildVariables, sha256, fetchClientIp } from "@/lv/lib/contracts";
import { ContractThemePicker, ContractThemeDots, renderContractPrintHtml, contractBodyToHtml, CONTRACT_THEME_TOKENS, type ContractTheme } from "@/lv/components/contracts/ContractPrintTemplate";

interface Template { id: string; key: string; title: string; body: string; }
interface Client {
  id: string; name: string; email?: string; phone?: string; whatsapp?: string;
  cpf_cnpj?: string; address?: string; cep?: string; street?: string;
  neighborhood?: string; city?: string; state?: string; address_number?: string;
  company_name?: string;
}

function templateServiceKey(key: string): ServiceTypeKey {
  const k = (key || "").toLowerCase();
  if (k.includes("trafego") || k.includes("tráfego") || k.includes("ads")) return "trafego_pago";
  if (k.includes("loja") || k.includes("ecom") || k.includes("shop")) return "loja_virtual";
  if (k.includes("app") || k.includes("sistema") || k.includes("pwa")) return "sistemas_app";
  return "sites_paginas";
}

interface Props {
  open: boolean;
  onClose: () => void;
  templates: Template[];
  clients: Client[];
  onCreated: () => void;
}

export function NewContractWizard({ open, onClose, templates, clients, onCreated }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: cliente
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [clientId, setClientId] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [newClient, setNewClient] = useState({
    name: "", email: "", phone: "", cpf_cnpj: "",
    cep: "", street: "", address_number: "", neighborhood: "", city: "", state: "",
  });
  const [cepLoading, setCepLoading] = useState(false);

  // Step 2: template
  const [templateId, setTemplateId] = useState("");

  // Step 3: contrato
  const [laborValue, setLaborValue] = useState(""); // BRL masked - mão de obra
  const [adsValue, setAdsValue] = useState(""); // BRL masked - tráfego pago
  const [selectedPlanIndex, setSelectedPlanIndex] = useState<number | null>(null);
  const [plansByService, setPlansByService] = useState<Record<string, any[]>>({});

  // PWA / Sistemas — campos específicos
  const [pwaTipoProjeto, setPwaTipoProjeto] = useState("Sistema Web");
  const [pwaNomeProjeto, setPwaNomeProjeto] = useState("");
  const [pwaDescricaoProjeto, setPwaDescricaoProjeto] = useState("");
  const [pwaValorProjeto, setPwaValorProjeto] = useState(""); // BRL masked
  const [pwaPlanoHospedagem, setPwaPlanoHospedagem] = useState("");
  const [pwaPeriodoHospedagem, setPwaPeriodoHospedagem] = useState("1 Ano");
  const [pwaValorHospedagem, setPwaValorHospedagem] = useState(""); // BRL masked
  const [pwaDominio, setPwaDominio] = useState("");

  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scope, setScope] = useState("");
  const [signerName, setSignerName] = useState("");
  const [clientSig, setClientSig] = useState<string | null>(null);
  const [providerSig, setProviderSig] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [empresa, setEmpresa] = useState<any>(null);
  const [printTheme, setPrintTheme] = useState<ContractTheme>("apple-blue");
  const [savedContract, setSavedContract] = useState<{ id: string; token: string } | null>(null);

  const PUBLIC_BASE = getPaymentsBaseUrl();



  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setStep(1); setMode("existing"); setClientId(""); setClientQuery("");
      setNewClient({ name: "", email: "", phone: "", cpf_cnpj: "", cep: "", street: "", address_number: "", neighborhood: "", city: "", state: "" });
      setTemplateId(""); setLaborValue(""); setAdsValue(""); setScope("");
      setSignerName(""); setClientSig(null); setProviderSig(null); setSavedContract(null);
      setSelectedPlanIndex(null);
      setPwaTipoProjeto("Sistema Web"); setPwaNomeProjeto(""); setPwaDescricaoProjeto("");
      setPwaValorProjeto(""); setPwaPlanoHospedagem(""); setPwaPeriodoHospedagem("1 Ano");
      setPwaValorHospedagem(""); setPwaDominio("");
      const today = new Date().toISOString().slice(0, 10);
      setStartDate(today); setDueDate(today);

    } else {
      db.from("empresa_contratada_config").select("*").limit(1).maybeSingle()
        .then(({ data }) => setEmpresa(data));
      // Carrega planos configurados em Orçamentos > Planos (sincronia em tempo real)
      db.from("sales_page_config").select("config").eq("id", "quote_plans_defaults").maybeSingle()
        .then(({ data }: any) => {
          const map = data?.config?.plansByService || {};
          setPlansByService({
            trafego_pago: Array.isArray(map.trafego_pago) ? map.trafego_pago : (Array.isArray(data?.config?.plans) ? data.config.plans : []),
            sites_paginas: Array.isArray(map.sites_paginas) ? map.sites_paginas : [],
            loja_virtual: Array.isArray(map.loja_virtual) ? map.loja_virtual : [],
            sistemas_app: Array.isArray(map.sistemas_app) ? map.sistemas_app : [],
          });
        });
    }
  }, [open]);

  // Helper: extrai primeiro valor monetário de uma string tipo "R$ 900,00 (R$ 30/dia)"
  const extractMoney = (s: string): number => {
    if (!s) return 0;
    const before = String(s).split("(")[0];
    return parseBRL(before);
  };

  const currentServiceKey: ServiceTypeKey | null = templateId
    ? templateServiceKey(templates.find((t) => t.id === templateId)?.key || "")
    : null;
  const isPwa = currentServiceKey === "sistemas_app";
  const availablePlans = currentServiceKey ? (plansByService[currentServiceKey] || []) : [];
  const selectedPlan = selectedPlanIndex != null ? availablePlans[selectedPlanIndex] : null;

  const applyPlan = (idx: number) => {
    const p = availablePlans[idx];
    if (!p) return;
    setSelectedPlanIndex(idx);
    const total = extractMoney(p.total);
    const labor = extractMoney(p.labor);
    let ads = extractMoney(p.ads);
    if (isPwa) {
      // Para PWA usa apenas o total do plano como valor do projeto
      const proj = total > 0 ? total : labor;
      setPwaValorProjeto(proj > 0 ? maskCurrency(String(Math.round(proj * 100))) : "");
      return;
    }
    // Se ads = 0 e total > labor, deduz. Se labor = 0, usa total como labor.
    if (labor === 0 && total > 0 && ads === 0) {
      setLaborValue(maskCurrency(String(Math.round(total * 100))));
      setAdsValue("");
    } else {
      if (ads === 0 && total > 0 && labor > 0 && total > labor) ads = total - labor;
      setLaborValue(labor > 0 ? maskCurrency(String(Math.round(labor * 100))) : "");
      setAdsValue(ads > 0 ? maskCurrency(String(Math.round(ads * 100))) : "");
    }
  };


  const existing = clients.find((c) => c.id === clientId) || null;
  const template = templates.find((t) => t.id === templateId) || null;
  const meta = template ? getServiceTypeMeta(templateServiceKey(template.key)) : null;

  const filteredClients = useMemo(() => {
    const s = clientQuery.trim().toLowerCase();
    if (!s) return clients;
    return clients.filter((c) =>
      c.name?.toLowerCase().includes(s) ||
      c.email?.toLowerCase().includes(s) ||
      c.cpf_cnpj?.toLowerCase().includes(s),
    );
  }, [clientQuery, clients]);

  // Cliente ativo (existente ou novo em cadastro)
  const activeClient: Client | null = mode === "existing"
    ? existing
    : (newClient.name ? {
        id: "", name: newClient.name, email: newClient.email, phone: newClient.phone,
        cpf_cnpj: newClient.cpf_cnpj, cep: newClient.cep, street: newClient.street,
        neighborhood: newClient.neighborhood, city: newClient.city, state: newClient.state,
        address_number: newClient.address_number,
        address: [newClient.street, newClient.address_number, newClient.neighborhood, newClient.city, newClient.state, newClient.cep].filter(Boolean).join(", "),
      } : null);

  const canGoStep2 = !!activeClient?.name;
  const canGoStep3 = !!templateId;

  const handleCepBlur = async () => {
    const cep = newClient.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoading(true);
    const addr = await fetchAddressByCep(cep);
    setCepLoading(false);
    if (addr) {
      setNewClient((n) => ({
        ...n,
        street: addr.logradouro || n.street,
        neighborhood: addr.bairro || n.neighborhood,
        city: addr.localidade || n.city,
        state: addr.uf || n.state,
      }));
    } else {
      toast({ title: "CEP não encontrado", variant: "destructive" });
    }
  };

  const goStep2 = async () => {
    if (mode === "new") {
      if (!newClient.name.trim()) return toast({ title: "Nome é obrigatório", variant: "destructive" });
    } else if (!clientId) {
      return toast({ title: "Selecione um cliente", variant: "destructive" });
    }
    setStep(2);
  };

  const goStep3 = () => {
    if (!templateId) return toast({ title: "Escolha um modelo", variant: "destructive" });
    if (activeClient && !signerName) setSignerName(activeClient.name);
    setStep(3);
  };

  // ---- Rendered preview ----
  const laborNumber = parseBRL(laborValue);
  const adsNumber = parseBRL(adsValue);
  const totalNumber = laborNumber + adsNumber;
  const dailyNumber = adsNumber > 0 ? adsNumber / 30 : 0;

  // PWA numbers
  const pwaProjNumber = parseBRL(pwaValorProjeto);
  const pwaHostNumber = parseBRL(pwaValorHospedagem);
  const pwaParcela1 = pwaProjNumber * 0.30;
  const pwaParcela2 = pwaProjNumber * 0.30;
  const pwaParcela3 = pwaProjNumber * 0.40;


  const previewVars = activeClient && template ? (() => {
    const displayTotal = isPwa ? pwaProjNumber : totalNumber;
    const vars: any = buildVariables(
      {
        name: activeClient.name,
        cpf_cnpj: activeClient.cpf_cnpj,
        email: activeClient.email,
        phone: activeClient.phone,
        address: activeClient.address,
      },
      {
        service_value: isPwa ? pwaProjNumber : laborNumber,
        service_scope: isPwa ? pwaDescricaoProjeto : scope,
        payment_terms: isPwa
          ? `Projeto: R$ ${formatBRL(pwaProjNumber)} · 30/30/40 · Início: ${new Date(startDate + "T12:00:00").toLocaleDateString("pt-BR")}`
          : `Mão de obra: R$ ${formatBRL(laborNumber)} · Anúncios: R$ ${formatBRL(adsNumber)} · Total: R$ ${formatBRL(totalNumber)} · Início: ${new Date(startDate + "T12:00:00").toLocaleDateString("pt-BR")}`,
        contractor_name: empresa?.razao_social || "Matheus Rangel",
      },
    );
    // Flat variables (novo padrão do texto de contrato)
    vars.cliente_nome = activeClient.name || "";
    vars.cliente_documento = activeClient.cpf_cnpj || "";
    vars.cliente_responsavel = activeClient.name || "";
    vars.cliente_email = activeClient.email || "";
    vars.cliente_whatsapp = activeClient.phone || "";
    vars.cliente_endereco = activeClient.address || "";
    vars.empresa_nome = empresa?.razao_social || "Matheus Rangel da Silva";
    vars.empresa_documento = empresa?.documento || "";
    vars.empresa_email = empresa?.email || "atendimento@matheusrangel.com.br";
    vars.empresa_telefone = empresa?.whatsapp || "";
    vars.empresa_endereco = [empresa?.endereco, empresa?.cidade_uf].filter(Boolean).join(" — ");
    vars.empresa_representante = empresa?.representante || "";
    vars.nome_do_plano = selectedPlan?.name || selectedPlan?.title || template.title || "";
    vars.valor_total = `R$ ${formatBRL(displayTotal)}`;
    vars.valor_mao_de_obra = `R$ ${formatBRL(laborNumber)}`;
    vars.valor_anuncios = `R$ ${formatBRL(adsNumber)}`;
    vars.valor_diario = `R$ ${formatBRL(dailyNumber)}`;
    vars.valor_mensal = `R$ ${formatBRL(laborNumber)}`; // retrocompat
    vars.data_inicio = new Date(startDate + "T12:00:00").toLocaleDateString("pt-BR");
    vars.data_vencimento = new Date(dueDate + "T12:00:00").toLocaleDateString("pt-BR");
    vars.dia_vencimento = String(new Date(dueDate + "T12:00:00").getDate()).padStart(2, "0");

    // PWA / Sistemas — variáveis específicas usadas pelo template sistema_app
    vars.tipo_projeto = pwaTipoProjeto || "";
    vars.nome_projeto = pwaNomeProjeto || "";
    vars.descricao_projeto = pwaDescricaoProjeto || "";
    vars.valor_projeto = `R$ ${formatBRL(pwaProjNumber)}`;
    vars.parcela_1 = `R$ ${formatBRL(pwaParcela1)}`;
    vars.parcela_2 = `R$ ${formatBRL(pwaParcela2)}`;
    vars.parcela_3 = `R$ ${formatBRL(pwaParcela3)}`;
    vars.plano_hospedagem = pwaPlanoHospedagem || "";
    vars.periodo_hospedagem = pwaPeriodoHospedagem || "";
    vars.valor_hospedagem = pwaHostNumber > 0 ? `R$ ${formatBRL(pwaHostNumber)}` : "";
    vars.dominio = pwaDominio || "";
    vars.prazo_estimado = "30 (trinta) dias corridos";
    vars.prazo_maximo = "60 (sessenta) dias";
    vars.garantia = "6 (seis) meses";
    vars.suporte_gratuito = "6 (seis) meses";
    vars.valor_suporte_avulso = "R$ 250,00";
    return vars;
  })() : null;


  const renderedBody = template && previewVars ? renderTemplate(template.body, previewVars) : "";

  // ---- Save / Sign ----
  const submit = async () => {
    if (!template || !activeClient) return;

    setBusy(true);
    try {
      // Cria cliente se novo
      let cid = clientId;
      if (mode === "new") {
        const { data: { user } } = await db.auth.getUser();
        const { data: created, error: cErr } = await db.from("clients").insert({
          user_id: user?.id,
          name: newClient.name,
          email: newClient.email || null,
          phone: newClient.phone || null,
          whatsapp: newClient.phone || null,
          cpf_cnpj: newClient.cpf_cnpj || null,
          cep: newClient.cep || null,
          street: newClient.street || null,
          address_number: newClient.address_number || null,
          neighborhood: newClient.neighborhood || null,
          city: newClient.city || null,
          state: newClient.state || null,
          address: activeClient.address || null,
        }).select("id").single();
        if (cErr) throw cErr;
        cid = created.id;
      }

      const ip = await fetchClientIp();
      const hash = await sha256(renderedBody + "|" + (providerSig || ""));
      // Regra: Empresa assina primeiro. Se já assinou aqui, status = 'enviado' (aguardando cliente).
      // Caso contrário, status = 'rascunho' (empresa assinará via link também).
      const status = providerSig ? "enviado" : "rascunho";

      const payload: any = {
        template_key: template.key,
        template_id: template.id,
        client_id: cid || null,
        title: `${template.title} — ${activeClient.name}`,
        body: renderedBody,
        variables: {
          ...previewVars,
          labor_value: laborNumber,
          ads_value: adsNumber,
          total_value: totalNumber,
          daily_value: dailyNumber,
          start_date: startDate,
          due_date: dueDate,
          signer_name: signerName,
          print_theme: printTheme,
          // PWA fields
          pwa_tipo_projeto: pwaTipoProjeto,
          pwa_nome_projeto: pwaNomeProjeto,
          pwa_descricao_projeto: pwaDescricaoProjeto,
          pwa_valor_projeto: pwaProjNumber,
          pwa_parcela_1: pwaParcela1,
          pwa_parcela_2: pwaParcela2,
          pwa_parcela_3: pwaParcela3,
          pwa_plano_hospedagem: pwaPlanoHospedagem,
          pwa_periodo_hospedagem: pwaPeriodoHospedagem,
          pwa_valor_hospedagem: pwaHostNumber,
          pwa_dominio: pwaDominio,
        },
        service_value: isPwa ? pwaProjNumber : laborNumber,
        service_scope: (isPwa ? pwaDescricaoProjeto : scope) || null,
        payment_terms: isPwa
          ? `Projeto R$ ${formatBRL(pwaProjNumber)} — 30% início / 30% em 30 dias / 40% em 60 dias`
          : `Mão de obra R$ ${formatBRL(laborNumber)} + Anúncios R$ ${formatBRL(adsNumber)} = Total R$ ${formatBRL(totalNumber)}`,

        contractor_name: empresa?.razao_social || "Matheus Rangel",
        contractor_document: empresa?.documento || null,
        contractor_email: empresa?.email || null,
        client_name: activeClient.name,
        client_document: activeClient.cpf_cnpj || null,
        client_email: activeClient.email || null,
        client_phone: activeClient.phone || null,
        client_address: activeClient.address || null,
        status,
        sent_at: new Date().toISOString(),
        provider_signature: providerSig,
        provider_signed_at: providerSig ? new Date().toISOString() : null,
        provider_ip: providerSig ? ip : null,
        document_hash: hash,
      };

      const { data: inserted, error } = await db.from("contracts").insert(payload).select("id, token").single();
      if (error) throw error;

      setSavedContract({ id: inserted.id, token: inserted.token });
      toast({ title: "Contrato criado!", description: "Compartilhe o link para colher a assinatura do cliente." });
      onCreated();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message || String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const shareUrl = savedContract ? `${PUBLIC_BASE}/contrato/${savedContract.token}` : "";
  const copyShareLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: "Link copiado!", description: "Cole no WhatsApp, e-mail ou onde quiser." });
  };
  const whatsappShare = () => {
    if (!shareUrl) return;
    const msg = `Olá! Segue o link do contrato para leitura e assinatura digital:\n\n${shareUrl}\n\nBasta abrir no celular, tablet ou computador, ler com calma e assinar na tela.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };


  const openPrintWindow = (theme: ContractTheme) => {
    if (!template || !activeClient) return;
    const clientDisplayName = activeClient.company_name?.trim() || activeClient.name;
    const clientResp = activeClient.company_name?.trim() ? activeClient.name : "";
    const composedAddress = activeClient.address?.trim()
      || [activeClient.street, activeClient.address_number, activeClient.neighborhood, activeClient.city, activeClient.state, activeClient.cep].filter(Boolean).join(", ");
    const html = renderContractPrintHtml(theme, {
      title: template.title,
      number: "#" + String(Date.now()).slice(-6),
      date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
      clientName: clientDisplayName,
      clientDocument: activeClient.cpf_cnpj,
      clientResponsible: clientResp,
      clientAddress: composedAddress,
      clientEmail: activeClient.email,
      clientPhone: activeClient.phone || activeClient.whatsapp,
      contractorName: empresa?.razao_social || "Matheus Rangel",
      contractorDocument: empresa?.documento,
      contractorResponsible: empresa?.representante || "",
      contractorAddress: empresa?.endereco || "",
      contractorEmail: empresa?.email || "atendimento@matheusrangel.com.br",
      contractorPhone: empresa?.whatsapp || "",
      contractorCityUf: empresa?.cidade_uf || "",
      contractorWebsite: (empresa?.email || "").split("@")[1] || "matheusrangel.com.br",
      planName: selectedPlan?.name || selectedPlan?.title,
      totalValue: totalNumber > 0 ? `R$ ${formatBRL(totalNumber)}` : undefined,
      clientSignatureImg: clientSig,
      providerSignatureImg: providerSig,
      bodyHtml: contractBodyToHtml(renderedBody),
      isSigned: !!clientSig,
    });
    const w = window.open("", "_blank", "width=980,height=1050");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };
  const doPrint = () => openPrintWindow(printTheme);

  // Escuta troca de tema disparada pela janela de impressão (bolinhas na toolbar)
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e?.data?.type === "contract-theme-change" && e.data.theme) {
        setPrintTheme(e.data.theme);
        setTimeout(() => openPrintWindow(e.data.theme), 120);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, activeClient, renderedBody, clientSig, providerSig, empresa, selectedPlan, totalNumber]);

  const StepBadge = ({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) => (
    <div className="flex-1 flex flex-col items-center gap-1.5">
      <div className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ring-2 transition-all",
        done ? "bg-emerald-600 text-white ring-emerald-200"
          : active ? "bg-indigo-600 text-white ring-indigo-200"
          : "bg-slate-100 text-slate-400 ring-slate-200",
      )}>
        {done ? <Check className="h-4 w-4" /> : n}
      </div>
      <span className={cn("text-[11px] font-medium tracking-wide uppercase",
        active ? "text-slate-900" : "text-slate-400")}>{label}</span>
    </div>
  );

  if (!open) return null;

  return (
    <div
      className="w-full"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm mb-5">
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-indigo-500" />
              <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">Novo Contrato</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-9 w-9" title="Fechar">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Cadastro em 3 etapas: dados, modelos e contrato.
          </p>
          <div className="flex items-center gap-4 mt-5 px-2">
            <StepBadge n={1} active={step === 1} done={step > 1} label="Dados do Cliente" />
            <div className="h-[2px] flex-1 bg-gradient-to-r from-indigo-200 to-slate-200 -mt-6" />
            <StepBadge n={2} active={step === 2} done={step > 2} label="Modelos & Tipo" />
            <div className="h-[2px] flex-1 bg-gradient-to-r from-indigo-200 to-slate-200 -mt-6" />
            <StepBadge n={3} active={step === 3} done={false} label="Contrato & Assinatura" />
          </div>
        </div>
      </div>

      <div className="pb-6">
        <div>



          {/* ---------- Step 1 ---------- */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={mode === "existing" ? "default" : "outline"}
                  className={mode === "existing" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}
                  onClick={() => setMode("existing")}
                >Cliente Existente</Button>
                <Button
                  type="button"
                  variant={mode === "new" ? "default" : "outline"}
                  className={mode === "new" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}
                  onClick={() => setMode("new")}
                >Novo Cliente</Button>
              </div>

              {mode === "existing" ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={clientQuery}
                      onChange={(e) => setClientQuery(e.target.value)}
                      placeholder="Buscar por nome, e-mail ou CPF/CNPJ..."
                      className="pl-9 h-10 rounded-xl"
                    />
                  </div>
                  <div className="max-h-[42vh] overflow-y-auto space-y-1">
                    {filteredClients.length === 0 ? (
                      <div className="text-center py-10 text-sm text-muted-foreground">
                        Nenhum cliente encontrado.
                      </div>
                    ) : filteredClients.map((c) => {
                      const active = c.id === clientId;
                      const initials = c.name?.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
                      return (
                        <button
                          key={c.id} type="button"
                          onClick={() => setClientId(c.id)}
                          className={cn(
                            "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all border",
                            active
                              ? "bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30"
                              : "bg-card hover:bg-muted/60 border-transparent",
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                            active ? "bg-emerald-600 text-white" : "bg-gradient-to-br from-slate-200 to-slate-100 text-slate-600",
                          )}>{initials}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{c.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {[c.email, c.cpf_cnpj].filter(Boolean).join(" · ") || "Sem dados adicionais"}
                            </div>
                          </div>
                          {active && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Label>Nome / Razão Social *</Label>
                    <Input value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
                  </div>
                  <div>
                    <Label>CPF/CNPJ</Label>
                    <Input value={newClient.cpf_cnpj} onChange={(e) => setNewClient({ ...newClient, cpf_cnpj: maskCpfCnpj(e.target.value) })} />
                  </div>
                  <div>
                    <Label>WhatsApp</Label>
                    <Input value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: maskPhoneBR(e.target.value) })} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>E-mail</Label>
                    <Input type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
                  </div>
                  <div>
                    <Label>CEP {cepLoading && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}</Label>
                    <Input
                      value={newClient.cep}
                      onChange={(e) => setNewClient({ ...newClient, cep: maskCEP(e.target.value) })}
                      onBlur={handleCepBlur}
                      placeholder="00000-000"
                    />
                  </div>
                  <div>
                    <Label>Número</Label>
                    <Input value={newClient.address_number} onChange={(e) => setNewClient({ ...newClient, address_number: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Rua</Label>
                    <Input value={newClient.street} onChange={(e) => setNewClient({ ...newClient, street: e.target.value })} />
                  </div>
                  <div>
                    <Label>Bairro</Label>
                    <Input value={newClient.neighborhood} onChange={(e) => setNewClient({ ...newClient, neighborhood: e.target.value })} />
                  </div>
                  <div>
                    <Label>Cidade</Label>
                    <Input value={newClient.city} onChange={(e) => setNewClient({ ...newClient, city: e.target.value })} />
                  </div>
                  <div>
                    <Label>UF</Label>
                    <Input maxLength={2} value={newClient.state} onChange={(e) => setNewClient({ ...newClient, state: e.target.value.toUpperCase() })} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---------- Step 2 ---------- */}
          {step === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.length === 0 && (
                <div className="col-span-full text-center py-10 text-sm text-muted-foreground">
                  Nenhum modelo ativo. Abra "Modelos" para cadastrar.
                </div>
              )}
              {templates.map((t) => {
                const m = getServiceTypeMeta(templateServiceKey(t.key));
                const Icon = m.icon;
                const selected = t.id === templateId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplateId(t.id)}
                    className={cn(
                      "text-left rounded-2xl border p-5 transition-all group",
                      selected
                        ? "border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/50"
                        : "border-border/70 bg-card hover:border-primary/40 hover:shadow-md",
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center ring-1 mb-3 group-hover:scale-105 transition-transform",
                      m.gradient, m.ring,
                    )}>
                      <Icon className={cn("h-6 w-6", m.color)} />
                    </div>
                    <div className="text-[15px] font-semibold tracking-tight mb-1 flex items-center gap-2">
                      {t.title}
                      {selected && <Check className="h-4 w-4 text-indigo-600" />}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {m.description}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* ---------- Step 3 ---------- */}
          {step === 3 && template && activeClient && (
            <div className="space-y-5">
              {/* Seletor de Plano — sincronizado com Orçamentos > Planos */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">
                    Plano contratado ({meta?.label})
                  </Label>
                  <span className="text-[11px] text-slate-500">
                    Vinculado a <strong>Orçamentos › Planos</strong>
                  </span>
                </div>
                {availablePlans.length === 0 ? (
                  <div className="text-sm text-slate-500 italic">
                    Nenhum plano cadastrado para este serviço. Cadastre em <strong>Orçamentos › Planos › {meta?.label}</strong>.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {availablePlans.map((p: any, idx: number) => {
                      const active = selectedPlanIndex === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => applyPlan(idx)}
                          className={cn(
                            "text-left rounded-xl border p-3 transition-all",
                            active
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                              : "bg-white border-slate-200 hover:border-emerald-400"
                          )}
                        >
                          <div className="text-[13px] font-semibold truncate">{p.name || p.title || `Opção ${idx + 1}`}</div>
                          <div className={cn("text-[11px] mt-0.5", active ? "text-emerald-50" : "text-slate-500")}>
                            Total: {p.total || "—"}
                          </div>
                          <div className={cn("text-[11px]", active ? "text-emerald-50" : "text-slate-500")}>
                            Mão de obra: {p.labor || "—"}
                          </div>
                          {p.ads && p.ads !== "—" && (
                            <div className={cn("text-[11px]", active ? "text-emerald-50" : "text-slate-500")}>
                              Anúncios: {p.ads}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Configurações rápidas — valores vêm do plano selecionado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100">
                <div>
                  <Label className="text-xs">Início da Vigência</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Data de Vencimento</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>

                {!isPwa && (laborNumber > 0 || adsNumber > 0) && (
                  <div className="md:col-span-2 grid grid-cols-2 gap-3 rounded-xl bg-white border border-indigo-100 p-3">
                    <div className="text-sm">
                      <div className="text-xs text-slate-500">Investimento Total Mensal</div>
                      <div className="font-semibold text-indigo-700">R$ {formatBRL(totalNumber)}</div>
                    </div>
                    <div className="text-sm">
                      <div className="text-xs text-slate-500">Média Diária de Anúncios</div>
                      <div className="font-semibold text-indigo-700">R$ {formatBRL(dailyNumber)} / dia</div>
                    </div>
                  </div>
                )}

                {!isPwa && (
                  <div className="md:col-span-2">
                    <Label className="text-xs">Observações / Escopo (opcional)</Label>
                    <Textarea rows={2} value={scope} onChange={(e) => setScope(e.target.value)} />
                  </div>
                )}
              </div>

              {/* ============ PWA / Sistemas — Campos específicos ============ */}
              {isPwa && (
                <div className="space-y-4 p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-wide text-sky-700 font-semibold">
                      Detalhes do Projeto PWA
                    </Label>
                    <span className="text-[11px] text-slate-500">Cláusulas 2 e 4</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Tipo do Projeto</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={pwaTipoProjeto}
                        onChange={(e) => setPwaTipoProjeto(e.target.value)}
                      >
                        <option value="Sistema Web">Sistema Web</option>
                        <option value="Aplicativo PWA">Aplicativo PWA</option>
                        <option value="Sistema Web + PWA">Sistema Web + PWA</option>
                        <option value="Painel Administrativo">Painel Administrativo</option>
                        <option value="API / Backend">API / Backend</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Nome do Projeto</Label>
                      <Input
                        placeholder="Ex.: Portal do Cliente"
                        value={pwaNomeProjeto}
                        onChange={(e) => setPwaNomeProjeto(e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Descrição do Projeto (Cláusula 2)</Label>
                      <Textarea
                        rows={4}
                        placeholder="Descreva funcionalidades, telas, integrações e escopo entregue."
                        value={pwaDescricaoProjeto}
                        onChange={(e) => setPwaDescricaoProjeto(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Valor Total do Projeto</Label>
                      <Input
                        inputMode="numeric"
                        placeholder="R$ 0,00"
                        value={pwaValorProjeto}
                        onChange={(e) => setPwaValorProjeto(maskCurrency(e.target.value))}
                      />
                    </div>
                    <div className="rounded-xl bg-white border border-sky-100 p-3 text-[12px] space-y-1">
                      <div className="font-semibold text-sky-700">Divisão automática 30 / 30 / 40</div>
                      <div>1ª parcela (30% — início): <strong>R$ {formatBRL(pwaParcela1)}</strong></div>
                      <div>2ª parcela (30% — 30 dias): <strong>R$ {formatBRL(pwaParcela2)}</strong></div>
                      <div>3ª parcela (40% — 60 dias): <strong>R$ {formatBRL(pwaParcela3)}</strong></div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/70 border border-sky-100 p-3">
                    <div className="text-xs font-semibold text-sky-700 mb-2">Hospedagem e Domínio</div>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Hospedagem e domínio <strong>não estão inclusos</strong> no valor do projeto. Contratados à parte pelo cliente
                      (podem ser intermediados pela contratada).
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Plano de Hospedagem</Label>
                        <Input
                          placeholder="Ex.: Cloud Básico / Hostinger Premium"
                          value={pwaPlanoHospedagem}
                          onChange={(e) => setPwaPlanoHospedagem(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Período</Label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={pwaPeriodoHospedagem}
                          onChange={(e) => setPwaPeriodoHospedagem(e.target.value)}
                        >
                          <option value="1 Mês">1 Mês</option>
                          <option value="6 Meses">6 Meses</option>
                          <option value="1 Ano">1 Ano</option>
                          <option value="2 Anos">2 Anos</option>
                          <option value="3 Anos">3 Anos</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Valor da Hospedagem</Label>
                        <Input
                          inputMode="numeric"
                          placeholder="R$ 0,00"
                          value={pwaValorHospedagem}
                          onChange={(e) => setPwaValorHospedagem(maskCurrency(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Domínio</Label>
                        <Input
                          placeholder="seudominio.com.br"
                          value={pwaDominio}
                          onChange={(e) => setPwaDominio(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                    <div className="rounded-lg bg-white border border-sky-100 p-2">
                      <div className="text-slate-500">Prazo Estimado</div>
                      <div className="font-semibold text-sky-700">30 dias corridos</div>
                    </div>
                    <div className="rounded-lg bg-white border border-sky-100 p-2">
                      <div className="text-slate-500">Prazo Máximo</div>
                      <div className="font-semibold text-sky-700">60 dias</div>
                    </div>
                    <div className="rounded-lg bg-white border border-sky-100 p-2">
                      <div className="text-slate-500">Garantia / Suporte</div>
                      <div className="font-semibold text-sky-700">6 meses gratuitos</div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Observações adicionais (opcional)</Label>
                    <Textarea rows={2} value={scope} onChange={(e) => setScope(e.target.value)} />
                  </div>
                </div>
              )}






              {/* Prévia — layout idêntico à impressão, tema ao vivo */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase font-semibold text-slate-500 tracking-wide">Prévia (atualiza ao vivo com a cor escolhida)</div>
                <ContractThemeDots value={printTheme} onChange={setPrintTheme} />
              </div>
              <div ref={previewRef}>
                <ContractLivePreview
                  theme={printTheme}
                  title={template.title}
                  number={"#" + String(Date.now()).slice(-6)}
                  dateLabel={new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  isSigned={!!clientSig}
                  client={{
                    name: activeClient.company_name?.trim() || activeClient.name,
                    document: activeClient.cpf_cnpj,
                    responsible: activeClient.company_name?.trim() ? (signerName || activeClient.name) : "",
                    email: activeClient.email,
                    phone: activeClient.phone || activeClient.whatsapp,
                    address: activeClient.address?.trim() || [activeClient.street, activeClient.address_number, activeClient.neighborhood, activeClient.city, activeClient.state, activeClient.cep].filter(Boolean).join(", "),
                  }}
                  contractor={{
                    name: empresa?.razao_social || "Matheus Rangel",
                    document: empresa?.documento,
                    responsible: empresa?.representante || "",
                    address: empresa?.endereco || "",
                    cityUf: empresa?.cidade_uf || "",
                    email: empresa?.email || "atendimento@matheusrangel.com.br",
                    phone: empresa?.whatsapp || "",
                  }}
                  bodyText={renderedBody}
                  clientSig={clientSig}
                  providerSig={providerSig}
                />
              </div>


              {/* Área de assinatura — regra fixa: Empresa (Contratada) assina PRIMEIRO. Cliente assina depois via link público. */}
              {!savedContract && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase text-emerald-700 font-semibold tracking-wide">
                      Assinatura da Contratada (Empresa) — 1ª assinatura
                    </Label>
                    <span className="text-[10.5px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                      Opcional agora · pode assinar pelo link
                    </span>
                  </div>
                  <div className="text-[12px] text-slate-600 leading-relaxed">
                    Você pode assinar agora <strong>direto no computador</strong> abaixo, ou salvar sem assinar e depois abrir o
                    <strong> link gerado no seu celular</strong> pra assinar de qualquer lugar. Depois disso, o cliente recebe o mesmo link
                    para ler o contrato com calma e assinar informando <strong>Nome Completo</strong> e <strong>CPF</strong>.
                  </div>
                  <SignaturePad value={providerSig} onChange={setProviderSig} height={140} />
                </div>
              )}

              {/* Painel de sucesso — link para compartilhar */}
              {savedContract && (
                <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/60 p-6 space-y-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
                      <Check className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-[16px] font-bold text-emerald-900">Contrato criado com sucesso!</div>
                      <div className="text-[12.5px] text-emerald-700">
                        {providerSig
                          ? "Sua assinatura de Contratada foi registrada. Envie o link para o cliente assinar."
                          : "Abra o link no seu celular para assinar como Contratada. Depois envie para o cliente."}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-white p-3 flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <input
                      readOnly
                      value={shareUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      className="flex-1 bg-transparent text-[13px] text-slate-800 outline-none font-mono truncate"
                    />
                    <Button size="sm" variant="ghost" onClick={copyShareLink} className="h-8">
                      <Copy className="h-4 w-4 mr-1" /> Copiar
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button onClick={copyShareLink} className="rounded-full bg-slate-900 hover:bg-slate-800 text-white">
                      <Copy className="h-4 w-4 mr-1.5" /> Copiar Link
                    </Button>
                    <Button onClick={whatsappShare} className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white">
                      <MessageCircle className="h-4 w-4 mr-1.5" /> Enviar por WhatsApp
                    </Button>
                    <Button variant="outline" onClick={() => window.open(shareUrl, "_blank")} className="rounded-full">
                      <ExternalLink className="h-4 w-4 mr-1.5" /> Abrir Link
                    </Button>
                  </div>

                  <div className="text-[11.5px] text-slate-500 leading-relaxed border-t border-emerald-200 pt-3">
                    Regra da assinatura: <strong>Contratada assina primeiro</strong>, depois o Cliente. No link, quem abrir vê apenas o passo
                    permitido no momento. O cliente informa Nome Completo e CPF ao assinar — esses dados ficam registrados junto com a
                    assinatura no contrato final.
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>

      {/* Footer nav */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep((step - 1) as 1 | 2 | 3)} className="rounded-full">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
              </Button>
            ) : (
              <Button variant="outline" onClick={onClose} className="rounded-full bg-rose-600 text-white hover:bg-rose-700 border-rose-600">
                Cancelar
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step === 3 && (
              <>
                <ContractThemeDots value={printTheme} onChange={setPrintTheme} className="mr-1" />
                <Button variant="outline" onClick={doPrint} className="rounded-full">
                  <Printer className="h-4 w-4 mr-1.5" /> Imprimir
                </Button>
              </>
            )}
            {step === 1 && (
              <Button onClick={goStep2} disabled={!canGoStep2} className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white">
                Próximo <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            )}
            {step === 2 && (
              <Button onClick={goStep3} disabled={!canGoStep3} className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white">
                Próximo <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            )}
            {step === 3 && !savedContract && (
              <Button onClick={submit} disabled={busy} className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white">
                {busy ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Salvando...</> : <>Salvar e Gerar Link <Check className="h-4 w-4 ml-1.5" /></>}
              </Button>
            )}
            {step === 3 && savedContract && (
              <Button onClick={onClose} className="rounded-full bg-slate-900 hover:bg-slate-800 text-white">
                Concluir <Check className="h-4 w-4 ml-1.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

}

/**
 * Renderiza o corpo do contrato com:
 * - Título principal (primeira linha em MAIÚSCULAS) centralizado e em negrito
 * - Blocos CONTRATANTE / CONTRATADO com cada campo (nome, CPF, endereço, e-mail, telefone) em uma linha
 * - Cabeçalhos de CLÁUSULA em negrito
 * - Marcação **texto** convertida em <strong>
 */
function FormattedContract({ text }: { text: string }) {
  const renderInline = (s: string, keyPrefix = ""): ReactNode[] => {
    const parts = s.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) => {
      if (/^\*\*[^*]+\*\*$/.test(p)) {
        return <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-slate-900">{p.slice(2, -2)}</strong>;
      }
      return <span key={`${keyPrefix}-t-${i}`}>{p}</span>;
    });
  };

  const renderPartyBlock = (label: "CONTRATANTE" | "CONTRATADO" | "CONTRATADA", rest: string) => {
    // rest é algo como: "Fulano, CPF/CNPJ 123, endereço X, e-mail a@b, telefone 999"
    // Quebra na vírgula, exceto quando dentro do próprio campo (heurística simples)
    const items = rest.split(/,\s*/).map((s) => s.trim()).filter(Boolean);
    return (
      <div className="mb-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="text-[13px] font-bold uppercase tracking-wider text-indigo-700 mb-2">{label}</div>
        <div className="space-y-1">
          {items.map((it, i) => (
            <div key={i} className="text-[14.5px] text-slate-800">{renderInline(it, `${label}-${i}`)}</div>
          ))}
        </div>
      </div>
    );
  };

  const lines = text.split(/\r?\n/);
  const out: ReactNode[] = [];
  let i = 0;
  let titleShown = false;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) { out.push(<div key={`sp-${i}`} className="h-3" />); i++; continue; }

    // Título principal: primeira linha significativa toda em maiúsculas
    if (!titleShown && line === line.toUpperCase() && line.length > 10 && /CONTRATO/i.test(line)) {
      out.push(
        <h2 key={`title-${i}`} className="text-center text-[19px] font-bold text-slate-900 tracking-tight mb-6 uppercase">
          {line}
        </h2>
      );
      titleShown = true; i++; continue;
    }

    // Bloco CONTRATANTE: / CONTRATADO: / CONTRATADA:
    const partyMatch = line.match(/^(CONTRATANTE|CONTRATADO|CONTRATADA)\s*[:\-—]\s*(.*)$/);
    if (partyMatch) {
      // Junta continuações (linhas seguintes sem quebra dupla) até próxima linha vazia
      let rest = partyMatch[2];
      let j = i + 1;
      while (j < lines.length && lines[j].trim() && !/^(CONTRATANTE|CONTRATADO|CONTRATADA|CLÁUSULA|CLAUSULA)/i.test(lines[j].trim())) {
        rest += " " + lines[j].trim();
        j++;
      }
      out.push(<div key={`party-${i}`}>{renderPartyBlock(partyMatch[1] as any, rest)}</div>);
      i = j; continue;
    }

    // Cabeçalho de cláusula
    if (/^(CLÁUSULA|CLAUSULA)\s+/i.test(line)) {
      out.push(
        <h3 key={`cl-${i}`} className="text-[15px] font-bold text-slate-900 mt-6 mb-2 uppercase tracking-wide">
          {renderInline(line, `cl-${i}`)}
        </h3>
      );
      i++; continue;
    }

    // Parágrafo normal
    out.push(
      <p key={`p-${i}`} className="text-[14.5px] text-slate-700 leading-[1.75] mb-2">
        {renderInline(raw, `p-${i}`)}
      </p>
    );
    i++;
  }

  return <div>{out}</div>;
}

/* ------------------------------------------------------------------ */
/* Prévia ao vivo com o mesmo layout da impressão (tema aplicado)     */
/* ------------------------------------------------------------------ */

export interface PartyInfo {
  name: string;
  document?: string;
  responsible?: string;
  email?: string;
  phone?: string;
  address?: string;
  cityUf?: string;
}

export interface LivePreviewProps {
  theme: ContractTheme;
  title: string;
  number: string;
  dateLabel: string;
  isSigned: boolean;
  client: PartyInfo;
  contractor: PartyInfo;
  bodyText: string;
  clientSig?: string | null;
  providerSig?: string | null;
}

export function ContractLivePreview({ theme, title, number, dateLabel, isSigned, client, contractor, bodyText, clientSig, providerSig }: LivePreviewProps) {
  const t = CONTRACT_THEME_TOKENS[theme];

  const normalizeMarkdown = (s: string) => String(s || "").replace(/\\\*/g, "*").replace(/\\_/g, "_");
  const stripHeading = (s: string) => normalizeMarkdown(s).replace(/^\s{0,3}#{1,6}\s*/, "").trim();
  const cleanLine = (s: string) => stripHeading(s).replace(/\*/g, "").trim();
  const inline = (s: string, k = ""): ReactNode[] => {
    const parts = stripHeading(s).split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) =>
      /^\*\*[^*]+\*\*$/.test(p)
        ? <strong key={`${k}-b-${i}`} className="font-bold text-slate-900">{p.slice(2, -2)}</strong>
        : <span key={`${k}-t-${i}`}>{p}</span>
    );
  };

  // Divide o corpo em cards por cláusula (mesma lógica do contractBodyToHtml)
  const isClauseLine = (l: string) => /^\s*(CLÁUSULA|CLAUSULA)\s+/i.test(cleanLine(l));
  const isHorizontalSeparator = (l: string) => /^[-–—_]{3,}$/.test(l.trim());
  const isPartyMetaLine = (l: string) => {
    const s = cleanLine(l).toUpperCase();
    if (!s) return false;
    return s === "CONTRATANTE" || s === "CONTRATADA" ||
      s.startsWith("CONTRATO DE ") || s.startsWith("EMPRESA") ||
      s.startsWith("RAZÃO SOCIAL") || s.startsWith("RAZAO SOCIAL") ||
      s.startsWith("CPF/CNPJ") || s.startsWith("CNPJ") || s.startsWith("CPF") ||
      s.startsWith("RESPONSÁVEL") || s.startsWith("RESPONSAVEL") ||
      s.startsWith("E-MAIL") || s.startsWith("EMAIL") ||
      s.startsWith("TELEFONE") || s.startsWith("WHATSAPP") ||
      s.startsWith("ENDEREÇO") || s.startsWith("ENDERECO");
  };

  const lines = (bodyText || "").split(/\r?\n/);
  const firstClauseIdx = lines.findIndex(isClauseLine);
  const start = firstClauseIdx >= 0 ? firstClauseIdx : 0;

  const clauses: { title: string; paras: string[][] }[] = [];
  let curTitle = ""; let curBody: string[] = [];
  const flush = () => {
    if (!curTitle && curBody.length === 0) return;
    const paras: string[][] = [];
    let buf: string[] = [];
    const push = () => { if (buf.length) { paras.push(buf); buf = []; } };
    for (const l of curBody) { if (!l.trim()) push(); else buf.push(l); }
    push();
    clauses.push({ title: cleanLine(curTitle), paras });
    curTitle = ""; curBody = [];
  };
  for (let i = start; i < lines.length; i++) {
    const l = lines[i].trim();
    if (isClauseLine(l)) { flush(); curTitle = cleanLine(l); }
    else if (isPartyMetaLine(l)) continue;
    else if (isHorizontalSeparator(l)) continue;
    else curBody.push(lines[i]);
  }
  flush();

  const subLine = [contractor.document ? `CNPJ ${contractor.document}` : "", contractor.cityUf].filter(Boolean).join(" · ");

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* HERO */}
      <div className="relative px-8 py-8 text-white overflow-hidden" style={{ background: `linear-gradient(135deg, ${t.start} 0%, ${t.end} 100%)` }}>
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-25" style={{ background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.55), transparent 60%)" }} />
        <div className="absolute top-10 right-32 w-40 h-40 rounded-full opacity-15" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.5), transparent 60%)" }} />
        <div className="relative flex items-start justify-between gap-4">
          <div className="max-w-[65%]">
            <div className="text-[10px] uppercase tracking-[3px] font-semibold opacity-90">{contractor.name} · Contrato Digital</div>
            <h2 className="text-[24px] font-bold mt-1.5 leading-tight tracking-tight">{title}</h2>
            {subLine && <div className="text-xs opacity-90 mt-1">{subLine}</div>}
          </div>
          <div className="text-right shrink-0">
            <div className="text-[9px] uppercase tracking-[2.5px] font-semibold opacity-85">Nº do Contrato</div>
            <div className="text-2xl font-extrabold tracking-tight">{number}</div>
            <div className="text-[11px] opacity-90">{dateLabel}</div>
            <div
              className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-[10.5px] font-bold tracking-wider"
              style={{ background: isSigned ? t.chip : "rgba(255,255,255,0.18)" }}
            >
              {isSigned ? "✓ ASSINADO" : "AGUARDANDO ASSINATURA"}
            </div>
          </div>
        </div>
      </div>

      {/* Cards de partes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-6 pt-5">
        <div className="rounded-xl p-4 border" style={{ background: t.soft, borderColor: t.ring }}>
          <div className="text-[10.5px] uppercase font-bold tracking-[2.5px] mb-2" style={{ color: t.accent }}>Contratante</div>
          <div className="text-[15px] font-bold text-slate-900 mb-1">{client.name || "—"}</div>
          {client.document && <div className="text-[12px] text-slate-700 leading-relaxed"><strong>CNPJ/CPF:</strong> {client.document}</div>}
          {client.responsible && client.responsible !== client.name && <div className="text-[12px] text-slate-700 leading-relaxed"><strong>Representante:</strong> {client.responsible}</div>}
          {client.email && <div className="text-[12px] text-slate-700 leading-relaxed"><strong>E-mail:</strong> {client.email}</div>}
          {client.phone && <div className="text-[12px] text-slate-700 leading-relaxed"><strong>Telefone:</strong> {client.phone}</div>}
          {client.address && <div className="text-[12px] text-slate-700 leading-relaxed"><strong>Endereço:</strong> {client.address}</div>}
        </div>
        <div className="rounded-xl p-4 border border-slate-200 bg-white">
          <div className="text-[10.5px] uppercase font-bold tracking-[2.5px] mb-2" style={{ color: t.accent }}>Contratada</div>
          <div className="text-[15px] font-bold text-slate-900 mb-1">{contractor.name}</div>
          {contractor.document && <div className="text-[12px] text-slate-700 leading-relaxed"><strong>CNPJ/CPF:</strong> {contractor.document}</div>}
          {contractor.responsible && <div className="text-[12px] text-slate-700 leading-relaxed"><strong>Representante:</strong> {contractor.responsible}</div>}
          {contractor.email && <div className="text-[12px] text-slate-700 leading-relaxed"><strong>E-mail:</strong> {contractor.email}</div>}
          {contractor.phone && <div className="text-[12px] text-slate-700 leading-relaxed"><strong>Telefone:</strong> {contractor.phone}</div>}
          {(contractor.address || contractor.cityUf) && <div className="text-[12px] text-slate-700 leading-relaxed"><strong>Endereço:</strong> {[contractor.address, contractor.cityUf].filter(Boolean).join(" — ")}</div>}
        </div>
      </div>

      {/* Cards de cláusulas */}
      <div className="px-6 pt-5 pb-2 space-y-3">
        {clauses.length === 0 ? (
          <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500 italic">Carregando conteúdo…</div>
        ) : clauses.map((c, idx) => (
          <div key={idx} className="rounded-xl border border-slate-200 p-4 bg-white">
            {c.title && (
              <h3 className="text-[12px] font-extrabold uppercase tracking-[1.2px] mb-2" style={{ color: t.accent }}>
                {inline(c.title, `ct-${idx}`)}
              </h3>
            )}
            {c.paras.map((buf, i) => (
              <p key={i} className="text-[13px] leading-[1.75] text-slate-800 mb-2 last:mb-0">
                {buf.map((ln, j) => (
                  <span key={j}>
                    {inline(ln, `ln-${idx}-${i}-${j}`)}
                    {j < buf.length - 1 && <br />}
                  </span>
                ))}
              </p>
            ))}
          </div>
        ))}
      </div>

      {/* Assinaturas */}
      <div className="px-6 pt-2 pb-5">
        <div className="grid grid-cols-2 gap-6">
          {[
            { sig: clientSig, name: client.name, signName: (client as any).responsible || client.name, role: "Contratante" },
            { sig: providerSig, name: contractor.name, signName: (contractor as any).responsible || contractor.name, role: "Contratada" },
          ].map((it, i) => (
            <div key={i} className="text-center rounded-xl border border-slate-200 p-3 bg-white">
              <div className="h-20 flex items-end justify-center">
                {it.sig ? (
                  <span className="pb-1 text-slate-900" style={{ fontFamily: SIGNATURE_FONT_FAMILY, fontSize: 34, lineHeight: 1.1 }}>
                    {toSignatureCase(it.signName)}
                  </span>
                ) : (
                  <span className="text-[11px] italic text-slate-400">Aguardando assinatura</span>
                )}
              </div>
              <div className="border-t border-slate-400 mt-1.5 pt-1.5 text-[12px]">
                <div className="font-bold text-slate-900">{it.name}</div>
                <div className="text-[10.5px] uppercase tracking-[1.5px] font-bold" style={{ color: t.accent }}>{it.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rodapé colorido — igual ao modelo de impressão */}
      <div className="px-6 pt-2 pb-5">
        <div
          className="flex items-center justify-between text-white rounded-2xl px-5 py-3.5 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${t.start} 0%, ${t.end} 100%)` }}
        >
          <div className="flex items-center gap-2 text-[12px] font-semibold">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s7-7.58 7-13a7 7 0 1 0-14 0c0 5.42 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>
            <span>{[contractor.cityUf, dateLabel].filter(Boolean).join(", ")}</span>
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            <strong>Contrato {number}</strong>
            <span className="opacity-60">·</span>
            <span className="opacity-95">{(contractor.email || "").split("@")[1] || "matheusrangel.com.br"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}


