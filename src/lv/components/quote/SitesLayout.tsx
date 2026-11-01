// @ts-nocheck
"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { ColorTheme } from "@/lv/lib/colorThemes";
import type { Tables } from "@/lv/integrations/supabase/types";
import { supabase } from "@/lv/integrations/supabase/client";
import {
  Globe, Sparkles, Check, ChevronDown, ArrowRight, Zap, ShieldCheck, Smartphone,
} from "lucide-react";
import { WhatsAppIcon } from "@/lv/components/icons/PlatformIcons";
import {
  DesignIcon, ResponsiveIcon, SpeedIcon, GoogleBrandIcon, WhatsAppBrandIcon, SecurityIcon,
  HandshakeIcon, TargetIcon, RocketIcon, TrendingIcon, SupportIcon,
} from "@/lv/components/icons/PremiumSiteIcons";
import { resolveQuotePlans, normalizePlanDefaults, type QuotePlanConfig } from "@/lv/lib/quotePlans";
import ProfessionalFooter from "./ProfessionalFooter";
import ReviewsSection from "./ReviewsSection";
import FaqSection from "./FaqSection";
import ExclusiveClientHeader from "./ExclusiveClientHeader";

interface Props {
  quote: Tables<"quotes">;
  theme: ColorTheme;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as any } }),
};

const CARDS = [
  { icon: DesignIcon, title: "Design Exclusivo", text: "Layout desenvolvido especialmente para sua empresa, respeitando sua identidade visual." },
  { icon: ResponsiveIcon, title: "Totalmente Responsivo", text: "Perfeito em computadores, tablets e celulares." },
  { icon: SpeedIcon, title: "Alta Performance", text: "Carregamento rápido para oferecer uma excelente experiência ao visitante." },
  { icon: GoogleBrandIcon, title: "Estrutura para Google", text: "Organizado seguindo boas práticas para facilitar o posicionamento nas pesquisas." },
  { icon: WhatsAppBrandIcon, title: "Integração com WhatsApp", text: "Facilite o contato direto entre sua empresa e seus clientes." },
  { icon: SecurityIcon, title: "Segurança", text: "Tecnologias modernas para garantir estabilidade e proteção do seu projeto." },
];

const STEPS = [
  { n: 1, title: "Conhecemos seu negócio.", text: "Entendemos seus objetivos, seu público e como seu site deve funcionar." },
  { n: 2, title: "Planejamos toda a estrutura.", text: "Organizamos páginas, conteúdos e experiência do usuário antes do desenvolvimento." },
  { n: 3, title: "Criamos o design.", text: "Desenvolvemos um layout moderno, profissional e alinhado à sua marca." },
  { n: 4, title: "Programamos tudo.", text: "Transformamos o projeto em um site rápido, seguro e totalmente responsivo." },
  { n: 5, title: "Publicamos.", text: "Seu site entra no ar pronto para receber visitantes e gerar novas oportunidades." },
];

const DIFFS = [
  { icon: HandshakeIcon, title: "Atendimento próximo", text: "Você acompanha todas as etapas do projeto." },
  { icon: TargetIcon, title: "Projeto personalizado", text: "Nada de modelos genéricos. Seu site será único." },
  { icon: RocketIcon, title: "Tecnologia atual", text: "Utilizamos ferramentas modernas para garantir desempenho e estabilidade." },
  { icon: TrendingIcon, title: "Pensado para crescer", text: "Seu projeto poderá evoluir junto com sua empresa." },
  { icon: SupportIcon, title: "Suporte", text: "Continuamos disponíveis após a entrega para auxiliar quando necessário." },
];

const INCLUDED = [
  "Design personalizado", "Página inicial", "Páginas institucionais",
  "Página de serviços", "Formulário de contato", "Botão para WhatsApp",
  "Mapa de localização", "Integração com redes sociais", "Certificado SSL",
  "Otimização de velocidade", "SEO básico", "Hospedagem (quando contratada)",
];

const FAQ_LOCAL = [
  { q: "Meu site funcionará no celular?", a: "Sim. Todos os projetos são desenvolvidos para oferecer uma ótima experiência em qualquer dispositivo." },
  { q: "Em quanto tempo fica pronto?", a: "O prazo varia conforme a complexidade do projeto, mas será informado antes do início do desenvolvimento." },
  { q: "Posso solicitar alterações?", a: "Sim. Durante o desenvolvimento você poderá acompanhar o projeto e validar as etapas." },
  { q: "O site aparecerá no Google?", a: "Criamos toda a estrutura seguindo boas práticas de SEO para facilitar o posicionamento nas pesquisas." },
  { q: "Depois da entrega vocês oferecem suporte?", a: "Sim. Permanecemos disponíveis para auxiliar sempre que necessário." },
];

// ─────────────────────────────────────────────────────────────
// 3D floating browser mockup (pure CSS+SVG, no external assets)
// ─────────────────────────────────────────────────────────────
function BrowserMockup({ accent }: { accent: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, rotateX: 25, y: 40 }}
      animate={{ opacity: 1, rotateX: 12, y: 0 }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-xl"
      style={{ perspective: 1200, transformStyle: "preserve-3d" }}
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-gradient-to-br from-slate-900 to-slate-800 mockup-3d"
        style={{ boxShadow: `0 40px 80px -20px ${accent}55, 0 20px 40px -20px rgba(0,0,0,0.5)` }}
      >
        {/* window chrome */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border-b border-white/10">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <div className="ml-3 flex-1 h-5 rounded-md bg-white/5 border border-white/10 flex items-center px-2">
            <span className="text-[10px] text-white/40">https://sua-empresa.com.br</span>
          </div>
        </div>
        {/* content */}
        <div className="p-5 grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-2">
            <div className="h-4 rounded bg-white/15 w-3/4" />
            <div className="h-3 rounded bg-white/10 w-full" />
            <div className="h-3 rounded bg-white/10 w-5/6" />
            <div className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-semibold" style={{ background: accent, color: "#fff" }}>
              Fale conosco
            </div>
          </div>
          <div className="rounded-lg overflow-hidden" style={{ background: `linear-gradient(135deg, ${accent}66, ${accent}22)` }}>
            <div className="aspect-square" />
          </div>
          <div className="col-span-3 grid grid-cols-3 gap-2 mt-2">
            {[0,1,2].map(i => (
              <div key={i} className="h-14 rounded-md bg-white/5 border border-white/10" />
            ))}
          </div>
        </div>
      </motion.div>

      {/* floating badges */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        className="absolute -top-4 -left-4 rounded-xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 px-3 py-2 shadow-xl"
      >
        <div className="flex items-center gap-2 text-xs text-white">
          <Zap className="h-3.5 w-3.5 text-amber-300" />
          <span>Carrega em 1.2s</span>
        </div>
      </motion.div>
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute -bottom-5 -right-4 rounded-xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 px-3 py-2 shadow-xl"
      >
        <div className="flex items-center gap-2 text-xs text-white">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
          <span>SSL Ativo</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3D floating iPhone mockup (pure CSS, no external assets)
// ─────────────────────────────────────────────────────────────
function PhoneMockup({ accent }: { accent: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, rotateY: -20, y: 30 }}
      animate={{ opacity: 1, rotateY: -8, y: 0 }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
      className="relative"
      style={{ perspective: 1000, transformStyle: "preserve-3d" }}
    >
      <motion.div
        animate={{ y: [0, -12, 0], rotateZ: [0, -1.5, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        className="relative w-[150px] h-[310px] md:w-[170px] md:h-[350px] rounded-[38px] p-[3px] shadow-2xl mockup-phone-3d"
        style={{
          background: "linear-gradient(135deg, #2a2a2e 0%, #0e0e10 100%)",
          boxShadow: `0 30px 60px -15px ${accent}66, 0 15px 30px -10px rgba(0,0,0,0.55)`,
        }}
      >
        {/* Side buttons */}
        <span className="absolute -left-[3px] top-[80px] h-8 w-[3px] rounded-l-sm bg-neutral-700" />
        <span className="absolute -left-[3px] top-[125px] h-14 w-[3px] rounded-l-sm bg-neutral-700" />
        <span className="absolute -right-[3px] top-[100px] h-20 w-[3px] rounded-r-sm bg-neutral-700" />

        {/* Screen */}
        <div className="relative h-full w-full rounded-[34px] overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800">
          {/* Dynamic Island */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 h-6 w-20 rounded-full bg-black z-20" />

          {/* Status bar */}
          <div className="relative z-10 flex justify-between items-center px-5 pt-2.5 text-[9px] text-white/80 font-semibold">
            <span>9:41</span>
            <span className="opacity-0">•</span>
          </div>

          {/* App content */}
          <div className="p-3 pt-6 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}88)` }} />
              <div className="flex-1">
                <div className="h-2 rounded bg-white/25 w-3/4" />
                <div className="h-1.5 rounded bg-white/10 w-1/2 mt-1" />
              </div>
            </div>
            <div className="aspect-[4/3] rounded-lg" style={{ background: `linear-gradient(135deg, ${accent}55, ${accent}18)` }} />
            <div className="space-y-1.5">
              <div className="h-1.5 rounded bg-white/15 w-full" />
              <div className="h-1.5 rounded bg-white/12 w-5/6" />
              <div className="h-1.5 rounded bg-white/10 w-4/6" />
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <div className="h-10 rounded-md bg-white/8 border border-white/10" />
              <div className="h-10 rounded-md bg-white/8 border border-white/10" />
            </div>
            <div className="mt-2 h-8 rounded-lg flex items-center justify-center text-[9px] font-bold"
              style={{ background: accent, color: "#fff", boxShadow: `0 6px 14px -4px ${accent}aa` }}>
              Fale no WhatsApp
            </div>
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-16 rounded-full bg-white/40" />
        </div>
      </motion.div>

      {/* Floating notification badge */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        className="absolute -top-2 -right-6 rounded-xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 px-2.5 py-1.5 shadow-xl"
      >
        <div className="flex items-center gap-1.5 text-[10px] text-white whitespace-nowrap">
          <Smartphone className="h-3 w-3 text-emerald-300" />
          <span>100% Mobile</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function SitesLayout({ quote, theme }: Props) {
  const reduce = useReducedMotion();
  const [adminWa, setAdminWa] = useState("");
  const [planDefaults, setPlanDefaults] = useState<QuotePlanConfig[] | undefined>(undefined);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    supabase.from("site_settings").select("whatsapp_number").eq("id", "main").maybeSingle()
      .then(({ data }: any) => { if (data?.whatsapp_number) setAdminWa(data.whatsapp_number); });
  }, []);

  useEffect(() => {
    const load = () => supabase.from("sales_page_config").select("config").eq("id", "quote_plans_defaults").maybeSingle()
      .then(({ data }: any) => {
        if (data?.config) {
          setPlanDefaults(normalizePlanDefaults(data.config, "sites_paginas"));
          if (!adminWa && (data.config as any).whatsappNumber) setAdminWa((data.config as any).whatsappNumber);
        }
      });
    load();
    const h = () => load();
    window.addEventListener("quote-plans-updated", h);
    return () => window.removeEventListener("quote-plans-updated", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plans = useMemo(() => resolveQuotePlans(quote, planDefaults).filter(p => !p.hidden), [quote, planDefaults]);
  const whatsappLink = adminWa ? `https://wa.me/${adminWa}` : "#";

  const clientName = (quote as any).client_name || "";
  const businessType = (quote as any).business_type || "seu negócio";

  const buildWaText = (label: string) => encodeURIComponent(`Olá! ${clientName ? `Sou ${clientName}. ` : ""}Tenho interesse em ${label} para ${String(businessType).toLowerCase()}.`);

  const accent = theme.accent;

  return (
    <div style={{ background: theme.bg, color: theme.text }} className="relative overflow-hidden">
      <style>{`
        @keyframes sitesIconFloat {
          0%,100% { transform: translateY(0) rotate(0deg); }
          50%     { transform: translateY(-6px) rotate(-1.2deg); }
        }
        .sites-icon-float {
          animation: sitesIconFloat 4.5s ease-in-out infinite;
          will-change: transform;
        }
        @media (min-width: 768px) {
          .mockup-3d { transform: rotateX(6deg) rotateY(-4deg); }
          .mockup-phone-3d { transform: rotateY(-10deg) rotateX(4deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sites-icon-float { animation: none; }
        }
      `}</style>
      {/* Ambient orbs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full blur-3xl opacity-30" style={{ background: `radial-gradient(circle, ${accent}, transparent 60%)` }} />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full blur-3xl opacity-20" style={{ background: `radial-gradient(circle, ${accent}, transparent 60%)` }} />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full blur-3xl opacity-15" style={{ background: `radial-gradient(circle, ${accent}, transparent 60%)` }} />
      </div>

      {/* HERO */}
      <section className="relative px-4 pt-12 md:pt-24 pb-16 md:pb-28">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-12 items-center">
          <div>
            <ExclusiveClientHeader
              city={(quote as any).city}
              clientName={(quote as any).client_name}
              businessType={(quote as any).business_type}
              serviceLabel="Desenvolvimento de Site"
              ServiceIcon={Globe}
              accent={accent}
              text={theme.text}
              textMuted={theme.textMuted}
              quoteNumber={(quote as any).quote_number || (quote as any).number}
            />
            <motion.h1 initial="hidden" animate="show" custom={1} variants={fadeUp}
              className="mt-5 text-[26px] leading-[1.15] sm:text-3xl md:text-5xl font-bold tracking-tight">
              Um site profissional que{" "}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, ${accent}, ${accent}aa)` }}>
                transmite confiança
              </span>{" "}
              e ajuda sua empresa a conquistar mais clientes.
            </motion.h1>
            <motion.p initial="hidden" animate="show" custom={2} variants={fadeUp} className="mt-6 text-[15px] md:text-lg leading-relaxed" style={{ color: theme.textMuted }}>
              Seu site é muito mais do que uma vitrine na internet.
              <br /><br />
              Ele é o primeiro contato que muitas pessoas terão com sua empresa. Por isso desenvolvemos projetos modernos, rápidos e totalmente personalizados para fortalecer sua marca, gerar credibilidade e transformar visitantes em oportunidades de negócio.
            </motion.p>
            <motion.div initial="hidden" animate="show" custom={3} variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
              <a href="#processo" className="inline-flex items-center justify-center text-center gap-2 w-full sm:w-auto px-5 sm:px-6 py-3.5 rounded-xl font-semibold text-[13px] sm:text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                style={{ background: accent, color: theme.accentFg, boxShadow: `0 12px 30px -10px ${accent}88` }}>
                <span className="leading-tight">VER COMO SEU NOVO SITE SERÁ DESENVOLVIDO</span>
                <ArrowRight className="h-4 w-4 flex-shrink-0" />
              </a>
            </motion.div>
          </div>
          <div className="relative flex flex-col items-center justify-center gap-6 md:block">
            <div className="relative w-full max-w-xl mx-auto">
              <BrowserMockup accent={accent} />
              {/* Desktop: overlapped phone. Mobile: rendered below (separately). */}
              <div className="hidden md:block absolute -right-6 -bottom-16 z-10">
                <PhoneMockup accent={accent} />
              </div>
            </div>
            <div className="md:hidden flex justify-center mt-4">
              <PhoneMockup accent={accent} />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — Por que ter um site profissional */}
      <section className="relative px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="text-2xl md:text-4xl font-bold tracking-tight">
            Seu cliente pesquisa <span style={{ color: accent }}>antes de comprar.</span>
          </motion.h2>
          <div className="mt-8 space-y-5 text-base md:text-lg leading-relaxed" style={{ color: theme.textMuted }}>
            <p>Antes de entrar em contato, pedir um orçamento ou visitar sua empresa, a maioria das pessoas pesquisa na internet.</p>
            <p>Se encontram um site moderno, organizado e profissional, <strong style={{ color: theme.text }}>a confiança aumenta.</strong></p>
            <p>Se encontram um site antigo, lento ou nem encontram um site, muitas vezes <strong style={{ color: theme.text }}>escolhem outro fornecedor.</strong></p>
            <p>Um bom site trabalha para sua empresa todos os dias, mostrando quem você é, o que faz e por que merece a confiança do cliente.</p>
          </div>
        </div>
      </section>

      {/* SECTION 3 — O que você receberá */}
      <section className="relative px-4 py-16 md:py-20">
        <div className="max-w-6xl mx-auto">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="text-2xl md:text-4xl font-bold tracking-tight text-center">
            Tudo o que seu projeto precisa para causar uma ótima primeira impressão.
          </motion.h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CARDS.map((c, i) => {
              const Icon = c.icon;
              return (
                <motion.div key={c.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.06 }}
                  whileHover={reduce ? undefined : { y: -6, rotateX: 3, rotateY: -3 }}
                  className="group relative rounded-2xl p-6 backdrop-blur-xl ring-1 transition-all"
                  style={{ background: `${theme.card}`, borderColor: theme.cardBorder, transformStyle: "preserve-3d" }}
                >
                  <motion.div
                    whileHover={reduce ? undefined : { scale: 1.08, rotate: -4 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className={`inline-block drop-shadow-lg ${reduce ? "" : "sites-icon-float"}`}
                    style={{ animationDelay: `${(i % 6) * 0.35}s` }}
                  >
                    <Icon className="h-14 w-14" />
                  </motion.div>
                  <h3 className="mt-4 text-lg font-semibold" style={{ color: theme.text }}>{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: theme.textMuted }}>{c.text}</p>
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ boxShadow: `0 20px 40px -12px ${accent}55` }} />
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 4 — Como funciona (timeline) */}
      <section id="processo" className="relative px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="text-2xl md:text-4xl font-bold tracking-tight text-center">
            Um processo <span style={{ color: accent }}>simples, transparente e organizado.</span>
          </motion.h2>
          <div className="mt-12 relative">
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px" style={{ background: `linear-gradient(to bottom, transparent, ${accent}55, transparent)` }} />
            <div className="space-y-8">
              {STEPS.map((s, i) => (
                <motion.div key={s.n}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className={`relative flex items-start gap-5 md:gap-8 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
                >
                  <div className="relative z-10 flex-shrink-0">
                    <div className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg shadow-lg ring-4"
                      style={{ background: accent, color: theme.accentFg, boxShadow: `0 0 30px ${accent}66`, borderColor: theme.bg }}>
                      {s.n}
                    </div>
                  </div>
                  <div className="flex-1 md:max-w-md rounded-2xl p-5 backdrop-blur-xl ring-1"
                    style={{ background: theme.card, borderColor: theme.cardBorder }}>
                    <h3 className="text-lg font-semibold" style={{ color: theme.text }}>{s.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed" style={{ color: theme.textMuted }}>{s.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — Diferenciais */}
      <section className="relative px-4 py-16 md:py-20">
        <div className="max-w-6xl mx-auto">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="text-2xl md:text-4xl font-bold tracking-tight text-center">
            Por que desenvolver seu site conosco?
          </motion.h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {DIFFS.map((d, i) => {
              const Icon = d.icon;
              return (
                <motion.div key={d.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="rounded-2xl p-6 ring-1 backdrop-blur-xl"
                  style={{ background: `linear-gradient(135deg, ${accent}0a, transparent)`, borderColor: theme.cardBorder }}
                >
                  <motion.div
                    whileHover={reduce ? undefined : { y: -3, rotate: 3 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className={`inline-block drop-shadow-lg ${reduce ? "" : "sites-icon-float"}`}
                    style={{ animationDelay: `${(i % 5) * 0.4 + 0.2}s` }}
                  >
                    <Icon className="h-12 w-12" />
                  </motion.div>
                  <h3 className="mt-4 text-lg font-semibold" style={{ color: theme.text }}>{d.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: theme.textMuted }}>{d.text}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 6 — Resultado esperado */}
      <section className="relative px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto rounded-3xl p-8 md:p-12 ring-1 backdrop-blur-xl relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${accent}18, ${theme.card})`, borderColor: theme.cardBorder }}>
          <div aria-hidden className="absolute -top-20 -right-20 h-64 w-64 rounded-full blur-3xl opacity-40" style={{ background: accent }} />
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="relative text-2xl md:text-4xl font-bold tracking-tight">
            Seu site trabalhando por você <span style={{ color: accent }}>todos os dias.</span>
          </motion.h2>
          <p className="relative mt-6 text-base md:text-lg leading-relaxed" style={{ color: theme.textMuted }}>
            Enquanto você atende clientes, fecha negócios ou descansa, seu site continua apresentando sua empresa, respondendo dúvidas, mostrando seus serviços e incentivando novos contatos.
          </p>
          <p className="relative mt-4 text-base md:text-lg leading-relaxed" style={{ color: theme.text }}>
            Mais do que um investimento em design, é um investimento na <strong>imagem</strong> e no <strong>crescimento</strong> do seu negócio.
          </p>
        </div>
      </section>

      {/* SECTION 7 — O que está incluso */}
      <section className="relative px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="text-2xl md:text-4xl font-bold tracking-tight text-center">
            Seu projeto pode incluir
          </motion.h2>
          <div className="mt-10 grid sm:grid-cols-2 gap-3">
            {INCLUDED.map((item, i) => (
              <motion.div key={item}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.03 }}
                className="flex items-center gap-3 rounded-xl px-4 py-3 ring-1"
                style={{ background: theme.card, borderColor: theme.cardBorder }}
              >
                <div className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center" style={{ background: `${accent}22` }}>
                  <Check className="h-3.5 w-3.5" style={{ color: accent }} strokeWidth={3} />
                </div>
                <span className="text-sm font-medium" style={{ color: theme.text }}>{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      {plans.length > 0 && (
        <section className="relative px-4 py-16 md:py-20">
          <div className="max-w-6xl mx-auto">
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
              className="text-2xl md:text-4xl font-bold tracking-tight text-center">
              Escolha o formato ideal para <span style={{ color: accent }}>seu projeto.</span>
            </motion.h2>
            <div className={`mt-12 grid gap-6 ${plans.length === 1 ? "max-w-md mx-auto" : plans.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
              {plans.map((plan, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className={`relative rounded-3xl p-8 ring-1 backdrop-blur-xl ${plan.highlighted ? "md:scale-[1.03]" : ""}`}
                  style={{
                    background: plan.highlighted ? `linear-gradient(160deg, ${accent}18, ${theme.card})` : theme.card,
                    borderColor: plan.highlighted ? `${accent}66` : theme.cardBorder,
                    boxShadow: plan.highlighted ? `0 20px 50px -20px ${accent}66` : undefined,
                  }}
                >
                  {plan.highlighted && plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                      style={{ background: accent, color: theme.accentFg }}>
                      {plan.badge}
                    </div>
                  )}
                  <h3 className="text-lg font-semibold text-center" style={{ color: accent }}>{plan.title}</h3>
                  <div className="mt-4 text-center">
                    <span className="text-4xl md:text-5xl font-bold" style={{ color: theme.text }}>{plan.total}</span>
                  </div>
                  {plan.items?.length > 0 && (
                    <ul className="mt-6 space-y-2.5">
                      {plan.items.map((it, k) => (
                        <li key={k} className="flex items-start gap-2 text-sm" style={{ color: theme.textMuted }}>
                          <Check className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: accent }} strokeWidth={3} />
                          {it}
                        </li>
                      ))}
                    </ul>
                  )}
                  <a
                    href={`${whatsappLink}?text=${buildWaText(plan.title || "este plano")}`}
                    target="_blank" rel="noopener noreferrer"
                    className="mt-8 w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-transform hover:scale-[1.02]"
                    style={{ background: "#25D366" }}
                  >
                    <WhatsAppIcon /> {plan.ctaLabel || "Quero este plano"}
                  </a>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="relative px-4 py-16 md:py-20">
        <div className="max-w-3xl mx-auto">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="text-2xl md:text-4xl font-bold tracking-tight text-center">
            Perguntas <span style={{ color: accent }}>frequentes</span>
          </motion.h2>
          <div className="mt-10 space-y-3">
            {FAQ_LOCAL.map((f, i) => (
              <div key={i} className="rounded-2xl ring-1 overflow-hidden" style={{ background: theme.card, borderColor: theme.cardBorder }}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="font-medium text-sm md:text-base" style={{ color: theme.text }}>{f.q}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openFaq === i ? "rotate-180" : ""}`} style={{ color: accent }} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm leading-relaxed" style={{ color: theme.textMuted }}>
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Also merge admin-managed FAQs if configured */}
          <div className="mt-8">
            <FaqSection theme={theme} layoutType="simple" userId={(quote as any).user_id} />
          </div>
        </div>
      </section>

      {/* Reviews */}
      <ReviewsSection theme={theme} />

      {/* FINAL CTA */}
      <section className="relative px-4 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl mx-auto text-center rounded-3xl p-10 md:p-16 ring-1 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${accent}22, ${theme.card})`, borderColor: `${accent}44` }}
        >
          <div aria-hidden className="absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full blur-3xl opacity-40" style={{ background: accent }} />
          <Sparkles className="relative h-10 w-10 mx-auto mb-4" style={{ color: accent }} />
          <h2 className="relative text-2xl md:text-4xl font-bold tracking-tight" style={{ color: theme.text }}>
            Vamos criar um site que represente a <span style={{ color: accent }}>qualidade da sua empresa?</span>
          </h2>
          <p className="relative mt-4 text-base md:text-lg" style={{ color: theme.textMuted }}>
            Seu projeto será desenvolvido pensando na experiência do usuário, na credibilidade da sua marca e no crescimento do seu negócio.
          </p>
          <a
            href={`${whatsappLink}?text=${buildWaText("meu orçamento personalizado de site")}`}
            target="_blank" rel="noopener noreferrer"
            className="relative mt-8 inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm md:text-base shadow-2xl hover:scale-[1.03] transition-transform"
            style={{ background: accent, color: theme.accentFg, boxShadow: `0 20px 50px -12px ${accent}88` }}
          >
            <WhatsAppIcon /> SOLICITAR MEU ORÇAMENTO PERSONALIZADO
            <ArrowRight className="h-4 w-4" />
          </a>
        </motion.div>
      </section>

      <ProfessionalFooter theme={theme} clientName={(quote as any).client_name || ""} city={(quote as any).city || ""} />
    </div>
  );
}
