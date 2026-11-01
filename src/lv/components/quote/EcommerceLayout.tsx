// @ts-nocheck
"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { ColorTheme } from "@/lv/lib/colorThemes";
import type { Tables } from "@/lv/integrations/supabase/types";
import { supabase } from "@/lv/integrations/supabase/client";
import {
  Sparkles, Check, ChevronDown, ArrowRight, Tag, Lock,
  ShoppingBag, CreditCard, ShieldCheck,
} from "lucide-react";
import { WhatsAppIcon } from "@/lv/components/icons/PlatformIcons";
import {
  ShoppingBagIcon3D, SmartphoneIcon3D, CreditCardIcon3D, TruckIcon3D,
  PackageIcon3D, ZapIcon3D, SearchIcon3D, ShieldIcon3D,
  RocketIcon3D, StoreIcon3D, TrendingIcon3D, HeadphonesIcon3D,
  ChartIcon3D, UsersIcon3D, GlobeIcon3D,
} from "@/lv/components/icons/PremiumEcommerceIcons";
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
  { Icon: ShoppingBagIcon3D, title: "Loja 100% Personalizada", text: "Layout exclusivo desenvolvido para destacar sua marca e seus produtos." },
  { Icon: SmartphoneIcon3D, title: "Totalmente Responsiva", text: "Experiência perfeita em celulares, tablets e computadores." },
  { Icon: CreditCardIcon3D, title: "Pagamentos Online", text: "Integração com PIX, cartão de crédito, boleto e outras formas de pagamento." },
  { Icon: TruckIcon3D, title: "Gestão de Frete", text: "Configuração de transportadoras, Correios e cálculo automático de envio." },
  { Icon: PackageIcon3D, title: "Controle de Pedidos", text: "Acompanhe pedidos, pagamentos e entregas em um único painel." },
  { Icon: ZapIcon3D, title: "Alta Performance", text: "Loja rápida e otimizada para oferecer a melhor experiência ao cliente." },
  { Icon: SearchIcon3D, title: "Estrutura para Google", text: "Organizada seguindo boas práticas de SEO para facilitar que novos clientes encontrem sua empresa." },
  { Icon: ShieldIcon3D, title: "Segurança", text: "Proteção de dados, certificado SSL e ambiente seguro para seus clientes comprarem com tranquilidade." },
];

const STEPS = [
  { n: 1, title: "Conhecemos seu negócio.", text: "Entendemos seus produtos, seu público e seus objetivos." },
  { n: 2, title: "Planejamos a estrutura.", text: "Organizamos categorias, produtos, páginas e toda a jornada de compra." },
  { n: 3, title: "Criamos o design.", text: "Desenvolvemos uma loja moderna, intuitiva e alinhada com a identidade da sua empresa." },
  { n: 4, title: "Configuramos tudo.", text: "Pagamentos, fretes, segurança, produtos e todas as funcionalidades necessárias." },
  { n: 5, title: "Publicamos sua loja.", text: "Após os testes finais, sua loja entra no ar pronta para começar a vender." },
];

const DIFFS = [
  { Icon: RocketIcon3D, title: "Projeto Exclusivo", text: "Nada de modelos genéricos. Sua loja será desenvolvida para refletir a identidade da sua marca." },
  { Icon: StoreIcon3D, title: "Experiência de Compra", text: "Criamos uma navegação simples e intuitiva para facilitar cada etapa da compra." },
  { Icon: ZapIcon3D, title: "Alta Velocidade", text: "Páginas rápidas aumentam a satisfação do cliente e reduzem o abandono do carrinho." },
  { Icon: TrendingIcon3D, title: "Preparada para Crescer", text: "Sua loja poderá evoluir junto com seu negócio, adicionando novos produtos e funcionalidades sempre que necessário." },
  { Icon: HeadphonesIcon3D, title: "Suporte", text: "Após a entrega continuamos disponíveis para orientar e auxiliar sempre que necessário." },
];

const INCLUDED = [
  "Layout exclusivo", "Cadastro de produtos", "Categorias organizadas",
  "Carrinho de compras", "PIX", "Cartão de Crédito", "Boleto Bancário",
  "Cálculo automático de frete", "Área do cliente", "Painel administrativo",
  "Cupons de desconto", "Integração com redes sociais", "Certificado SSL",
  "SEO básico", "Otimização de velocidade",
];

const FAQ_LOCAL = [
  { q: "Posso vender para todo o Brasil?", a: "Sim. Sua loja poderá ser configurada para atender clientes em qualquer região." },
  { q: "Quais formas de pagamento podem ser utilizadas?", a: "Podemos integrar PIX, cartão de crédito, boleto bancário e diversas plataformas de pagamento." },
  { q: "Vou conseguir cadastrar novos produtos?", a: "Sim. Você terá acesso ao painel administrativo para gerenciar produtos, pedidos e informações da loja." },
  { q: "Minha loja funcionará no celular?", a: "Sim. Todos os projetos são desenvolvidos com foco na experiência mobile." },
  { q: "Depois da entrega vocês oferecem suporte?", a: "Sim. Continuamos disponíveis para auxiliar sempre que necessário." },
];

const EMOTIONAL_BULLETS = [
  "Venda sem depender de horário comercial.",
  "Receba pedidos automaticamente.",
  "Atenda clientes de qualquer lugar do Brasil.",
  "Centralize produtos, pagamentos e pedidos em um único lugar.",
  "Transforme sua operação em um negócio preparado para crescer.",
];

// ─────────────────────────────────────────────────────────────
// 3D floating storefront mockup (browser + product grid + cart)
// ─────────────────────────────────────────────────────────────
function StoreMockup({ accent }: { accent: string }) {
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
          <div className="ml-3 flex-1 h-5 rounded-md bg-white/5 border border-white/10 flex items-center gap-1.5 px-2">
            <Lock className="h-2.5 w-2.5 text-emerald-300" />
            <span className="text-[10px] text-white/40">https://sua-loja.com.br</span>
          </div>
          <div className="relative">
            <ShoppingBag className="h-3.5 w-3.5 text-white/70" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full text-[8px] font-bold flex items-center justify-center"
              style={{ background: accent, color: "#fff" }}>3</span>
          </div>
        </div>
        {/* nav */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
          <div className="h-2 rounded bg-white/25 w-16" />
          <div className="ml-auto flex gap-2">
            {[0,1,2,3].map(i => <div key={i} className="h-2 rounded bg-white/10 w-8" />)}
          </div>
        </div>
        {/* product grid */}
        <div className="p-4 grid grid-cols-3 gap-3">
          {[0,1,2].map(i => (
            <div key={i} className="rounded-lg overflow-hidden ring-1 ring-white/10 bg-white/[0.03]">
              <div className="aspect-square" style={{ background: `linear-gradient(135deg, ${accent}55 ${i*10}%, ${accent}18)` }} />
              <div className="p-2 space-y-1">
                <div className="h-1.5 rounded bg-white/25 w-3/4" />
                <div className="flex items-center justify-between">
                  <div className="h-2 rounded bg-white/40 w-10" />
                  <div className="h-4 w-4 rounded flex items-center justify-center" style={{ background: accent }}>
                    <ShoppingBag className="h-2.5 w-2.5 text-white" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* checkout bar */}
        <div className="mx-4 mb-4 rounded-lg px-3 py-2 flex items-center justify-between" style={{ background: `${accent}22`, border: `1px solid ${accent}44` }}>
          <div className="flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5" style={{ color: accent }} />
            <span className="text-[10px] font-semibold text-white/80">PIX • Cartão • Boleto</span>
          </div>
          <div className="text-[10px] font-bold text-white">Finalizar →</div>
        </div>
      </motion.div>

      {/* floating "New order" badge */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        className="absolute -top-4 -left-6 rounded-xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 px-3 py-2 shadow-xl"
      >
        <div className="flex items-center gap-2 text-xs text-white">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Novo pedido! <strong>R$ 247,90</strong></span>
        </div>
      </motion.div>
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute -bottom-5 -right-4 rounded-xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 px-3 py-2 shadow-xl"
      >
        <div className="flex items-center gap-2 text-xs text-white">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
          <span>Pagamento seguro</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3D floating iPhone mockup showcasing the product/checkout flow
// ─────────────────────────────────────────────────────────────
function PhoneStoreMockup({ accent }: { accent: string }) {
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
        <span className="absolute -left-[3px] top-[80px] h-8 w-[3px] rounded-l-sm bg-neutral-700" />
        <span className="absolute -left-[3px] top-[125px] h-14 w-[3px] rounded-l-sm bg-neutral-700" />
        <span className="absolute -right-[3px] top-[100px] h-20 w-[3px] rounded-r-sm bg-neutral-700" />

        <div className="relative h-full w-full rounded-[34px] overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 h-6 w-20 rounded-full bg-black z-20" />
          <div className="relative z-10 flex justify-between items-center px-5 pt-2.5 text-[9px] text-white/80 font-semibold">
            <span>9:41</span>
            <span className="opacity-0">•</span>
          </div>

          <div className="p-3 pt-6 space-y-2">
            {/* store header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="h-6 w-6 rounded-md" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}88)` }} />
                <div className="h-1.5 rounded bg-white/25 w-16" />
              </div>
              <div className="relative">
                <ShoppingBag className="h-3 w-3 text-white/80" />
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full text-[7px] font-bold flex items-center justify-center"
                  style={{ background: accent, color: "#fff" }}>2</span>
              </div>
            </div>
            {/* featured product */}
            <div className="rounded-lg overflow-hidden ring-1 ring-white/10">
              <div className="aspect-[4/3]" style={{ background: `linear-gradient(135deg, ${accent}66, ${accent}22)` }} />
              <div className="p-1.5 space-y-1 bg-white/[0.03]">
                <div className="h-1.5 rounded bg-white/25 w-4/5" />
                <div className="flex justify-between items-center">
                  <div className="h-2 rounded bg-white/40 w-10" />
                  <div className="text-[7px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${accent}33`, color: accent }}>-20%</div>
                </div>
              </div>
            </div>
            {/* product row */}
            <div className="grid grid-cols-2 gap-1.5">
              {[0,1].map(i => (
                <div key={i} className="rounded-md overflow-hidden ring-1 ring-white/10">
                  <div className="aspect-square" style={{ background: `linear-gradient(135deg, ${accent}44, ${accent}18)` }} />
                </div>
              ))}
            </div>
            {/* buy button */}
            <div className="mt-1 h-8 rounded-lg flex items-center justify-center gap-1.5 text-[9px] font-bold"
              style={{ background: accent, color: "#fff", boxShadow: `0 6px 14px -4px ${accent}aa` }}>
              <ShoppingBag className="h-3 w-3" /> Comprar agora
            </div>
          </div>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-16 rounded-full bg-white/40" />
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        className="absolute -top-2 -right-8 rounded-xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 px-2.5 py-1.5 shadow-xl"
      >
        <div className="flex items-center gap-1.5 text-[10px] text-white whitespace-nowrap">
          <Tag className="h-3 w-3 text-emerald-300" />
          <span>Pedido pago via PIX</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function EcommerceLayout({ quote, theme }: Props) {
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
          setPlanDefaults(normalizePlanDefaults(data.config, "loja_virtual"));
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
        @keyframes ecomIconFloat {
          0%,100% { transform: translateY(0) rotate(0deg); }
          50%     { transform: translateY(-6px) rotate(-1.2deg); }
        }
        .ecom-icon-float {
          animation: ecomIconFloat 4.5s ease-in-out infinite;
          will-change: transform;
        }
        @keyframes ecomBadgePulse {
          0%,100% { transform: scale(1); box-shadow: 0 0 0 0 ${accent}55; }
          50%     { transform: scale(1.06); box-shadow: 0 0 0 12px ${accent}00; }
        }
        .ecom-badge-pulse { animation: ecomBadgePulse 2.2s ease-in-out infinite; }
        @media (min-width: 768px) {
          .mockup-3d { transform: rotateX(6deg) rotateY(-4deg); }
          .mockup-phone-3d { transform: rotateY(-10deg) rotateX(4deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ecom-icon-float, .ecom-badge-pulse { animation: none; }
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
              serviceLabel="Desenvolvimento de Loja Virtual"
              ServiceIcon={ShoppingBag}
              accent={accent}
              text={theme.text}
              textMuted={theme.textMuted}
              quoteNumber={(quote as any).quote_number || (quote as any).number}
            />
            <motion.h1 initial="hidden" animate="show" custom={1} variants={fadeUp}
              className="mt-5 text-[26px] leading-[1.15] sm:text-3xl md:text-5xl font-bold tracking-tight">
              Transforme sua empresa em uma{" "}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, ${accent}, ${accent}aa)` }}>
                loja aberta 24 horas
              </span>{" "}
              por dia.
            </motion.h1>
            <motion.p initial="hidden" animate="show" custom={2} variants={fadeUp} className="mt-6 text-[15px] md:text-lg leading-relaxed" style={{ color: theme.textMuted }}>
              Pare de depender apenas do WhatsApp ou das redes sociais para vender.
              <br /><br />
              Desenvolvemos lojas virtuais modernas, rápidas e preparadas para oferecer uma excelente experiência de compra, aumentar suas vendas e automatizar todo o processo de pedidos.
            </motion.p>

            {/* Emotional bullets */}
            <motion.ul initial="hidden" animate="show" custom={3} variants={fadeUp} className="mt-6 space-y-2">
              {EMOTIONAL_BULLETS.map((b, i) => (
                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: theme.text }}>
                  <div className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${accent}22` }}>
                    <Check className="h-3 w-3" style={{ color: accent }} strokeWidth={3} />
                  </div>
                  {b}
                </li>
              ))}
            </motion.ul>

            <motion.div initial="hidden" animate="show" custom={4} variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
              <a href="#processo" className="inline-flex items-center justify-center text-center gap-2 w-full sm:w-auto px-5 sm:px-6 py-3.5 rounded-xl font-semibold text-[13px] sm:text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                style={{ background: accent, color: theme.accentFg, boxShadow: `0 12px 30px -10px ${accent}88` }}>
                <span className="leading-tight">VER COMO SUA LOJA VIRTUAL SERÁ DESENVOLVIDA</span>
                <ArrowRight className="h-4 w-4 flex-shrink-0" />
              </a>
            </motion.div>
          </div>
          <div className="relative flex flex-col items-center justify-center gap-6 md:block">
            <div className="relative w-full max-w-xl mx-auto">
              <StoreMockup accent={accent} />
              <div className="hidden md:block absolute -right-6 -bottom-16 z-10">
                <PhoneStoreMockup accent={accent} />
              </div>
            </div>
            <div className="md:hidden flex justify-center mt-4">
              <PhoneStoreMockup accent={accent} />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — Por que ter uma loja virtual */}
      <section className="relative px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="text-2xl md:text-4xl font-bold tracking-tight">
            Venda todos os dias, mesmo quando sua empresa <span style={{ color: accent }}>estiver fechada.</span>
          </motion.h2>
          <div className="mt-8 space-y-5 text-base md:text-lg leading-relaxed" style={{ color: theme.textMuted }}>
            <p>Uma loja virtual permite que seus clientes encontrem seus produtos, realizem pedidos e finalizem compras a qualquer hora do dia.</p>
            <p>Enquanto você trabalha, descansa ou atende outros clientes, sua loja continua funcionando automaticamente, ampliando seu alcance e criando novas oportunidades de venda.</p>
            <p>Mais do que vender online, é oferecer <strong style={{ color: theme.text }}>praticidade, confiança e uma experiência profissional</strong> para quem compra.</p>
          </div>
        </div>
      </section>

      {/* SECTION 3 — O que você receberá */}
      <section className="relative px-4 py-16 md:py-20">
        <div className="max-w-6xl mx-auto">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="text-2xl md:text-4xl font-bold tracking-tight text-center">
            Tudo o que sua loja precisa para <span style={{ color: accent }}>vender mais.</span>
          </motion.h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CARDS.map((c, i) => {
              const Icon = c.Icon;
              return (
                <motion.div key={c.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  whileHover={reduce ? undefined : { y: -6, rotateX: 3, rotateY: -3 }}
                  className="group relative rounded-2xl p-6 backdrop-blur-xl ring-1 transition-all"
                  style={{ background: theme.card, borderColor: theme.cardBorder, transformStyle: "preserve-3d" }}
                >
                  <motion.div
                    whileHover={reduce ? undefined : { scale: 1.08, rotate: -4 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl drop-shadow-lg ${reduce ? "" : "ecom-icon-float"}`}
                    style={{
                      animationDelay: `${(i % 8) * 0.3}s`,
                      background: `linear-gradient(135deg, ${accent}33, ${accent}11)`,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 24px -8px ${accent}66`,
                    }}
                  >
                    <Icon className="h-7 w-7"  />
                  </motion.div>
                  <h3 className="mt-4 text-base font-semibold" style={{ color: theme.text }}>{c.title}</h3>
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
            Criamos uma loja pronta para vender <span style={{ color: accent }}>desde o primeiro dia.</span>
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
            Mais do que uma loja bonita. <br className="hidden md:block" /> Uma loja <span style={{ color: accent }}>preparada para vender.</span>
          </motion.h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {DIFFS.map((d, i) => {
              const Icon = d.Icon;
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
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl drop-shadow-lg ${reduce ? "" : "ecom-icon-float"}`}
                    style={{
                      animationDelay: `${(i % 5) * 0.4 + 0.2}s`,
                      background: `linear-gradient(135deg, ${accent}33, ${accent}11)`,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 24px -8px ${accent}66`,
                    }}
                  >
                    <Icon className="h-6 w-6"  />
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
            Uma loja trabalhando para sua empresa <span style={{ color: accent }}>o tempo todo.</span>
          </motion.h2>
          <p className="relative mt-6 text-base md:text-lg leading-relaxed" style={{ color: theme.textMuted }}>
            Imagine seus produtos disponíveis para milhares de pessoas todos os dias.
          </p>
          <p className="relative mt-4 text-base md:text-lg leading-relaxed" style={{ color: theme.textMuted }}>
            Seu cliente acessa a loja, escolhe o produto, realiza o pagamento e envia o pedido <strong style={{ color: theme.text }}>sem depender de atendimento manual.</strong>
          </p>
          <p className="relative mt-4 text-base md:text-lg leading-relaxed" style={{ color: theme.text }}>
            Enquanto isso, você ganha tempo para focar no <strong>crescimento do seu negócio.</strong>
          </p>

          {/* result stats */}
          <div className="relative mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { Icon: ChartIcon3D, label: "Pedidos 24/7" },
              { Icon: UsersIcon3D, label: "Todo o Brasil" },
              { Icon: GlobeIcon3D, label: "Alcance ampliado" },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl p-4 text-center ring-1" style={{ background: theme.card, borderColor: theme.cardBorder }}>
                <s.Icon className="h-8 w-8 mx-auto" />
                <div className="mt-2 text-xs font-semibold" style={{ color: theme.text }}>{s.label}</div>
              </div>
            ))}
          </div>
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
                transition={{ duration: 0.4, delay: i * 0.025 }}
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
              Escolha o formato ideal para <span style={{ color: accent }}>sua loja.</span>
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
                    href={`${whatsappLink}?text=${buildWaText(plan.title || "este plano de loja virtual")}`}
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
            Vamos criar uma loja virtual pronta para <span style={{ color: accent }}>vender todos os dias?</span>
          </h2>
          <p className="relative mt-4 text-base md:text-lg" style={{ color: theme.textMuted }}>
            Seu projeto será desenvolvido para oferecer uma excelente experiência de compra, fortalecer sua marca e ajudar sua empresa a vender mais pela internet.
          </p>
          <a
            href={`${whatsappLink}?text=${buildWaText("meu orçamento personalizado de loja virtual")}`}
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
