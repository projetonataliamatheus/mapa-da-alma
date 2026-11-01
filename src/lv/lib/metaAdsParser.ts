// @ts-nocheck
import * as XLSX from "xlsx";
import { restrictToApprovedReportMetrics } from "@/lv/lib/trafficReportMetricRules";

export interface MetaAdsMetric {
  metric_key: string;
  metric_value: number;
  metric_label: string;
  metric_icon: string;
  metric_color: string;
  metric_category: string;
}

// Known mappings for common Meta Ads columns
const KNOWN_COLUMNS: Record<
  string,
  {
    key: string;
    label: string;
    icon: string;
    color: string;
    category: string;
    avg?: boolean;
    format?: "currency" | "percent" | "number";
  }
> = {
  alcance: { key: "reach", label: "Pessoas Alcançadas", icon: "Eye", color: "#3b82f6", category: "alcance" },
  impressões: { key: "impressions", label: "Impressões", icon: "Eye", color: "#6366f1", category: "alcance" },
  impressoes: { key: "impressions", label: "Impressões", icon: "Eye", color: "#6366f1", category: "alcance" },
  frequência: {
    key: "frequency",
    label: "Frequência",
    icon: "BarChart2",
    color: "#a855f7",
    category: "alcance",
    avg: true,
  },
  frequencia: {
    key: "frequency",
    label: "Frequência",
    icon: "BarChart2",
    color: "#a855f7",
    category: "alcance",
    avg: true,
  },
  "cliques no link": {
    key: "link_clicks",
    label: "Cliques no Link",
    icon: "MousePointer",
    color: "#f59e0b",
    category: "engajamento",
  },
  "cliques no link únicos": {
    key: "unique_link_clicks",
    label: "Cliques no Link Únicos",
    icon: "MousePointer",
    color: "#f59e0b",
    category: "engajamento",
  },
  "cliques no link unicos": {
    key: "unique_link_clicks",
    label: "Cliques no Link Únicos",
    icon: "MousePointer",
    color: "#f59e0b",
    category: "engajamento",
  },
  "cliques (todos)": {
    key: "clicks_all",
    label: "Cliques (Todos)",
    icon: "MousePointer",
    color: "#f59e0b",
    category: "engajamento",
  },
  "cliques únicos (todos)": {
    key: "unique_clicks_all",
    label: "Cliques Únicos (Todos)",
    icon: "MousePointer",
    color: "#d97706",
    category: "engajamento",
  },
  "ctr (taxa de cliques no link)": {
    key: "ctr",
    label: "CTR (Taxa de Cliques)",
    icon: "MousePointer",
    color: "#8b5cf6",
    category: "engajamento",
    avg: true,
    format: "percent",
  },
  "ctr único (taxa de cliques no link)": {
    key: "ctr_unique",
    label: "CTR Único",
    icon: "MousePointer",
    color: "#7c3aed",
    category: "engajamento",
    avg: true,
    format: "percent",
  },
  "ctr unico (taxa de cliques no link)": {
    key: "ctr_unique",
    label: "CTR Único",
    icon: "MousePointer",
    color: "#7c3aed",
    category: "engajamento",
    avg: true,
    format: "percent",
  },
  "ctr (todos)": {
    key: "ctr_all",
    label: "CTR (Todos)",
    icon: "MousePointer",
    color: "#8b5cf6",
    category: "engajamento",
    avg: true,
    format: "percent",
  },
  "ctr único (todos)": {
    key: "ctr_unique_all",
    label: "CTR Único (Todos)",
    icon: "MousePointer",
    color: "#7c3aed",
    category: "engajamento",
    avg: true,
    format: "percent",
  },
  "valor usado (brl)": {
    key: "spend",
    label: "Valor Investido",
    icon: "DollarSign",
    color: "#10b981",
    category: "custo",
    format: "currency",
  },
  "quantia gasta (brl)": {
    key: "spend",
    label: "Valor Investido",
    icon: "DollarSign",
    color: "#10b981",
    category: "custo",
    format: "currency",
  },
  "valor usado": {
    key: "spend",
    label: "Valor Investido",
    icon: "DollarSign",
    color: "#10b981",
    category: "custo",
    format: "currency",
  },
  "valor gasto (brl)": {
    key: "spend",
    label: "Valor Investido",
    icon: "DollarSign",
    color: "#10b981",
    category: "custo",
    format: "currency",
  },
  "valor gasto (r$)": {
    key: "spend",
    label: "Valor Investido",
    icon: "DollarSign",
    color: "#10b981",
    category: "custo",
    format: "currency",
  },
  "valor gasto": {
    key: "spend",
    label: "Valor Investido",
    icon: "DollarSign",
    color: "#10b981",
    category: "custo",
    format: "currency",
  },
  "quantia gasta": {
    key: "spend",
    label: "Valor Investido",
    icon: "DollarSign",
    color: "#10b981",
    category: "custo",
    format: "currency",
  },
  "amount spent (brl)": {
    key: "spend",
    label: "Valor Investido",
    icon: "DollarSign",
    color: "#10b981",
    category: "custo",
    format: "currency",
  },
  "amount spent": {
    key: "spend",
    label: "Valor Investido",
    icon: "DollarSign",
    color: "#10b981",
    category: "custo",
    format: "currency",
  },

  "cpm (custo por 1.000 impressões)": {
    key: "cpm",
    label: "CPM",
    icon: "TrendingDown",
    color: "#ef4444",
    category: "custo",
    avg: true,
    format: "currency",
  },
  "cpm (custo por 1.000 impressoes)": {
    key: "cpm",
    label: "CPM",
    icon: "TrendingDown",
    color: "#ef4444",
    category: "custo",
    avg: true,
    format: "currency",
  },
  "cpm (custo por 1.000 impressões) (brl)": {
    key: "cpm",
    label: "CPM",
    icon: "TrendingDown",
    color: "#ef4444",
    category: "custo",
    avg: true,
    format: "currency",
  },
  "cpm (custo por 1.000 impressoes) (brl)": {
    key: "cpm",
    label: "CPM",
    icon: "TrendingDown",
    color: "#ef4444",
    category: "custo",
    avg: true,
    format: "currency",
  },
  "cpc (custo por clique no link)": {
    key: "cpc",
    label: "CPC - Custo Por Clique",
    icon: "TrendingDown",
    color: "#f97316",
    category: "custo",
    avg: true,
    format: "currency",
  },
  "cpc (custo por clique no link) (brl)": {
    key: "cpc",
    label: "CPC - Custo Por Clique",
    icon: "TrendingDown",
    color: "#f97316",
    category: "custo",
    avg: true,
    format: "currency",
  },
  "cpc (todos)": {
    key: "cpc_all",
    label: "CPC (Todos)",
    icon: "TrendingDown",
    color: "#f97316",
    category: "custo",
    avg: true,
    format: "currency",
  },
  "custo por clique no link único": {
    key: "cost_per_unique_link_click",
    label: "Custo por Clique Único no Link",
    icon: "TrendingDown",
    color: "#ea580c",
    category: "custo",
    avg: true,
    format: "currency",
  },
  "custo por clique no link unico": {
    key: "cost_per_unique_link_click",
    label: "Custo por Clique Único no Link",
    icon: "TrendingDown",
    color: "#ea580c",
    category: "custo",
    avg: true,
    format: "currency",
  },
  "custo por clique único (todos)": {
    key: "cost_per_unique_click_all",
    label: "Custo por Clique Único (Todos)",
    icon: "TrendingDown",
    color: "#ea580c",
    category: "custo",
    avg: true,
    format: "currency",
  },
  resultados: { key: "results", label: "Resultados", icon: "Target", color: "#22c55e", category: "conversão" },
  "custo por resultado": {
    key: "cost_per_result",
    label: "Custo por Resultado",
    icon: "Target",
    color: "#14b8a6",
    category: "conversão",
    avg: true,
    format: "currency",
  },
  "custo por resultados": {
    key: "cost_per_result",
    label: "Custo por Resultado",
    icon: "Target",
    color: "#14b8a6",
    category: "conversão",
    avg: true,
    format: "currency",
  },
  "tipo de resultado": { key: "__skip__", label: "", icon: "", color: "", category: "" },
  "conversas por mensagem iniciadas": {
    key: "messages_started",
    label: "Conversas por Mensagem",
    icon: "MessageCircle",
    color: "#25d366",
    category: "conversão",
  },
  "mensagens iniciadas por pessoas": {
    key: "messages_started",
    label: "Mensagens Iniciadas",
    icon: "MessageCircle",
    color: "#25d366",
    category: "conversão",
  },
  "custo por mensagem iniciada por pessoa": {
    key: "cost_per_message",
    label: "Custo por Mensagem",
    icon: "MessageCircle",
    color: "#16a34a",
    category: "conversão",
    avg: true,
    format: "currency",
  },
  "custo por conversa por mensagem iniciada": {
    key: "cost_per_message",
    label: "Custo por Mensagem",
    icon: "MessageCircle",
    color: "#16a34a",
    category: "conversão",
    avg: true,
    format: "currency",
  },
  "visualizações da página de destino": {
    key: "landing_page_views",
    label: "Visualizações da Página de Destino",
    icon: "Eye",
    color: "#06b6d4",
    category: "engajamento",
  },
  "custo por visualização da página de destino": {
    key: "cost_per_landing_page_view",
    label: "Custo por Visualização da Página",
    icon: "TrendingDown",
    color: "#0891b2",
    category: "custo",
    avg: true,
    format: "currency",
  },
  leads: { key: "leads", label: "Leads", icon: "Users", color: "#8b5cf6", category: "conversão" },
  "custo por lead": {
    key: "cost_per_lead",
    label: "Custo por Lead",
    icon: "TrendingDown",
    color: "#7c3aed",
    category: "conversão",
    avg: true,
    format: "currency",
  },
  compras: { key: "purchases", label: "Compras", icon: "Target", color: "#22c55e", category: "conversão" },
  "custo por compra": {
    key: "cost_per_purchase",
    label: "Custo por Compra",
    icon: "TrendingDown",
    color: "#16a34a",
    category: "conversão",
    avg: true,
    format: "currency",
  },
  "valor de conversão da compra": {
    key: "purchase_conversion_value",
    label: "Valor de Conversão da Compra",
    icon: "DollarSign",
    color: "#10b981",
    category: "conversão",
    format: "currency",
  },
  "retorno sobre o investimento em publicidade (roas) das compras": {
    key: "roas",
    label: "ROAS das Compras",
    icon: "TrendingUp",
    color: "#059669",
    category: "conversão",
    avg: true,
  },
  "adições ao carrinho": {
    key: "add_to_cart",
    label: "Adições ao Carrinho",
    icon: "Target",
    color: "#f59e0b",
    category: "conversão",
  },
  "custo por adição ao carrinho": {
    key: "cost_per_add_to_cart",
    label: "Custo por Adição ao Carrinho",
    icon: "TrendingDown",
    color: "#d97706",
    category: "conversão",
    avg: true,
    format: "currency",
  },
  "finalizações de compra iniciadas": {
    key: "checkouts_initiated",
    label: "Finalizações de Compra Iniciadas",
    icon: "Target",
    color: "#ea580c",
    category: "conversão",
  },
  "custo por finalização de compra iniciada": {
    key: "cost_per_checkout",
    label: "Custo por Finalização de Compra",
    icon: "TrendingDown",
    color: "#c2410c",
    category: "conversão",
    avg: true,
    format: "currency",
  },
  "registros concluídos": {
    key: "registrations",
    label: "Registros Concluídos",
    icon: "Users",
    color: "#7c3aed",
    category: "conversão",
  },
  "custo por registro concluído": {
    key: "cost_per_registration",
    label: "Custo por Registro",
    icon: "TrendingDown",
    color: "#6d28d9",
    category: "conversão",
    avg: true,
    format: "currency",
  },
  "engajamento com a página": {
    key: "page_engagement",
    label: "Engajamento com a Página",
    icon: "MousePointer",
    color: "#ec4899",
    category: "engajamento",
  },
  "engajamentos com o post": {
    key: "post_engagement",
    label: "Engajamentos com o Post",
    icon: "MousePointer",
    color: "#db2777",
    category: "engajamento",
  },
  "curtidas do facebook": {
    key: "facebook_likes",
    label: "Curtidas do Facebook",
    icon: "Users",
    color: "#3b82f6",
    category: "engajamento",
  },
  "seguidores no instagram": {
    key: "instagram_followers",
    label: "Seguidores no Instagram",
    icon: "Users",
    color: "#e11d48",
    category: "engajamento",
  },
  "comentários no post": {
    key: "post_comments",
    label: "Comentários no Post",
    icon: "MessageCircle",
    color: "#f472b6",
    category: "engajamento",
  },
  "comentarios no post": {
    key: "post_comments",
    label: "Comentários no Post",
    icon: "MessageCircle",
    color: "#f472b6",
    category: "engajamento",
  },
  "compartilhamentos do post": {
    key: "post_shares",
    label: "Compartilhamentos do Post",
    icon: "Users",
    color: "#06b6d4",
    category: "engajamento",
  },
  "salvamentos do post": {
    key: "post_saves",
    label: "Salvamentos do Post",
    icon: "Target",
    color: "#14b8a6",
    category: "engajamento",
  },
  "reações ao post": {
    key: "post_reactions",
    label: "Reações ao Post",
    icon: "Users",
    color: "#f59e0b",
    category: "engajamento",
  },
  "reproduções do vídeo contínuas por no mínimo 2 segundos": {
    key: "video_plays_2s",
    label: "Reproduções de Vídeo (2s)",
    icon: "Eye",
    color: "#7c3aed",
    category: "engajamento",
  },
  "reproduções do vídeo por no mínimo 3 segundos": {
    key: "video_plays_3s",
    label: "Reproduções de Vídeo (3s)",
    icon: "Eye",
    color: "#6d28d9",
    category: "engajamento",
  },
  thruplays: { key: "thruplays", label: "ThruPlays", icon: "Eye", color: "#5b21b6", category: "engajamento" },
  "custo por thruplay": {
    key: "cost_per_thruplay",
    label: "Custo por ThruPlay",
    icon: "TrendingDown",
    color: "#4c1d95",
    category: "custo",
    avg: true,
    format: "currency",
  },
  "índice de resultados": {
    key: "result_rate",
    label: "Índice de Resultados",
    icon: "Target",
    color: "#059669",
    category: "conversão",
    avg: true,
    format: "percent",
  },
  "indice de resultados": {
    key: "result_rate",
    label: "Índice de Resultados",
    icon: "Target",
    color: "#059669",
    category: "conversão",
    avg: true,
    format: "percent",
  },
  "visualizações do conteúdo": {
    key: "content_views",
    label: "Visualizações do Conteúdo",
    icon: "Eye",
    color: "#0ea5e9",
    category: "engajamento",
  },
  "custo por visualização de conteúdo": {
    key: "cost_per_content_view",
    label: "Custo por Visualização de Conteúdo",
    icon: "TrendingDown",
    color: "#0284c7",
    category: "custo",
    avg: true,
    format: "currency",
  },
  "instalações do app": {
    key: "app_installs",
    label: "Instalações do App",
    icon: "Target",
    color: "#2563eb",
    category: "conversão",
  },
  "custo por instalação de app": {
    key: "cost_per_app_install",
    label: "Custo por Instalação de App",
    icon: "TrendingDown",
    color: "#1d4ed8",
    category: "conversão",
    avg: true,
    format: "currency",
  },
  "cliques de saída": {
    key: "outbound_clicks",
    label: "Cliques de Saída",
    icon: "MousePointer",
    color: "#0ea5e9",
    category: "engajamento",
  },
  "cliques de saída únicos": {
    key: "unique_outbound_clicks",
    label: "Pessoas que Clicou no Anúncio",
    icon: "MousePointer",
    color: "#0284c7",
    category: "engajamento",
  },
  "custo por clique de saída": {
    key: "cost_per_outbound_click",
    label: "Custo por Clique de Saída",
    icon: "TrendingDown",
    color: "#0369a1",
    category: "custo",
    avg: true,
    format: "currency",
  },
  "ctr de saída": {
    key: "outbound_ctr",
    label: "CTR de Saída",
    icon: "MousePointer",
    color: "#7c3aed",
    category: "engajamento",
    avg: true,
    format: "percent",
  },
  "novos contatos de mensagem": {
    key: "new_message_contacts",
    label: "Novos Contatos de Mensagem",
    icon: "MessageCircle",
    color: "#25d366",
    category: "conversão",
  },
  "custo por novo contato por mensagem": {
    key: "cost_per_new_message_contact",
    label: "Custo por Novo Contato",
    icon: "TrendingDown",
    color: "#16a34a",
    category: "conversão",
    avg: true,
    format: "currency",
  },
  "valor dos resultados": {
    key: "result_value",
    label: "Valor dos Resultados",
    icon: "DollarSign",
    color: "#059669",
    category: "conversão",
    format: "currency",
  },
  "roas de resultados": {
    key: "result_roas",
    label: "ROAS de Resultados",
    icon: "TrendingUp",
    color: "#047857",
    category: "conversão",
    avg: true,
  },
  "custo por 1.000 contas da central de contas alcançadas": {
    key: "cost_per_1k_accounts_reached",
    label: "Custo por 1.000 Contas Alcançadas",
    icon: "TrendingDown",
    color: "#dc2626",
    category: "custo",
    avg: true,
    format: "currency",
  },
  "valor médio de conversão de compra": {
    key: "avg_purchase_value",
    label: "Valor Médio de Compra",
    icon: "DollarSign",
    color: "#059669",
    category: "conversão",
    avg: true,
    format: "currency",
  },
  // Additional Meta Ads columns
  "criativo %": {
    key: "creative_pct",
    label: "Criativo %",
    icon: "BarChart2",
    color: "#a855f7",
    category: "engajamento",
    avg: true,
    format: "percent",
  },
  "viu anúncio e chamou no whatsapp": {
    key: "saw_ad_whatsapp",
    label: "Viu Anúncio e Chamou no WhatsApp",
    icon: "MessageCircle",
    color: "#25d366",
    category: "conversão",
  },
  "viu anuncio e chamou no whatsapp": {
    key: "saw_ad_whatsapp",
    label: "Viu Anúncio e Chamou no WhatsApp",
    icon: "MessageCircle",
    color: "#25d366",
    category: "conversão",
  },
  // WhatsApp strategy columns
  "qualidade do criativo | ctr": {
    key: "creative_quality_ctr",
    label: "Qualidade do Criativo | CTR",
    icon: "BarChart2",
    color: "#8b5cf6",
    category: "engajamento",
    avg: true,
    format: "percent",
  },
  "aproveitamento de conversas": {
    key: "conversation_rate",
    label: "Aproveitamento de Conversas",
    icon: "MessageCircle",
    color: "#10b981",
    category: "conversão",
    avg: true,
    format: "percent",
  },
  "ctr de saída único": {
    key: "outbound_ctr_unique",
    label: "CTR de Saída Único",
    icon: "MousePointer",
    color: "#6366f1",
    category: "engajamento",
    avg: true,
    format: "percent",
  },
  "ctr de saida unico": {
    key: "outbound_ctr_unique",
    label: "CTR de Saída Único",
    icon: "MousePointer",
    color: "#6366f1",
    category: "engajamento",
    avg: true,
    format: "percent",
  },
  "visitas ao perfil do instagram": {
    key: "instagram_profile_visits",
    label: "Visitas ao Perfil do Instagram",
    icon: "Eye",
    color: "#e11d48",
    category: "engajamento",
  },
  "qualidade do perfil instagram": {
    key: "instagram_profile_quality",
    label: "Qualidade do Perfil Instagram",
    icon: "BarChart2",
    color: "#ec4899",
    category: "engajamento",
    avg: true,
    format: "percent",
  },
  orçamento: {
    key: "budget",
    label: "Orçamento",
    icon: "DollarSign",
    color: "#10b981",
    category: "custo",
    format: "currency",
  },
  orcamento: {
    key: "budget",
    label: "Orçamento",
    icon: "DollarSign",
    color: "#10b981",
    category: "custo",
    format: "currency",
  },
  "cpc (todos) (brl)": {
    key: "cpc_all",
    label: "CPC (Todos)",
    icon: "TrendingDown",
    color: "#f97316",
    category: "custo",
    avg: true,
    format: "currency",
  },
  "custo por resultado (brl)": {
    key: "cost_per_result",
    label: "Custo por Resultado",
    icon: "Target",
    color: "#14b8a6",
    category: "conversão",
    avg: true,
    format: "currency",
  },
  "custo por conversa por mensagem iniciada (brl)": {
    key: "cost_per_message",
    label: "Custo por Mensagem",
    icon: "MessageCircle",
    color: "#16a34a",
    category: "conversão",
    avg: true,
    format: "currency",
  },
};

/** Canonical label overrides by metric_key — always use these instead of stored labels */
const CANONICAL_LABELS: Record<string, string> = {};
// Build from KNOWN_COLUMNS (first occurrence wins)
(function buildCanonicalLabels() {
  const seen = new Set<string>();
  for (const col of Object.values(KNOWN_COLUMNS)) {
    if (col.key === "__skip__" || seen.has(col.key)) continue;
    seen.add(col.key);
    CANONICAL_LABELS[col.key] = col.label;
  }
})();

/** Returns the canonical display label for a metric key, falling back to the provided label */
export function getCanonicalLabel(metricKey: string, fallback?: string): string {
  return CANONICAL_LABELS[metricKey] || fallback || metricKey;
}

/** Returns deduplicated list of all known metric definitions (unique by key) */
export function getAllKnownMetrics(): { key: string; label: string; icon: string; color: string; category: string }[] {
  const seen = new Set<string>();
  const result: { key: string; label: string; icon: string; color: string; category: string }[] = [];
  for (const col of Object.values(KNOWN_COLUMNS)) {
    if (col.key === "__skip__" || seen.has(col.key)) continue;
    seen.add(col.key);
    result.push({ key: col.key, label: col.label, icon: col.icon, color: col.color, category: col.category });
  }
  return result;
}

const FALLBACK_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
  "#14b8a6",
  "#e11d48",
  "#a855f7",
  "#0ea5e9",
  "#d946ef",
];

// Columns that are metadata/config — skip
const SKIP_COLUMNS = new Set([
  "nome da campanha",
  "nome do conjunto de anúncios",
  "nome do anúncio",
  "nome do conjunto de anuncios",
  "nome do anuncio",
  "identificação da campanha",
  "identificação do conjunto de anúncios",
  "identificação do anúncio",
  "identificação da conta",
  "nome da conta",
  "veiculação",
  "objetivo",
  "início dos relatórios",
  "término dos relatórios",
  "encerramento dos relatórios",
  "configuração de atribuição",
  "inicio dos relatórios",
  "inicio dos relatorios",
  "término dos relatorios",
  "termino dos relatorios",
  "encerramento dos relatorios",
  "encerramento dos relatórios",
  "meta de desempenho",
  "tipo de compra",
  "lance",
  "programação",
  "corpo (configurações do anúncio)",
  "link de prévia",
  "link (configurações do anúncio)",
  "moeda",
  "fuso horário",
  "identificação da página",
  "descrição",
  "título (configurações do anúncio)",
  "url do site",
  "chamada para ação",
  "hash da imagem",
  "identificação do vídeo",
  "nome da imagem",
  "nome do vídeo",
  "parâmetros de url",
  "públicos personalizados incluídos",
  "públicos personalizados excluídos",
  "orçamento do conjunto de anúncios",
  "orçamento da campanha",
  "veiculação do anúncio",
  "veiculação do conjunto de anúncios",
  "veiculação da campanha",
  "classificação de qualidade",
  "classificação da taxa de engajamento",
  "classificação da taxa de conversão",
  "ad name",
  "link de prévia",
  "status de veiculação",
  "status de veiculacao",
  "nível de veiculação",
  "nivel de veiculacao",
  "tipo de resultado",
  "indicador de resultados",
  "indicador de resultado",
  "início dos relatórios",
  "termino dos relatórios",
  "início dos relatorios",
  "término dos relatorios",
  "termino dos relatorios",
  "classificacao de qualidade",
  "classificacao da taxa de engajamento",
  "classificacao da taxa de conversao",
  "inicio dos relatorios",
  "termino dos relatorios",
  "tipo de orçamento do conjunto de anúncios",
  "tipo de orcamento do conjunto de anuncios",
  "tipo de orçamento da campanha",
  "tipo de orcamento da campanha",
  "conjunto de anúncios",
  "conjunto de anuncios",
  "veiculação",
  "veiculacao",
]);

function isLikelyAverage(key: string, label: string): boolean {
  const lowerLabel = label.toLowerCase();
  return (
    lowerLabel.includes("ctr") ||
    lowerLabel.includes("cpc") ||
    lowerLabel.includes("cpm") ||
    lowerLabel.includes("custo por") ||
    lowerLabel.includes("frequência") ||
    lowerLabel.includes("frequencia") ||
    lowerLabel.includes("taxa") ||
    lowerLabel.includes("roas") ||
    lowerLabel.includes("índice") ||
    lowerLabel.includes("indice") ||
    lowerLabel.includes("roi") ||
    lowerLabel.includes("aproveitamento") ||
    lowerLabel.includes("conversão da página") ||
    lowerLabel.includes("%")
  );
}

function isLikelyCurrency(label: string): boolean {
  const lower = label.toLowerCase();
  return (
    lower.includes("valor") ||
    lower.includes("custo") ||
    lower.includes("gast") ||
    lower.includes("cpm") ||
    lower.includes("cpc") ||
    lower.includes("roi em r$") ||
    lower.includes("(brl)")
  );
}

function isLikelyPercent(label: string): boolean {
  const lower = label.toLowerCase();
  return lower.includes("ctr") || lower.includes("taxa") || lower.includes("%");
}

function guessCategory(label: string): string {
  const lower = label.toLowerCase();
  if (
    lower.includes("custo") ||
    lower.includes("cpm") ||
    lower.includes("cpc") ||
    lower.includes("valor usado") ||
    lower.includes("valor gasto") ||

    lower.includes("gast")
  )
    return "custo";
  if (
    lower.includes("alcance") ||
    lower.includes("impressõ") ||
    lower.includes("impressoe") ||
    lower.includes("frequên") ||
    lower.includes("frequen")
  )
    return "alcance";
  if (
    lower.includes("ctr") ||
    lower.includes("clique") ||
    lower.includes("engaj") ||
    lower.includes("curtid") ||
    lower.includes("seguido") ||
    lower.includes("reproduç") ||
    lower.includes("thruplay") ||
    lower.includes("visualiz")
  )
    return "engajamento";
  if (
    lower.includes("resultado") ||
    lower.includes("conversã") ||
    lower.includes("lead") ||
    lower.includes("compra") ||
    lower.includes("mensag") ||
    lower.includes("registro") ||
    lower.includes("carrinho") ||
    lower.includes("checkout") ||
    lower.includes("roas")
  )
    return "conversão";
  return "outros";
}

function guessIcon(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes("mensag") || lower.includes("conversa")) return "MessageCircle";
  if (lower.includes("clique") || lower.includes("ctr")) return "MousePointer";
  if (
    lower.includes("alcance") ||
    lower.includes("impressõ") ||
    lower.includes("impressoe") ||
    lower.includes("visualiz") ||
    lower.includes("reproduç") ||
    lower.includes("thruplay")
  )
    return "Eye";
  if (
    lower.includes("custo") ||
    lower.includes("valor") ||
    lower.includes("gast") ||
    lower.includes("cpm") ||
    lower.includes("cpc")
  )
    return "DollarSign";
  if (
    lower.includes("resultado") ||
    lower.includes("lead") ||
    lower.includes("compra") ||
    lower.includes("registro") ||
    lower.includes("carrinho")
  )
    return "Target";
  if (lower.includes("roas") || lower.includes("cresci") || lower.includes("roi")) return "TrendingUp";
  if (lower.includes("frequên") || lower.includes("frequen")) return "BarChart2";
  if (lower.includes("seguido") || lower.includes("curtid") || lower.includes("engaj")) return "Users";
  return "BarChart2";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseNumericValue(value: any): number | null {
  if (typeof value === "number") return isNaN(value) ? null : value;
  if (value == null || value === "" || value === "—" || value === "-" || value === "–") return null;
  const str = String(value).trim();
  if (!str) return null;
  // Handle "R$ 324,45" or "324.45" or "1.234,56" or "2,35%"
  const cleaned = str
    .replace(/^R\$\s*/, "") // Remove "R$ " prefix
    .replace(/[€$]/g, "") // Remove other currency symbols
    .replace(/%$/, "") // Remove trailing %
    .trim();
  if (!cleaned) return null;

  // Detect Brazilian number format: "1.234,56" vs standard "1,234.56"
  // If has both . and , check which comes last to determine format
  if (cleaned.includes(",") && cleaned.includes(".")) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastComma > lastDot) {
      // Brazilian: 1.234,56 → remove dots, replace comma with dot
      const num = parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
      return isNaN(num) ? null : num;
    } else {
      // Standard: 1,234.56 → remove commas
      const num = parseFloat(cleaned.replace(/,/g, ""));
      return isNaN(num) ? null : num;
    }
  } else if (cleaned.includes(",")) {
    // Only comma: could be "3,45" (decimal) or "1,234" (thousands)
    const parts = cleaned.split(",");
    if (parts.length === 2) {
      // If the part after comma has 1-2 digits, OR the part before comma has no dots
      // and the part after comma could be decimal digits, treat as decimal separator
      // Brazilian format: comma = decimal separator
      const afterComma = parts[1];
      if (afterComma.length <= 2 || !parts[0].includes(".")) {
        const num = parseFloat(cleaned.replace(",", "."));
        return isNaN(num) ? null : num;
      }
    }
    // Multiple commas = thousands separator
    const num = parseFloat(cleaned.replace(/,/g, ""));
    return isNaN(num) ? null : num;
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Detect if a header is an auto-generated empty header from SheetJS (__EMPTY, __EMPTY_1, etc.)
 */
function isEmptyHeader(header: string): boolean {
  return /^__EMPTY(_\d+)?$/.test(header) || header.trim() === "";
}

/**
 * Try to find the real header row in the sheet.
 * SheetJS creates __EMPTY headers when the first row isn't the real header.
 * We scan the first 10 rows to find one with mostly text values.
 */
function findHeaderRow(sheet: XLSX.WorkSheet): number {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  const maxScanRows = Math.min(range.e.r, 15);

  let bestRow = 0;
  let bestScore = 0;

  for (let r = 0; r <= maxScanRows; r++) {
    let textCells = 0;
    let totalCells = 0;
    let hasKnownColumn = false;

    for (let c = range.s.c; c <= Math.min(range.e.c, 30); c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell) {
        totalCells++;
        if (cell.t === "s" && cell.v && String(cell.v).trim().length > 1) {
          textCells++;
          // Check if this cell value matches a known Meta Ads column
          const normalized = String(cell.v)
            .toLowerCase()
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          if (
            KNOWN_COLUMNS[String(cell.v).toLowerCase().trim()] ||
            SKIP_COLUMNS.has(String(cell.v).toLowerCase().trim()) ||
            normalized.includes("campanha") ||
            normalized.includes("alcance") ||
            normalized.includes("resultado") ||
            normalized.includes("valor usado") ||
            normalized.includes("valor gasto") ||

            normalized.includes("impresso") ||
            normalized.includes("clique")
          ) {
            hasKnownColumn = true;
          }
        }
      }
    }

    // A good header row has mostly text cells and ideally recognized columns
    const score = totalCells > 0 ? textCells / totalCells + (hasKnownColumn ? 1 : 0) : 0;
    if (score > bestScore && textCells >= 3) {
      bestScore = score;
      bestRow = r;
    }
  }

  return bestRow;
}

/**
 * Normalize header: strip accents, lowercase, trim
 */
function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, "") // strip BOM
    .replace(/^"|"$/g, "") // strip surrounding quotes
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export interface DailySnapshot {
  period_start: string;
  period_end: string;
  campaign_name?: string | null;
  metrics: MetaAdsMetric[];
}

export interface ParseResult {
  metrics: MetaAdsMetric[];
  missingColumns: string[];
  rawData: Record<string, any>[];
  dailySnapshots: DailySnapshot[];
  detectedPeriodStart?: string;
  detectedPeriodEnd?: string;
}

/** Normalize for fuzzy matching: strip accents, quotes, BOM, lowercase */
function normFuzzy(s: string): string {
  return s
    .replace(/^\uFEFF/, "")
    .replace(/["']/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const DATE_START_KEYWORDS = [
  "inicio dos relatorios",
  "data de inicio",
  "reporting starts",
  "date_start",
  "reporting_start",
  "data inicio",
];
const DATE_END_KEYWORDS = [
  "termino dos relatorios",
  "encerramento dos relatorios",
  "data de termino",
  "reporting ends",
  "date_stop",
  "reporting_end",
  "data termino",
  "data fim",
];

const CAMPAIGN_KEYWORDS = ["nome da campanha", "campanha", "campaign name", "campaign_name", "campaign"];

function findCampaignColumn(headers: string[]): string | null {
  return (
    headers.find((h) => CAMPAIGN_KEYWORDS.some((k) => normFuzzy(h) === k)) ||
    headers.find((h) => CAMPAIGN_KEYWORDS.some((k) => normFuzzy(h).includes(k))) ||
    null
  );
}

function getCampaignName(row: Record<string, any>, campaignCol: string | null): string | null {
  if (!campaignCol) return null;
  const value = row[campaignCol];
  if (value == null) return null;
  const name = String(value).trim();
  return name.length > 0 ? name : null;
}

function findDateColumns(headers: string[]): { startCol: string | null; endCol: string | null } {
  let startCol: string | null = null;
  let endCol: string | null = null;
  for (const h of headers) {
    const n = normFuzzy(h);
    if (!startCol && DATE_START_KEYWORDS.some((k) => n === k || n.includes(k))) startCol = h;
    if (!endCol && DATE_END_KEYWORDS.some((k) => n === k || n.includes(k))) endCol = h;
  }
  return { startCol, endCol };
}

function findLikelySingleDateColumn(headers: string[], rows: Record<string, any>[]): string | null {
  const sampleRows = rows.slice(0, 25);
  let bestHeader: string | null = null;
  let bestScore = 0;

  for (const header of headers) {
    let nonEmptyCount = 0;
    let validDateCount = 0;

    for (const row of sampleRows) {
      const value = row[header];
      if (value == null || value === "") continue;
      nonEmptyCount += 1;
      if (normalizeDate(value)) validDateCount += 1;
    }

    if (nonEmptyCount === 0 || validDateCount < 2) continue;

    const keywordBoost = /(\bdata\b|\bdia\b|\bdate\b)/i.test(normFuzzy(header)) ? 0.25 : 0;
    const score = validDateCount / nonEmptyCount + keywordBoost;

    if (score > bestScore) {
      bestScore = score;
      bestHeader = header;
    }
  }

  return bestScore >= 0.6 ? bestHeader : null;
}

function isSummaryLikeRow(row: Record<string, any>): boolean {
  return Object.values(row).some((value) => {
    if (typeof value !== "string") return false;
    const normalized = normFuzzy(value);
    return (
      /^resultados de\b/.test(normalized) ||
      /^total\b/.test(normalized) ||
      /^totais\b/.test(normalized) ||
      /^resumo\b/.test(normalized)
    );
  });
}

function normalizeDate(val: any): string | null {
  if (!val) return null;
  // If it's a Date object (XLSX often converts date strings to Date)
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim();
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  // XLSX serial number (number)
  if (typeof val === "number" && val > 30000 && val < 60000) {
    const epoch = new Date((val - 25569) * 86400000);
    if (!isNaN(epoch.getTime())) {
      const y = epoch.getUTCFullYear();
      const m = String(epoch.getUTCMonth() + 1).padStart(2, "0");
      const d = String(epoch.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  return null;
}

function isValidDate(str: string): boolean {
  if (!str || typeof str !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(str.trim());
}

function aggregateRowsToMetrics(rows: Record<string, any>[], allHeaders: string[]): MetaAdsMetric[] {
  const aggregated: Record<string, { sum: number; count: number; label: string }> = {};

  // Pre-calculate header mappings for specialized logic
  const findHeader = (keywords: string[]) => {
    return allHeaders.find((h) => {
      const n = normalizeHeader(h);
      return keywords.some((k) => n === k || n.includes(k));
    });
  };

  const resultsH = findHeader(["resultados"]);
  const indicatorH = findHeader(["indicador de resultados", "indicador de resultado", "tipo de resultado"]);
  const whatsappH = findHeader(["conversas por mensagem iniciadas", "mensagens iniciadas por pessoas"]);
  const costMsgH = findHeader(["custo por conversa por mensagem iniciada", "custo por mensagem iniciada"]);
  const profileVisH = findHeader(["visitas ao perfil do instagram", "instagram_profile_visits", "profile_visits"]);
  const followersH = findHeader(["seguidores no instagram"]);
  const convRateH = findHeader(["aproveitamento de conversas", "taxa de conversas"]);
  const leadsH = findHeader(["leads"]);
  const costLeadH = findHeader(["custo por lead"]);
  const purchasesH = findHeader(["compras"]);
  const costPurchH = findHeader(["custo por compra"]);
  const postCommentH = findHeader(["comentarios no post", "comentários no post"]);

  // ─── INDICATOR → METRIC ROUTING MAP ──────────────────────────────────────
  // Maps substrings found in "Indicador de resultados" to which metric key
  // the "Resultados" column value should be routed to.
  // Add new campaign types here as needed — no other code changes required.
  const INDICATOR_RESULT_ROUTING: Array<{
    match: (ind: string) => boolean;
    resultKey: string; // metric_key to accumulate Results value into
    resultLabel: string;
    dedicatedH: string | undefined; // preferred dedicated column (overrides Results)
    extraKeys?: Array<{
      // additional metrics only valid for this indicator type
      header: string | undefined;
      key: string;
      label: string;
    }>;
  }> = [
    {
      // WhatsApp: "actions:onsite_conversion.messaging_conversation_started_7d"
      match: (ind) => ind.includes("messaging_conversation") || ind.includes("whatsapp") || ind.includes("mensagens"),
      resultKey: "messages_started",
      resultLabel: "Conversas por Mensagem",
      dedicatedH: whatsappH,
      extraKeys: [
        { header: costMsgH, key: "cost_per_message", label: "Custo por Mensagem" },
        { header: convRateH, key: "conversation_rate", label: "Aproveitamento de Conversas" },
      ],
    },
    {
      // Instagram Traffic / Profile Visits: "total_profile_visits"
      match: (ind) =>
        ind === "total_profile_visits" ||
        ind.includes("profile_visit") ||
        ind.includes("visitas_ao_perfil") ||
        ind.includes("visitas ao perfil"),
      resultKey: "instagram_profile_visits",
      resultLabel: "Visitas ao Perfil do Instagram",
      dedicatedH: profileVisH,
    },
    {
      // Instagram Followers / Engagement: "post_engagement", "page_like", follower variants
      match: (ind) =>
        ind.includes("page_like") ||
        ind.includes("seguidor") ||
        ind.includes("follower") ||
        ind.includes("post_engagement"),
      resultKey: "instagram_followers",
      resultLabel: "Seguidores no Instagram",
      dedicatedH: followersH,
    },
    {
      // Leads / Form fills
      match: (ind) => ind.includes("lead") || ind.includes("complete_registration") || ind.includes("contact"),
      resultKey: "leads",
      resultLabel: "Leads",
      dedicatedH: leadsH,
      extraKeys: [{ header: costLeadH, key: "cost_per_lead", label: "Custo por Lead" }],
    },
    {
      // Purchases / Sales / E-commerce
      match: (ind) =>
        ind.includes("purchase") || ind.includes("compra") || ind.includes("offsite_conversion.fb_pixel_purchase"),
      resultKey: "purchases",
      resultLabel: "Compras",
      dedicatedH: purchasesH,
      extraKeys: [{ header: costPurchH, key: "cost_per_purchase", label: "Custo por Compra" }],
    },
    {
      // Post comments / engagement
      match: (ind) => ind.includes("comment") || ind.includes("comentario"),
      resultKey: "post_comments",
      resultLabel: "Comentários no Post",
      dedicatedH: postCommentH,
    },
    {
      // Video views / ThruPlays
      match: (ind) => ind.includes("video_view") || ind.includes("thruplay") || ind.includes("visualizacao_de_video"),
      resultKey: "thruplays",
      resultLabel: "Visualizações de Vídeo",
      dedicatedH: undefined,
    },
    {
      // Link clicks / outbound traffic
      match: (ind) => ind.includes("link_click") || ind.includes("outbound_click"),
      resultKey: "unique_outbound_clicks",
      resultLabel: "Cliques no Link",
      dedicatedH: undefined,
    },
  ];
  // ─────────────────────────────────────────────────────────────────────────

  // Build the set of all headers that are handled by the specialized routing
  // so the generic loop below doesn't double-count them.
  // These headers are handled by the specialized routing above.
  // postCommentH and followersH are captured unconditionally (not via routing),
  // so they must still be in this set to prevent double-counting in the generic loop.
  // "Qualidade do Criativo | CTR" is NOT specialized — let the generic loop handle it.
  const specializedHeaders = new Set(
    [
      resultsH,
      indicatorH,
      whatsappH,
      costMsgH,
      profileVisH,
      followersH,
      convRateH,
      leadsH,
      costLeadH,
      purchasesH,
      costPurchH,
      postCommentH,
    ].filter(Boolean) as string[],
  );

  for (const row of rows) {
    // ── Read the indicator for this row ──────────────────────────────────
    const indicatorRaw = indicatorH ? row[indicatorH] : "";
    const indicator = String(indicatorRaw || "")
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const resultsVal = parseNumericValue(resultsH ? row[resultsH] : null);

    // ── Route "Resultados" and extra metrics via the indicator map ────────
    let routedThisRow = false;
    for (const route of INDICATOR_RESULT_ROUTING) {
      if (!route.match(indicator)) continue;
      routedThisRow = true;

      // Value: prefer the dedicated column, fall back to Resultados
      const dedicatedVal = route.dedicatedH ? parseNumericValue(row[route.dedicatedH]) : null;
      const finalVal =
        dedicatedVal !== null && dedicatedVal > 0
          ? dedicatedVal
          : resultsVal !== null && resultsVal > 0
            ? resultsVal
            : null;

      if (finalVal !== null) {
        const k = route.resultKey;
        if (!aggregated[k]) aggregated[k] = { sum: 0, count: 0, label: route.resultLabel };
        aggregated[k].sum += finalVal;
        aggregated[k].count += 1;
      }

      // Extra metrics (cost per message, cost per lead, etc.)
      // NOTE: conversation_rate is skipped here — we compute it as a true % after the loop.
      for (const extra of route.extraKeys || []) {
        if (!extra.header) continue;
        if (extra.key === "conversation_rate") continue; // handled separately below
        const val = parseNumericValue(row[extra.header]);
        if (val !== null && val > 0) {
          if (!aggregated[extra.key]) aggregated[extra.key] = { sum: 0, count: 0, label: extra.label };
          aggregated[extra.key].sum += val;
          aggregated[extra.key].count += 1;
        }
      }

      // Accumulate raw "aproveitadas" count (absolute number) for % calc after loop
      if (route.resultKey === "messages_started" && convRateH) {
        const aprovVal = parseNumericValue(row[convRateH]);
        if (aprovVal !== null && aprovVal > 0) {
          if (!aggregated["__conv_aproveitadas__"])
            aggregated["__conv_aproveitadas__"] = { sum: 0, count: 0, label: "__internal__" };
          aggregated["__conv_aproveitadas__"].sum += aprovVal;
          aggregated["__conv_aproveitadas__"].count += 1;
        }
      }

      break; // each row matches at most one route
    }

    // ── Always capture "Seguidores no Instagram" from dedicated column ────
    // Followers appear as side-effect of ANY campaign type, so capture regardless of indicator.
    if (followersH) {
      const followVal = parseNumericValue(row[followersH]);
      if (followVal !== null && followVal > 0) {
        if (!aggregated["instagram_followers"])
          aggregated["instagram_followers"] = { sum: 0, count: 0, label: "Seguidores no Instagram" };
        aggregated["instagram_followers"].sum += followVal;
        aggregated["instagram_followers"].count += 1;
      }
    }

    // ── Always capture "Comentários no Post" from dedicated column ───────
    // Comments can come from any campaign type (WhatsApp, traffic, followers).
    if (postCommentH) {
      const commentVal = parseNumericValue(row[postCommentH]);
      if (commentVal !== null && commentVal > 0) {
        if (!aggregated["post_comments"])
          aggregated["post_comments"] = { sum: 0, count: 0, label: "Comentários no Post" };
        aggregated["post_comments"].sum += commentVal;
        aggregated["post_comments"].count += 1;
      }
    }

    // If no indicator matched but dedicated columns have data, capture them directly
    // (handles rows where indicator is blank but columns still have values)
    if (!routedThisRow) {
      const pairs: Array<{ h: string | undefined; key: string; label: string }> = [
        { h: whatsappH, key: "messages_started", label: "Conversas por Mensagem" },
        { h: profileVisH, key: "instagram_profile_visits", label: "Visitas ao Perfil do Instagram" },
        { h: leadsH, key: "leads", label: "Leads" },
        { h: purchasesH, key: "purchases", label: "Compras" },
      ];
      for (const p of pairs) {
        if (!p.h) continue;
        const val = parseNumericValue(row[p.h]);
        if (val !== null && val > 0) {
          if (!aggregated[p.key]) aggregated[p.key] = { sum: 0, count: 0, label: p.label };
          aggregated[p.key].sum += val;
          aggregated[p.key].count += 1;
        }
      }
    }

    // NORMAL PROCESSING FOR THE REST
    for (const originalHeader of allHeaders) {
      // Skip specialized headers already handled
      if (specializedHeaders.has(originalHeader)) continue;

      const cleanHeader = originalHeader
        .replace(/^\uFEFF/, "")
        .replace(/^"|"$/g, "")
        .toLowerCase()
        .trim();
      const accentStripped = cleanHeader.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const withoutCurrency = accentStripped.replace(/\s*\(brl\)\s*$/, "").trim();

      if (SKIP_COLUMNS.has(cleanHeader) || SKIP_COLUMNS.has(accentStripped)) continue;
      const knownEntry = KNOWN_COLUMNS[cleanHeader] || KNOWN_COLUMNS[accentStripped] || KNOWN_COLUMNS[withoutCurrency];
      if (knownEntry && knownEntry.key === "__skip__") continue;

      const value = row[originalHeader];
      const numVal = parseNumericValue(value);
      if (numVal === null) continue;

      const aggKey = accentStripped;
      if (!aggregated[aggKey]) {
        aggregated[aggKey] = {
          sum: 0,
          count: 0,
          label: originalHeader
            .replace(/^\uFEFF/, "")
            .replace(/^"|"$/g, "")
            .trim(),
        };
      }
      aggregated[aggKey].sum += numVal;
      aggregated[aggKey].count += 1;
    }
  }

  // ── Compute conversation_rate as a true percentage (0–100, never above) ──
  // The CSV col "Aproveitamento de Conversas" can be:
  //   • A decimal fraction (0.60 = 60%) — when the Meta UI shows a %
  //   • An absolute count of approved conversations
  // Strategy: accumulate raw values; if avg raw value <= 1.0 treat as fraction,
  // otherwise treat as count and divide by messages_started.
  {
    const iniciadas = aggregated["messages_started"]?.sum ?? 0;
    const rawSum = aggregated["__conv_aproveitadas__"]?.sum ?? 0;
    const rawCount = aggregated["__conv_aproveitadas__"]?.count ?? 0;
    delete aggregated["__conv_aproveitadas__"];

    if (rawCount > 0 && (rawSum > 0 || iniciadas > 0)) {
      const avgRaw = rawSum / rawCount;
      let pct: number;
      if (avgRaw <= 1.0) {
        // Values like 0.60 → already a fraction → convert to %
        pct = avgRaw * 100;
      } else if (iniciadas > 0) {
        // Values like 2, 3 → absolute count → divide by total started
        pct = (rawSum / iniciadas) * 100;
      } else {
        pct = 0;
      }
      // Hard cap: never show more than 100%
      pct = Math.min(Math.max(pct, 0), 100);
      aggregated["conversation_rate"] = { sum: pct / 100, count: 1, label: "Aproveitamento de Conversas" };
    }
  }

  const metrics: MetaAdsMetric[] = [];
  const addedKeys = new Set<string>();
  let colorIndex = 0;

  const specializedKeys = new Set([
    "messages_started",
    "cost_per_message",
    "conversation_rate",
    "instagram_profile_visits",
    "instagram_followers",
    "leads",
    "cost_per_lead",
    "purchases",
    "cost_per_purchase",
    "post_comments",
    "thruplays",
    "unique_outbound_clicks",
  ]);

  for (const [aggKey, agg] of Object.entries(aggregated)) {
    const isSpecialized = specializedKeys.has(aggKey);
    const cleanHeader = agg.label.toLowerCase().trim();
    const stripped = cleanHeader.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const withoutCurrency = stripped.replace(/\s*\(brl\)\s*$/, "").trim();

    let known =
      KNOWN_COLUMNS[cleanHeader] || KNOWN_COLUMNS[aggKey] || KNOWN_COLUMNS[stripped] || KNOWN_COLUMNS[withoutCurrency];

    // If specialized, try to find metadata by metric key if not found by header
    if (!known && isSpecialized) {
      known = Object.values(KNOWN_COLUMNS).find((v) => v.key === aggKey);
    }

    const metricKey = isSpecialized ? aggKey : known?.key || slugify(agg.label);
    if (!metricKey || metricKey === "__skip__") continue;
    if (addedKeys.has(metricKey)) continue;
    addedKeys.add(metricKey);

    const shouldAvg = known?.avg || isLikelyAverage(metricKey, agg.label);
    let value = shouldAvg ? agg.sum / agg.count : agg.sum;

    // Percent-format columns from Meta Ads are stored as decimals (e.g. 0.003 = 0.3%).
    // Multiply by 100 so the panel receives a proper percentage number.
    // Exception: conversation_rate is already computed as a real % (0–100) — don't touch it.
    const isPercentFormat = known?.format === "percent";
    const alreadyPercent = metricKey === "conversation_rate";
    if (isPercentFormat && !alreadyPercent && value > 0 && value <= 1.0) {
      value = value * 100;
    }

    // Hard cap for specific metrics
    if (metricKey === "conversation_rate" || metricKey === "instagram_profile_quality") {
      value = Math.min(100, Math.max(0, value));
    }

    // Round to 4 decimal places to preserve small CTR/percent values (e.g. 0.2509%)
    // The panel's display layer handles the final formatting.
    const rounded = Math.round(value * 10000) / 10000;

    const fallbackColor = FALLBACK_COLORS[colorIndex % FALLBACK_COLORS.length];
    colorIndex++;

    metrics.push({
      metric_key: metricKey,
      metric_value: rounded,
      metric_label: known?.label || agg.label,
      metric_icon: known?.icon || guessIcon(agg.label),
      metric_color: known?.color || fallbackColor,
      metric_category: known?.category || guessCategory(agg.label),
    });
  }
  return metrics;
}

export function parseMetaAdsFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", codepage: 65001 });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        let rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

        if (rawData.length > 0) {
          const headers = Object.keys(rawData[0]);
          const emptyHeaderCount = headers.filter((h) => isEmptyHeader(h)).length;
          if (emptyHeaderCount > headers.length * 0.3) {
            const headerRow = findHeaderRow(sheet);
            if (headerRow > 0) {
              const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
              range.s.r = headerRow;
              sheet["!ref"] = XLSX.utils.encode_range(range);
              rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
            }
          }
        }

        if (!rawData.length) {
          reject(new Error("Planilha vazia"));
          return;
        }

        const rowsWithoutSummaries = rawData.filter((row) => !isSummaryLikeRow(row));
        const sourceRows = rowsWithoutSummaries.length > 0 ? rowsWithoutSummaries : rawData;

        // Collect all headers
        const headerSet = new Set<string>();
        for (const row of sourceRows) {
          for (const key of Object.keys(row)) {
            if (!isEmptyHeader(key)) headerSet.add(key);
          }
        }
        const allHeaders = Array.from(headerSet);
        const campaignCol = findCampaignColumn(allHeaders);

        // Check for date columns to build daily snapshots
        const { startCol, endCol } = findDateColumns(allHeaders);
        const singleDateCol = !startCol || !endCol ? findLikelySingleDateColumn(allHeaders, sourceRows) : null;
        const dailySnapshots: DailySnapshot[] = [];
        let detectedPeriodStart: string | undefined;
        let detectedPeriodEnd: string | undefined;

        console.log("📅 Date columns found:", {
          startCol,
          endCol,
          singleDateCol,
          sampleRawStart: sourceRows[0]?.[startCol!],
          sampleRawEnd: sourceRows[0]?.[endCol!],
          typeStart: typeof sourceRows[0]?.[startCol!],
        });
        if (startCol && endCol) {
          // Group rows by date and campaign (period_start + period_end + campaign)
          const dateGroups: Record<string, Record<string, any>[]> = {};
          const groupCampaigns: Record<string, string | null> = {};
          const allDates: string[] = [];

          for (const row of sourceRows) {
            const ds = normalizeDate(row[startCol]);
            const de = normalizeDate(row[endCol]);
            if (ds && de) {
              allDates.push(ds, de);
              // Daily rows: start == end (single day)
              if (ds === de) {
                const rowCampaign = getCampaignName(row, campaignCol);
                const key = `${ds}__${rowCampaign || ""}`;
                if (!dateGroups[key]) dateGroups[key] = [];
                groupCampaigns[key] = rowCampaign;
                dateGroups[key].push(row);
              }
            }
          }

          // Detect period range
          if (allDates.length > 0) {
            allDates.sort();
            detectedPeriodStart = allDates[0];
            detectedPeriodEnd = allDates[allDates.length - 1];
          }

          // Build daily snapshots from grouped rows — include ALL days, even zero-value ones
          const sortedDates = Object.keys(dateGroups).sort();
          for (const groupKey of sortedDates) {
            const [date] = groupKey.split("__");
            const dayMetrics = restrictToApprovedReportMetrics(
              aggregateRowsToMetrics(dateGroups[groupKey], allHeaders),
            );
            dailySnapshots.push({
              period_start: date,
              period_end: date,
              campaign_name: groupCampaigns[groupKey],
              metrics: dayMetrics,
            });
          }
        } else if (singleDateCol) {
          const dateGroups: Record<string, Record<string, any>[]> = {};
          const groupCampaigns: Record<string, string | null> = {};
          const allDates: string[] = [];

          for (const row of sourceRows) {
            const date = normalizeDate(row[singleDateCol]);
            if (!date) continue;
            allDates.push(date);
            const rowCampaign = getCampaignName(row, campaignCol);
            const key = `${date}__${rowCampaign || ""}`;
            if (!dateGroups[key]) dateGroups[key] = [];
            groupCampaigns[key] = rowCampaign;
            dateGroups[key].push(row);
          }

          if (allDates.length > 0) {
            allDates.sort();
            detectedPeriodStart = allDates[0];
            detectedPeriodEnd = allDates[allDates.length - 1];
          }

          const sortedDates = Object.keys(dateGroups).sort();
          for (const groupKey of sortedDates) {
            const [date] = groupKey.split("__");
            const dayMetrics = restrictToApprovedReportMetrics(
              aggregateRowsToMetrics(dateGroups[groupKey], allHeaders),
            );
            dailySnapshots.push({
              period_start: date,
              period_end: date,
              campaign_name: groupCampaigns[groupKey],
              metrics: dayMetrics,
            });
          }
        }

        // Build overall aggregated metrics (all rows, same as before)
        // Filter out summary rows if we have daily data - use only daily rows for aggregation
        let rowsForAggregation = sourceRows;
        if (startCol && endCol && dailySnapshots.length > 0) {
          // Use only single-day rows for total aggregation to avoid double-counting
          // We include rows where start === end AND the date is valid
          rowsForAggregation = sourceRows.filter((row) => {
            const ds = normalizeDate(row[startCol]);
            const de = normalizeDate(row[endCol]);
            return ds && de && ds === de;
          });
          // If no single-day rows (e.g. summary-only file), fall back to all rows
          if (rowsForAggregation.length === 0) rowsForAggregation = sourceRows;
        } else if (singleDateCol && dailySnapshots.length > 0) {
          rowsForAggregation = sourceRows.filter((row) => !!normalizeDate(row[singleDateCol]));
          if (rowsForAggregation.length === 0) rowsForAggregation = sourceRows;
        } else {
          // If no date columns found, we use all source rows
          rowsForAggregation = sourceRows;
        }

        const metrics = restrictToApprovedReportMetrics(aggregateRowsToMetrics(rowsForAggregation, allHeaders));

        resolve({
          metrics,
          missingColumns: [],
          rawData: sourceRows,
          dailySnapshots,
          detectedPeriodStart,
          detectedPeriodEnd,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsArrayBuffer(file);
  });
}

export function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR");
}

export function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercent(value: number): string {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

// Metrics stored as decimals (0.74 = 74%) that need ×100 for display
const DECIMAL_TO_PERCENT_KEYS = new Set([
  "conversation_rate",
  "creative_quality_ctr",
  "instagram_profile_quality",
  "creative_pct",
]);

export function formatMetricValue(key: string, label: string, value: number): string {
  const lowerLabel = (label || "").toLowerCase();
  const lowerKey = (key || "").toLowerCase();

  // Special handling for metrics that MUST be capped at 100%
  // These are often stored as decimals (0.85 = 85%) or as percentages (85)
  const isProfileQuality = lowerKey.includes("instagram_profile_quality") || lowerLabel.includes("qualidade do perfil");
  const isConvRate = lowerKey.includes("conversation_rate") || lowerLabel.includes("aproveitamento");

  if (DECIMAL_TO_PERCENT_KEYS.has(key) || isProfileQuality || isConvRate) {
    // If it's a decimal <= 1, it's likely a multiplier (e.g. 0.85 -> 85%)
    // If it's > 1, it might already be a percentage value (e.g. 325 -> 325%)
    let raw = value <= 1.0 && value > 0 ? value * 100 : value;
    const capped = Math.min(100, Math.max(0, raw));
    
    // For these specific metrics, use formatPercent which gives the "XX,XX%" format
    return formatPercent(capped);
  }

  if (isLikelyCurrency(lowerLabel)) return formatCurrency(value);
  if (isLikelyPercent(lowerLabel)) return formatPercent(value);
  return formatNumber(value);
}

const METRIC_DESCRIPTIONS: Record<string, string> = {
  spend: "Valor Total investido em seus anúncios",
  reach: "O Número de Pessoas que visualizou seus anúncios",
  impressions: "Número total de vezes que seus anúncios foram exibidos",
  link_clicks: "Pessoas que clicaram no link do anúncio",
  unique_link_clicks: "Pessoas únicas que clicaram no link",
  clicks_all: "Total de cliques em qualquer parte do anúncio",
  unique_clicks_all: "Pessoas únicas que clicaram no anúncio",
  ctr: "Percentual de pessoas que clicaram ao ver o anúncio",
  ctr_unique: "CTR considerando apenas cliques únicos",
  ctr_all: "Taxa de cliques considerando todos os cliques",
  cpc: "Quanto custou cada clique no link do anúncio",
  cpc_all: "Custo médio de cada clique no anúncio",
  cpm: "Custo para exibir seu anúncio 1.000 vezes",
  results: "Pessoas que realizaram a ação esperada",
  cost_per_result: "Quanto custou cada resultado obtido",
  messages_started: "Pessoas que iniciaram conversa pelo WhatsApp",
  cost_per_message: "Quanto custou cada mensagem recebida",
  frequency: "Média de vezes que cada pessoa viu o anúncio",
  leads: "Pessoas que demonstraram interesse no seu negócio",
  cost_per_lead: "Quanto custou cada lead gerado",
  purchases: "Número de compras realizadas",
  cost_per_purchase: "Quanto custou cada compra",
  purchase_conversion_value: "Valor total em vendas geradas pelos anúncios",
  roas: "Retorno para cada real investido em anúncios",
  landing_page_views: "Pessoas que acessaram sua página de destino",
  post_engagement: "Interações totais no post do anúncio",
  post_comments: "Comentários recebidos no post do anúncio",
  post_shares: "Compartilhamentos do post",
  video_plays_2s: "Pessoas que assistiram ao menos 2 segundos do vídeo",
  video_plays_3s: "Pessoas que assistiram ao menos 3 segundos do vídeo",
  thruplays: "Pessoas que assistiram o vídeo completo ou 15s",
  creative_quality_ctr: "Qualidade do criativo baseada na taxa de cliques",
  conversation_rate: "Percentual de conversas aproveitadas sobre o total",
  outbound_ctr_unique: "Taxa de cliques de saída únicos sobre o alcance",
  unique_outbound_clicks:
    "Cliques de saída de pessoas únicas - Número de pessoas que clicou no anúncio para ir conversar no WhatsApp",
  instagram_profile_visits: "Visitas ao perfil do Instagram geradas pelos anúncios",
  instagram_profile_quality: "Qualidade do perfil Instagram baseada em Novos Seguidores / Visitas",
  saw_ad_whatsapp: "Pessoas que viram o anúncio e chamaram no WhatsApp",
  creative_pct: "Percentual de performance do criativo",
  new_message_contacts: "Novos contatos que mandaram mensagem",
  instagram_followers: "Novos seguidores conquistados no Instagram",
  facebook_likes: "Novas curtidas na página do Facebook",
};

export function getMetricDescription(key: string): string {
  return METRIC_DESCRIPTIONS[key] || "";
}

/** Fixed color per metric key for consistent chart colors across all layouts */
const METRIC_CHART_COLORS: Record<string, string> = {
  spend: "#ef4444", // Vermelho — investimento
  instagram_profile_visits: "#E1306C", // Rosa Instagram
  instagram_followers: "#C13584", // Rosa/roxo Instagram
  instagram_profile_quality: "#833AB4",
  unique_outbound_clicks: "#60a5fa", // Azul bebê
  link_clicks: "#38bdf8", // Azul claro
  clicks_all: "#7dd3fc", // Azul mais claro
  results: "#22c55e", // Verde positivo
  messages_started: "#4ade80", // Verde claro
  cost_per_message: "#16a34a",
  cost_per_result: "#15803d",
  leads: "#34d399", // Verde médio
  purchases: "#10b981",
  reach: "#8b5cf6",
  impressions: "#a78bfa",
  cpm: "#f59e0b",
  cpc: "#fb923c",
  cpc_all: "#fdba74",
  ctr: "#c084fc",
  frequency: "#94a3b8",
  post_comments: "#3b82f6",
  post_engagement: "#6366f1",
  landing_page_views: "#06b6d4",
  conversation_rate: "#2dd4bf",
  creative_quality_ctr: "#a855f7",
};

export function getMetricChartColor(key: string, fallback?: string): string {
  return METRIC_CHART_COLORS[key] || fallback || "#22c55e";
}

/** Simple tooltip descriptions for clients — explain like to a 10-year-old */
const METRIC_SIMPLE_TOOLTIPS: Record<string, string> = {
  spend: "Quanto dinheiro foi usado para mostrar seus anúncios para as pessoas",
  reach: "Quantas pessoas diferentes viram seus anúncios na internet",
  impressions: "Quantas vezes no total seus anúncios apareceram na tela de alguém",
  link_clicks: "Quantas pessoas se interessaram e clicaram no link do seu anúncio",
  unique_link_clicks: "Quantas pessoas diferentes clicaram no link (sem contar repetidos)",
  clicks_all: "Todos os cliques no anúncio, seja no link, na foto ou no botão",
  unique_outbound_clicks: "Pessoas que clicaram para sair do anúncio e ir para seu site ou WhatsApp",
  ctr: "De cada 100 pessoas que viram o anúncio, quantas clicaram — quanto maior, melhor!",
  ctr_all: "Porcentagem de pessoas que clicaram em qualquer parte do anúncio",
  cpc: "Quanto custou cada clique no link do anúncio — quanto menor, melhor!",
  cpc_all: "Custo médio de cada clique, contando todos os tipos de clique",
  cpm: "Quanto custa para seu anúncio aparecer 1.000 vezes — como o preço de um outdoor digital",
  results: "Quantas pessoas fizeram o que a gente queria — como mandar mensagem, comprar ou preencher um formulário",
  cost_per_result: "Quanto custou para conseguir cada resultado — quanto menor, mais eficiente!",
  messages_started: "Quantas pessoas mandaram mensagem para você pelo WhatsApp por causa do anúncio",
  cost_per_message: "Quanto custou para receber cada mensagem — se esse valor cai, estamos pagando menos por contato!",
  frequency: "Em média, quantas vezes cada pessoa viu o anúncio. Se for muito alto, pode cansar o público",
  leads: "Pessoas interessadas que deixaram seus dados, como nome ou telefone",
  cost_per_lead: "Quanto custou para conseguir cada pessoa interessada",
  purchases: "Quantas vendas foram feitas por causa dos anúncios",
  cost_per_purchase: "Quanto custou para conseguir cada venda",
  landing_page_views: "Quantas pessoas chegaram até a página do seu site depois de clicar no anúncio",
  post_engagement: "Todas as interações no post: curtidas, comentários, compartilhamentos e cliques",
  post_comments: "Quantas pessoas comentaram no post do anúncio",
  post_shares: "Quantas pessoas compartilharam o post do anúncio com amigos",
  instagram_profile_visits: "Pessoas que ficaram curiosas e visitaram seu perfil do Instagram",
  instagram_followers: "Novos seguidores que você ganhou no Instagram graças aos anúncios",
  instagram_profile_quality: "Uma nota que mostra se seu perfil do Instagram está atraindo bem as pessoas",
  conversation_rate: "De todas as conversas iniciadas, quantas foram aproveitadas — como uma nota de eficiência",
  creative_quality_ctr: "Uma nota que mostra se a imagem ou vídeo do anúncio está chamando atenção das pessoas",
  outbound_ctr_unique: "Porcentagem de pessoas que viram e clicaram para sair — mostra se o anúncio convence",
  video_plays_2s: "Pessoas que assistiram pelo menos 2 segundos do seu vídeo",
  video_plays_3s: "Pessoas que assistiram pelo menos 3 segundos do seu vídeo",
  thruplays: "Pessoas que assistiram o vídeo todo ou pelo menos 15 segundos",
  roas: "Para cada R$1 investido, quanto voltou em vendas — quanto maior, melhor!",
  purchase_conversion_value: "Valor total em dinheiro que os anúncios geraram em vendas",
  saw_ad_whatsapp: "Pessoas que viram o anúncio e depois mandaram mensagem no WhatsApp",
  new_message_contacts: "Novos contatos que nunca tinham mandado mensagem antes",
  facebook_likes: "Novas curtidas que sua página do Facebook ganhou",
};

export function getMetricSimpleTooltip(key: string): string {
  return METRIC_SIMPLE_TOOLTIPS[key] || "";
}
