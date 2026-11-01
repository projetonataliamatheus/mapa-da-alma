// @ts-nocheck
/**
 * Textos automáticos por tipo de estratégia.
 * Injetados na seção "Estratégia em Uso" do relatório.
 */

export interface StrategyContext {
  title: string;
  emoji: string;
  description: string;
  kpiKeys: string[];
}

export const STRATEGY_CONTEXTS: Record<string, StrategyContext> = {
  mensagens: {
    title: "Campanha de Mensagens Ativas",
    emoji: "📲",
    description:
      "Esta campanha foi configurada para trazer pessoas diretamente para o seu WhatsApp. Cada mensagem recebida é uma oportunidade real de venda. Quanto mais mensagens com menor custo, melhor está funcionando o anúncio.",
    kpiKeys: ["messages_started", "cost_per_message", "instagram_profile_visits", "instagram_followers"],
  },
  leads: {
    title: "Campanha de Captação de Contatos",
    emoji: "📋",
    description:
      "Esta estratégia foca em coletar dados de pessoas interessadas no seu produto ou serviço. Os leads captados são potenciais clientes que demonstraram interesse real.",
    kpiKeys: ["leads", "cost_per_lead"],
  },
  vendas: {
    title: "Campanha de Vendas Diretas",
    emoji: "🛒",
    description:
      "O objetivo desta campanha é gerar vendas diretas. Cada conversão registrada representa uma compra realizada através dos seus anúncios. Acompanhe o ROAS para entender seu retorno sobre o investimento.",
    kpiKeys: ["purchases", "cost_per_purchase"],
  },
  engajamento: {
    title: "Campanha de Engajamento e Seguidores",
    emoji: "📱",
    description:
      "Esta campanha foca em aumentar o engajamento com seu perfil e atrair novos seguidores. Quanto mais visitas ao perfil e seguidores conquistados, maior a presença da sua marca nas redes sociais.",
    kpiKeys: ["instagram_profile_visits", "instagram_followers", "post_engagement"],
  },
  conteudo: {
    title: "Campanha de Alcance e Visibilidade",
    emoji: "📢",
    description:
      "Esta campanha tem como foco mostrar sua marca para o maior número possível de pessoas. É o combustível para que as campanhas de conversão funcionem melhor no futuro.",
    kpiKeys: ["reach", "impressions", "cpm", "frequency"],
  },
};

export function getStrategyContext(strategyType: string | null | undefined): StrategyContext | null {
  if (!strategyType) return null;
  const key = strategyType.toLowerCase().trim();
  return STRATEGY_CONTEXTS[key] || null;
}
