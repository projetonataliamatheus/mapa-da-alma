// @ts-nocheck
export interface ReportMetricLike {
  metric_key: string;
  metric_value: number;
  metric_label?: string;
  metric_icon?: string;
  metric_color?: string;
  metric_category?: string;
  [key: string]: any;
}

export interface ApprovedReportMetric extends ReportMetricLike {
  metric_label: string;
  metric_icon: string;
  metric_color: string;
  metric_category: string;
}

type ApprovedMetricKey =
  | "spend"
  | "reach"
  | "unique_outbound_clicks"
  | "cpm"
  | "messages_started"
  | "cost_per_message"
  | "conversation_rate"
  | "creative_quality_ctr"
  | "instagram_followers"
  | "instagram_profile_visits"
  | "post_comments"
  | "instagram_profile_quality";

type MetricMeta = {
  metric_label: string;
  metric_icon: string;
  metric_color: string;
  metric_category: string;
};

export const APPROVED_REPORT_METRIC_ORDER: ApprovedMetricKey[] = [
  "spend",
  "reach",
  "unique_outbound_clicks",
  "cpm",
  "messages_started",
  "cost_per_message",
  "conversation_rate",
  "creative_quality_ctr",
  "instagram_followers",
  "instagram_profile_visits",
  "post_comments",
  "instagram_profile_quality",
];

export const APPROVED_REPORT_METRIC_SET = new Set<string>(APPROVED_REPORT_METRIC_ORDER);

const APPROVED_REPORT_METRIC_META: Record<ApprovedMetricKey, MetricMeta> = {
  spend: {
    metric_label: "Valor Investido",
    metric_icon: "DollarSign",
    metric_color: "#10b981",
    metric_category: "custo",
  },
  reach: {
    metric_label: "Pessoas Alcançadas",
    metric_icon: "Eye",
    metric_color: "#3b82f6",
    metric_category: "alcance",
  },
  unique_outbound_clicks: {
    metric_label: "Pessoas que Clicou no Anúncio",
    metric_icon: "MousePointer",
    metric_color: "#0284c7",
    metric_category: "engajamento",
  },
  cpm: {
    metric_label: "CPM",
    metric_icon: "TrendingDown",
    metric_color: "#ef4444",
    metric_category: "custo",
  },
  messages_started: {
    metric_label: "Conversas por Mensagem",
    metric_icon: "MessageCircle",
    metric_color: "#25d366",
    metric_category: "conversão",
  },
  cost_per_message: {
    metric_label: "Custo por Mensagem",
    metric_icon: "MessageCircle",
    metric_color: "#16a34a",
    metric_category: "conversão",
  },
  conversation_rate: {
    metric_label: "Aproveitamento de Conversas",
    metric_icon: "MessageCircle",
    metric_color: "#10b981",
    metric_category: "conversão",
  },
  creative_quality_ctr: {
    metric_label: "Qualidade do Criativo | CTR",
    metric_icon: "BarChart2",
    metric_color: "#8b5cf6",
    metric_category: "engajamento",
  },
  instagram_followers: {
    metric_label: "Seguidores no Instagram",
    metric_icon: "Users",
    metric_color: "#e11d48",
    metric_category: "engajamento",
  },
  instagram_profile_visits: {
    metric_label: "Visitas ao Perfil do Instagram",
    metric_icon: "Eye",
    metric_color: "#e11d48",
    metric_category: "engajamento",
  },
  post_comments: {
    metric_label: "Comentários no Post",
    metric_icon: "MessageCircle",
    metric_color: "#f472b6",
    metric_category: "engajamento",
  },
  instagram_profile_quality: {
    metric_label: "Qualidade do Perfil Instagram",
    metric_icon: "BarChart2",
    metric_color: "#ec4899",
    metric_category: "engajamento",
  },
};

const LEGACY_KEY_MAP: Record<string, ApprovedMetricKey> = {
  amount_spent: "spend",
  outbound_clicks: "unique_outbound_clicks",
  unique_link_clicks: "unique_outbound_clicks",
  link_clicks: "unique_outbound_clicks",
  messaging_conversations_started: "messages_started",
  new_message_contacts: "messages_started",
  cost_per_new_message_contact: "cost_per_message",
  outbound_ctr_unique: "creative_quality_ctr",
  outbound_ctr: "creative_quality_ctr",
  ctr_unique: "creative_quality_ctr",
  ctr: "creative_quality_ctr",
  profile_visits: "instagram_profile_visits",
  instagram_follows: "instagram_followers",
};

const SOURCE_PRIORITY: Record<string, number> = {
  spend: 100,
  reach: 100,
  unique_outbound_clicks: 100,
  cpm: 100,
  messages_started: 100,
  cost_per_message: 100,
  conversation_rate: 100,
  creative_quality_ctr: 100,
  instagram_followers: 100,
  instagram_profile_visits: 100,
  post_comments: 100,
  instagram_profile_quality: 100,
  results: 80,
  messaging_conversations_started: 75,
  new_message_contacts: 70,
  cost_per_result: 80,
  cost_per_new_message_contact: 70,
  outbound_clicks: 80,
  unique_link_clicks: 75,
  link_clicks: 70,
  outbound_ctr_unique: 85,
  outbound_ctr: 80,
  ctr_unique: 75,
  ctr: 70,
  profile_visits: 80,
  instagram_follows: 80,
};

function roundMetric(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeMetricValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? roundMetric(parsed) : 0;
}

export function toApprovedReportMetricKey(metricKey: string) {
  return LEGACY_KEY_MAP[metricKey] || metricKey;
}

function buildApprovedMetric(metricKey: ApprovedMetricKey, value: number, source?: Partial<ReportMetricLike>): ApprovedReportMetric {
  const meta = APPROVED_REPORT_METRIC_META[metricKey];

  return {
    ...source,
    metric_key: metricKey,
    metric_value: roundMetric(value),
    metric_label: meta.metric_label,
    metric_icon: meta.metric_icon,
    metric_color: meta.metric_color,
    metric_category: meta.metric_category,
  } as ApprovedReportMetric;
}

function getPriority(originalKey: string, canonicalKey: string) {
  if (originalKey === canonicalKey) return 100;
  return SOURCE_PRIORITY[originalKey] ?? 10;
}

export function restrictToApprovedReportMetrics(
  metrics: ReportMetricLike[],
  options: { includeMissing?: boolean } = {},
): ApprovedReportMetric[] {
  const selected = new Map<ApprovedMetricKey, ApprovedReportMetric & { __priority: number }>();

  for (const metric of metrics || []) {
    const originalKey = metric.metric_key;
    const canonicalKey = toApprovedReportMetricKey(originalKey) as ApprovedMetricKey;

    if (!APPROVED_REPORT_METRIC_SET.has(canonicalKey)) continue;

    const candidate = {
      ...buildApprovedMetric(canonicalKey, normalizeMetricValue(metric.metric_value), metric),
      __priority: getPriority(originalKey, canonicalKey),
    };

    const current = selected.get(canonicalKey);
    if (!current) {
      selected.set(canonicalKey, candidate);
      continue;
    }

    if (candidate.__priority > current.__priority) {
      selected.set(canonicalKey, candidate);
      continue;
    }

    if (candidate.__priority === current.__priority && candidate.metric_value > current.metric_value) {
      selected.set(canonicalKey, candidate);
    }
  }

  const spend = selected.get("spend")?.metric_value || 0;
  const reach = selected.get("reach")?.metric_value || 0;
  const clicks = selected.get("unique_outbound_clicks")?.metric_value || 0;
  const messages = selected.get("messages_started")?.metric_value || 0;
  const followers = selected.get("instagram_followers")?.metric_value || 0;
  const visits = selected.get("instagram_profile_visits")?.metric_value || 0;

  if (!selected.has("cpm") && spend > 0 && reach > 0) {
    selected.set("cpm", { ...buildApprovedMetric("cpm", (spend / reach) * 1000), __priority: 999 });
  }

  if (!selected.has("cost_per_message") && spend > 0 && messages > 0) {
    selected.set("cost_per_message", {
      ...buildApprovedMetric("cost_per_message", spend / messages),
      __priority: 999,
    });
  }

  // Calculate or fix Conversation Rate (Aproveitamento de Conversas)
  if (clicks > 0 && messages > 0) {
    const calcRate = messages / clicks;
    const safe = Math.min(1, Math.max(0, calcRate));
    selected.set("conversation_rate", {
      ...buildApprovedMetric("conversation_rate", safe),
      __priority: 1000,
    });
  } else if (selected.has("conversation_rate")) {
    const m = selected.get("conversation_rate")!;
    const safe = Math.min(1, Math.max(0, m.metric_value));
    selected.set("conversation_rate", { ...m, metric_value: roundMetric(safe) });
  }

  // Calculate or fix Instagram Profile Quality (Qualidade do Perfil)
  // Formula: (New Followers / Profile Visits)
  if (visits > 0 && followers > 0) {
    const calcQuality = followers / visits;
    const safe = Math.min(1, Math.max(0, calcQuality));
    selected.set("instagram_profile_quality", {
      ...buildApprovedMetric("instagram_profile_quality", safe),
      __priority: 1000,
    });
  } else if (selected.has("instagram_profile_quality")) {
    const m = selected.get("instagram_profile_quality")!;
    const safe = Math.min(1, Math.max(0, m.metric_value));
    selected.set("instagram_profile_quality", { ...m, metric_value: roundMetric(safe) });
  }

  if (!options.includeMissing) {
    return APPROVED_REPORT_METRIC_ORDER
      .map((metricKey) => selected.get(metricKey))
      .filter(Boolean)
      .map(({ __priority, ...metric }) => metric);
  }

  return APPROVED_REPORT_METRIC_ORDER.map((metricKey) => {
    const current = selected.get(metricKey);
    if (current) {
      const { __priority, ...metric } = current;
      return metric;
    }

    return buildApprovedMetric(metricKey, 0);
  });
}

export function sanitizeMetricSnapshots<T extends { metrics?: any }>(snapshots: T[]): Array<Omit<T, "metrics"> & { metrics: ApprovedReportMetric[] }> {
  return (snapshots || []).map((snapshot) => ({
    ...snapshot,
    metrics: restrictToApprovedReportMetrics(Array.isArray(snapshot.metrics) ? snapshot.metrics : []),
  }));
}