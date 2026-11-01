// @ts-nocheck
"use client";
import { useState, useEffect, useCallback } from "react";

export interface LoadingPhase {
  text: string;
  sect: string;
  duration: number;
}

export interface LoadingStatusBar {
  loadingLabel: string;
  loadedLabel: string;
  bufferLabel: string;
  btnText: string;
}

export interface ToolItem {
  name: string;
  url: string;
}

export interface WhatsAppCard {
  icon: string;
  title: string;
  desc: string;
}

export interface InstagramCard {
  icon: string;
  day: string;
  title: string;
  desc: string;
}

export interface DiagCard {
  num: string;
  title: string;
  desc: string;
}

export interface PersonaCard {
  emoji: string;
  title: string;
  desc: string;
}

export interface JourneyPhase {
  label: string;
  title: string;
  desc: string;
}

export interface Testimonial {
  name: string;
  segment: string;
  text: string;
}

export interface PillItem {
  text: string;
}

export interface PhotoItem {
  label: string;
  url: string;
}

export interface FooterLink {
  text: string;
  url: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface SectionFloatingIcon {
  type: "platform" | "lucide" | "image" | "none";
  source: string; // platform name, lucide icon name, or image URL
  size: number;
  speed: number; // animation speed multiplier (1 = normal)
  isCircle: boolean; // circular crop for profile photos
}


export interface SiteConfig {
  // General
  accentColor: string;
  bgColor: string;
  whatsappLink: string;
  adminPassword: string;
  cardColor: string;
  textColor: string;
  mutedColor: string;

  // Loading
  loadingEnabled: boolean;
  loadingText: string;
  loadingSect: string;
  loadingDuration: number;
  loadingStartBtnEnabled: boolean;
  matrixTransitionDuration: number;
  matrixText: string;
  matrixOrientation: "vertical" | "horizontal";
  matrixCharSpeed: number;
  matrixEffect: "converge" | "rain" | "typewriter" | "spiral" | "explosion";
  matrixNameFontFamily: string;
  matrixNameFontSize: number;
  matrixNameBold: boolean;
  matrixNameItalic: boolean;
  matrixNameLetterSpacing: number;
  matrixImageUrl: string;
  matrixImageDuration: number;
  matrixImageEnabled: boolean;
  matrixImageCharSize: number;
  matrixImageScale: number;
  matrixImageOriginalColors: boolean;
  matrixImageTint: number;
  matrixImageBgRain: boolean;
  matrixImageScanlines: boolean;
  matrixImageEffect: "ascii" | "disintegrate" | "hologram" | "particle-edges" | "digital-rain";
  loadingPhases: LoadingPhase[];
  loadingStatusBar: LoadingStatusBar;
  loadingBtnEffect: "neon" | "pulse" | "glitch" | "breathe" | "rainbow";

  // Hero
  heroNameBadge: string;
  heroNameTypingEnabled: boolean;
  heroNameTypingSpeed: number;
  heroNameFontSize: number;
  heroNameFontFamily: string;
  heroNameBold: boolean;
  heroTitle1: string;
  heroTitle2: string;
  heroTitle3: string;
  heroTitle3FontSize: number;
  heroTitle3GlitchEnabled: boolean;
  heroTitle3Color: string;
  heroTitle3Position: "above" | "below";
  heroTitleFontSize: number;
  glitchEnabled: boolean;
  glitchSpeed: number;
  glitchInterval: number;
  glitchDuration: number;
  glitchPositions: number;
  heroDescription: string;
  heroIntroText: string;
  heroBadge: string;
  heroBadgeNeonEnabled: boolean;
  heroBadgeNeonColor: string;
  heroBadgeNeonSpeed: number;
  heroBadgeNeonThickness: number;
  heroCta1Text: string;
  heroCta1Link: string;
  heroCta2Text: string;
  heroCta2Link: string;
  heroCtaSubline: string;
  heroCtaSublineSpacing: number;
  heroBottomSpacing: number;
  heroTopSpacing?: number;
  heroMinHeight?: number;
  heroInnerPaddingTop?: number;

  // SEO Header (páginas /<slug>)
  seoHeaderTopPadding?: number;
  seoHeaderBottomPadding?: number;
  seoHeaderSeparatorMargin?: number;
  seoHeaderGridEnabled?: boolean;
  seoHeaderBgColor?: string;

  // Tools
  toolsTitle: string;
  toolsSubtitle: string;
  toolsDescription: string;
  toolsSpeed1: number;
  toolsSpeed2: number;
  toolsIconSize: number;
  toolsFloatAmplitude: number;
  toolsFloatSpeed: number;
  toolsMobilePaddingTop: number;
  toolsMobilePaddingBottom: number;
  toolsMobileGap: number;
  toolsList: ToolItem[];

  // Diagnostic
  diagTitle: string;
  diagSubtitle: string;
  diagCards: DiagCard[];
  diagClosingLines: { text: string; color: string; fontSize: number }[];
  diagClosingSpacing: number;

  // Personas
  personasTitle: string;
  personasCards: PersonaCard[];
  // Journey
  journeyTitle: string;
  journeySubtitle: string;
  journeyPhases: JourneyPhase[];

  // WhatsApp
  whatsappTitle: string;
  whatsappSubtitle: string;
  whatsappBanner: string;
  whatsappBannerEnabled: boolean;
  whatsappCards: WhatsAppCard[];

  // Instagram
  instagramTitle: string;
  instagramSubtitle: string;
  instagramCards: InstagramCard[];

  // Services
  servicesTitle: string;
  servicesSubtitle: string;
  servicesProtocolTitle: string;
  servicesProtocolDesc: string;
  servicesList: string[];

  // Authority
  authorityTitle1: string;
  authorityTitle2: string;
  authorityDesc: string;
  authorityIntro: string;
  authorityEmphasis1: string;
  authorityEmphasis2: string;
  authorityBulletLabel: string;
  authorityBullets: string[];
  authorityClosing1: string;
  authorityClosing2: string;
  authorityClosing3: string;
  authorityClosing4: string;
  authorityBadges: string[];
  authorityEnabled: boolean;

  // Social Proof
  socialProofEnabled: boolean;
  socialProofTitle: string;
  socialProofTestimonials: Testimonial[];

  // Prova Social (HTML embed - e.g. Elfsight)
  socialProofHtmlEnabled: boolean;
  socialProofHtmlCode: string;
  socialProofHtmlSubtitle: string;

  // Pills
  pillsTypingText: string;
  pillsTitle: string;
  pillsSubtitle: string;
  pillsHeroImageUrl: string;
  pillsHeroImageSize: number;
  pillsIconSize: number;
  pillsIconFloatSpeed: number;
  pillsIconFloatIntensity: number;
  pillsRecommendedLabel: string;
  pillsSchemaVersion: number;
  pillBlueAdminName: string;
  pillBlueLabel: string;
  pillBlueColor: string;
  pillBlueGlowIntensity: number;
  pillBlueTitle: string;
  pillBlueSubtitle: string;
  pillBlueQuote: string;
  pillBlueItems: PillItem[];
  pillBlueBtnText: string;
  pillBlueBtnLink: string;
  pillRedAdminName: string;
  pillRedLabel: string;
  pillRedColor: string;
  pillRedTitle: string;
  pillRedSubtitle: string;
  pillRedQuote: string;
  pillRedItems: PillItem[];
  pillRedBtnText: string;
  pillRedBtnLink: string;

  // About Me
  aboutTitle1: string;
  aboutTitle2: string;
  aboutSubtitle: string;
  aboutBio1: string;
  aboutBio2: string;
  aboutBio3: string;
  aboutBioParagraphs: string[];
  aboutMainPhoto: string;
  aboutPhotos: PhotoItem[];
  aboutPhotosPerRow: number;
  aboutBadges: string[];

  // FAQ
  faqTitle: string;
  faqBadge: string;
  faqList: FaqItem[];

  // Footer
  footerName: string;
  footerText: string;
  footerCopyright: string;
  footerDisclaimer: string;
  footerCnpj: string;
  footerEmail: string;
  footerWhatsapp: string;
  footerLinks: FooterLink[];
  footerInstagramUrl: string;
  footerIconSize: number;
  footerIconEffect: "bounce" | "pulse" | "shake" | "none";
  footerIconEffectSpeed: number;
  footerMotivationalPhrase: string;
  footerFieldsOrder: string[];

  // Audio 1 - Loading bar SFX (plays during progress bar)
  audioLoadingUrl: string;
  audioLoadingVolume: number;
  audioLoadingDelay: number;

  // Audio 2 - Button click SFX (plays when clicking INICIAR)
  audioClickUrl: string;
  audioClickVolume: number;

  // Audio 3 - Site music (loops after transition complete)
  audioSiteUrl: string;
  audioSiteVolume: number;
  audioSiteDelay: number;

  // Global audio settings
  audioMutedDefault: boolean;

  // Title color overrides per section ("auto" = theme accent, or custom hex)
  titleColorOverrides: Record<string, string>;

  // Multi-line titles per section — each line has 2 segments with independent colors
  sectionTitleLines: Record<string, { text: string; color: string; text2?: string; color2?: string }[]>;

  // WhatsApp CTA Widget
  whatsappCtaAvatarUrl: string;
  whatsappCtaAvatarSize: number;
  whatsappCtaIconSize: number;
  whatsappCtaTitle1: string;
  whatsappCtaTitle2: string;
  whatsappCtaBtnText: string;
  whatsappCtaBtnBlink: boolean;
  whatsappCtaBtnBlinkSpeed: number;
  whatsappCtaIconShake: boolean;
  whatsappCtaIconShakeSpeed: number;
  whatsappCtaNeonBorder: boolean;
  whatsappCtaNeonSpeed: number;
  whatsappCtaSections: string[];
  // Font & style controls
  whatsappCtaTitle1Size: number;
  whatsappCtaTitle1Color: string;
  whatsappCtaTitle2Size: number;
  whatsappCtaTitle2Gradient1: string;
  whatsappCtaTitle2Gradient2: string;
  whatsappCtaBtnSize: number;
  whatsappCtaBtnGradient1: string;
  whatsappCtaBtnGradient2: string;
  whatsappCtaBtnColor: string;
  whatsappCtaTextAlign: "left" | "center" | "right";
  whatsappCta3D: boolean;
  whatsappCtaTitle1Font: string;
  whatsappCtaTitle1Bold: boolean;
  whatsappCtaTitle1Italic: boolean;
  whatsappCtaTitle1LetterSpacing: number;
  whatsappCtaTitle1LineHeight: number;
  whatsappCtaTitle2Font: string;
  whatsappCtaTitle2Bold: boolean;
  whatsappCtaTitle2Italic: boolean;
  whatsappCtaTitle2LetterSpacing: number;
  whatsappCtaTitle2LineHeight: number;
  whatsappCtaBtnFont: string;
  whatsappCtaBtnBold: boolean;
  whatsappCtaBtnItalic: boolean;
  whatsappCtaBtnLetterSpacing: number;
  whatsappCtaBtnLineHeight: number;

  // Global widget effect
  whatsappCtaGlobalEffect: "none" | "glitch" | "flicker" | "malcontact" | "malcontact-v2" | "malcontact-v3" | "malcontact-hz" | "pulse-glow" | "interference";
  whatsappCtaGlobalEffectSpeed: number;
  whatsappCtaGlobalEffectDuration: number;
  whatsappCtaGlobalEffectIntensity: number;
  // Scanlines & hacker overlay
  whatsappCtaScanlines: boolean;
  whatsappCtaScanlineThickness: number;
  whatsappCtaScanlineOpacity: number;
  whatsappCtaScanlineSpeed: number;
  whatsappCtaScanlineColor: string;
  whatsappCtaHackerGlow: boolean;
  whatsappCtaHackerGlowColor: string;
  whatsappCtaHackerGlowIntensity: number;
  whatsappCtaHackerGlowSpeed: number;

  // CTA Phrase above widget
  whatsappCtaPhraseEnabled: boolean;
  whatsappCtaPhraseText: string;
  whatsappCtaPhraseSize: number;
  whatsappCtaPhraseColor: string;
  whatsappCtaPhraseFont: string;
  whatsappCtaPhraseBold: boolean;
  whatsappCtaPhraseItalic: boolean;
  whatsappCtaPhraseAlign: "left" | "center" | "right";
  whatsappCtaPhraseLineHeight: number;
  whatsappCtaPhraseLetterSpacing: number;

  // Floating Section Icons
  floatingIcons: Record<string, SectionFloatingIcon>;

  // Tracking
  gtmId: string;
  gaId: string;
  fbPixelId: string;
  fbPixelSecondaryId: string;
  customHtmlHead: string;
  customHtmlBody: string;
  utmTrackingEnabled: boolean;
  buttonTrackingEnabled: boolean;
  visitorTrackingEnabled: boolean;

  // Advanced
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogImageUrl: string;
  faviconUrl: string;
  customDomain: string;
  customSlug: string;
  scanlinesEnabled: boolean;
  scrollSpeed: number;

  // Intro Video
  introVideoEnabled: boolean;
  introVideoUrl: string;
  introVideoDuration: number;

  // Theme
  adminTheme: string;
  siteTheme: string;

  // Section visibility & order
  hiddenSections: string[];
  sectionOrder: string[];

  // WhatsApp CTA Widget spacing
  whatsappCtaMarginBottom: number;

  // Section Divider settings
  dividerThickness: number;
  dividerOpacity: number;
  dividerColor: string;
  dividerColorAuto: boolean;
  dividerGlow: boolean;
  dividerGlowIntensity: number;
  dividerGlowColor: string;
  dividerEffect: "none" | "pulse" | "shimmer" | "neon";
  dividerEffectSpeed: number;
  dividerMaxWidth: string;
  dividerMarginY: number;

  // Global subtitle styling
  subtitleFontSize: number;
  subtitleColor: string;
  subtitleGap: number;

  // Generic section extras (subtitle2, closing phrase)
  sectionSubtitle2: Record<string, string>;
  sectionClosingEnabled: Record<string, boolean>;
  sectionClosingLine1Green: Record<string, string>;
  sectionClosingLine1White: Record<string, string>;
  sectionClosingLine2Green: Record<string, string>;
  sectionClosingLine2White: Record<string, string>;

  // HTML Custom Sections
  htmlSections: { id: string; label: string; code: string; visible: boolean }[];

  // Dashboard Preview Section
  dashboardIntro: string;
  dashboardEmphasis1: string;
  dashboardEmphasis2: string;
  dashboardBullets: string[];
  dashboardClosing1: string;
  dashboardClosing2: string;
  dashboardClosing3: string;
  dashboardClosing4: string;
  dashboardBadgeText: string;
  dashboardDisclaimer: string;
  dashboardGoalPercent: number;
  dashboardGoalLabel: string;

  // Painel Showcase — controle por card/bloco (visibilidade, rótulo, cor)
  dashboardCardsConfig?: Record<string, { enabled?: boolean; label?: string; desc?: string; color?: string }>;
  dashboardBlocksOrder?: string[];
  dashboardBlocksVisible?: Record<string, boolean>;
  dashboardStrategyTitle?: string;
  dashboardStrategySubtitle?: string;
  dashboardStrategyDesc?: string;
  dashboardCostsTitle?: string;
  dashboardResultsTitle?: string;
  dashboardBudgetTitle?: string;

  // Investment Section
  investmentBadge: string;
  investmentTitle: string;
  investmentSubtitle: string;
  investmentBreakText: string;
  investmentBlock1Tag: string;
  investmentBlock1Title: string;
  investmentBlock1Bullets: string;
  investmentBlock1Price: string;
  investmentBlock2Tag: string;
  investmentBlock2Title: string;
  investmentBlock2Desc: string;
  investmentBlock2Examples: string;
  investmentSumTag: string;
  investmentSumIntro: string;
  investmentSumExample: string;
  investmentSumFormula: string;
  investmentSumTotal: string;
  investmentObjectionIntro: string;
  investmentObjectionText: string;
  investmentPositionText: string;
  investmentAnchor1: string;
  investmentAnchor2: string;
  investmentTransition: string;

  // Simulator Section
  simulatorBadge: string;
  simulatorTitle: string;
  simulatorSubtitle: string;
  simulatorSliderLabel: string;
  simulatorMicroLow: string;
  simulatorMicroMid: string;
  simulatorMicroHigh: string;
  simulatorImpactText: string;
  simulatorCtaText: string;
  simulatorDisclaimer: string;
  simulatorTransitionText: string;
  simulatorArrowSize: number;
  simulatorColorLow: string;
  simulatorColorMid: string;
  simulatorColorHigh: string;
  simulatorPlans: { name?: string; prefix?: string; perDay: number; perMonth: number; ads: number; management: number; total: number; active?: boolean }[];
  // Card customization
  simulatorCardAdsColor?: string;
  simulatorCardMgmtColor?: string;
  simulatorCardTotalColor?: string;
  simulatorCardAdsLabel?: string;
  simulatorCardMgmtLabel?: string;
  simulatorCardTotalLabel?: string;
  simulatorMetricFontSize?: number;
  simulatorMetricSubFontSize?: number;
  simulatorGrowthChartEnabled?: boolean;
  simulatorCtaTextColor?: string;
  // Per-month highlight card
  simulatorPerMonthCardColor?: string;
  simulatorPerMonthLabel?: string;
  simulatorPerMonthFontSize?: number;
  // Total before CTA
  simulatorShowTotalBeforeCta?: boolean;
  simulatorTotalBeforeCtaLabel?: string;
  simulatorTotalBeforeCtaColor?: string;
  // CTA size
  simulatorCtaFullWidth?: boolean;
  simulatorCtaFontSize?: number;
  // Title / Subtitle / labels customization
  simulatorTitleFontSize?: number;
  simulatorSubtitleFontSize?: number;
  simulatorSliderLabelFontSize?: number;
  simulatorImpactFontSize?: number;
  simulatorMicrocopyFontSize?: number;
  simulatorDisclaimerFontSize?: number;
  simulatorTransitionFontSize?: number;
  // Glow / borders
  simulatorCardGlowEnabled?: boolean;
  simulatorCardGlowIntensity?: number; // 0..100
  simulatorContainerBorderColor?: string; // override default dynamic border
  simulatorContainerBorderUseDyn?: boolean; // if true uses dynColor
  // Per-day display
  simulatorPerDayFontSize?: number;
  simulatorPerDayLabel?: string; // e.g. "clientes/dia"
  // Per-month label position (above number, below number, beside)
  simulatorPerMonthShowFirst?: boolean; // if true, big month card shows BEFORE per-day
  // Microcopy as rich text (allow inline color/bold)
  simulatorMicroLowHtml?: string;
  simulatorMicroMidHtml?: string;
  simulatorMicroHighHtml?: string;
  simulatorImpactHtml?: string;
  // Icons control
  simulatorIconsFloat?: boolean;
  simulatorIconsSize?: number;
  // Card order: array of "total"|"mgmt"|"ads"
  simulatorCardOrder?: string[];
  // Custom display labels for the card order chips in admin
  simulatorCardLabelTotal?: string;
  simulatorCardLabelMgmt?: string;
  simulatorCardLabelAds?: string;
  // Global scale 50..130 (%) — multiplies all simulator font sizes
  simulatorGlobalScale?: number;
  // Operator separators between metric cards (= and +)
  simulatorOperatorsEnabled?: boolean;
  simulatorOperatorEqualsColor?: string;
  simulatorOperatorPlusColor?: string;
  simulatorOperatorSize?: number;
  // Plans strip (chips/cards) shown above the slider
  simulatorPlansStripEnabled?: boolean;
  simulatorPlansStripFontSize?: number;
  simulatorPlansStripActiveColor?: string;
  simulatorPlansStripInactiveColor?: string;
  simulatorPlansStripGlow?: boolean;
  simulatorPlansStripPulse?: boolean;
  // Plan name shown between total and CTA
  simulatorPlanNameEnabled?: boolean;
  simulatorPlanNameFontSize?: number;
  simulatorPlanNameColor?: string;
  simulatorPlanNameGlow?: boolean;
  simulatorPlanNameUppercase?: boolean;
  simulatorPlanNameBold?: boolean;

  // ----- Smart CTA / Simulator gate -----
  /** Template usado pra construir a mensagem do WhatsApp depois que o cliente interage com o simulador.
   * Variáveis suportadas: {plano} {nome_plano} {dia} {clientes_dia} {mes} {clientes_mes} {total} {anuncios} {gestao} {prefixo} */
  whatsappMessageTemplate?: string;
  /** Força o CTA principal do Hero a ancorar para o simulador antes de abrir o WhatsApp. Default true. */
  ctaForceSimulatorHero1?: boolean;
  /** Força o CTA do plano positivo (Pill verde) a passar pelo simulador. Default true. */
  ctaForceSimulatorPillRed?: boolean;
  /** Força o ícone do WhatsApp no footer a passar pelo simulador. Default false (contato livre). */
  ctaForceSimulatorFooter?: boolean;
  /** Força os widgets WhatsApp CTA das seções a passar pelo simulador. Default true. */
  ctaForceSimulatorWidget?: boolean;

  // ----- Simulator CTA visual extras -----
  /** Centralizar o botão de CTA do simulador (default true). */
  simulatorCtaCenter?: boolean;
  /** Habilitar pulso animado no botão CTA do simulador. */
  simulatorCtaPulseEnabled?: boolean;
  /** Velocidade da animação de pulso (segundos). */
  simulatorCtaPulseSpeed?: number;
  /** Cor do anel/aura do pulso (default usa a cor dinâmica do simulador). */
  simulatorCtaPulseColor?: string;
  /** Intensidade do brilho do pulso 0..100. */
  simulatorCtaPulseIntensity?: number;

  // ----- Simulator extra WhatsApp widget (banner com foto antes da seta) -----
  /** Mostrar widget WhatsApp CTA antes da frase "Agora você decide:". */
  simulatorWidgetExtraEnabled?: boolean;
}

const CURRENT_PILLS_SCHEMA_VERSION = 2;
const DEFAULT_NEGATIVE_PLAN_ADMIN_NAME = "Plano 1";
const DEFAULT_POSITIVE_PLAN_ADMIN_NAME = "Plano 2";
const DEFAULT_NEGATIVE_PLAN_COLOR = "#dc2626";
const DEFAULT_POSITIVE_PLAN_COLOR = "#22c55e";
const DEFAULT_NEGATIVE_PLAN_INTENSITY = 1.25;
const LEGACY_NEGATIVE_PLAN_COLOR = "#3b82f6";
const LEGACY_POSITIVE_PLAN_COLOR = "#ff5c7c";

function normalizeLegacyPillsConfig(config: Partial<SiteConfig>): Partial<SiteConfig> {
  if ((config.pillsSchemaVersion ?? 1) >= CURRENT_PILLS_SCHEMA_VERSION) return config;

  const normalized = { ...config };
  const negativeColor = config.pillBlueColor?.trim().toLowerCase();
  const positiveColor = config.pillRedColor?.trim().toLowerCase();

  if (!negativeColor || negativeColor === LEGACY_NEGATIVE_PLAN_COLOR) {
    normalized.pillBlueColor = DEFAULT_NEGATIVE_PLAN_COLOR;
  }

  if (!positiveColor || positiveColor === LEGACY_POSITIVE_PLAN_COLOR) {
    normalized.pillRedColor = DEFAULT_POSITIVE_PLAN_COLOR;
  }

  if (!config.pillBlueAdminName) {
    normalized.pillBlueAdminName = DEFAULT_NEGATIVE_PLAN_ADMIN_NAME;
  }

  if (!config.pillRedAdminName) {
    normalized.pillRedAdminName = DEFAULT_POSITIVE_PLAN_ADMIN_NAME;
  }

  if (typeof config.pillBlueGlowIntensity !== "number") {
    normalized.pillBlueGlowIntensity = DEFAULT_NEGATIVE_PLAN_INTENSITY;
  }

  normalized.pillsSchemaVersion = CURRENT_PILLS_SCHEMA_VERSION;

  return normalized;
}

export const defaultConfig: SiteConfig = {
  accentColor: "#ff0033",
  bgColor: "#050a0a",
  whatsappLink: "https://wa.me/5519998701408?text=Olá%20Matheus!%20Vi%20seu%20site%20e%20quero%20saber%20mais.",
  adminPassword: "matheus2024",
  cardColor: "#0f1f3d",
  textColor: "#ffffff",
  mutedColor: "#8a8a8a",

  loadingEnabled: true,
  loadingText: "DECRYPTING ASSETS",
  loadingSect: "MR-DIGITAL",
  loadingDuration: 3000,
  loadingStartBtnEnabled: true,
  matrixTransitionDuration: 2000,
  matrixText: "MATHEUS RANGEL DIGITAL",
  matrixOrientation: "vertical" as const,
  matrixCharSpeed: 50,
  matrixEffect: "converge" as const,
  matrixNameFontFamily: "'JetBrains Mono', monospace",
  matrixNameFontSize: 0,
  matrixNameBold: true,
  matrixNameItalic: false,
  matrixNameLetterSpacing: 0,
  matrixImageUrl: "/images/matrix-avatar-nobg.png",
  matrixImageDuration: 3500,
  matrixImageEnabled: true,
  matrixImageCharSize: 0,
  matrixImageScale: 75,
  matrixImageOriginalColors: true,
  matrixImageTint: 25,
  matrixImageBgRain: true,
  matrixImageScanlines: true,
  matrixImageEffect: "ascii" as const,
  loadingPhases: [
    { text: "VERIFICANDO SISTEMA", sect: "MR-DIGITAL", duration: 800 },
    { text: "CARREGANDO ASSETS", sect: "WEB-DESIGN", duration: 800 },
    { text: "CONFIGURANDO MÓDULOS", sect: "TRAFEGO-PRO", duration: 800 },
    { text: "CONNECTING TO NEURAL LINK", sect: "MR-DIGITAL", duration: 800 },
  ],
  loadingStatusBar: {
    loadingLabel: "LOADING",
    loadedLabel: "LOADED",
    bufferLabel: "OVERLOAD",
    btnText: "I N I C I A R",
  },
  loadingBtnEffect: "neon" as const,

  heroNameBadge: "Matheus Rangel",
  heroNameTypingEnabled: true,
  heroNameTypingSpeed: 100,
  heroNameFontSize: 12,
  heroNameFontFamily: "JetBrains Mono, monospace",
  heroNameBold: false,
  heroTitle1: "Seu negócio está invisível",
  heroTitle2: "e você ainda não percebeu.",
  heroTitle3: "",
  heroTitle3FontSize: 28,
  heroTitle3GlitchEnabled: true,
  heroTitle3Color: "",
  heroTitle3Position: "below",
  heroTitleFontSize: 48,
  glitchEnabled: true,
  glitchSpeed: 3,
  glitchInterval: 5000,
  glitchDuration: 1200,
  glitchPositions: 3,
  heroDescription: "Marketing digital não é tendência. É infraestrutura.",
  heroIntroText: "Sou Matheus Rangel — especialista em criar presença digital que realmente vende. Sites, landing pages, lojas virtuais e gestão de anúncios no Google, Facebook e Instagram. Mais de 10 anos transformando negócios em máquinas de captar clientes.",
  heroBadge: "+ 10 ANOS DE EXPERIÊNCIA EM MARKETING DIGITAL",
  heroBadgeNeonEnabled: true,
  heroBadgeNeonColor: "auto",
  heroBadgeNeonSpeed: 3,
  heroBadgeNeonThickness: 2,
  heroCta1Text: "QUERO MAIS CLIENTES AGORA →",
  heroCta1Link: "",
  heroCta2Text: "VER MEUS SERVIÇOS",
  heroCta2Link: "#servicos",
  heroCtaSubline: "👉 Sem contrato. Sem complicação.",
  heroCtaSublineSpacing: 12,
  heroBottomSpacing: -120,
  heroTopSpacing: 0,
  heroMinHeight: 100,
  heroInnerPaddingTop: 0,
  seoHeaderTopPadding: 80,
  seoHeaderBottomPadding: 40,
  seoHeaderSeparatorMargin: 64,
  seoHeaderGridEnabled: true,
  seoHeaderBgColor: "#0a0f0a",

  toolsTitle: "Ferramentas & I.A's",
  toolsSubtitle: "Ferramentas que domino",
  toolsDescription: "Não uso ferramentas por moda. Uso o que funciona para o seu objetivo.",
  toolsSpeed1: 30,
  toolsSpeed2: 35,
  toolsIconSize: 80,
  toolsFloatAmplitude: 12,
  toolsFloatSpeed: 4,
  toolsMobilePaddingTop: 20,
  toolsMobilePaddingBottom: 20,
  toolsMobileGap: 12,
  toolsList: [
    { name: "Photoshop", url: "" },
    { name: "After Effects", url: "" },
    { name: "Figma", url: "" },
    { name: "Canva", url: "" },
    { name: "WordPress", url: "" },
    { name: "Google Ads", url: "" },
    { name: "Meta", url: "" },
    { name: "Instagram", url: "" },
    { name: "Google Analytics", url: "" },
    { name: "WhatsApp", url: "" },
    { name: "Google", url: "" },
    { name: "HTML5", url: "" },
    { name: "JavaScript", url: "" },
    { name: "Hotmart", url: "" },
    { name: "Elementor", url: "" },
    { name: "GTM", url: "" },
  ],

  diagTitle: "Seu negócio está fragmentado?",
  diagSubtitle: "A maioria dos negócios locais tem pelo menos 3 desses problemas.\nVocê tem quantos?",
  diagCards: [
    { num: "01", title: "Invisível no Google", desc: "Seu concorrente aparece. Você não. O cliente que quer te contratar vai direto para ele." },
    { num: "02", title: "Anúncios queimando dinheiro", desc: "Você impulsiona post, gasta R$500, consegue curtidas. Nenhum cliente. Isso não é tráfego pago." },
    { num: "03", title: "Site que não converte", desc: "Bonito mas inútil. Se ele não foi arquitetado para vender, é só um cartão de visitas que ninguém lê." },
    { num: "04", title: "Zero automação", desc: "Você responde tudo no braço, perde lead por demora, não tem funil. A operação te devora antes de crescer." },
  ],
  diagClosingLines: [
    { text: "👉 O problema não é seu produto.", color: "#22c55e", fontSize: 18 },
    { text: "É que ninguém está vendo você.", color: "#ffffff", fontSize: 18 },
    { text: "👉 E pior:", color: "#22c55e", fontSize: 18 },
    { text: "se isso não mudar… você continua no mesmo lugar.", color: "#ffffff", fontSize: 18 },
  ],
  diagClosingSpacing: 32,

  personasTitle: "Para quem está pronto para crescer de verdade.",
  personasCards: [
    { emoji: "🚀", title: "Negócios Locais", desc: "Clínicas, salões, pet shops, restaurantes, consultórios. Se você precisa de clientes locais, eu sei exatamente onde eles estão e como fazer você aparecer para eles." },
    { emoji: "🛒", title: "E-commerce & Lojas", desc: "Você vende online e quer mais vendas com menos desperdício de verba. Anúncios rentáveis, páginas que convertem, rastreamento preciso." },
    { emoji: "🤝", title: "Profissionais & Empresas", desc: "Advogados, arquitetos, consultores, empresas B2B. Presença digital profissional completa: site, identidade, anúncios e estratégia." },
  ],

  journeyTitle: "Do primeiro contato",
  journeySubtitle: "Processo estruturado. Sem surpresas. Sem enrolação.",
  journeyPhases: [
    { label: "FASE 01", title: "Diagnóstico & Estratégia", desc: "Mergulho fundo no seu negócio, concorrência e público. Definimos os canais certos, as metas reais e o caminho mais curto para resultado. Nada de papo de agência." },
    { label: "FASE 02", title: "Criação & Implementação", desc: "Site, landing page ou loja virtual. Criativos para campanha. Pixel, GA4, GTM — tudo configurado para decisões baseadas em dados reais." },
    { label: "FASE 03", title: "Escala & Otimização", desc: "Análise de dados toda semana. Testes A/B. Ajustes de campanha. Relatórios claros. Seu investimento trabalha mais a cada semana — não menos." },
  ],

  whatsappTitle: "Seu WhatsApp trabalhando por você",
  whatsappSubtitle: "O atendimento é a sua vitrine. Vamos estruturar um fluxo humanizado que converte.",
  whatsappBanner: "Futuro Próximo: vamos implementar automação completa no WhatsApp para agilizar atendimento mantendo humanização. Desenvolvimento incluído.",
  whatsappBannerEnabled: false,
  whatsappCards: [
    { icon: "⚡", title: "Velocidade é Tudo", desc: "Responder em minutos aumenta em 80% a chance de fechar. Configuramos alertas e fluxos para que nenhum lead esfrie." },
    { icon: "🤝", title: "Humanização Real", desc: "Áudios curtos, emojis, nome do cliente. Conexão real, não robô. Seu cliente se sente atendido, não processado." },
    { icon: "🔔", title: "Lembretes Automáticos", desc: "Avisos 24h e 2h antes do compromisso. Faltas são o maior inimigo do lucro. Acabamos com elas." },
    { icon: "⭐", title: "Pós-Atendimento", desc: "Pedimos avaliação no Google e seguimento no Instagram automaticamente. Máquina de indicações no piloto automático." },
  ],

  instagramTitle: "Do zero ao profissional.",
  instagramSubtitle: "Você posta, eu acompanho e direciono a estratégia.",
  instagramCards: [
    { icon: "💡", day: "SEGUNDA", title: "Dica da Semana", desc: "Vídeo curto (15–30s) com uma dica que resolve uma dúvida comum. Posiciona você como referência no assunto." },
    { icon: "🎬", day: "QUARTA", title: "Bastidores", desc: "Mostra o dia a dia, a equipe, o espaço. Humanização é tudo — pessoas compram de pessoas." },
    { icon: "🎁", day: "SEXTA", title: "Oferta da Semana", desc: "Post promocional com chamada clara para o WhatsApp. Converte seguidores em clientes." },
    { icon: "💬", day: "DIÁRIO", title: "Stories Interativos", desc: "Enquetes, perguntas, caixinhas. Quanto mais interação, mais o algoritmo te mostra para novas pessoas." },
  ],

  servicesTitle: "Seu <Portfólio/>",
  servicesSubtitle: "pronto para uso.",
  servicesProtocolTitle: "PROTOCOLO DE ATUALIZAÇÃO",
  servicesProtocolDesc: "Acesso a estratégias futuras, novos templates e atualizações de campanha conforme o mercado evolui.",
  servicesList: [
    "Site, Landing Page ou Loja Virtual arquitetada para converter",
    "Gestão profissional de anúncios: Google Ads, Facebook Ads, Instagram Ads",
    "Criação de criativos e conteúdo visual para campanhas",
    "Pixel de Rastreamento + Google Analytics 4 + GTM configurados",
    "Estratégia personalizada — não template de agência copiado",
    "Relatórios mensais + otimizações contínuas para maximizar ROI",
  ],

  authorityTitle1: "Você não está contratando uma agência.",
  authorityTitle2: "Está contratando o especialista.",
  authorityDesc: "",
  authorityIntro: "Agências cobram caro e repassam seu projeto.\n\nFreelancers baratos entregam qualquer coisa.",
  authorityEmphasis1: "👉 Aqui é diferente.",
  authorityEmphasis2: "",
  authorityBulletLabel: "Você fala direto comigo.\nE eu acompanho tudo de perto.",
  authorityBullets: ["Mais de 10 anos de experiência, foco total em resultado…", "e um sistema onde você consegue ver exatamente o que está acontecendo."],
  authorityClosing1: "👉 Sem achismo.",
  authorityClosing2: "Sem enrolação.",
  authorityClosing3: "Sem promessa vazia.",
  authorityClosing4: "",
  authorityBadges: ["+10 ANOS", "ATENDIMENTO DIRETO", "FOCO EM RESULTADO"],
  authorityEnabled: true,

  socialProofEnabled: true,
  socialProofTitle: "Clientes que apostaram e colheram resultado.",
  socialProofTestimonials: [
    { name: "Cliente 1", segment: "Segmento", text: "Depoimento será adicionado aqui." },
    { name: "Cliente 2", segment: "Segmento", text: "Depoimento será adicionado aqui." },
    { name: "Cliente 3", segment: "Segmento", text: "Depoimento será adicionado aqui." },
  ],
  socialProofHtmlEnabled: false,
  socialProofHtmlCode: "",
  socialProofHtmlSubtitle: "Resultados reais de clientes reais.",

  pillsTypingText: "Você? Talvez dependa da decisão que vai tomar...█",
  pillsTitle: "Dois caminhos. Só um muda alguma coisa.",
  pillsSubtitle: "Sua operação mudou. O mercado mudou. Qual caminho você vai escolher agora?",
  pillsHeroImageUrl: "",
  pillsHeroImageSize: 300,
  pillsIconSize: 96,
  pillsIconFloatSpeed: 1,
  pillsIconFloatIntensity: 8,
  pillsRecommendedLabel: "RECOMENDADO",
  pillsSchemaVersion: CURRENT_PILLS_SCHEMA_VERSION,
  pillBlueAdminName: DEFAULT_NEGATIVE_PLAN_ADMIN_NAME,
  pillBlueLabel: "CONTINUAR COMO ESTÁ",
  pillBlueColor: DEFAULT_NEGATIVE_PLAN_COLOR,
  pillBlueGlowIntensity: DEFAULT_NEGATIVE_PLAN_INTENSITY,
  pillBlueTitle: "CONTINUAR COMO ESTÁ",
  pillBlueSubtitle: "",
  pillBlueQuote: "\"A ignorância é confortável. Mas o mercado não perdoa quem decide estagnar.\"",
  pillBlueItems: [
    { text: "Continuar queimando dinheiro em anúncios sem estratégia" },
    { text: "Site bonito que ninguém encontra nem converte" },
    { text: "Concorrentes crescendo enquanto você estagna" },
    { text: "Sem dados, sem rastreamento, sem decisão inteligente" },
    { text: "Amanhã exatamente igual a hoje" },
  ],
  pillBlueBtnText: "TOMAR A PÍLULA AZUL",
  pillBlueBtnLink: "#",
  pillRedAdminName: DEFAULT_POSITIVE_PLAN_ADMIN_NAME,
  pillRedLabel: "A PÍLULA VERMELHA",
  pillRedColor: DEFAULT_POSITIVE_PLAN_COLOR,
  pillRedTitle: "TRABALHAR COM MATHEUS RANGEL",
  pillRedSubtitle: "",
  pillRedQuote: "\"Entramos no código do seu negócio para refazer tudo aquilo que você sabe que não funciona mais.\"",
  pillRedItems: [
    { text: "Estratégia digital personalizada para o SEU negócio" },
    { text: "Site ou LP arquitetada para atrair, convencer e converter" },
    { text: "Anúncios gerenciados por quem entende de resultado real" },
    { text: "Rastreamento preciso — você vê onde está cada centavo" },
    { text: "Suporte contínuo e otimizações mensais incluídas" },
    { text: "Atendimento direto com o especialista — sem intermediários" },
  ],
  pillRedBtnText: "TOMAR A PÍLULA VERMELHA",
  pillRedBtnLink: "",

  aboutTitle1: "Não sou agência.",
  aboutTitle2: "Sou o especialista que cuida do seu negócio pessoalmente.",
  aboutSubtitle: "",
  aboutBio1: "",
  aboutBio2: "",
  aboutBio3: "",
  aboutBioParagraphs: [
    "Me chamo Matheus Rangel. Há mais de 10 anos ajudo donos de negócio a conseguir mais clientes usando a internet — sem complicação, sem enrolação.",
    "Quando você me contrata, fala direto comigo. Eu mesmo crio os anúncios, acompanho os resultados e te explico tudo de forma simples, sem termos técnicos difíceis.\n\nNão importa se você tem uma clínica, um salão, uma loja ou qualquer outro negócio — se você quer mais clientes, eu sei como fazer isso acontecer.",
    "Traga seu problema. Eu entrego a solução.",
  ],
  aboutMainPhoto: "",
  aboutPhotos: [
    { label: "No trabalho", url: "" },
    { label: "Evento", url: "" },
    { label: "Bastidores", url: "" },
  ],
  aboutPhotosPerRow: 3,
  aboutBadges: [],

  faqTitle: "Dúvidas Frequentes",
  faqBadge: "BANCO DE RESPOSTAS",
  faqList: [
    { q: "O que está incluso?", a: "Depende do objetivo. Atendo desde criação de site até gestão completa de tráfego pago com automações. Cada projeto é personalizado." },
    { q: "Qual o prazo de entrega?", a: "Landing Page: 2–5 dias úteis. Site completo: 10–15 dias. Loja virtual: 15–30 dias." },
    { q: "Preciso de domínio e hospedagem?", a: "Sim. Oriento sobre as melhores opções do mercado com melhor custo-benefício." },
    { q: "Você garante resultado nos anúncios?", a: "Garanto estratégia profissional e transparência total. Resultado depende também do produto e atendimento do cliente." },
    { q: "Como funciona a automação de WhatsApp?", a: "Desenvolvemos o fluxo completo: recepção, qualificação, lembretes e pós-atendimento. Você atende com mais qualidade em menos tempo." },
    { q: "Como começo?", a: "Clique no WhatsApp, me conta o que precisa, e envio uma proposta personalizada em até 24h." },
  ],

  footerName: "Matheus Rangel",
  footerText: "Site Desenvolvido por Matheus Rangel · Web Designer · Especialista em Tráfego Pago",
  footerCopyright: "©2024 Matheus Rangel — Todos os Direitos Reservados",
  footerDisclaimer: "Este site não é afiliado, endossado ou administrado pelo Google, Meta ou qualquer plataforma de anúncios.",
  footerCnpj: "26.168.969/0001-60",
  footerEmail: "contato@matheusrangel.com.br",
  footerWhatsapp: "(19) 99870-1408",
  footerLinks: [
    { text: "TERMOS DE USO", url: "#" },
    { text: "POLÍTICA DE PRIVACIDADE", url: "#" },
    { text: "POLÍTICA DE COOKIES", url: "#" },
    { text: "REEMBOLSOS", url: "#" },
    { text: "CONTATO", url: "#" },
  ],
  footerInstagramUrl: "https://instagram.com/matheusrangel",
  footerIconSize: 20,
  footerIconEffect: "bounce" as const,
  footerIconEffectSpeed: 2,
  footerMotivationalPhrase: "Sua frase aqui!",
  footerFieldsOrder: ["name", "text", "copyright", "disclaimer", "cnpj", "email", "whatsapp", "motivational"],

  audioLoadingUrl: "",

  audioLoadingVolume: 50,
  audioLoadingDelay: 0,

  audioClickUrl: "",
  audioClickVolume: 70,

  audioSiteUrl: "https://afalha.club/trilha.mp3",
  audioSiteVolume: 35,
  audioSiteDelay: 3,

  audioMutedDefault: true,

  metaTitle: "Matheus Rangel — Marketing Digital",
  metaDescription: "Especialista em marketing digital com mais de 10 anos de experiência.",
  metaKeywords: "marketing digital, tráfego pago, web design, gestão de anúncios",
  ogImageUrl: "",
  faviconUrl: "",
  customDomain: "",
  customSlug: "pagina-de-vendas",
  scanlinesEnabled: true,
  scrollSpeed: 30,

  introVideoEnabled: false,
  introVideoUrl: "",
  introVideoDuration: 10,

  floatingIcons: {
    about: { type: "lucide", source: "User", size: 48, speed: 1, isCircle: true },
    diag: { type: "lucide", source: "Search", size: 48, speed: 1, isCircle: false },
    personas: { type: "lucide", source: "Target", size: 48, speed: 1, isCircle: false },
    journey: { type: "lucide", source: "MapPin", size: 48, speed: 1, isCircle: false },
    whatsapp: { type: "platform", source: "whatsapp", size: 48, speed: 1, isCircle: false },
    instagram: { type: "platform", source: "instagram", size: 48, speed: 1, isCircle: false },
    services: { type: "lucide", source: "Briefcase", size: 48, speed: 1, isCircle: false },
    authority: { type: "lucide", source: "Zap", size: 48, speed: 1, isCircle: false },
    social: { type: "lucide", source: "MessageSquare", size: 48, speed: 1, isCircle: false },
    pills: { type: "lucide", source: "TrendingUp", size: 48, speed: 1, isCircle: false },
    provasocial: { type: "lucide", source: "Award", size: 48, speed: 1, isCircle: false },
    dashboard: { type: "lucide", source: "BarChart3", size: 48, speed: 1, isCircle: false },
    faq: { type: "lucide", source: "HelpCircle", size: 48, speed: 1, isCircle: false },
    simulator: { type: "lucide", source: "Calculator", size: 48, speed: 1, isCircle: false },
  },

  gtmId: "",
  gaId: "",
  fbPixelId: "",
  fbPixelSecondaryId: "",
  customHtmlHead: "",
  customHtmlBody: "",
  utmTrackingEnabled: true,
  buttonTrackingEnabled: true,
  visitorTrackingEnabled: true,

  adminTheme: "dark",
  siteTheme: "cyberpunk",
  hiddenSections: [],
  sectionOrder: ["loading","hero","tools","about","diag","personas","journey","whatsapp","instagram","services","authority","dashboard","provasocial","investment","simulator","pills","faq","footer"],
  titleColorOverrides: {},
  sectionTitleLines: {},
  whatsappCtaAvatarUrl: "",
  whatsappCtaAvatarSize: 72,
  whatsappCtaIconSize: 44,
  whatsappCtaTitle1: "ATENDIMENTO",
  whatsappCtaTitle2: "WHATSAPP",
  whatsappCtaBtnText: "Clique Aqui Agora",
  whatsappCtaBtnBlink: true,
  whatsappCtaBtnBlinkSpeed: 2,
  whatsappCtaIconShake: true,
  whatsappCtaIconShakeSpeed: 2,
  whatsappCtaNeonBorder: true,
  whatsappCtaNeonSpeed: 2,
  whatsappCtaSections: [],
  whatsappCtaTitle1Size: 18,
  whatsappCtaTitle1Color: "#FFFFFF",
  whatsappCtaTitle2Size: 26,
  whatsappCtaTitle2Gradient1: "#25D366",
  whatsappCtaTitle2Gradient2: "#0AE85E",
  whatsappCtaBtnSize: 14,
  whatsappCtaBtnGradient1: "#25D366",
  whatsappCtaBtnGradient2: "#0AE85E",
  whatsappCtaBtnColor: "#FFFFFF",
  whatsappCtaTextAlign: "left",
  whatsappCta3D: true,
  whatsappCtaTitle1Font: "Poppins",
  whatsappCtaTitle1Bold: true,
  whatsappCtaTitle1Italic: false,
  whatsappCtaTitle1LetterSpacing: 1,
  whatsappCtaTitle1LineHeight: 1.1,
  whatsappCtaTitle2Font: "Poppins",
  whatsappCtaTitle2Bold: true,
  whatsappCtaTitle2Italic: false,
  whatsappCtaTitle2LetterSpacing: 2,
  whatsappCtaTitle2LineHeight: 1.1,
  whatsappCtaBtnFont: "Poppins",
  whatsappCtaBtnBold: true,
  whatsappCtaBtnItalic: false,
  whatsappCtaBtnLetterSpacing: 0,
  whatsappCtaBtnLineHeight: 1.2,
  whatsappCtaGlobalEffect: "none" as const,
  whatsappCtaGlobalEffectSpeed: 2,
  whatsappCtaGlobalEffectDuration: 0.5,
  whatsappCtaGlobalEffectIntensity: 5,
  whatsappCtaScanlines: false,
  whatsappCtaScanlineThickness: 2,
  whatsappCtaScanlineOpacity: 0.15,
  whatsappCtaScanlineSpeed: 3,
  whatsappCtaScanlineColor: "#00ff41",
  whatsappCtaHackerGlow: false,
  whatsappCtaHackerGlowColor: "#25D366",
  whatsappCtaHackerGlowIntensity: 5,
  whatsappCtaHackerGlowSpeed: 2,
  whatsappCtaPhraseEnabled: true,
  whatsappCtaPhraseText: "Clique abaixo e fale comigo no WhatsApp 👇",
  whatsappCtaPhraseSize: 16,
  whatsappCtaPhraseColor: "#FFFFFF",
  whatsappCtaPhraseFont: "Poppins",
  whatsappCtaPhraseBold: false,
  whatsappCtaPhraseItalic: false,
  whatsappCtaPhraseAlign: "center" as const,
  whatsappCtaPhraseLineHeight: 1.4,
  whatsappCtaPhraseLetterSpacing: 0,
  whatsappCtaMarginBottom: 0,
  dividerThickness: 1,
  dividerOpacity: 0.25,
  dividerColor: "",
  dividerColorAuto: true,
  dividerGlow: false,
  dividerGlowIntensity: 5,
  dividerGlowColor: "",
  dividerEffect: "none" as const,
  dividerEffectSpeed: 2,
  dividerMaxWidth: "6xl",
  dividerMarginY: 8,
  subtitleFontSize: 14,
  subtitleColor: "",
  subtitleGap: 8,
  htmlSections: [],
  sectionSubtitle2: {},
  sectionClosingEnabled: {},
  sectionClosingLine1Green: {},
  sectionClosingLine1White: {},
  sectionClosingLine2Green: {},
  sectionClosingLine2White: {},

  dashboardIntro: "Cada cliente meu recebe acesso a um painel exclusivo, onde pode acompanhar o desempenho das campanhas em tempo real.",
  dashboardEmphasis1: "👉 Nada de esperar relatório.",
  dashboardEmphasis2: "👉 Nada de \"confia em mim\".",
  dashboardBullets: [
    "Investimento total",
    "Cliques e alcance",
    "Quantidade de mensagens",
    "Custo por cliente",
    "Evolução dos resultados",
  ],
  dashboardClosing1: "👉 Se não estiver funcionando…",
  dashboardClosing2: "você sabe.",
  dashboardClosing3: "👉 Se estiver funcionando…",
  dashboardClosing4: "você vê crescer.",
  dashboardBadgeText: "💣 PRÉVIA DO SEU PAINEL",
  dashboardDisclaimer: "* Dados ilustrativos. Seu painel terá métricas reais do seu negócio.",
  dashboardGoalPercent: 78,
  dashboardGoalLabel: "Meta de Conversões",
  dashboardCardsConfig: {
    invested: { enabled: true, label: "Valor Investido", desc: "Valor Total investido em seus anúncios", color: "#22c55e" },
    clicks: { enabled: true, label: "Pessoas que Clicou no Anúncio", desc: "Cliques de saída de pessoas únicas", color: "#60a5fa" },
    msgs: { enabled: true, label: "Conversas por Mensagem", desc: "Pessoas que iniciaram conversa pelo WhatsApp", color: "#25D366" },
    cpmsg: { enabled: true, label: "Custo por Mensagem", desc: "Quanto custou cada mensagem recebida", color: "#25D366" },
    conv: { enabled: true, label: "Aproveitamento de Conversas", desc: "Percentual de conversas aproveitadas sobre o total", color: "#25D366" },
    profile: { enabled: true, label: "Visitas ao Perfil do Instagram", desc: "Visitas ao perfil do Instagram geradas pelos anúncios", color: "#E1306C" },
    followers: { enabled: true, label: "Seguidores no Instagram", desc: "Novos seguidores conquistados no Instagram", color: "#E1306C" },
  },
  dashboardBlocksOrder: ["costs", "strategy", "kpis", "whatsapp", "instagram", "budget"],
  dashboardBlocksVisible: { costs: true, strategy: true, kpis: true, whatsapp: true, instagram: true, budget: true },
  dashboardStrategyTitle: "📊 🏠 Campanha de Mensagens Ativas",
  dashboardStrategySubtitle: "O que estamos fazendo pela sua empresa ✅",
  dashboardStrategyDesc: "Esta campanha foi configurada para trazer pessoas diretamente para o seu WhatsApp. Cada mensagem recebida é uma oportunidade real de venda. Quanto mais mensagens com menor custo, melhor está funcionando o anúncio.",
  dashboardCostsTitle: "CUSTOS MÉDIOS",
  dashboardResultsTitle: "Resultados Alcançados",
  dashboardBudgetTitle: "Orçamento — Distribuição de Investimento",

  // Investment Section
  investmentBadge: "INVESTIMENTO",
  investmentTitle: "Quanto você precisa investir pra começar a receber clientes todos os dias?",
  investmentSubtitle: "Não é custo. É investimento direto em clientes.",
  investmentBreakText: "Você não paga só pelo serviço.\nVocê investe em duas coisas:",
  investmentBlock1Tag: "BLOCO 1 — SUA MÃO DE OBRA",
  investmentBlock1Title: "🧠 Estratégia + Execução + Acompanhamento",
  investmentBlock1Bullets: "→ Criação e gestão dos anúncios\n→ Estrutura do WhatsApp pra conversão\n→ Otimizações constantes\n→ Suporte direto comigo",
  investmentBlock1Price: "💰 A partir de R$ 799/mês",
  investmentBlock2Tag: "BLOCO 2 — INVESTIMENTO EM ANÚNCIOS",
  investmentBlock2Title: "📢 O dinheiro que traz os clientes até você",
  investmentBlock2Desc: "Você define quanto quer investir.",
  investmentBlock2Examples: "→ R$ 20/dia = R$ 600/mês\n→ R$ 30/dia = R$ 900/mês",
  investmentSumTag: "💣 SOMA TOTAL — CLAREZA EXTREMA",
  investmentSumIntro: "👉 Exemplo real:",
  investmentSumExample: "Se você investir R$ 20/dia:",
  investmentSumFormula: "💰 R$ 799 (gestão) + R$ 600 (anúncios)",
  investmentSumTotal: "= R$ 1.399/mês",
  investmentObjectionIntro: "👉 Agora pensa comigo:",
  investmentObjectionText: "Se isso te traz 1 cliente por dia…\nisso se paga ou não?",
  investmentPositionText: "O problema nunca foi o valor.\nO problema é não ter cliente entrando.",
  investmentAnchor1: "👉 Tem gente gastando isso e crescendo.",
  investmentAnchor2: "👉 E tem gente economizando… e ficando parado.",
  investmentTransition: "Agora você decide:",

  // Simulator Section
  simulatorBadge: "SIMULADOR",
  simulatorTitle: "Monte seu plano em segundos",
  simulatorSubtitle: "Arraste e descubra o investimento ideal pro seu negócio.",
  simulatorSliderLabel: "Quantos clientes por dia você quer receber no seu WhatsApp?",
  simulatorMicroLow: "Você começa a ter seus primeiros clientes chegando.",
  simulatorMicroMid: "Seu WhatsApp começa a ter movimento todos os dias.",
  simulatorMicroHigh: "🔥 Aqui você entra em crescimento acelerado.",
  simulatorImpactText: "Com esse investimento, você pode gerar aproximadamente {month} clientes por mês.",
  simulatorCtaText: "Quero esses {month} clientes por mês",
  simulatorDisclaimer: "Os valores são estimativas conservadoras.\nNa prática, o custo por cliente pode ser menor.",
  simulatorTransitionText: "Agora você decide:",
  simulatorArrowSize: 48,
  simulatorColorLow: "#ef4444",
  simulatorColorMid: "#eab308",
  simulatorColorHigh: "#22c55e",
  simulatorPlans: [
    { name: "Plano Inicial", prefix: "Até", perDay: 1, perMonth: 30, ads: 300, management: 799, total: 1099 },
    { name: "Plano Básico", prefix: "Até", perDay: 2, perMonth: 60, ads: 600, management: 799, total: 1399 },
    { name: "Plano Recomendado", prefix: "Até", perDay: 3, perMonth: 90, ads: 900, management: 900, total: 1800 },
    { name: "Plano Avançado", prefix: "Até", perDay: 4, perMonth: 120, ads: 1200, management: 1100, total: 2300 },
    { name: "Plano Pro", prefix: "Até", perDay: 5, perMonth: 150, ads: 1500, management: 1100, total: 2600 },
    { name: "Plano Premium", prefix: "Até", perDay: 6, perMonth: 180, ads: 1800, management: 1300, total: 3100 },
    { name: "Plano Elite", prefix: "Até", perDay: 7, perMonth: 210, ads: 2100, management: 1300, total: 3400 },
    { name: "Plano Top", prefix: "Até", perDay: 8, perMonth: 240, ads: 2400, management: 1500, total: 3900 },
  ],
  // Simulator card customization
  simulatorCardAdsColor: "#3b82f6",
  simulatorCardMgmtColor: "#3b82f6",
  simulatorCardTotalColor: "#22c55e",
  simulatorCardAdsLabel: "Anúncios",
  simulatorCardMgmtLabel: "Gestão",
  simulatorCardTotalLabel: "Total Mensal",
  simulatorMetricFontSize: 36,
  simulatorMetricSubFontSize: 16,
  simulatorGrowthChartEnabled: true,
  simulatorCtaTextColor: "#ffffff",
  simulatorPerMonthCardColor: "#22c55e",
  simulatorPerMonthLabel: "Novos Clientes no WhatsApp por mês",
  simulatorPerMonthFontSize: 56,
  simulatorShowTotalBeforeCta: true,
  simulatorTotalBeforeCtaLabel: "Investimento total mensal",
  simulatorTotalBeforeCtaColor: "#22c55e",
  simulatorCtaFullWidth: true,
  simulatorCtaFontSize: 20,
  simulatorTitleFontSize: 48,
  simulatorSubtitleFontSize: 18,
  simulatorSliderLabelFontSize: 18,
  simulatorImpactFontSize: 20,
  simulatorMicrocopyFontSize: 18,
  simulatorDisclaimerFontSize: 13,
  simulatorTransitionFontSize: 22,
  simulatorCardGlowEnabled: true,
  simulatorCardGlowIntensity: 50,
  simulatorContainerBorderColor: "#22c55e",
  simulatorContainerBorderUseDyn: true,
  simulatorPerDayFontSize: 64,
  simulatorPerDayLabel: "clientes/dia",
  simulatorPerMonthShowFirst: true,
  simulatorIconsFloat: true,
  simulatorIconsSize: 22,
  simulatorCardOrder: ["total", "mgmt", "ads"],
  simulatorCardLabelTotal: "Total Mensal",
  simulatorCardLabelMgmt: "Gestão",
  simulatorCardLabelAds: "Anúncios",
  simulatorGlobalScale: 100,
  simulatorOperatorsEnabled: true,
  simulatorOperatorEqualsColor: "#22c55e",
  simulatorOperatorPlusColor: "#eab308",
  simulatorOperatorSize: 36,
  simulatorPlansStripEnabled: true,
  simulatorPlansStripFontSize: 14,
  simulatorPlansStripActiveColor: "#22c55e",
  simulatorPlansStripInactiveColor: "#3f3f46",
  simulatorPlansStripGlow: true,
  simulatorPlansStripPulse: true,
  simulatorPlanNameEnabled: true,
  simulatorPlanNameFontSize: 22,
  simulatorPlanNameColor: "#22c55e",
  simulatorPlanNameGlow: true,
  simulatorPlanNameUppercase: true,
  simulatorPlanNameBold: true,

  // Smart CTA defaults
  whatsappMessageTemplate:
    "Olá Matheus! Quero o plano *{plano}* — {clientes_dia} clientes/dia ({clientes_mes}/mês). Investimento total: *{total}* (Anúncios {anuncios} + Gestão {gestao}).",
  ctaForceSimulatorHero1: true,
  ctaForceSimulatorPillRed: true,
  ctaForceSimulatorFooter: false,
  ctaForceSimulatorWidget: true,

  // Simulator CTA pulse defaults
  simulatorCtaCenter: true,
  simulatorCtaPulseEnabled: true,
  simulatorCtaPulseSpeed: 2,
  simulatorCtaPulseColor: "",
  simulatorCtaPulseIntensity: 70,

  // Extra simulator WhatsApp widget
  simulatorWidgetExtraEnabled: true,
};

const STORAGE_KEY = "sales_page_config";
const EVENT_NAME = "sales-page-config-updated";

// In-memory cache to avoid repeated DB reads within same session
let memoryCache: SiteConfig | null = null;

const DEFAULT_FLOATING_ICON: SectionFloatingIcon = {
  type: "none",
  source: "",
  size: 48,
  speed: 1,
  isCircle: false,
};

function mergeFloatingIcons(
  icons?: Record<string, Partial<SectionFloatingIcon>> | null,
): Record<string, SectionFloatingIcon> {
  const mergedIcons: Record<string, SectionFloatingIcon> = {
    ...defaultConfig.floatingIcons,
  };

  if (!icons) return mergedIcons;

  for (const [key, value] of Object.entries(icons)) {
    const baseIcon = defaultConfig.floatingIcons[key] ?? DEFAULT_FLOATING_ICON;
    const mergedIcon = {
      ...baseIcon,
      ...value,
    } as SectionFloatingIcon;

    if (key === "pills" && mergedIcon.type === "lucide" && (!mergedIcon.source || mergedIcon.source === "Pill")) {
      mergedIcon.source = "TrendingUp";
    }

    mergedIcons[key] = mergedIcon;
  }

  return mergedIcons;
}

function mergeConfigWithDefaults(config?: Partial<SiteConfig> | null): SiteConfig {
  const parsed = normalizeLegacyPillsConfig((config ?? {}) as Partial<SiteConfig>);

  return {
    ...defaultConfig,
    ...parsed,
    floatingIcons: mergeFloatingIcons(parsed.floatingIcons),
    titleColorOverrides: {
      ...defaultConfig.titleColorOverrides,
      ...(parsed.titleColorOverrides ?? {}),
    },
    sectionTitleLines: {
      ...defaultConfig.sectionTitleLines,
      ...(parsed.sectionTitleLines ?? {}),
    },
  };
}

function loadConfigFromMemory(): SiteConfig {
  if (memoryCache) return { ...memoryCache };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<SiteConfig>;
      const merged = mergeConfigWithDefaults(parsed);
      memoryCache = merged;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
      return merged;
    }
  } catch {}
  return mergeConfigWithDefaults();
}

function saveConfigToMemory(config: SiteConfig) {
  const normalized = mergeConfigWithDefaults(config);
  memoryCache = normalized;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

// Database persistence functions
import { supabase } from "@/lv/integrations/supabase/client";

async function loadConfigFromDB(): Promise<SiteConfig> {
  try {
    const { data, error } = await supabase
      .from("sales_page_config" as any)
      .select("config")
      .eq("id", "default")
      .maybeSingle();

    if (error) {
      console.error("[SP-CONFIG] DB load error:", error.message);
      return mergeConfigWithDefaults();
    }

    if (data && (data as any).config) {
      const merged = mergeConfigWithDefaults((data as any).config as Record<string, any>);
      memoryCache = merged;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
      return merged;
    }
  } catch (e) {
    console.error("[SP-CONFIG] DB load exception:", e);
  }
  return mergeConfigWithDefaults();
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let latestConfigToSave: SiteConfig | null = null;

async function saveConfigToDB(config: SiteConfig, immediate = false) {
  latestConfigToSave = mergeConfigWithDefaults(config);

  if (immediate) {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = null;
    await flushSaveToDB();
    return;
  }

  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => flushSaveToDB(), 500);
}

async function flushSaveToDB() {
  if (!latestConfigToSave) return;
  const config = mergeConfigWithDefaults(latestConfigToSave);
  try {
    const { error } = await supabase
      .from("sales_page_config" as any)
      .upsert({ id: "default", config: config as any, updated_at: new Date().toISOString() } as any, { onConflict: "id" });

    if (error) {
      console.error("[SP-CONFIG] DB save error:", error.message);
    }
  } catch (e) {
    console.error("[SP-CONFIG] DB save exception:", e);
  }
}

export function useConfig() {
  const [config, setConfigState] = useState<SiteConfig>(() => loadConfigFromMemory());
  const [dbLoaded, setDbLoaded] = useState(false);

  useEffect(() => {
    loadConfigFromDB().then((dbConfig) => {
      setConfigState(dbConfig);
      setDbLoaded(true);
    });
  }, []);

  useEffect(() => {
    const handler = () => {
      setConfigState(loadConfigFromMemory());
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
    };
  }, []);

  const updateConfig = useCallback((partial: Partial<SiteConfig>) => {
    setConfigState((prev) => {
      const next = mergeConfigWithDefaults({
        ...prev,
        ...partial,
        floatingIcons: partial.floatingIcons
          ? { ...prev.floatingIcons, ...partial.floatingIcons }
          : prev.floatingIcons,
        titleColorOverrides: partial.titleColorOverrides
          ? { ...prev.titleColorOverrides, ...partial.titleColorOverrides }
          : prev.titleColorOverrides,
        sectionTitleLines: partial.sectionTitleLines
          ? { ...prev.sectionTitleLines, ...partial.sectionTitleLines }
          : prev.sectionTitleLines,
      });
      saveConfigToMemory(next);
      saveConfigToDB(next);
      return next;
    });
  }, []);

  const resetConfig = useCallback(() => {
    const fresh = mergeConfigWithDefaults();
    saveConfigToMemory(fresh);
    saveConfigToDB(fresh);
    setConfigState(fresh);
  }, []);

  const exportConfig = useCallback(() => {
    const data = memoryCache || mergeConfigWithDefaults();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sales-page-config.json";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const importConfig = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json) as Partial<SiteConfig>;
      const merged = mergeConfigWithDefaults(parsed);
      saveConfigToMemory(merged);
      saveConfigToDB(merged);
      setConfigState(merged);
      return true;
    } catch {
      return false;
    }
  }, []);

  const forceSave = useCallback(async () => {
    const current = memoryCache || config;
    await saveConfigToDB(current, true);
  }, [config]);

  return { config, updateConfig, resetConfig, exportConfig, importConfig, forceSave };
}

export function usePublicConfig() {
  const [config, setConfig] = useState<SiteConfig>(() => loadConfigFromMemory());

  // Load from DB on mount
  useEffect(() => {
    loadConfigFromDB().then((dbConfig) => {
      setConfig(dbConfig);
    });
  }, []);

  useEffect(() => {
    const handler = () => {
      setConfig(loadConfigFromMemory());
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
    };
  }, []);

  return config;
}
