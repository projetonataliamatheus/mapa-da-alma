// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lv/integrations/supabase/client";
import { useAuth } from "@/lv/hooks/useAuth";
import { useToast } from "@/lv/hooks/use-toast";
import { Button } from "@/lv/components/ui/button";
import { Input } from "@/lv/components/ui/input";
import { Textarea } from "@/lv/components/ui/textarea";
import { Switch } from "@/lv/components/ui/switch";
import { Label } from "@/lv/components/ui/label";
import { Card, CardContent } from "@/lv/components/ui/card";
import { Plus, Trash2, GripVertical, Save, HelpCircle, Eye, EyeOff } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/lv/components/ui/alert-dialog";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  show_on_simple: boolean;
  show_on_detailed: boolean;
  is_active: boolean;
}

export default function FaqSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [faqTitle, setFaqTitle] = useState("Perguntas Frequentes");

  const fetchItems = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("quote_faq_items")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });

    if (error) { console.error(error); setLoading(false); return; }

    if (!data || data.length === 0) {
      // Seed defaults
      const defaults = [
        { question: "Quanto tempo leva para começar a aparecer resultados?", answer: "Os anúncios entram no ar na segunda semana. Os primeiros contatos no WhatsApp costumam aparecer nos primeiros 3 a 5 dias após ativação.", sort_order: 0 },
        { question: "Preciso entender de marketing ou tecnologia?", answer: "Não. Você cuida dos pacientes e eu cuido de tudo relacionado ao marketing digital.", sort_order: 1 },
        { question: "O valor de tráfego vai direto para o Facebook/Meta?", answer: "Sim. Você cria uma conta de anúncios no Meta e cadastra seu cartão diretamente lá. Total transparência.", sort_order: 2 },
        { question: "Qual o prazo mínimo de contrato?", answer: "O contrato é mensal, sem fidelidade mínima. Recomendamos pelo menos 3 meses.", sort_order: 3 },
        { question: "E se eu não conseguir responder rápido no WhatsApp?", answer: "Vamos implementar uma automação inteligente no WhatsApp que responde automaticamente com informações básicas.", sort_order: 4 },
      ];
      const { error: insertErr } = await supabase.from("quote_faq_items").insert(
        defaults.map(d => ({ ...d, user_id: user.id, show_on_simple: false, show_on_detailed: true, is_active: true }))
      );
      if (!insertErr) { fetchItems(); return; }
    }

    setItems((data as FaqItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [user]);

  const updateItem = (id: string, field: keyof FaqItem, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    setHasChanges(true);
  };

  const addItem = () => {
    const newItem: FaqItem = {
      id: `new-${Date.now()}`,
      question: "",
      answer: "",
      sort_order: items.length,
      show_on_simple: false,
      show_on_detailed: true,
      is_active: true,
    };
    setItems(prev => [...prev, newItem]);
    setHasChanges(true);
  };

  const removeItem = async () => {
    if (!deleteId) return;
    if (!deleteId.startsWith("new-")) {
      await supabase.from("quote_faq_items").delete().eq("id", deleteId);
    }
    setItems(prev => prev.filter(item => item.id !== deleteId));
    setDeleteId(null);
    setHasChanges(true);
    toast({ title: "Pergunta removida" });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const payload = {
        user_id: user.id,
        question: item.question,
        answer: item.answer,
        sort_order: i,
        show_on_simple: item.show_on_simple,
        show_on_detailed: item.show_on_detailed,
        is_active: item.is_active,
        updated_at: new Date().toISOString(),
      };

      if (item.id.startsWith("new-")) {
        await supabase.from("quote_faq_items").insert(payload);
      } else {
        await supabase.from("quote_faq_items").update(payload).eq("id", item.id);
      }
    }

    toast({ title: "FAQ salvo com sucesso! ✨" });
    setHasChanges(false);
    fetchItems();
    setSaving(false);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    const newItems = [...items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    setItems(newItems.map((item, i) => ({ ...item, sort_order: i })));
    setHasChanges(true);
  };

  if (loading) return <p className="text-center text-muted-foreground py-8">Carregando FAQ...</p>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* Hero header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <HelpCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Perguntas Frequentes</h2>
            <p className="text-sm text-muted-foreground">Configure as perguntas do orçamento. Ative por versão (Simplificada / Detalhada).</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={addItem} className="gap-1.5 h-10 rounded-xl">
          <Plus className="h-4 w-4" /> Nova Pergunta
        </Button>
      </div>

      {/* Legend */}
      <div className="flex items-center flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground bg-muted/40 border border-border/60 rounded-xl px-4 py-3">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Visível na Detalhada</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> Visível na Simplificada</span>
        <span className="flex items-center gap-1.5"><Eye className="h-3 w-3" /> Ativa</span>
        <span className="flex items-center gap-1.5"><EyeOff className="h-3 w-3" /> Inativa</span>
        <span className="ml-auto tabular-nums font-medium text-foreground">{items.length} {items.length === 1 ? "pergunta" : "perguntas"}</span>
      </div>


      <div className="space-y-3">
        {items.map((item, index) => (
          <Card key={item.id} className={`transition-all ${!item.is_active ? "opacity-50" : ""}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                {/* Drag handle & order */}
                <div className="flex flex-col items-center gap-1 pt-2">
                  <button onClick={() => moveItem(index, -1)} disabled={index === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▲</button>
                  <span className="text-xs text-muted-foreground font-mono w-5 text-center">{index + 1}</span>
                  <button onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▼</button>
                </div>

                <div className="flex-1 space-y-2">
                  <Input
                    value={item.question}
                    onChange={e => updateItem(item.id, "question", e.target.value)}
                    placeholder="Pergunta..."
                    className="font-medium"
                  />
                  <Textarea
                    value={item.answer}
                    onChange={e => updateItem(item.id, "answer", e.target.value)}
                    placeholder="Resposta..."
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6 pl-9 pt-1 border-t border-border/50">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={item.is_active}
                    onCheckedChange={v => updateItem(item.id, "is_active", v)}
                  />
                  <span className="text-xs text-muted-foreground">Ativa</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={item.show_on_detailed}
                    onCheckedChange={v => updateItem(item.id, "show_on_detailed", v)}
                  />
                  <span className="text-xs text-muted-foreground">Versão Detalhada</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={item.show_on_simple}
                    onCheckedChange={v => updateItem(item.id, "show_on_simple", v)}
                  />
                  <span className="text-xs text-muted-foreground">Versão Simplificada</span>
                </label>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma pergunta cadastrada.</p>
          <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={addItem}>
            <Plus className="h-4 w-4" /> Adicionar Primeira Pergunta
          </Button>
        </div>
      )}

      {/* Sticky save bar */}
      <div className="sticky bottom-0 -mx-2 md:-mx-4 mt-6 z-10">
        <div className="rounded-2xl border border-border/60 bg-background/85 backdrop-blur-xl px-4 py-3 shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.15)] flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground hidden sm:block">
            {hasChanges ? <span className="text-amber-600 dark:text-amber-400 font-medium">● Alterações não salvas</span> : "Tudo salvo"}
          </p>
          <Button className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-5 ml-auto" onClick={handleSave} disabled={saving || !hasChanges}>
            <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando..." : hasChanges ? "Salvar Alterações" : "Salvo ✓"}
          </Button>
        </div>
      </div>


      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🗑️ Excluir pergunta</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta pergunta?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={removeItem}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
