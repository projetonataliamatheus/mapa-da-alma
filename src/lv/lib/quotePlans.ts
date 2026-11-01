// @ts-nocheck
export type QuotePlanMetricsRow = [string, string];

export interface QuotePlanMetrics {
  trafficDailyLabel: string;
  rows: QuotePlanMetricsRow[];
}

export interface QuotePlanConfig {
  title?: string;
  total: string;
  labor: string;
  ads: string;
  items: string[];
  metrics: QuotePlanMetrics;
  hidden?: boolean;
  highlighted?: boolean;
  badge?: string;
  ctaLabel?: string;
  bestPlan?: boolean;
  bestPlanLabel?: string;
}

export const DEFAULT_PLAN_ITEMS = [
  "Criação da Ficha do Google Meu Negócio",
  "Criação dos Perfis de Anúncios (Meta Ads)",
  "Gestão e Administração das Campanhas",
  "Acompanhamento de Métricas e Relatórios",
  "Criação de Criativos para Anúncios",
  "Estratégia de Marketing para os Anúncios",
  "Acompanhamento do Perfil do Instagram",
  "Estratégia de Engajamento Instagram",
  "Estratégia de WhatsApp (Fluxo de Atendimento)",
  "Desenvolvimento de Fluxo de Atendimento WhatsApp",
  "Pós-Atendimento (Avaliações no Google)",
  "Suporte e Acompanhamento",
];

export const DEFAULT_METRIC_ROWS: QuotePlanMetricsRow[] = [
  ["Custo por Conversa (WhatsApp)", "R$ 3,00 a R$ 8,00"],
  ["Volume de Contatos/Dia", "4 a 8 pessoas"],
  ["Taxa de Conversão", "20% com atendimento ágil"],
  ["Resultados/Dia", "1 a 2 novos clientes"],
  ["Resultados/Mês", "10 a 30 novos clientes"],
];

export const DEFAULT_QUOTE_PLANS: QuotePlanConfig[] = [
  {
    title: "Opção 1",
    total: "R$ 2.000",
    labor: "R$ 1.100,00",
    ads: "R$ 900,00 (R$ 30/dia)",
    items: [...DEFAULT_PLAN_ITEMS],
    metrics: {
      trafficDailyLabel: "R$ 30/dia",
      rows: DEFAULT_METRIC_ROWS.map((row) => [...row] as QuotePlanMetricsRow),
    },
    hidden: false,
  },
  {
    title: "Opção 2",
    total: "R$ 3.000",
    labor: "R$ 1.500,00",
    ads: "R$ 1.500,00 (R$ 50/dia)",
    items: [...DEFAULT_PLAN_ITEMS],
    metrics: {
      trafficDailyLabel: "R$ 50/dia",
      rows: [
        ["Custo por Conversa (WhatsApp)", "R$ 3,00 a R$ 8,00"],
        ["Volume de Contatos/Dia", "7 a 14 pessoas"],
        ["Taxa de Conversão", "20% com atendimento ágil"],
        ["Resultados/Dia", "2 a 3 novos clientes"],
        ["Resultados/Mês", "20 a 50 novos clientes"],
      ],
    },
    hidden: false,
    highlighted: true,
    badge: "⭐ Mais Popular",
  },
  {
    title: "Opção 3",
    total: "R$ 2.800,00",
    labor: "R$ 1.300,00",
    ads: "R$ 1.500,00 (R$ 50/dia)",
    items: [...DEFAULT_PLAN_ITEMS],
    metrics: {
      trafficDailyLabel: "R$ 50/dia",
      rows: [
        ["Custo por Conversa (WhatsApp)", "R$ 3,00 a R$ 8,00"],
        ["Volume de Contatos/Dia", "8 a 15 pessoas"],
        ["Taxa de Conversão", "20% com atendimento ágil"],
        ["Resultados/Dia", "4 a 8 novos clientes"],
        ["Resultados/Mês", "25 a 60 novos clientes"],
      ],
    },
    hidden: false,
  },
];

function extractMetricRows(metrics: any): QuotePlanMetricsRow[] | undefined {
  if (Array.isArray(metrics) && metrics.length) {
    return metrics.map((row: any) => Array.isArray(row)
      ? [String(row?.[0] || ""), String(row?.[1] || "")] as QuotePlanMetricsRow
      : [String(row?.label || ""), String(row?.value || "")] as QuotePlanMetricsRow);
  }
  if (Array.isArray(metrics?.rows) && metrics.rows.length) {
    return metrics.rows.map((row: any) => [String(row?.[0] || row?.label || ""), String(row?.[1] || row?.value || "")] as QuotePlanMetricsRow);
  }
  return undefined;
}

function cloneMetrics(metrics?: any, fallback?: QuotePlanMetrics, dailyAds?: string): QuotePlanMetrics {
  const baseRows = extractMetricRows(metrics) || fallback?.rows || DEFAULT_METRIC_ROWS;

  return {
    trafficDailyLabel: metrics?.trafficDailyLabel || metrics?.dailyAds || dailyAds || fallback?.trafficDailyLabel || "R$ 30/dia",
    rows: baseRows.map((row: any) => [String(row?.[0] || ""), String(row?.[1] || "")] as QuotePlanMetricsRow),
  };
}

function normalizePlan(plan: any, index: number, fallback?: QuotePlanConfig): QuotePlanConfig {
  const hiddenValue = plan?.hidden ?? (plan?.visible === false ? true : undefined) ?? fallback?.hidden ?? false;
  return {
    title: plan?.title || plan?.name || fallback?.title || `Opção ${index + 1}`,
    total: plan?.total || fallback?.total || "",
    labor: plan?.labor || fallback?.labor || "",
    ads: plan?.ads || fallback?.ads || "",
    items: Array.isArray(plan?.items) && plan.items.length
      ? plan.items.map((item: any) => String(item))
      : fallback?.items?.map((item) => String(item)) || [...DEFAULT_PLAN_ITEMS],
    metrics: cloneMetrics(plan?.metrics, fallback?.metrics, plan?.dailyAds || plan?.trafficDailyLabel),
    hidden: Boolean(hiddenValue),
    highlighted: Boolean(plan?.highlighted ?? plan?.is_popular ?? fallback?.highlighted ?? index === 1),
    badge: plan?.badge || fallback?.badge || (index === 1 ? "⭐ Mais Popular" : undefined),
    ctaLabel: plan?.ctaLabel || plan?.cta_text || fallback?.ctaLabel,
    bestPlan: Boolean(plan?.bestPlan ?? plan?.best_plan ?? fallback?.bestPlan ?? false),
    bestPlanLabel: plan?.bestPlanLabel || plan?.best_plan_label || fallback?.bestPlanLabel,
  };
}

export type ServicePlansKey = "trafego_pago" | "sites_paginas" | "loja_virtual" | "sistemas_app";

/** Sensible starter plans for non-traffic services (edited by admin later). */
export function getDefaultPlansForService(serviceType: ServicePlansKey): QuotePlanConfig[] {
  if (serviceType === "trafego_pago") return DEFAULT_QUOTE_PLANS.map((p, i) => normalizePlan(p, i));
  if (serviceType === "sites_paginas") {
    return [
      normalizePlan({
        title: "Site À Vista",
        total: "R$ 2.500", labor: "R$ 2.500", ads: "—",
        items: ["Design personalizado (até 5 páginas)","Layout 100% responsivo","Formulário de contato","Integração com WhatsApp","SEO básico on-page","Domínio + Hospedagem (1º ano)"],
        metrics: { trafficDailyLabel: "Entrega em 15 dias", rows: [["Prazo de Entrega","10 a 15 dias úteis"],["Revisões Incluídas","2 rodadas"],["Suporte pós-entrega","30 dias"]] },
        highlighted: false,
      }, 0),
      normalizePlan({
        title: "Site Parcelado",
        total: "3x R$ 900", labor: "R$ 2.700", ads: "—",
        items: ["Tudo do plano à vista","+2 páginas extras","Blog integrado","Google Analytics + Search Console"],
        metrics: { trafficDailyLabel: "Entrega em 20 dias", rows: [["Prazo de Entrega","15 a 20 dias úteis"],["Revisões Incluídas","3 rodadas"],["Suporte pós-entrega","60 dias"]] },
        highlighted: true, badge: "⭐ Mais Popular",
      }, 1),
    ];
  }
  if (serviceType === "loja_virtual") {
    return [
      normalizePlan({
        title: "Loja Essencial",
        total: "R$ 4.500", labor: "R$ 4.500", ads: "—",
        items: ["Loja online completa (até 50 produtos)","Pagamento Pix, Boleto e Cartão","Cálculo de frete Correios","Painel administrativo","Design responsivo","SSL grátis"],
        metrics: { trafficDailyLabel: "Entrega em 30 dias", rows: [["Prazo de Entrega","25 a 30 dias úteis"],["Produtos Incluídos","Até 50"],["Suporte pós-entrega","60 dias"]] },
        highlighted: false,
      }, 0),
      normalizePlan({
        title: "Loja Completa",
        total: "R$ 6.900", labor: "R$ 6.900", ads: "—",
        items: ["Tudo do plano essencial","Produtos ilimitados","Integração ERP/Marketplaces","Cupons e promoções","Automação de e-mails","Treinamento gravado"],
        metrics: { trafficDailyLabel: "Entrega em 45 dias", rows: [["Prazo de Entrega","35 a 45 dias úteis"],["Produtos Incluídos","Ilimitados"],["Suporte pós-entrega","90 dias"]] },
        highlighted: true, badge: "⭐ Mais Popular",
      }, 1),
    ];
  }
  // sistemas_app
  return [
    normalizePlan({
      title: "Sistema Sob Medida",
      total: "A partir de R$ 8.000", labor: "R$ 8.000", ads: "—",
      items: ["Análise de requisitos","Prototipagem UI/UX","Desenvolvimento full-stack","Painel administrativo","Autenticação e permissões","Deploy em nuvem"],
      metrics: { trafficDailyLabel: "Prazo conforme escopo", rows: [["Prazo de Entrega","45 a 90 dias"],["Reuniões de Alinhamento","Semanais"],["Suporte pós-entrega","90 dias"]] },
      highlighted: true, badge: "⭐ Personalizado",
    }, 0),
  ];
}

export function extractServicePlansMap(config: any): Record<ServicePlansKey, any[]> {
  const map = (config?.plansByService && typeof config.plansByService === "object") ? config.plansByService : {};
  return {
    trafego_pago: Array.isArray(map.trafego_pago) ? map.trafego_pago : (Array.isArray(config?.plans) ? config.plans : []),
    sites_paginas: Array.isArray(map.sites_paginas) ? map.sites_paginas : [],
    loja_virtual: Array.isArray(map.loja_virtual) ? map.loja_virtual : [],
    sistemas_app: Array.isArray(map.sistemas_app) ? map.sistemas_app : [],
  };
}

export function normalizePlanDefaults(config: any, serviceType?: string): QuotePlanConfig[] {
  const svc = (serviceType as ServicePlansKey) || "trafego_pago";
  const map = extractServicePlansMap(config);
  const arr = map[svc];
  if (Array.isArray(arr) && arr.length) {
    return arr.map((plan: any, index: number) =>
      normalizePlan(plan, index, svc === "trafego_pago" ? DEFAULT_QUOTE_PLANS[index] : undefined));
  }
  if (svc === "trafego_pago") {
    const legacyPlans = [
      { total: config?.plan1_total, labor: config?.plan1_labor, ads: config?.plan1_ads },
      { total: config?.plan2_total, labor: config?.plan2_labor, ads: config?.plan2_ads },
    ];
    return DEFAULT_QUOTE_PLANS.map((fallback, index) => normalizePlan(legacyPlans[index], index, fallback));
  }
  return getDefaultPlansForService(svc);
}

export function resolveQuotePlans(quote: any, defaults?: QuotePlanConfig[]): QuotePlanConfig[] {
  const fallbackPlans = defaults?.length
    ? defaults.map((plan, index) => normalizePlan(plan, index, DEFAULT_QUOTE_PLANS[index]))
    : DEFAULT_QUOTE_PLANS.map((plan, index) => normalizePlan(plan, index));

  const explicitPlans = Array.isArray(quote?.plans_config) ? quote.plans_config : [];
  const legacyPlans = [
    { total: quote?.plan1_total, labor: quote?.plan1_labor, ads: quote?.plan1_ads, items: quote?.plan1_items },
    { total: quote?.plan2_total, labor: quote?.plan2_labor, ads: quote?.plan2_ads, items: quote?.plan2_items },
  ];

  const maxLength = Math.max(fallbackPlans.length, explicitPlans.length, legacyPlans.length);
  const hiddenIndexes = Array.isArray(quote?.hidden_plan_indexes)
    ? quote.hidden_plan_indexes.map((value: any) => Number(value)).filter((value: number) => Number.isFinite(value))
    : [];

  const bestPlanConfig = (quote?.best_plan_config && typeof quote.best_plan_config === "object") ? quote.best_plan_config : null;
  const bestIndex = bestPlanConfig && bestPlanConfig.enabled !== false && Number.isFinite(Number(bestPlanConfig.planIndex))
    ? Number(bestPlanConfig.planIndex)
    : -1;
  const bestLabelOverride = bestPlanConfig?.label;

  return Array.from({ length: maxLength }, (_, index) => {
    const sourcePlan = explicitPlans[index] || legacyPlans[index] || {};
    // CRITICAL FIX: When the quote's plans_config doesn't include metrics,
    // inherit metrics from the admin defaults (fallbackPlans), not from
    // hardcoded DEFAULT_QUOTE_PLANS — so admin edits reflect on the page.
    const sourceWithFallbackMetrics = (() => {
      if (sourcePlan && (sourcePlan as any).metrics) return sourcePlan;
      const fb = fallbackPlans[index];
      if (fb?.metrics) return { ...sourcePlan, metrics: fb.metrics };
      return sourcePlan;
    })();
    const normalized = normalizePlan(sourceWithFallbackMetrics, index, fallbackPlans[index]);
    if (hiddenIndexes.includes(index)) normalized.hidden = true;
    if (bestIndex >= 0) {
      normalized.bestPlan = index === bestIndex;
      if (index === bestIndex && bestLabelOverride) normalized.bestPlanLabel = bestLabelOverride;
    }
    return normalized;
  });
}

export function buildLegacyPlanFields(plans: QuotePlanConfig[]) {
  return {
    plan1_total: plans[0]?.total || "",
    plan1_labor: plans[0]?.labor || "",
    plan1_ads: plans[0]?.ads || "",
    plan1_items: plans[0]?.items || [],
    plan2_total: plans[1]?.total || "",
    plan2_labor: plans[1]?.labor || "",
    plan2_ads: plans[1]?.ads || "",
    plan2_items: plans[1]?.items || [],
  };
}
