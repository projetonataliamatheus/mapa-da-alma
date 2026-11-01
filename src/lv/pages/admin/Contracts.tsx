// @ts-nocheck
"use client";
/**
 * Contratos — geração e assinatura digital.
 * Lista contratos, permite criar a partir de um template + cliente, editar,
 * enviar link público, assinar como prestador e baixar PDF.
 */
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lv/lib/supabaseClient";
import { PageHeader } from "@/lv/components/admin/PageHeader";
import { Button } from "@/lv/components/ui/button";
import { Input } from "@/lv/components/ui/input";
import { Label } from "@/lv/components/ui/label";
import { Textarea } from "@/lv/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/lv/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/lv/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/lv/components/ui/alert-dialog";
import { toast } from "@/lv/hooks/use-toast";
import {
  FileSignature, Plus, Copy, Trash2, Download, PenLine, Search,
  ArrowLeft, Check, User, Eye, Printer, RefreshCw,
} from "lucide-react";
import { renderTemplate, sha256, fetchClientIp, buildVariables, CONTRACT_STATUS_LABEL, CONTRACT_STATUS_TONE } from "@/lv/lib/contracts";
import { SignaturePad } from "@/lv/components/contracts/SignaturePad";
import { NewContractWizard } from "@/lv/components/contracts/NewContractWizard";
import { formatBRL } from "@/lv/lib/receiptPdf";
import { SERVICE_TYPES, getServiceTypeMeta, type ServiceTypeKey } from "@/lv/lib/serviceTypes";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { cn } from "@/lv/lib/utils";
import { ContractThemeDots, renderContractPrintHtml, contractBodyToHtml, type ContractTheme } from "@/lv/components/contracts/ContractPrintTemplate";
import { PremiumContractView } from "@/lv/components/contracts/PremiumContractView";
import { getPaymentsBaseUrl } from "@/lv/lib/domainUtils";

interface Template { id: string; key: string; title: string; body: string; }
interface Client { id: string; name: string; email?: string; phone?: string; whatsapp?: string; cpf_cnpj?: string; address?: string; }
interface Contract {
  id: string; token: string; template_key: string; template_id?: string;
  client_id?: string; title: string; body: string; variables: any;
  service_value?: number; payment_terms?: string; service_scope?: string; duration_months?: number;
  contractor_name?: string; contractor_document?: string; contractor_email?: string;
  client_name: string; client_document?: string; client_email?: string; client_phone?: string; client_address?: string;
  status: string; sent_at?: string;
  client_signature?: string; client_signed_at?: string; client_ip?: string;
  provider_signature?: string; provider_signed_at?: string; provider_ip?: string;
  document_hash?: string;
  created_at: string;
}

const PUBLIC_BASE_FN = () => getPaymentsBaseUrl();

export default function Contracts() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const [openNew, setOpenNew] = useState(false);
  const [viewing, setViewing] = useState<Contract | null>(null);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [openTemplates, setOpenTemplates] = useState(false);

  const load = async () => {
    setLoading(true);
    const [t, c, k] = await Promise.all([
      db.from("contract_templates").select("*").eq("is_active", true).order("sort_order"),
      db.from("clients").select("id, name, email, phone, whatsapp, cpf_cnpj, address").order("name"),
      db.from("contracts").select("*").order("created_at", { ascending: false }),
    ]);
    setTemplates(t.data || []);
    setClients(c.data || []);
    setContracts(k.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return contracts;
    return contracts.filter((c) =>
      c.title?.toLowerCase().includes(s) ||
      c.client_name?.toLowerCase().includes(s) ||
      c.template_key?.toLowerCase().includes(s)
    );
  }, [q, contracts]);

  const kpis = useMemo(() => ({
    total: contracts.length,
    assinados: contracts.filter((c) => c.status === "assinado_todos").length,
    pendentes: contracts.filter((c) => ["enviado", "assinado_cliente"].includes(c.status)).length,
    valor: contracts.reduce((a, c) => a + (Number(c.service_value) || 0), 0),
  }), [contracts]);

  const deleteContract = async (id: string) => {
    const { error } = await db.from("contracts").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Contrato excluído" }); load(); }
  };

  const copyLink = (token: string) => {
    const url = `${PUBLIC_BASE_FN()}/contrato/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado", description: url });
  };

  const printContract = (c: Contract) => {
    const template = templates.find((t) => t.id === c.template_id);
    const bodySource = template?.body || c.body || "";
    const html = renderContractPrintHtml("apple-blue", {
      title: c.title,
      number: "#" + (c.id?.slice(0, 6).toUpperCase() || "000000"),
      date: new Date(c.created_at || Date.now()).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
      clientName: c.client_name,
      clientDocument: c.client_document,
      clientResponsible: (c as any).client_responsible || "",
      clientAddress: c.client_address,
      clientEmail: c.client_email,
      clientPhone: c.client_phone,
      contractorName: c.contractor_name || "Matheus Rangel",
      contractorDocument: c.contractor_document,
      contractorResponsible: (c as any).contractor_responsible || "",
      contractorAddress: (c as any).contractor_address,
      contractorEmail: c.contractor_email,
      contractorPhone: (c as any).contractor_phone || "",
      contractorCityUf: (c as any).contractor_city_uf,
      contractorWebsite: (c.contractor_email || "").split("@")[1] || "matheusrangel.com.br",
      totalValue: c.service_value ? formatBRL(Number(c.service_value)) : undefined,
      clientSignatureImg: c.client_signature,
      providerSignatureImg: c.provider_signature,
      bodyHtml: contractBodyToHtml(
        renderTemplate(bodySource, buildVariables({
          name: c.client_name, cpf_cnpj: c.client_document, email: c.client_email,
          phone: c.client_phone, address: c.client_address,
        }, c))
      ),
      documentHash: c.document_hash,
    });
    const w = window.open("", "_blank", "width=980,height=1050");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {!openNew && (<>
      <PageHeader
        icon={FileSignature}
        title="Contratos"
        subtitle="Geração e assinatura digital de contratos de prestação de serviços"
        gradient="from-indigo-500 to-violet-600"
        shadowColor="shadow-indigo-500/30"
        badge={contracts.length}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => { await load(); toast({ title: "Lista atualizada" }); }}
              disabled={loading}
              title="Recarregar contratos, modelos e clientes"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setOpenTemplates(true)}>
              Modelos
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setOpenNew(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" /> Novo Contrato
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: kpis.total, grad: "from-indigo-500 to-violet-500" },
          { label: "Assinados", value: kpis.assinados, grad: "from-emerald-500 to-teal-500" },
          { label: "Pendentes", value: kpis.pendentes, grad: "from-amber-500 to-orange-500" },
          { label: "Valor total", value: formatBRL(kpis.valor), grad: "from-sky-500 to-blue-500" },
        ].map((k) => (
          <div key={k.label} className={cn(
            "rounded-2xl p-4 text-white shadow-lg bg-gradient-to-br",
            k.grad,
          )}>
            <div className="text-[11px] uppercase tracking-wide opacity-80">{k.label}</div>
            <div className="text-xl font-bold mt-1">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por título, cliente ou tipo..."
          className="pl-9"
        />
      </div>

      {/* List */}
      <div className="rounded-2xl border border-slate-200 bg-white/60 backdrop-blur-xl divide-y divide-slate-100">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <FileSignature className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Nenhum contrato encontrado. Clique em "Novo Contrato" para gerar o primeiro.
          </div>
        ) : (
          filtered.map((c) => (
            <div key={c.id} className="p-4 flex items-center gap-3 hover:bg-slate-50/70">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white shrink-0">
                <FileSignature className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-medium text-slate-900 truncate">{c.title}</div>
                  <span className={cn(
                    "text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ring-1",
                    CONTRACT_STATUS_TONE[c.status] || "bg-slate-200 text-slate-700 ring-slate-300"
                  )}>
                    {CONTRACT_STATUS_LABEL[c.status] || c.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">
                  {c.client_name} · {c.service_value ? formatBRL(Number(c.service_value)) : "—"} ·{" "}
                  {new Date(c.created_at).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm" variant="ghost"
                  className="gap-1.5 text-slate-700 hover:text-indigo-700 hover:bg-indigo-50"
                  onClick={() => setViewing(c)} title="Visualizar contrato"
                >
                  <Eye className="h-4 w-4" />
                  <span className="hidden md:inline text-xs">Visualizar</span>
                </Button>
                <Button
                  size="sm" variant="ghost"
                  className="gap-1.5 text-slate-700 hover:text-violet-700 hover:bg-violet-50"
                  onClick={() => setEditing(c)} title="Editar contrato"
                >
                  <PenLine className="h-4 w-4" />
                  <span className="hidden md:inline text-xs">Editar</span>
                </Button>
                <Button
                  size="sm" variant="ghost"
                  className="gap-1.5 text-slate-700 hover:text-sky-700 hover:bg-sky-50"
                  onClick={() => copyLink(c.token)} title="Copiar link público"
                >
                  <Copy className="h-4 w-4" />
                  <span className="hidden md:inline text-xs">Copiar Link</span>
                </Button>
                <Button
                  size="sm" variant="ghost"
                  className="gap-1.5 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50"
                  onClick={() => printContract(c)} title="Imprimir / PDF"
                >
                  <Printer className="h-4 w-4" />
                  <span className="hidden md:inline text-xs">Imprimir</span>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm" variant="ghost"
                      className="gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      title="Excluir contrato"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden md:inline text-xs">Excluir</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O contrato e suas assinaturas serão removidos permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-rose-600 text-white hover:bg-rose-700">Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => deleteContract(c.id)}
                      >
                        Confirmar exclusão
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </div>
      </>)}



      <NewContractWizard
        open={openNew}
        onClose={() => setOpenNew(false)}
        templates={templates}
        clients={clients}
        onCreated={() => { setOpenNew(false); load(); }}
      />

      {editing && (
        <ContractEditor
          contract={editing}
          templates={templates}
          onClose={() => setEditing(null)}
          onSaved={() => { load(); }}
        />
      )}

      {viewing && (
        <ContractPreviewDialog
          contract={viewing}
          templates={templates}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); }}
        />
      )}

      {openTemplates && (
        <TemplatesManager open={openTemplates} onClose={() => { setOpenTemplates(false); load(); }} />
      )}
    </div>
  );
}

/* -------- New contract dialog (Apple premium, 2 passos) -------- */
function templateServiceKey(key: string): ServiceTypeKey {
  const k = (key || "").toLowerCase();
  if (k.includes("trafego") || k.includes("tráfego") || k.includes("ads")) return "trafego_pago";
  if (k.includes("loja") || k.includes("ecom") || k.includes("shop")) return "loja_virtual";
  if (k.includes("app") || k.includes("sistema") || k.includes("pwa")) return "sistemas_app";
  return "sites_paginas";
}

function NewContractDialog({
  open, onClose, templates, clients, onCreated,
}: {
  open: boolean; onClose: () => void;
  templates: Template[]; clients: Client[];
  onCreated: (c: Contract) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [templateId, setTemplateId] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [clientQuery, setClientQuery] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) { setStep(1); setTemplateId(""); setClientId(""); setClientQuery(""); }
  }, [open]);

  const chosenTemplate = templates.find((t) => t.id === templateId);
  const chosenMeta = chosenTemplate ? getServiceTypeMeta(templateServiceKey(chosenTemplate.key)) : null;

  const filteredClients = useMemo(() => {
    const s = clientQuery.trim().toLowerCase();
    if (!s) return clients;
    return clients.filter((c) =>
      c.name?.toLowerCase().includes(s) ||
      c.email?.toLowerCase().includes(s) ||
      c.cpf_cnpj?.toLowerCase().includes(s)
    );
  }, [clientQuery, clients]);

  const pickTemplate = (id: string) => { setTemplateId(id); setStep(2); };

  const submit = async () => {
    const t = chosenTemplate;
    if (!t) return toast({ title: "Escolha um modelo", variant: "destructive" });
    const client = clients.find((c) => c.id === clientId);
    if (!client) return toast({ title: "Escolha um cliente", variant: "destructive" });
    setBusy(true);
    const draft: any = {
      template_key: t.key,
      template_id: t.id,
      client_id: client.id,
      title: `${t.title} — ${client.name}`,
      body: t.body,
      variables: {},
      client_name: client.name,
      client_document: client.cpf_cnpj || null,
      client_email: client.email || null,
      client_phone: client.phone || client.whatsapp || null,
      client_address: client.address || null,
      status: "rascunho",
    };
    const { data, error } = await db.from("contracts").insert(draft).select("*").single();
    setBusy(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    onCreated(data as Contract);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 rounded-2xl border border-border/60 shadow-2xl overflow-hidden">
        <DialogHeader className="px-8 pt-7 pb-4 border-b border-border/50 bg-gradient-to-b from-muted/30 to-transparent">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <Button
                type="button" variant="ghost" size="icon"
                className="h-8 w-8 rounded-full -ml-2"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1">
              <DialogTitle className="text-[22px] font-semibold tracking-tight">
                {step === 1 ? "Escolha o Modelo de Contrato" : "Escolha o Cliente"}
              </DialogTitle>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {step === 1
                  ? "Selecione o tipo de prestação de serviço. Cada modelo já vem com o texto pronto e placeholders para os dados."
                  : chosenMeta
                    ? <>Modelo selecionado: <span className="font-medium text-foreground">{chosenTemplate?.title}</span>. Agora escolha o cliente — os dados serão preenchidos automaticamente.</>
                    : "Escolha o cliente."}
              </p>
            </div>
            {step === 2 && chosenMeta && (
              <div className={cn(
                "w-10 h-10 rounded-2xl bg-gradient-to-br flex items-center justify-center ring-1 shrink-0",
                chosenMeta.gradient, chosenMeta.ring,
              )}>
                <chosenMeta.icon className={cn("h-5 w-5", chosenMeta.color)} />
              </div>
            )}
          </div>
        </DialogHeader>

        {step === 1 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-6 max-h-[65vh] overflow-y-auto">
            {templates.length === 0 && (
              <div className="col-span-full text-center py-10 text-sm text-muted-foreground">
                Nenhum modelo ativo. Abra "Modelos" para cadastrar.
              </div>
            )}
            {templates.map((t) => {
              const meta = getServiceTypeMeta(templateServiceKey(t.key));
              const Icon = meta.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickTemplate(t.id)}
                  className="group text-left rounded-2xl border border-border/70 bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center ring-1 mb-3 group-hover:scale-105 transition-transform",
                    meta.gradient, meta.ring,
                  )}>
                    <Icon className={cn("h-6 w-6", meta.color)} />
                  </div>
                  <div className="text-[15px] font-semibold tracking-tight mb-1">{t.title}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {meta.description}
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col max-h-[70vh]">
            <div className="px-6 pt-5 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  value={clientQuery}
                  onChange={(e) => setClientQuery(e.target.value)}
                  placeholder="Buscar cliente por nome, e-mail ou CPF/CNPJ..."
                  className="pl-9 h-10 rounded-xl"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {filteredClients.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  Nenhum cliente encontrado.
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredClients.map((c) => {
                    const active = c.id === clientId;
                    const initials = c.name?.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
                    return (
                      <button
                        key={c.id}
                        type="button"
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
                          active
                            ? "bg-emerald-600 text-white"
                            : "bg-gradient-to-br from-slate-200 to-slate-100 text-slate-600",
                        )}>
                          {initials}
                        </div>
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
              )}
            </div>
            <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20">
              <Button variant="outline" onClick={onClose} className="bg-rose-600 text-white hover:bg-rose-700 border-rose-600 rounded-full">
                Cancelar
              </Button>
              <Button
                onClick={submit}
                disabled={busy || !clientId}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full gap-2"
              >
                {busy ? "Criando..." : <>Criar contrato <Check className="h-4 w-4" /></>}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------- Contract editor / preview / provider sign -------- */
function ContractEditor({
  contract, templates, onClose, onSaved,
}: {
  contract: Contract; templates: Template[];
  onClose: () => void; onSaved: () => void;
}) {
  const [c, setC] = useState<Contract>(contract);
  const [busy, setBusy] = useState(false);
  const [providerSig, setProviderSig] = useState<string | null>(c.provider_signature || null);
  const [printTheme, setPrintTheme] = useState<ContractTheme>(((contract.variables as any)?.print_theme as ContractTheme) || "apple-blue");
  const [previewHeight, setPreviewHeight] = useState(1100);

  useEffect(() => {
    setC(contract);
    setProviderSig(contract.provider_signature || null);
    setPrintTheme(((contract.variables as any)?.print_theme as ContractTheme) || "apple-blue");
  }, [contract.id]);

  const template = templates.find((t) => t.id === c.template_id);
  const vars = buildVariables({
    name: c.client_name, cpf_cnpj: c.client_document, email: c.client_email,
    phone: c.client_phone, address: c.client_address,
  }, c);
  const rendered = renderTemplate(template?.body || c.body, vars);

  const save = async () => {
    setBusy(true);
    const { error } = await db.from("contracts").update({
      title: c.title,
      service_value: c.service_value,
      payment_terms: c.payment_terms,
      service_scope: c.service_scope,
      duration_months: c.duration_months,
      contractor_name: c.contractor_name,
      contractor_document: c.contractor_document,
      contractor_email: c.contractor_email,
      client_name: c.client_name,
      client_document: c.client_document,
      client_email: c.client_email,
      client_phone: c.client_phone,
      client_address: c.client_address,
      body: rendered,
      variables: vars,
    }).eq("id", c.id);
    setBusy(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Salvo" });
    onSaved();
  };

  const send = async () => {
    await save();
    const { error } = await db.from("contracts").update({
      status: "enviado", sent_at: new Date().toISOString(),
    }).eq("id", c.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setC({ ...c, status: "enviado" });
    const url = `${PUBLIC_BASE_FN()}/contrato/${c.token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Contrato marcado como enviado", description: `Link copiado: ${url}` });
    onSaved();
  };

  const signAsProvider = async () => {
    if (!providerSig) return toast({ title: "Assine antes de confirmar", variant: "destructive" });
    if (!c.client_signed_at) {
      const ok = confirm("O cliente ainda não assinou. Assinar mesmo assim?");
      if (!ok) return;
    }
    setBusy(true);
    const hash = await sha256(rendered + "|" + (c.client_signature || "") + "|" + providerSig);
    const ip = await fetchClientIp();
    const { error } = await db.from("contracts").update({
      provider_signature: providerSig,
      provider_signed_at: new Date().toISOString(),
      provider_ip: ip,
      provider_user_agent: navigator.userAgent,
      document_hash: hash,
      status: c.client_signed_at ? "assinado_todos" : "assinado_cliente",
    }).eq("id", c.id);
    setBusy(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Contrato assinado", description: "Registrado com IP, data e hash SHA-256." });
    onSaved();
    onClose();
  };

  const buildPrintHtml = () =>
    renderContractPrintHtml(printTheme, {
      title: c.title,
      number: "#" + (c.id?.slice(0, 6).toUpperCase() || "000000"),
      date: new Date(c.created_at || Date.now()).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
      clientName: c.client_name,
      clientDocument: c.client_document,
      clientResponsible: (c as any).client_responsible || "",
      clientAddress: c.client_address,
      clientEmail: c.client_email,
      clientPhone: c.client_phone,
      contractorName: c.contractor_name || "Matheus Rangel",
      contractorDocument: c.contractor_document,
      contractorResponsible: (c as any).contractor_responsible || "",
      contractorAddress: (c as any).contractor_address,
      contractorEmail: c.contractor_email,
      contractorPhone: (c as any).contractor_phone || "",
      contractorCityUf: (c as any).contractor_city_uf,
      contractorWebsite: (c.contractor_email || "").split("@")[1] || "matheusrangel.com.br",
      totalValue: c.service_value ? formatBRL(Number(c.service_value)) : undefined,
      clientSignatureImg: c.client_signature,
      providerSignatureImg: c.provider_signature,
      bodyHtml: contractBodyToHtml(rendered),
      documentHash: c.document_hash,
    });

  const buildEmbeddedPreviewHtml = () =>
    renderContractPrintHtml(printTheme, {
      title: c.title,
      number: "#" + (c.id?.slice(0, 6).toUpperCase() || "000000"),
      date: new Date(c.created_at || Date.now()).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
      clientName: c.client_name,
      clientDocument: c.client_document,
      clientResponsible: (c as any).client_responsible || "",
      clientAddress: c.client_address,
      clientEmail: c.client_email,
      clientPhone: c.client_phone,
      contractorName: c.contractor_name || "Matheus Rangel",
      contractorDocument: c.contractor_document,
      contractorResponsible: (c as any).contractor_responsible || "",
      contractorAddress: (c as any).contractor_address,
      contractorEmail: c.contractor_email,
      contractorPhone: (c as any).contractor_phone || "",
      contractorCityUf: (c as any).contractor_city_uf,
      contractorWebsite: (c.contractor_email || "").split("@")[1] || "matheusrangel.com.br",
      totalValue: c.service_value ? formatBRL(Number(c.service_value)) : undefined,
      clientSignatureImg: c.client_signature,
      providerSignatureImg: c.provider_signature || providerSig,
      bodyHtml: contractBodyToHtml(rendered),
      documentHash: c.document_hash,
      isSigned: c.status === "assinado_todos",
    }, { toolbar: false, embedded: true });

  const doPrint = () => {
    const w = window.open("", "_blank", "width=980,height=1050");
    if (!w) return;
    w.document.write(buildPrintHtml());
    w.document.close();
  };

  const downloadPdf = async () => {
    // Renderiza o template em um iframe fora da tela e captura via html2canvas
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = "900px";
    iframe.style.height = "1400px";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open(); doc.write(buildPrintHtml()); doc.close();
    await new Promise((r) => setTimeout(r, 700));
    const target = doc.querySelector(".page") as HTMLElement | null;
    if (!target) { document.body.removeChild(iframe); return; }
    const canvas = await html2canvas(target, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();
    const iw = w;
    const ih = (canvas.height * iw) / canvas.width;
    let left = ih; let pos = 0;
    pdf.addImage(img, "PNG", 0, pos, iw, ih);
    left -= h;
    while (left > 0) { pos = left - ih; pdf.addPage(); pdf.addImage(img, "PNG", 0, pos, iw, ih); left -= h; }
    pdf.save(`${c.title.replace(/\s+/g, "_")}.pdf`);
    document.body.removeChild(iframe);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-indigo-500" /> {c.title}
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left — form */}
          <div className="space-y-4">
            <section className="space-y-3">
              <div className="text-xs uppercase font-semibold text-slate-500">Dados do contrato</div>
              <div><Label>Título</Label><Input value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01"
                    value={c.service_value ?? ""} onChange={(e) => setC({ ...c, service_value: e.target.value === "" ? undefined : Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Duração</Label>
                  <Input type="number"
                    value={c.duration_months ?? ""} onChange={(e) => setC({ ...c, duration_months: e.target.value === "" ? undefined : Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>Forma de pagamento</Label>
                <Input placeholder="Ex: Pix mensal, todo dia 5"
                  value={c.payment_terms ?? ""} onChange={(e) => setC({ ...c, payment_terms: e.target.value })} />
              </div>
              <div>
                <Label>Escopo / Observações</Label>
                <Textarea rows={3}
                  value={c.service_scope ?? ""} onChange={(e) => setC({ ...c, service_scope: e.target.value })} />
              </div>
            </section>

            <section className="space-y-3">
              <div className="text-xs uppercase font-semibold text-slate-500">Contratante (cliente)</div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Nome</Label><Input value={c.client_name} onChange={(e) => setC({ ...c, client_name: e.target.value })} /></div>
                <div><Label>Documento</Label><Input value={c.client_document ?? ""} onChange={(e) => setC({ ...c, client_document: e.target.value })} /></div>
                <div><Label>E-mail</Label><Input value={c.client_email ?? ""} onChange={(e) => setC({ ...c, client_email: e.target.value })} /></div>
                <div><Label>Telefone</Label><Input value={c.client_phone ?? ""} onChange={(e) => setC({ ...c, client_phone: e.target.value })} /></div>
                <div className="col-span-2"><Label>Endereço</Label><Input value={c.client_address ?? ""} onChange={(e) => setC({ ...c, client_address: e.target.value })} /></div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="text-xs uppercase font-semibold text-slate-500">Contratado (prestador)</div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Nome</Label><Input value={c.contractor_name ?? "Matheus Rangel"} onChange={(e) => setC({ ...c, contractor_name: e.target.value })} /></div>
                <div><Label>Documento</Label><Input value={c.contractor_document ?? ""} onChange={(e) => setC({ ...c, contractor_document: e.target.value })} /></div>
                <div className="col-span-2"><Label>E-mail</Label><Input value={c.contractor_email ?? ""} onChange={(e) => setC({ ...c, contractor_email: e.target.value })} /></div>
              </div>
            </section>

            {c.status !== "rascunho" && (
              <section className="space-y-2 rounded-xl bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-500 uppercase">Assinatura do prestador</div>
                {c.provider_signed_at ? (
                  <div className="text-sm text-emerald-700">
                    ✓ Assinado em {new Date(c.provider_signed_at).toLocaleString("pt-BR")}
                    {c.provider_ip && <> · IP {c.provider_ip}</>}
                  </div>
                ) : (
                  <>
                    <SignaturePad value={providerSig} onChange={setProviderSig} height={140} />
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={signAsProvider} disabled={busy}>
                      Assinar como prestador
                    </Button>
                  </>
                )}
              </section>
            )}

            {c.document_hash && (
              <div className="text-[10px] text-slate-400 break-all">
                Hash SHA-256: {c.document_hash}
              </div>
            )}
          </div>

          {/* Right — preview premium fiel ao PDF/impressão */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase font-semibold text-slate-500">Prévia premium fiel ao PDF</div>
              <ContractThemeDots value={printTheme} onChange={setPrintTheme} />
            </div>
            <div className="rounded-2xl bg-white shadow-xl shadow-slate-200/70 ring-1 ring-slate-200 overflow-hidden max-h-[60vh] overflow-y-auto">
              <iframe
                title="Prévia premium do contrato"
                srcDoc={buildEmbeddedPreviewHtml()}
                className="block w-full border-0 bg-transparent"
                style={{ height: previewHeight }}
                onLoad={(event) => {
                  const doc = event.currentTarget.contentWindow?.document;
                  const next = Math.max(900, doc?.documentElement?.scrollHeight || doc?.body?.scrollHeight || 1100);
                  setPreviewHeight(next + 8);
                }}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap items-center">
          <Button variant="outline" onClick={onClose} className="bg-rose-600 text-white hover:bg-rose-700 border-rose-600">Fechar</Button>
          <ContractThemeDots value={printTheme} onChange={setPrintTheme} />
          <Button variant="outline" onClick={doPrint}>
            🖨️ Imprimir
          </Button>
          <Button variant="outline" onClick={downloadPdf}>
            <Download className="h-4 w-4 mr-1.5" /> PDF
          </Button>
          <Button variant="outline" onClick={save} disabled={busy}>Salvar</Button>
          {c.status === "rascunho" && (
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={send} disabled={busy}>
              Marcar como enviado + copiar link
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------- Visualização premium direta da lista -------- */
function ContractPreviewDialog({
  contract, templates, onClose, onEdit,
}: {
  contract: Contract; templates: Template[];
  onClose: () => void; onEdit: () => void;
}) {
  const [theme, setTheme] = useState<ContractTheme>(((contract.variables as any)?.print_theme as ContractTheme) || "apple-blue");
  const template = templates.find((t) => t.id === contract.template_id);
  const rendered = renderTemplate(template?.body || contract.body, buildVariables({
    name: contract.client_name,
    cpf_cnpj: contract.client_document,
    email: contract.client_email,
    phone: contract.client_phone,
    address: contract.client_address,
  }, contract));
  const publicUrl = `${PUBLIC_BASE_FN()}/contrato/${contract.token}`;

  const buildHtml = (toolbar = false) =>
    renderContractPrintHtml(theme, {
      title: contract.title,
      number: "#" + (contract.id?.slice(0, 6).toUpperCase() || "000000"),
      date: new Date(contract.created_at || Date.now()).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
      clientName: contract.client_name,
      clientDocument: contract.client_document,
      clientResponsible: (contract as any).client_responsible || "",
      clientAddress: contract.client_address,
      clientEmail: contract.client_email,
      clientPhone: contract.client_phone,
      contractorName: contract.contractor_name || "Matheus Rangel",
      contractorDocument: contract.contractor_document,
      contractorResponsible: (contract as any).contractor_responsible || "",
      contractorAddress: (contract as any).contractor_address,
      contractorEmail: contract.contractor_email,
      contractorPhone: (contract as any).contractor_phone || "",
      contractorCityUf: (contract as any).contractor_city_uf,
      contractorWebsite: (contract.contractor_email || "").split("@")[1] || "matheusrangel.com.br",
      totalValue: contract.service_value ? formatBRL(Number(contract.service_value)) : undefined,
      clientSignatureImg: contract.client_signature,
      providerSignatureImg: contract.provider_signature,
      bodyHtml: contractBodyToHtml(rendered),
      documentHash: contract.document_hash,
      isSigned: contract.status === "assinado_todos",
    }, { toolbar, embedded: !toolbar });

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast({ title: "Link copiado", description: publicUrl });
  };

  const print = () => {
    const w = window.open("", "_blank", "width=980,height=1050");
    if (!w) return;
    w.document.open();
    w.document.write(buildHtml(true));
    w.document.close();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-6xl max-h-[94vh] overflow-hidden p-0 gap-0">
        <DialogHeader className="px-5 py-4 border-b border-slate-200 bg-white">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Eye className="h-5 w-5 text-indigo-600" /> Visualização premium do contrato
            </DialogTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <ContractThemeDots value={theme} onChange={setTheme} />
              <Button variant="outline" size="sm" onClick={copyPublicLink}>
                <Copy className="h-4 w-4 mr-1.5" /> Copiar Link
              </Button>
              <Button variant="outline" size="sm" onClick={print}>
                <Printer className="h-4 w-4 mr-1.5" /> Imprimir
              </Button>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <PenLine className="h-4 w-4 mr-1.5" /> Editar
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="bg-slate-100 p-4 overflow-y-auto max-h-[calc(94vh-88px)]">
          <div className="overflow-x-auto rounded-[28px] bg-white shadow-2xl shadow-slate-300/70 ring-1 ring-slate-200">
            <PremiumContractView
              theme={theme}
              title={contract.title}
              number={"#" + (contract.id?.slice(0, 6).toUpperCase() || "000000")}
              date={new Date(contract.created_at || Date.now()).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              client={{
                name: contract.client_name,
                document: contract.client_document,
                responsible: (contract as any).client_responsible || "",
                address: contract.client_address,
                email: contract.client_email,
                phone: contract.client_phone,
              }}
              contractor={{
                name: contract.contractor_name || "Matheus Rangel",
                document: contract.contractor_document,
                responsible: (contract as any).contractor_responsible || "",
                address: (contract as any).contractor_address,
                email: contract.contractor_email,
                phone: (contract as any).contractor_phone || "",
                cityUf: (contract as any).contractor_city_uf,
              }}
              body={rendered}
              clientSignatureImg={contract.client_signature}
              providerSignatureImg={contract.provider_signature}
              documentHash={contract.document_hash}
              signed={contract.status === "assinado_todos"}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* -------- Templates manager (list + edit body) -------- */
function TemplatesManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<Template[]>([]);
  const [sel, setSel] = useState<Template | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    db.from("contract_templates").select("*").order("sort_order").then(({ data }) => {
      setItems(data || []);
      if (data && data.length && !sel) setSel(data[0]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = async () => {
    if (!sel) return;
    setBusy(true);
    const { error } = await db.from("contract_templates").update({
      title: sel.title, body: sel.body,
    }).eq("id", sel.id);
    setBusy(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Modelo salvo" });
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Modelos de contrato</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-[220px_1fr] gap-4 overflow-hidden">
          <div className="space-y-1 overflow-y-auto">
            {items.map((t) => (
              <button
                key={t.id}
                onClick={() => setSel(t)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm",
                  sel?.id === t.id ? "bg-indigo-100 text-indigo-900 font-medium" : "hover:bg-slate-100"
                )}
              >
                {t.title}
              </button>
            ))}
          </div>
          <div className="flex flex-col overflow-hidden">
            {sel && (
              <>
                <Label className="mb-1">Título</Label>
                <Input value={sel.title} onChange={(e) => setSel({ ...sel, title: e.target.value })} />
                <Label className="mt-3 mb-1">Corpo do contrato</Label>
                <p className="text-[11px] text-slate-500 mb-1">
                  Use placeholders: <code>{"{{cliente.nome}}"}</code>, <code>{"{{cliente.documento}}"}</code>,{" "}
                  <code>{"{{servico.valor}}"}</code>, <code>{"{{servico.duracao}}"}</code>,{" "}
                  <code>{"{{servico.escopo}}"}</code>, <code>{"{{data.hoje}}"}</code>.
                </p>
                <Textarea
                  className="flex-1 font-mono text-[12px]"
                  rows={20}
                  value={sel.body}
                  onChange={(e) => setSel({ ...sel, body: e.target.value })}
                />
              </>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="bg-rose-600 text-white hover:bg-rose-700 border-rose-600">Fechar</Button>
          <Button onClick={save} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            Salvar modelo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
