// @ts-nocheck
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/lv/components/ui/input";
import { maskCpfCnpj, maskBRL, parseBRL, formatBRL } from "@/lv/lib/masks";
import { Label } from "@/lv/components/ui/label";
import { Textarea } from "@/lv/components/ui/textarea";
import { Button } from "@/lv/components/ui/button";
import { Switch } from "@/lv/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/lv/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/lv/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/lv/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/lv/components/ui/tooltip";
import { useToast } from "@/lv/hooks/use-toast";
import { supabase } from "@/lv/integrations/supabase/client";
import { useAuth } from "@/lv/hooks/useAuth";
import {
  ReceiptText, Plus, Trash2, ArrowUp, ArrowDown, Download, Save, Eye, Printer,
  FileText, RefreshCw, History, Search, Sparkles, Check, X, Layers,
  Palette, User, Building2, StickyNote, FileSignature,
} from "lucide-react";
import ReceiptPreview, { ReceiptData, ReceiptProduct, ReceiptSection, LAYOUT_OPTIONS, ReceiptLayout } from "@/lv/components/receipt/ReceiptPreview";
import { downloadReceiptPdf, printReceipt, sanitizeFilename, generateReceiptNumber } from "@/lv/lib/receiptPdf";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/lv/components/ui/confirm-delete-dialog";
import { PageHeader } from "@/lv/components/admin/PageHeader";


const DEFAULT_SECTIONS: ReceiptSection[] = [
  { id: "header", enabled: true, title: "Recibo de Venda" },
  { id: "receipt-info", enabled: true, title: "Dados do recibo" },
  { id: "payer", enabled: true, title: "Dados do pagador" },
  { id: "beneficiary", enabled: true, title: "Dados do beneficiário" },
  { id: "products", enabled: true, title: "Produtos" },
  { id: "observations", enabled: true, title: "Observações" },
];

const DEFAULT_LABELS = {
  issueDate: "Data de emissão:",
  receiptNumber: "Número do recibo:",
  name: "Nome:",
  document: "CPF/CNPJ:",
  state: "Estado:",
  email: "Email:",
  total: "Valor total",
  receiptInfo: "Dados do recibo",
  payer: "Dados do pagador",
  beneficiary: "Dados do beneficiário",
  products: "Produtos",
  observations: "Observações",
};

const LABEL_HUMAN: Record<keyof typeof DEFAULT_LABELS, string> = {
  issueDate: "Data de emissão",
  receiptNumber: "Número do recibo",
  name: "Nome",
  document: "Documento",
  state: "Estado",
  email: "Email",
  total: "Valor total",
  receiptInfo: "Título — Dados do recibo",
  payer: "Título — Pagador",
  beneficiary: "Título — Beneficiário",
  products: "Título — Produtos",
  observations: "Título — Observações",
};

const todayISO = () => {
  const d = new Date();
  const tz = new Date(d.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const y = tz.getFullYear();
  const m = String(tz.getMonth() + 1).padStart(2, "0");
  const day = String(tz.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const newProduct = (description = "", amount = 0): ReceiptProduct => ({
  id: crypto.randomUUID(),
  description,
  amount,
});

function buildInitialData(): ReceiptData {
  return {
    title: "Recibo de Pagamento",
    receiptNumber: generateReceiptNumber(),
    paymentDate: todayISO(),
    payerName: "",
    payerDocument: "",
    payerState: "",
    payerEmail: "",
    beneficiaryName: "Matheus Rangel da Silva",
    beneficiaryDocument: "26.168.969/0001-60",
    beneficiaryEmail: "atendimento@matheusrangel.com.br",
    beneficiaryCompany: "Matheus Rangel Tecnologia",
    beneficiarySignatureName: "Matheus",
    city: "Limeira",
    reference: "",
    paymentStatus: "PAGO",
    products: [newProduct("MÃO DE OBRA - PLANO AVANÇADO (TRÁFEGO PAGO)", 1100)],
    observations: "Valor referente a Mão de Obra de Prestação de Serviços para Tráfego Pago.",
    sections: DEFAULT_SECTIONS,
    layout: "apple-blue",
    labels: DEFAULT_LABELS,
  };
}

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Receipts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);
  const printPreviewRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<ReceiptData>(buildInitialData);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [savedReceipts, setSavedReceipts] = useState<any[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [tmplDialogOpen, setTmplDialogOpen] = useState(false);
  const [tmplName, setTmplName] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [histSearch, setHistSearch] = useState("");
  const [histViewOpen, setHistViewOpen] = useState(false);
  const [histSelected, setHistSelected] = useState<ReceiptData | null>(null);
  const [histDownloadingId, setHistDownloadingId] = useState<string | null>(null);
  const histPreviewRef = useRef<HTMLDivElement>(null);

  const historyFiltered = useMemo(() => {
    const q = histSearch.trim().toLowerCase();
    if (!q) return savedReceipts;
    return savedReceipts.filter((r) =>
      [r.payer_name, r.receipt_number, r.payer_document].filter(Boolean).some((f: string) => f.toLowerCase().includes(q))
    );
  }, [savedReceipts, histSearch]);

  const openHistView = (r: any) => {
    setHistSelected(r.config as ReceiptData);
    setHistViewOpen(true);
  };

  const downloadHistPdf = async (r: any) => {
    setHistSelected(r.config as ReceiptData);
    setHistDownloadingId(r.id);
    await new Promise((res) => setTimeout(res, 250));
    try {
      if (histPreviewRef.current) {
        const cfg = r.config as ReceiptData;
        const fname = `Recibo_${sanitizeFilename(cfg.payerName || "Cliente")}_${cfg.paymentDate.split("-").reverse().join("-")}.pdf`;
        await downloadReceiptPdf(histPreviewRef.current, fname);
        toast({ title: "PDF baixado!", description: fname });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setHistDownloadingId(null);
    }
  };

  const deleteHistoryItem = async (id: string) => {
    await (supabase as any).from("receipts").delete().eq("id", id);
    await reloadReceipts();
    toast({ title: "Recibo excluído" });
  };
  const histDel = useConfirmDelete<string>(deleteHistoryItem);

  const totalAmount = useMemo(
    () => data.products.reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [data.products]
  );

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [c, t, r] = await Promise.all([
        supabase.from("clients").select("id, name, cnpj, cpf, state, city, email").order("name"),
        (supabase as any).from("receipt_templates").select("*").order("created_at", { ascending: false }),
        (supabase as any).from("receipts").select("*").order("created_at", { ascending: false }),
      ]);
      if (c.data) setClients(c.data);
      if (t.data) setTemplates(t.data);
      if (r.data) setSavedReceipts(r.data);

      // Sincroniza dados da empresa (Configurações > Empresa)
      const { data: emp } = await (supabase as any)
        .from("empresa_contratada_config").select("*").limit(1).maybeSingle();
      if (emp) {
        setData((prev) => ({
          ...prev,
          beneficiaryName: emp.razao_social || prev.beneficiaryName,
          beneficiaryCompany: emp.razao_social || prev.beneficiaryCompany,
          beneficiaryDocument: emp.documento || prev.beneficiaryDocument,
          beneficiaryEmail: emp.email || prev.beneficiaryEmail,
          beneficiarySignatureName: emp.representante || prev.beneficiarySignatureName,
        }));
      }
    })();
  }, [user]);

  const reloadReceipts = async () => {
    const { data: r } = await (supabase as any).from("receipts").select("*").order("created_at", { ascending: false });
    if (r) setSavedReceipts(r);
  };

  const updateField = <K extends keyof ReceiptData>(k: K, v: ReceiptData[K]) =>
    setData((d) => ({ ...d, [k]: v }));
  const updateLabel = (k: keyof ReceiptData["labels"], v: string) =>
    setData((d) => ({ ...d, labels: { ...d.labels, [k]: v } }));
  const updateProduct = (id: string, patch: Partial<ReceiptProduct>) =>
    setData((d) => ({ ...d, products: d.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  const addProduct = () => setData((d) => ({ ...d, products: [...d.products, newProduct()] }));
  const removeProduct = (id: string) =>
    setData((d) => ({ ...d, products: d.products.filter((p) => p.id !== id) }));

  const moveSection = (idx: number, dir: -1 | 1) => {
    setData((d) => {
      const arr = [...d.sections];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return d;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...d, sections: arr };
    });
  };
  const toggleSection = (id: string) =>
    setData((d) => ({ ...d, sections: d.sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)) }));
  const updateSectionTitle = (id: string, title: string) =>
    setData((d) => ({ ...d, sections: d.sections.map((s) => (s.id === id ? { ...s, title } : s)) }));

  const selectClient = (id: string) => {
    setSelectedClientId(id);
    if (!id || id === "none") return;
    const c = clients.find((x) => x.id === id);
    if (!c) return;
    setData((d) => ({
      ...d,
      payerName: c.name || "",
      payerDocument: c.cnpj || c.cpf || "",
      payerState: (c.state || "").toUpperCase().slice(0, 2),
    }));
  };

  const loadTemplate = (id: string) => {
    if (!id || id === "none") return;
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    const cfg = t.config as Partial<ReceiptData>;
    setData((d) => ({
      ...buildInitialData(),
      ...d,
      ...cfg,
      receiptNumber: generateReceiptNumber(),
      paymentDate: todayISO(),
      sections: cfg.sections || DEFAULT_SECTIONS,
      labels: { ...DEFAULT_LABELS, ...(cfg.labels || {}) },
    }));
    toast({ title: "Modelo carregado", description: t.name });
  };

  const saveTemplate = async () => {
    if (!tmplName.trim() || !user) return;
    const { error } = await (supabase as any)
      .from("receipt_templates")
      .insert({ user_id: user.id, name: tmplName.trim(), config: data });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Modelo salvo!" });
    setTmplDialogOpen(false);
    setTmplName("");
    const { data: list } = await (supabase as any).from("receipt_templates").select("*").order("created_at", { ascending: false });
    if (list) setTemplates(list);
  };

  const handleDeleteTemplate = async (id: string) => {
    await (supabase as any).from("receipt_templates").delete().eq("id", id);
    setTemplates((arr) => arr.filter((t) => t.id !== id));
    toast({ title: "Modelo excluído" });
  };
  const tmplDel = useConfirmDelete(handleDeleteTemplate);

  const filename = useMemo(() => {
    const name = sanitizeFilename(data.payerName || "Cliente");
    const date = data.paymentDate.split("-").reverse().join("-");
    return `Recibo_${name}_${date}.pdf`;
  }, [data.payerName, data.paymentDate]);

  const persistAndDownload = async () => {
    if (!previewRef.current || !user) return;
    setDownloading(true);
    try {
      await (supabase as any).from("receipts").insert({
        user_id: user.id,
        receipt_number: data.receiptNumber,
        payer_name: data.payerName,
        payer_document: data.payerDocument,
        payer_state: data.payerState,
        beneficiary_name: data.beneficiaryName,
        beneficiary_document: data.beneficiaryDocument,
        beneficiary_email: data.beneficiaryEmail,
        payment_date: data.paymentDate,
        total_amount: totalAmount,
        products: data.products,
        observations: data.observations,
        client_id: selectedClientId && selectedClientId !== "none" ? selectedClientId : null,
        config: data,
      });
      await downloadReceiptPdf(previewRef.current, filename);
      toast({ title: "PDF baixado!", description: filename });
      await reloadReceipts();
    } catch (e: any) {
      toast({ title: "Erro ao gerar PDF", description: e.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    const element = previewRef.current || printPreviewRef.current;
    if (!element) return;
    try {
      await printReceipt(element, `Recibo - ${data.payerName || "Cliente"}`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Não foi possível abrir a impressão.";
      toast({ title: "Erro ao imprimir", description: message, variant: "destructive" });
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="container mx-auto p-4 md:p-6 max-w-7xl animate-fade-in">
        {/* Header */}
        <PageHeader
          icon={ReceiptText}
          title="Recibos"
          subtitle="Gerador rápido e elegante de recibos profissionais."
          gradient="from-emerald-500 to-teal-600"
          shadowColor="shadow-emerald-500/25"
          badge={savedReceipts.length > 0 ? savedReceipts.length : undefined}
          actions={
            <>
              <ToolbarButton icon={<Sparkles className="w-3.5 h-3.5" />} label="Novo" onClick={() => setData(buildInitialData())} />
              <ToolbarButton icon={<Save className="w-3.5 h-3.5" />} label="Salvar modelo" onClick={() => setTmplDialogOpen(true)} />
              <ToolbarButton icon={<Eye className="w-3.5 h-3.5" />} label="Visualizar" onClick={() => setPreviewOpen(true)} />
              <ToolbarButton icon={<Printer className="w-3.5 h-3.5" />} label="Imprimir" onClick={handlePrint} />
              <Button
                onClick={() => setPreviewOpen(true)}
                className="h-10 rounded-full px-5 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_6px_20px_-6px_rgba(16,185,129,0.6)] hover:shadow-[0_8px_24px_-6px_rgba(16,185,129,0.75)] transition-all hover:-translate-y-0.5"
              >
                <FileText className="w-4 h-4" /> Gerar Recibo
              </Button>
            </>
          }
        />


        <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-6">
          {/* LEFT: editor */}
          <div className="space-y-4">
            <Tabs defaultValue="dados">
              <TabsList className="w-full h-11 p-1 bg-card/60 backdrop-blur-sm border border-border/60 rounded-full flex justify-center gap-1">
                <PillTab value="dados" icon={<User className="w-3.5 h-3.5" />}>Dados</PillTab>
                <PillTab value="produtos" icon={<Layers className="w-3.5 h-3.5" />}>Produtos</PillTab>
                <PillTab value="layout" icon={<Palette className="w-3.5 h-3.5" />}>Layout</PillTab>
                <PillTab value="modelos" icon={<FileSignature className="w-3.5 h-3.5" />}>Modelos</PillTab>
                <PillTab value="historico" icon={<History className="w-3.5 h-3.5" />}>
                  Histórico
                  {savedReceipts.length > 0 && (
                    <span className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground data-[state=active]:bg-background/25 data-[state=active]:text-current">
                      {savedReceipts.length}
                    </span>
                  )}
                </PillTab>
              </TabsList>

              {/* DADOS */}
              <TabsContent value="dados" className="space-y-4 mt-5">
                <Panel icon={<ReceiptText className="w-4 h-4" />} title="Dados do recibo">
                  <FieldGrid>
                    <Field label="Número do recibo">
                      <div className="flex gap-2">
                        <Input value={data.receiptNumber} onChange={(e) => updateField("receiptNumber", e.target.value)} />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button type="button" variant="outline" size="icon" onClick={() => updateField("receiptNumber", generateReceiptNumber())} className="shrink-0">
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">Gerar novo número</TooltipContent>
                        </Tooltip>
                      </div>
                    </Field>
                    <Field label="Data do pagamento">
                      <Input type="date" value={data.paymentDate} onChange={(e) => updateField("paymentDate", e.target.value)} />
                    </Field>
                    <Field label="Título principal" full>
                      <Input value={data.title} onChange={(e) => updateField("title", e.target.value)} />
                    </Field>
                  </FieldGrid>
                </Panel>

                <Panel icon={<User className="w-4 h-4" />} title="Pagador (Cliente)">
                  <Field label="Cliente cadastrado" full>
                    <Select value={selectedClientId} onValueChange={selectClient}>
                      <SelectTrigger><SelectValue placeholder="— ou preencher manualmente —" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Preencher manualmente —</SelectItem>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <FieldGrid>
                    <Field label="Nome">
                      <Input value={data.payerName} onChange={(e) => updateField("payerName", e.target.value)} />
                    </Field>
                    <Field label="CPF/CNPJ">
                      <Input inputMode="numeric" placeholder="000.000.000-00 ou 00.000.000/0000-00" value={maskCpfCnpj(data.payerDocument || "")} onChange={(e) => updateField("payerDocument", maskCpfCnpj(e.target.value))} />
                    </Field>
                    <Field label="Estado" full>
                      <Input maxLength={2} placeholder="SP" value={(data.payerState || "").toUpperCase()} onChange={(e) => updateField("payerState", e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2))} />
                    </Field>
                  </FieldGrid>
                </Panel>

                <Panel icon={<Building2 className="w-4 h-4" />} title="Beneficiário">
                  <FieldGrid>
                    <Field label="Nome">
                      <Input value={data.beneficiaryName} onChange={(e) => updateField("beneficiaryName", e.target.value)} />
                    </Field>
                    <Field label="CPF/CNPJ">
                      <Input inputMode="numeric" placeholder="000.000.000-00 ou 00.000.000/0000-00" value={maskCpfCnpj(data.beneficiaryDocument || "")} onChange={(e) => updateField("beneficiaryDocument", maskCpfCnpj(e.target.value))} />
                    </Field>
                    <Field label="Empresa (cabeçalho)">
                      <Input value={data.beneficiaryCompany || ""} onChange={(e) => updateField("beneficiaryCompany", e.target.value)} />
                    </Field>
                    <Field label="Nome curto (assinatura)">
                      <Input value={data.beneficiarySignatureName || ""} onChange={(e) => updateField("beneficiarySignatureName", e.target.value)} placeholder="Ex: Matheus" />
                    </Field>
                    <Field label="Email" full>
                      <Input value={data.beneficiaryEmail} onChange={(e) => updateField("beneficiaryEmail", e.target.value)} />
                    </Field>
                    <Field label="Cidade (rodapé)">
                      <Input value={data.city || ""} onChange={(e) => updateField("city", e.target.value)} placeholder="Ex: Limeira" />
                    </Field>
                    <Field label="Status do pagamento">
                      <Input value={data.paymentStatus || ""} onChange={(e) => updateField("paymentStatus", e.target.value)} placeholder="PAGO" />
                    </Field>
                    <Field label="Referente a (opcional — substitui a lista de produtos)" full>
                      <Input value={data.reference || ""} onChange={(e) => updateField("reference", e.target.value)} placeholder="Ex: Mensalidade — Posicionamento Orgânico — JO MODAS" />
                    </Field>
                  </FieldGrid>
                </Panel>

                <Panel icon={<StickyNote className="w-4 h-4" />} title="Observações">
                  <Textarea rows={4} value={data.observations} onChange={(e) => updateField("observations", e.target.value)} />
                </Panel>
              </TabsContent>

              {/* PRODUTOS */}
              <TabsContent value="produtos" className="space-y-3 mt-5">
                <Panel
                  icon={<Layers className="w-4 h-4" />}
                  title="Produtos / Serviços"
                  action={
                    <Button size="sm" onClick={addProduct} className="h-8 rounded-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </Button>
                  }
                >
                  <div className="space-y-2">
                    {data.products.map((p, i) => (
                      <div key={p.id} className="group grid grid-cols-[28px_1fr_160px_auto] gap-2 items-start p-2.5 rounded-xl border border-border/60 bg-card/40 hover:bg-card/70 transition-colors">
                        <div className="mt-2 h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-600 text-[11px] font-semibold flex items-center justify-center">
                          {i + 1}
                        </div>
                        <Textarea
                          rows={2}
                          placeholder="Descrição do produto ou serviço"
                          value={p.description}
                          onChange={(e) => updateProduct(p.id, { description: e.target.value })}
                          className="resize-none"
                        />
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">R$</span>
                          <Input
                            inputMode="numeric"
                            placeholder="0,00"
                            value={p.amount ? formatBRL(p.amount) : ""}
                            onChange={(e) => updateProduct(p.id, { amount: parseBRL(maskBRL(e.target.value)) })}
                            className="pl-9 font-medium text-right"
                          />
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeProduct(p.id)}
                              className="h-9 w-9 rounded-full text-red-500 hover:bg-red-500/10 hover:text-red-600 opacity-60 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">Remover item</TooltipContent>
                        </Tooltip>
                      </div>
                    ))}
                    {data.products.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Nenhum item ainda — clique em Adicionar.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Valor total</span>
                    <span className="text-lg font-bold text-emerald-600 tabular-nums">{BRL(totalAmount)}</span>
                  </div>
                </Panel>
              </TabsContent>

              {/* LAYOUT */}
              <TabsContent value="layout" className="space-y-4 mt-5">
                <Panel
                  icon={<Palette className="w-4 h-4" />}
                  title="Modelo visual"
                  subtitle="Escolha o estilo — todos preservam os mesmos dados."
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {LAYOUT_OPTIONS.map((opt) => {
                      const active = (data.layout || "default") === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => updateField("layout", opt.id as ReceiptLayout)}
                          className={`relative text-left rounded-2xl border p-3 transition-all duration-300 hover:-translate-y-0.5 ${
                            active
                              ? "border-emerald-500 ring-2 ring-emerald-500/25 bg-emerald-500/5 shadow-[0_8px_24px_-8px_rgba(16,185,129,0.4)]"
                              : "border-border/60 hover:border-emerald-500/40 hover:shadow-md"
                          }`}
                        >
                          <LayoutThumbnail id={opt.id} />
                          <p className="text-[12.5px] font-semibold mt-2 tracking-tight">{opt.name}</p>
                          <p className="text-[10.5px] text-muted-foreground leading-tight mt-0.5">{opt.desc}</p>
                          {active && (
                            <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                              <Check className="w-3 h-3" strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </Panel>

                <Panel icon={<Layers className="w-4 h-4" />} title="Seções" subtitle="Ordem, visibilidade e títulos das seções do recibo.">
                  <div className="space-y-1.5">
                    {data.sections.map((s, idx) => (
                      <div key={s.id} className="flex items-center gap-2 p-2 rounded-xl border border-border/60 bg-card/40">
                        <div className="flex flex-col gap-0.5">
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => moveSection(idx, -1)} disabled={idx === 0}>
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => moveSection(idx, 1)} disabled={idx === data.sections.length - 1}>
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                        </div>
                        <Input className="flex-1 border-0 bg-transparent focus-visible:ring-1" value={s.title} onChange={(e) => updateSectionTitle(s.id, e.target.value)} />
                        <Switch checked={s.enabled} onCheckedChange={() => toggleSection(s.id)} />
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel icon={<FileSignature className="w-4 h-4" />} title="Rótulos dos campos" subtitle="Personalize os textos que aparecem no recibo.">
                  <FieldGrid>
                    {(Object.keys(DEFAULT_LABELS) as (keyof typeof DEFAULT_LABELS)[]).map((k) => (
                      <Field key={k} label={LABEL_HUMAN[k]}>
                        <Input value={data.labels[k]} onChange={(e) => updateLabel(k, e.target.value)} />
                      </Field>
                    ))}
                  </FieldGrid>
                </Panel>
              </TabsContent>

              {/* MODELOS */}
              <TabsContent value="modelos" className="space-y-4 mt-5">
                <Panel
                  icon={<FileSignature className="w-4 h-4" />}
                  title="Modelos salvos"
                  action={
                    <Button size="sm" onClick={() => setTmplDialogOpen(true)} className="h-8 rounded-full gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Novo modelo
                    </Button>
                  }
                >
                  {templates.length === 0 ? (
                    <EmptyState icon={<FileSignature className="w-6 h-6" />} title="Nenhum modelo salvo" subtitle="Salve o layout atual como modelo para reutilizar depois." />
                  ) : (
                    <div className="space-y-2">
                      {templates.map((t) => (
                        <div key={t.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-card/40 p-3 hover:bg-card/70 transition-colors">
                          <div>
                            <p className="font-medium text-sm">{t.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Criado em {new Date(t.created_at).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => loadTemplate(t.id)} className="h-8 rounded-full text-xs">Carregar</Button>
                            <Button size="sm" variant="ghost" onClick={() => tmplDel.requestDelete(t.id)} className="h-8 w-8 rounded-full text-red-500 hover:bg-red-500/10 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel icon={<History className="w-4 h-4" />} title="Recibos recentes">
                  {savedReceipts.length === 0 ? (
                    <EmptyState icon={<ReceiptText className="w-6 h-6" />} title="Nenhum recibo gerado ainda" />
                  ) : (
                    <div className="space-y-2">
                      {savedReceipts.slice(0, 10).map((r) => (
                        <div key={r.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-card/40 p-3 hover:bg-card/70 transition-colors">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{r.payer_name || "Sem nome"}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {r.payment_date?.split("-").reverse().join("/")} · <span className="text-emerald-600 font-semibold">{BRL(Number(r.total_amount))}</span>
                            </p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => setData(r.config as ReceiptData)} className="h-8 rounded-full text-xs">
                            Reabrir
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </TabsContent>

              {/* HISTÓRICO */}
              <TabsContent value="historico" className="space-y-4 mt-5">
                <Panel icon={<History className="w-4 h-4" />} title={`Recibos gerados (${savedReceipts.length})`}>
                  <div className="relative mb-3">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-10 pr-9 h-10 rounded-full bg-card/60"
                      placeholder="Buscar por cliente, nº do recibo ou CPF/CNPJ…"
                      value={histSearch}
                      onChange={(e) => setHistSearch(e.target.value)}
                    />
                    {histSearch && (
                      <button onClick={() => setHistSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center text-muted-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {historyFiltered.length === 0 ? (
                    <EmptyState
                      icon={<ReceiptText className="w-6 h-6" />}
                      title={savedReceipts.length === 0 ? "Nenhum recibo foi gerado ainda" : "Nenhum resultado para essa busca"}
                      subtitle={savedReceipts.length === 0 ? "Gere o primeiro para ver aqui." : undefined}
                    />
                  ) : (
                    <div className="space-y-2 max-h-[60vh] overflow-auto pr-1 -mr-1">
                      {historyFiltered.map((r) => (
                        <div key={r.id} className="rounded-xl border border-border/60 bg-card/40 p-3 hover:bg-card/70 hover:border-primary/30 hover:shadow-sm transition-all">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-sm truncate">{r.payer_name || "Sem nome"}</p>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                                  #{String(r.receipt_number || "").slice(-6)}
                                </span>
                              </div>
                              <p className="text-[11.5px] text-muted-foreground mt-0.5">
                                {r.payment_date?.split("-").reverse().join("/")}
                                {r.payer_document && <> · {r.payer_document}</>}
                              </p>
                              <p className="text-[14px] font-bold text-emerald-600 tabular-nums mt-1">
                                {BRL(Number(r.total_amount))}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <IconGhost tip="Visualizar" onClick={() => openHistView(r)}>
                                <Eye className="w-3.5 h-3.5" />
                              </IconGhost>
                              <IconGhost
                                tip="Baixar PDF"
                                onClick={() => downloadHistPdf(r)}
                                disabled={histDownloadingId === r.id}
                                emerald
                              >
                                <Download className="w-3.5 h-3.5" />
                              </IconGhost>
                              <IconGhost tip="Reabrir na edição" onClick={() => setData(r.config as ReceiptData)}>
                                <RefreshCw className="w-3.5 h-3.5" />
                              </IconGhost>
                              <IconGhost tip="Excluir" onClick={() => histDel.requestDelete(r.id)} destructive>
                                <Trash2 className="w-3.5 h-3.5" />
                              </IconGhost>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </TabsContent>
            </Tabs>
          </div>

          {/* RIGHT: live preview */}
          <div className="lg:sticky lg:top-24 self-start">
            <Panel icon={<Eye className="w-4 h-4" />} title="Pré-visualização ao vivo" subtitle="Atualiza conforme você edita.">
              <ResponsiveReceiptPreview data={data} />
            </Panel>
          </div>

        </div>

        {/* Preview / Generate dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight">Pré-visualização do recibo</DialogTitle>
              <DialogDescription>Revise antes de gerar. O PDF será salvo no histórico.</DialogDescription>
            </DialogHeader>
            <div className="flex justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 p-4 rounded-xl">
              <div className="shadow-xl">
                <ReceiptPreview ref={previewRef} data={data} />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>Cancelar</Button>
              <Button variant="outline" onClick={handlePrint} className="gap-2">
                <Printer className="w-4 h-4" /> Imprimir
              </Button>
              <Button onClick={persistAndDownload} disabled={downloading} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                <Download className="w-4 h-4" /> {downloading ? "Gerando…" : `Baixar ${filename}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Save template dialog */}
        <Dialog open={tmplDialogOpen} onOpenChange={setTmplDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Salvar como modelo</DialogTitle>
              <DialogDescription>Reutilize a configuração atual em recibos futuros.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Nome do modelo</Label>
              <Input value={tmplName} onChange={(e) => setTmplName(e.target.value)} placeholder="Ex: Plano Avançado — Tráfego Pago" />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setTmplDialogOpen(false)}>Cancelar</Button>
              <Button onClick={saveTemplate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* History view dialog */}
        <Dialog open={histViewOpen} onOpenChange={setHistViewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Recibo salvo</DialogTitle>
            </DialogHeader>
            {histSelected && (
              <div className="flex justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 p-4 rounded-xl">
                <div className="shadow-xl">
                  <ReceiptPreview data={histSelected} />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Hidden preview used to render historical entries for PDF export */}
        <div style={{ position: "fixed", left: "-99999px", top: 0, pointerEvents: "none", opacity: 0 }} aria-hidden>
          <ReceiptPreview ref={printPreviewRef} data={data} />
          {histSelected && <ReceiptPreview ref={histPreviewRef} data={histSelected} />}
        </div>

        <ConfirmDeleteDialog
          open={!!tmplDel.deleteTarget}
          onOpenChange={(open) => !open && tmplDel.cancelDelete()}
          onConfirm={tmplDel.confirmDelete}
          title="Excluir modelo"
          description="Tem certeza que deseja excluir este modelo? Esta ação não pode ser desfeita."
        />
        <ConfirmDeleteDialog
          open={!!histDel.deleteTarget}
          onOpenChange={(open) => !open && histDel.cancelDelete()}
          onConfirm={histDel.confirmDelete}
          title="Excluir recibo"
          description="Tem certeza que deseja excluir este recibo do histórico? Esta ação não pode ser desfeita."
        />
      </div>
    </TooltipProvider>
  );
}

// ================= UI helpers =================
function ToolbarButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="h-10 rounded-full gap-1.5 px-4 bg-card/60 backdrop-blur-sm border-border/60 hover:border-primary/30 hover:-translate-y-0.5 transition-all"
    >
      {icon} {label}
    </Button>
  );
}

function PillTab({ value, icon, children }: { value: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <TabsTrigger
      value={value}
      className="flex-1 h-9 rounded-full gap-1.5 text-[12.5px] font-medium data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm transition-all"
    >
      {icon} {children}
    </TabsTrigger>
  );
}

function Panel({
  icon,
  title,
  subtitle,
  action,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 md:p-5 shadow-[0_1px_0_hsl(var(--foreground)/0.02)]">
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold tracking-tight">{title}</h3>
            {subtitle && <p className="text-[11.5px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${full ? "md:col-span-2" : ""}`}>
      <Label className="text-[11.5px] font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-12 h-12 rounded-full bg-muted/50 text-muted-foreground/60 flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

function IconGhost({
  children,
  tip,
  onClick,
  disabled,
  destructive,
  emerald,
}: {
  children: React.ReactNode;
  tip: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  emerald?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClick}
          disabled={disabled}
          className={`h-8 w-8 rounded-full transition-all hover:scale-105 ${
            destructive
              ? "text-red-500 hover:bg-red-500/10 hover:text-red-600"
              : emerald
              ? "text-emerald-600 hover:bg-emerald-500/10"
              : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
          }`}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs">{tip}</TooltipContent>
    </Tooltip>
  );
}

// ================= Responsive live preview (A4, no scrollbars) =================
function ResponsiveReceiptPreview({ data }: { data: ReceiptData }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const A4_W = 595;
  const A4_H = 842;

  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / A4_W);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className="w-full rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 p-3 ring-1 ring-border/60 overflow-hidden"
    >
      <div style={{ height: A4_H * scale, width: "100%", position: "relative" }}>
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: A4_W,
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          <ReceiptPreview data={data} />
        </div>
      </div>
    </div>
  );
}


// ================= Layout thumbnails =================
function LayoutThumbnail({ id }: { id: string }) {
  const base = "w-full h-16 rounded-md overflow-hidden border border-border/40";
  switch (id) {
    case "default":
      return (
        <div className={`${base} bg-white p-1.5`}>
          <div className="h-1.5 w-12 bg-gray-700 rounded-sm mb-1" />
          <div className="h-1 w-full bg-gray-200 mb-0.5" />
          <div className="h-1 w-2/3 bg-gray-200 mb-0.5" />
          <div className="h-1 w-1/2 bg-gray-200" />
        </div>
      );
    case "minimal":
      return (
        <div className={`${base} bg-white p-2`}>
          <div className="h-0.5 w-4 bg-emerald-500 mb-2" />
          <div className="h-2 w-10 bg-gray-900 rounded-sm mb-2" />
          <div className="h-1 w-full bg-gray-100 mb-0.5" />
          <div className="flex justify-end mt-1"><div className="h-2 w-10 bg-emerald-600 rounded-sm" /></div>
        </div>
      );
    case "emerald-card":
      return (
        <div className={`${base} p-1.5`} style={{ background: "linear-gradient(135deg,#065f46,#10b981)" }}>
          <div className="bg-white rounded-sm h-full p-1.5">
            <div className="h-1 w-8 bg-emerald-500 mb-1" />
            <div className="h-1 w-full bg-gray-200 mb-0.5" />
            <div className="h-3 w-full rounded-sm" style={{ background: "linear-gradient(135deg,#065f46,#10b981)" }} />
          </div>
        </div>
      );
    case "executive-dark":
      return (
        <div className={`${base} bg-white`}>
          <div className="bg-black p-1.5 flex justify-between items-center">
            <div className="h-1.5 w-8 bg-emerald-400 rounded-sm" />
            <div className="h-3 w-8 bg-emerald-500/30 border border-emerald-500/60 rounded-sm" />
          </div>
          <div className="p-1.5">
            <div className="h-1 w-full bg-gray-200 mb-0.5" />
            <div className="h-1 w-2/3 bg-gray-200" />
          </div>
        </div>
      );
    case "badge-modern":
      return (
        <div className={`${base} bg-white flex`}>
          <div className="w-1.5" style={{ background: "linear-gradient(180deg,#10b981,#047857)" }} />
          <div className="flex-1 p-1.5">
            <div className="h-2 w-8 bg-gray-900 rounded-sm mb-1" />
            <div className="h-3 w-full bg-emerald-100 border border-emerald-200 rounded-sm" />
          </div>
        </div>
      );
    case "gradient-sidebar":
      return (
        <div className={`${base} bg-white flex`}>
          <div className="w-8 p-1" style={{ background: "linear-gradient(180deg,#065f46,#10b981)" }}>
            <div className="h-1 w-4 bg-emerald-200 mb-1" />
            <div className="h-1 w-5 bg-white/80 mb-1" />
            <div className="h-1.5 w-5 bg-white" />
          </div>
          <div className="flex-1 p-1.5">
            <div className="h-1 w-full bg-gray-200 mb-0.5" />
            <div className="h-1 w-2/3 bg-gray-200 mb-1" />
            <div className="h-1.5 w-full bg-emerald-100 rounded-sm" />
          </div>
        </div>
      );
    default:
      return <div className={base} />;
  }
}
