// @ts-nocheck
/**
 * Section ordering and custom sections system for quote templates.
 * Built-in sections have fixed IDs; custom sections get generated IDs.
 */

export interface SectionDefinition {
  id: string;
  type: "builtin" | "text" | "image" | "video" | "carousel";
  label: string;
  icon: string; // emoji or lucide icon name
  visible: boolean;
  // Custom section data
  data?: {
    title?: string;
    content?: string;
    imageUrl?: string;
    imageAlt?: string;
    videoUrl?: string;
    videoType?: "youtube" | "upload" | "url";
    images?: { url: string; caption?: string }[];
  };
}

// Built-in sections for Simple layout
export const SIMPLE_BUILTIN_SECTIONS: SectionDefinition[] = [
  { id: "hero", type: "builtin", label: "Hero / Cabeçalho", icon: "gps-pin", visible: true },
  { id: "strategy", type: "builtin", label: "Estratégia", icon: "📋", visible: true },
  { id: "platforms", type: "builtin", label: "Plataformas", icon: "📱", visible: true },
  { id: "google", type: "builtin", label: "Google Meu Negócio", icon: "🔍", visible: true },
  { id: "instagram", type: "builtin", label: "Instagram", icon: "📸", visible: true },
  { id: "whatsapp", type: "builtin", label: "WhatsApp", icon: "💬", visible: true },
  { id: "metrics", type: "builtin", label: "Métricas", icon: "money-float", visible: true },
  { id: "plans", type: "builtin", label: "Planos", icon: "money-float", visible: true },
  { id: "faq", type: "builtin", label: "FAQ", icon: "❓", visible: true },
  { id: "cta", type: "builtin", label: "CTA Final", icon: "🚀", visible: true },
  { id: "reviews", type: "builtin", label: "Avaliações", icon: "⭐", visible: true },
  { id: "footer", type: "builtin", label: "Rodapé", icon: "📄", visible: true },
];

// Built-in sections for Detailed layout (includes extra sections)
export const DETAILED_BUILTIN_SECTIONS: SectionDefinition[] = [
  { id: "hero", type: "builtin", label: "Hero / Cabeçalho", icon: "gps-pin", visible: true },
  { id: "strategy", type: "builtin", label: "Estratégia", icon: "📋", visible: true },
  { id: "howwework", type: "builtin", label: "Como Trabalhamos", icon: "handshake", visible: true },
  { id: "platforms", type: "builtin", label: "Plataformas", icon: "📱", visible: true },
  { id: "google", type: "builtin", label: "Google Meu Negócio", icon: "🔍", visible: true },
  { id: "instagram", type: "builtin", label: "Instagram", icon: "📸", visible: true },
  { id: "whatsapp", type: "builtin", label: "WhatsApp", icon: "💬", visible: true },
  { id: "metrics", type: "builtin", label: "Métricas", icon: "money-float", visible: true },
  { id: "timeline", type: "builtin", label: "Cronograma", icon: "calendar-modern", visible: true },
  { id: "plans", type: "builtin", label: "Planos", icon: "money-float", visible: true },
  { id: "social_proof", type: "builtin", label: "Prova Social", icon: "🏆", visible: true },
  { id: "faq", type: "builtin", label: "FAQ", icon: "❓", visible: true },
  { id: "cta", type: "builtin", label: "CTA Final", icon: "🚀", visible: true },
  { id: "reviews", type: "builtin", label: "Avaliações", icon: "⭐", visible: true },
  { id: "footer", type: "builtin", label: "Rodapé", icon: "📄", visible: true },
];

// Built-in sections for Sites e Páginas layout (matches SitesLayout blocks)
export const SITES_BUILTIN_SECTIONS: SectionDefinition[] = [
  { id: "hero", type: "builtin", label: "Hero / Cabeçalho", icon: "🌐", visible: true },
  { id: "why", type: "builtin", label: "Por que ter um site profissional", icon: "🔎", visible: true },
  { id: "differentials", type: "builtin", label: "Diferenciais", icon: "✨", visible: true },
  { id: "process", type: "builtin", label: "Como Desenvolvemos", icon: "🛠️", visible: true },
  { id: "included", type: "builtin", label: "O que está incluído", icon: "✅", visible: true },
  { id: "trust", type: "builtin", label: "Confiança & Segurança", icon: "🛡️", visible: true },
  { id: "plans", type: "builtin", label: "Planos e Investimento", icon: "💰", visible: true },
  { id: "faq", type: "builtin", label: "FAQ", icon: "❓", visible: true },
  { id: "reviews", type: "builtin", label: "Avaliações", icon: "⭐", visible: true },
  { id: "cta", type: "builtin", label: "CTA Final", icon: "🚀", visible: true },
  { id: "footer", type: "builtin", label: "Rodapé", icon: "📄", visible: true },
];

// Built-in sections for Loja Virtual (e-commerce)
export const ECOMMERCE_BUILTIN_SECTIONS: SectionDefinition[] = [
  { id: "hero", type: "builtin", label: "Hero / Cabeçalho", icon: "🛒", visible: true },
  { id: "why", type: "builtin", label: "Por que vender online", icon: "📈", visible: true },
  { id: "features", type: "builtin", label: "Recursos da Loja", icon: "🧩", visible: true },
  { id: "payments", type: "builtin", label: "Pagamentos & Frete", icon: "💳", visible: true },
  { id: "process", type: "builtin", label: "Como Desenvolvemos", icon: "🛠️", visible: true },
  { id: "plans", type: "builtin", label: "Planos e Investimento", icon: "💰", visible: true },
  { id: "faq", type: "builtin", label: "FAQ", icon: "❓", visible: true },
  { id: "cta", type: "builtin", label: "CTA Final", icon: "🚀", visible: true },
  { id: "footer", type: "builtin", label: "Rodapé", icon: "📄", visible: true },
];

// Built-in sections for Sistemas & Apps
export const SYSTEMS_BUILTIN_SECTIONS: SectionDefinition[] = [
  { id: "hero", type: "builtin", label: "Hero / Cabeçalho", icon: "💻", visible: true },
  { id: "problem", type: "builtin", label: "Problema & Solução", icon: "🎯", visible: true },
  { id: "modules", type: "builtin", label: "Módulos do Sistema", icon: "🧩", visible: true },
  { id: "stack", type: "builtin", label: "Tecnologias", icon: "⚙️", visible: true },
  { id: "process", type: "builtin", label: "Metodologia", icon: "🛠️", visible: true },
  { id: "plans", type: "builtin", label: "Investimento", icon: "💰", visible: true },
  { id: "faq", type: "builtin", label: "FAQ", icon: "❓", visible: true },
  { id: "cta", type: "builtin", label: "CTA Final", icon: "🚀", visible: true },
  { id: "footer", type: "builtin", label: "Rodapé", icon: "📄", visible: true },
];

export function getBuiltinSectionsForService(serviceType: string, isDetailed = false): SectionDefinition[] {
  switch (serviceType) {
    case "sites_paginas": return SITES_BUILTIN_SECTIONS.map(s => ({ ...s }));
    case "loja_virtual": return ECOMMERCE_BUILTIN_SECTIONS.map(s => ({ ...s }));
    case "sistemas_app": return SYSTEMS_BUILTIN_SECTIONS.map(s => ({ ...s }));
    default:
      return (isDetailed ? DETAILED_BUILTIN_SECTIONS : SIMPLE_BUILTIN_SECTIONS).map(s => ({ ...s }));
  }
}

export const CUSTOM_SECTION_TYPES = [
  { type: "text" as const, label: "Texto Livre", icon: "📝", description: "Título e parágrafo editáveis" },
  { type: "image" as const, label: "Imagem / Banner", icon: "🖼️", description: "Upload ou link de imagem" },
  { type: "video" as const, label: "Vídeo", icon: "🎬", description: "YouTube, Vimeo ou upload" },
  { type: "carousel" as const, label: "Carrossel", icon: "🎠", description: "Múltiplas imagens em slider" },
];

export function createCustomSection(type: SectionDefinition["type"], label?: string): SectionDefinition {
  const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const defaults: Record<string, Partial<SectionDefinition>> = {
    text: { label: label || "Seção de Texto", icon: "📝", data: { title: "Título da Seção", content: "Adicione seu conteúdo aqui..." } },
    image: { label: label || "Imagem / Banner", icon: "🖼️", data: { title: "", imageUrl: "", imageAlt: "Imagem" } },
    video: { label: label || "Vídeo", icon: "🎬", data: { title: "Vídeo", videoUrl: "", videoType: "youtube" } },
    carousel: { label: label || "Carrossel de Imagens", icon: "🎠", data: { title: "Galeria", images: [] } },
  };
  const def = defaults[type] || defaults.text;
  return { id, type, visible: true, ...def } as SectionDefinition;
}
