// @ts-nocheck
"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { ColorTheme } from "@/lv/lib/colorThemes";
import type { Tables } from "@/lv/integrations/supabase/types";
import { supabase } from "@/lv/integrations/supabase/client";
import {
  Sparkles, Check, ChevronDown, ArrowRight, Settings, Bell, Activity,
} from "lucide-react";
import { WhatsAppIcon } from "@/lv/components/icons/PlatformIcons";
import {
  ZapIcon3D, ShieldIcon3D, RocketIcon3D, ChartIcon3D, UsersIcon3D,
  GlobeIcon3D, SmartphoneIcon3D, HeadphonesIcon3D, TrendingIcon3D,
  PackageIcon3D, SearchIcon3D,
} from "@/lv/components/icons/PremiumEcommerceIcons";
import { TargetIcon, HandshakeIcon } from "@/lv/components/icons/PremiumSiteIcons";
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
  { Icon: ZapIcon3D,        title: "Elimina tarefas repetitivas", text: "Automatize atividades que hoje consomem horas da sua equipe." },
  { Icon: PackageIcon3D,    title: "Centraliza todas as informações", text: "Clientes, vendas, financeiro, documentos e processos em um único lugar." },
  { Icon: UsersIcon3D,      title: "Melhora o trabalho da equipe", text: "Cada colaborador acessa apenas o que realmente precisa." },
  { Icon: ChartIcon3D,      title: "Informações em tempo real", text: "Indicadores atualizados para decisões com muito mais segurança." },
  { Icon: SmartphoneIcon3D, title: "Acesso de qualquer lugar", text: "Seu sistema pode ser utilizado pelo computador, tablet ou celular." },
  { Icon: ShieldIcon3D,     title: "Segurança", text: "Proteção das informações com tecnologias modernas e controle de acesso." },
];

const STEPS = [
  { n: 1, title: "Entendimento",   text: "Conhecemos profundamente sua empresa. Entendemos como ela funciona hoje e identificamos onde estão os gargalos." },
  { n: 2, title: "Planejamento",   text: "Desenhamos toda a estrutura do sistema — telas, funcionalidades, fluxos e permissões." },
  { n: 3, title: "Protótipo",      text: "Antes de programar, você visualiza como o sistema irá funcionar. Validamos tudo antes do desenvolvimento." },
  { n: 4, title: "Desenvolvimento",text: "Transformamos o projeto em um sistema moderno, rápido e seguro utilizando tecnologias atuais." },
  { n: 5, title: "Testes",         text: "Realizamos diversos testes para garantir estabilidade, desempenho e segurança." },
  { n: 6, title: "Implantação",    text: "Colocamos o sistema em funcionamento e acompanhamos toda a implantação." },
  { n: 7, title: "Evolução",       text: "Seu sistema poderá receber novas funcionalidades sempre que sua empresa crescer." },
];

const DIFFS = [
  { Icon: TargetIcon,       title: "Projeto Sob Medida",         text: "Seu sistema será desenvolvido exclusivamente para a realidade da sua empresa." },
  { Icon: RocketIcon3D,     title: "Tecnologia Moderna",         text: "Utilizamos tecnologias atuais que garantem desempenho, estabilidade e evolução." },
  { Icon: SmartphoneIcon3D, title: "Funciona em qualquer dispositivo", text: "Computador, tablet, celular ou instalado como aplicativo PWA." },
  { Icon: ZapIcon3D,        title: "Alta Performance",           text: "Sistemas rápidos proporcionam mais produtividade para toda a equipe." },
  { Icon: ShieldIcon3D,     title: "Segurança",                  text: "Proteção de dados, autenticação e controle de acesso." },
  { Icon: TrendingIcon3D,   title: "Escalabilidade",             text: "Seu sistema cresce conforme sua empresa cresce." },
  { Icon: HandshakeIcon,    title: "Atendimento Humanizado",     text: "Você acompanha todas as etapas do projeto e participa das decisões importantes." },
];

const INCLUDED = [
  "CRM Comercial", "ERP", "Sistema Financeiro", "Controle de Estoque",
  "Ordem de Serviço", "Sistema para Clínicas", "Sistema para Escritórios",
  "Sistema para Imobiliárias", "Sistema para Indústrias", "Sistema para Prestadores de Serviço",
  "Sistema de Agendamentos", "Área do Cliente", "Portal do Funcionário",
  "Controle de Produção", "Gestão de Contratos", "Gestão Documental",
  "Dashboards", "Relatórios Inteligentes", "Aplicativos PWA",
  "Integrações com APIs", "Automatização de Processos",
];

const FAQ_LOCAL = [
  { q: "Meu sistema será desenvolvido exclusivamente para minha empresa?", a: "Sim. Cada projeto é criado conforme a necessidade do seu negócio. Nada é baseado em modelos prontos." },
  { q: "Funciona no celular?", a: "Sim. Todos os sistemas são responsivos e, quando desejado, também podem ser entregues como Aplicativo PWA." },
  { q: "É possível integrar com outros sistemas?", a: "Sim. Podemos integrar ERPs, CRMs, APIs, plataformas de pagamento, WhatsApp, emissão de notas fiscais e diversas outras soluções." },
  { q: "Posso solicitar novas funcionalidades depois?", a: "Sim. O sistema pode evoluir conforme sua empresa cresce." },
  { q: "Quanto tempo leva o desenvolvimento?", a: "O prazo depende da complexidade. Após entendermos sua necessidade, apresentaremos um cronograma detalhado." },
  { q: "Vocês oferecem suporte?", a: "Sim. Após a implantação continuamos disponíveis para suporte, melhorias e evolução do sistema." },
];

const EMOTIONAL_BULLETS = [
  "Automatize tarefas que hoje consomem horas da sua equipe.",
  "Centralize clientes, vendas, financeiro e documentos em um único lugar.",
  "Acompanhe indicadores atualizados em tempo real.",
  "Reduza erros e retrabalho na operação diária.",
  "Deixe sua empresa preparada para crescer com organização.",
];

// ─────────────────────────────────────────────────────────────
// 3D floating admin dashboard mockup
// ─────────────────────────────────────────────────────────────
function DashboardMockup({ accent }: { accent: string }) {
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
            <Activity className="h-2.5 w-2.5 text-emerald-300" />
            <span className="text-[10px] text-white/40">painel.suaempresa.com.br</span>
          </div>
          <Bell className="h-3.5 w-3.5 text-white/70" />
        </div>
        <div className="grid grid-cols-[70px_1fr]">
          {/* sidebar */}
          <div className="border-r border-white/5 p-2 space-y-1.5">
            {[0,1,2,3,4,5].map(i => (
              <div key={i} className="h-6 rounded-md flex items-center gap-1 px-1.5"
                style={{ background: i === 1 ? `${accent}22` : "transparent" }}>
                <div className="h-2 w-2 rounded" style={{ background: i === 1 ? accent : "rgba(255,255,255,0.25)" }} />
                <div className="h-1 rounded flex-1" style={{ background: i === 1 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.15)" }} />
              </div>
            ))}
          </div>
          {/* main */}
          <div className="p-3 space-y-2">
            {/* KPI cards */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: "Clientes", v: "1.284" },
                { l: "Vendas",   v: "R$ 87k" },
                { l: "Tarefas",  v: "42" },
              ].map((k, i) => (
                <div key={i} className="rounded-lg p-2 ring-1 ring-white/10 bg-white/[0.03]">
                  <div className="text-[8px] text-white/50">{k.l}</div>
                  <div className="text-[11px] font-bold text-white">{k.v}</div>
                  <div className="mt-1 h-1 rounded" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
                </div>
              ))}
            </div>
            {/* chart */}
            <div className="rounded-lg p-2 ring-1 ring-white/10 bg-white/[0.03]">
              <div className="flex items-end gap-1 h-14">
                {[35, 55, 42, 68, 50, 78, 62, 88, 72, 95, 80, 100].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t"
                    style={{ height: `${h}%`, background: `linear-gradient(180deg, ${accent}, ${accent}44)` }} />
                ))}
              </div>
            </div>
            {/* table rows */}
            <div className="rounded-lg ring-1 ring-white/10 bg-white/[0.03] p-2 space-y-1.5">
              {[0,1,2].map(i => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}66)` }} />
                  <div className="h-1.5 rounded bg-white/25 flex-1" />
                  <div className="h-1.5 rounded bg-white/15 w-10" />
                  <div className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${accent}33`, color: accent }}>OK</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* floating notification */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        className="absolute -top-4 -left-6 rounded-xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 px-3 py-2 shadow-xl"
      >
        <div className="flex items-center gap-2 text-xs text-white">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Automação executada <strong>+12 tarefas</strong></span>
        </div>
      </motion.div>
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute -bottom-5 -right-4 rounded-xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 px-3 py-2 shadow-xl"
      >
        <div className="flex items-center gap-2 text-xs text-white">
          <Activity className="h-3.5 w-3.5 text-emerald-300" />
          <span>Tempo real</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3D floating iPhone mockup as a PWA
// ─────────────────────────────────────────────────────────────
function PhoneAppMockup({ accent }: { accent: string }) {
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
            {/* app header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="h-6 w-6 rounded-md" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}88)` }} />
                <div className="h-1.5 rounded bg-white/25 w-16" />
              </div>
              <Settings className="h-3 w-3 text-white/70" />
            </div>
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { l: "Hoje",   v: "R$ 3.4k" },
                { l: "Semana", v: "R$ 21k" },
              ].map((k, i) => (
                <div key={i} className="rounded-md p-1.5 ring-1 ring-white/10 bg-white/[0.04]">
                  <div className="text-[7px] text-white/50">{k.l}</div>
                  <div className="text-[9px] font-bold text-white">{k.v}</div>
                </div>
              ))}
            </div>
            {/* line chart */}
            <div className="rounded-md p-1.5 ring-1 ring-white/10 bg-white/[0.04] h-14 relative overflow-hidden">
              <svg viewBox="0 0 100 40" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="sysln" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity="0.6" />
                    <stop offset="100%" stopColor={accent} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 30 L15 22 L28 26 L42 14 L58 18 L72 8 L88 12 L100 4 L100 40 L0 40 Z" fill="url(#sysln)" />
                <path d="M0 30 L15 22 L28 26 L42 14 L58 18 L72 8 L88 12 L100 4" fill="none" stroke={accent} strokeWidth="1.5" />
              </svg>
            </div>
            {/* task list */}
            <div className="space-y-1">
              {[0,1,2].map(i => (
                <div key={i} className="flex items-center gap-1.5 rounded-md p-1.5 ring-1 ring-white/10 bg-white/[0.03]">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
                  <div className="h-1 rounded bg-white/25 flex-1" />
                  <Check className="h-2.5 w-2.5" style={{ color: accent }} />
                </div>
              ))}
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
          <Bell className="h-3 w-3 text-emerald-300" />
          <span>Aplicativo PWA</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function SystemsLayout({ quote, theme }: Props) {
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
          setPlanDefaults(normalizePlanDefaults(data.config, "sistemas_app"));
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
        @keyframes sysIconFloat {
          0%,100% { transform: translateY(0) rotate(0deg); }
          50%     { transform: translateY(-6px) rotate(-1.2deg); }
        }
        .sys-icon-float { animation: sysIconFloat 4.5s ease-in-out infinite; will-change: transform; }
        @keyframes sysBadgePulse {
          0%,100% { transform: scale(1); box-shadow: 0 0 0 0 ${accent}55; }
          50%     { transform: scale(1.06); box-shadow: 0 0 0 12px ${accent}00; }
        }
        .sys-badge-pulse { animation: sysBadgePulse 2.2s ease-in-out infinite; }
        @media (min-width: 768px) {
          .mockup-3d { transform: rotateX(6deg) rotateY(-4deg); }
          .mockup-phone-3d { transform: rotateY(-10deg) rotateX(4deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sys-icon-float, .sys-badge-pulse { animation: none; }
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
              serviceLabel="Sistemas Personalizados e Apps PWA"
              ServiceIcon={Settings}
              accent={accent}
              text={theme.text}
              textMuted={theme.textMuted}
              quoteNumber={(quote as any).quote_number || (quote as any).number}
            />
            <motion.h1 initial="hidden" animate="show" custom={1} variants={fadeUp}
              className="mt-5 text-[26px] leading-[1.15] sm:text-3xl md:text-5xl font-bold tracking-tight">
              Pare de adaptar sua empresa aos{" "}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, ${accent}, ${accent}aa)` }}>
                sistemas do mercado.
              </span>
            </motion.h1>
            <motion.p initial="hidden" animate="show" custom={2} variants={fadeUp} className="mt-6 text-[15px] md:text-lg leading-relaxed" style={{ color: theme.textMuted }}>
              Planilhas espalhadas, controles manuais, retrabalho e informações perdidas fazem sua empresa desperdiçar tempo todos os dias.
              <br /><br />
              Desenvolvemos sistemas e aplicativos personalizados que automatizam tarefas, organizam informações e tornam sua operação muito mais eficiente. Seu sistema será criado do zero para funcionar exatamente da forma que sua empresa precisa.
            </motion.p>

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
                <span className="leading-tight">QUERO CONHECER A MELHOR SOLUÇÃO PARA MINHA EMPRESA</span>
                <ArrowRight className="h-4 w-4 flex-shrink-0" />
              </a>
            </motion.div>
          </div>
          <div className="relative flex flex-col items-center justify-center gap-6 md:block">
            <div className="relative w-full max-w-xl mx-auto">
              <DashboardMockup accent={accent} />
              <div className="hidden md:block absolute -right-6 -bottom-16 z-10">
                <PhoneAppMockup accent={accent} />
              </div>
            </div>
            <div className="md:hidden flex justify-center mt-4">
              <PhoneAppMockup accent={accent} />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION — Verdade que poucas percebem */}
      <section className="relative px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="text-2xl md:text-4xl font-bold tracking-tight">
            Sua empresa cresce. Mas seus processos <span style={{ color: accent }}>continuam os mesmos.</span>
          </motion.h2>
          <div className="mt-8 space-y-5 text-base md:text-lg leading-relaxed" style={{ color: theme.textMuted }}>
            <p>No começo, planilhas resolvem. Depois vêm os grupos de WhatsApp. Mais tarde aparecem dezenas de arquivos, controles paralelos, informações duplicadas e tarefas repetitivas.</p>
            <p>Chega um momento em que sua equipe passa mais tempo tentando organizar o trabalho do que realmente produzindo.</p>
            <p style={{ color: theme.text }}>É exatamente nesse ponto que um <strong>sistema personalizado</strong> faz toda a diferença. Ele elimina processos desnecessários, reduz erros e permite que sua empresa cresça com organização.</p>
          </div>
        </div>
      </section>

      {/* SECTION — O que um sistema resolve */}
      <section className="relative px-4 py-16 md:py-20">
        <div className="max-w-6xl mx-auto">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="text-2xl md:text-4xl font-bold tracking-tight text-center">
            Mais do que tecnologia. <br className="hidden md:block" /> Uma nova forma de <span style={{ color: accent }}>administrar sua empresa.</span>
          </motion.h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                    className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl drop-shadow-lg ${reduce ? "" : "sys-icon-float"}`}
                    style={{
                      animationDelay: `${(i % 6) * 0.3}s`,
                      background: `linear-gradient(135deg, ${accent}33, ${accent}11)`,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 24px -8px ${accent}66`,
                    }}
                  >
                    <Icon className="h-7 w-7" />
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

      {/* SECTION — Imagine assim */}
      <section className="relative px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto rounded-3xl p-8 md:p-12 ring-1 backdrop-blur-xl relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${accent}12, ${theme.card})`, borderColor: theme.cardBorder }}>
          <div aria-hidden className="absolute -top-20 -right-20 h-64 w-64 rounded-full blur-3xl opacity-30" style={{ background: accent }} />
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="relative text-2xl md:text-4xl font-bold tracking-tight text-center">
            Imagine sua empresa <span style={{ color: accent }}>funcionando assim.</span>
          </motion.h2>
          <div className="relative mt-8 grid sm:grid-cols-2 gap-3">
            {[
              "Acompanha seus clientes",
              "Visualiza vendas",
              "Consulta documentos",
              "Controla pagamentos",
              "Organiza atendimentos",
              "Acompanha sua equipe",
              "Gera relatórios",
              "Tudo em um só lugar",
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl px-4 py-3 ring-1"
                style={{ background: theme.card, borderColor: theme.cardBorder }}>
                <div className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${accent}22` }}>
                  <Check className="h-3.5 w-3.5" style={{ color: accent }} strokeWidth={3} />
                </div>
                <span className="text-sm font-medium" style={{ color: theme.text }}>{t}</span>
              </div>
            ))}
          </div>
          <p className="relative mt-6 text-base md:text-lg leading-relaxed text-center" style={{ color: theme.text }}>
            Sem procurar informações em vários lugares. Sem planilhas. Sem retrabalho. <strong>Sem perder tempo.</strong>
          </p>
        </div>
      </section>

      {/* SECTION — Como desenvolvemos (timeline 7 passos) */}
      <section id="processo" className="relative px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="text-2xl md:text-4xl font-bold tracking-tight text-center">
            Cada empresa é única. <span style={{ color: accent }}>Cada projeto também.</span>
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

      {/* SECTION — O que podemos desenvolver */}
      <section className="relative px-4 py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="text-2xl md:text-4xl font-bold tracking-tight text-center">
            O que podemos <span style={{ color: accent }}>desenvolver.</span>
          </motion.h2>
          <p className="mt-3 text-center text-sm md:text-base" style={{ color: theme.textMuted }}>Cada projeto é único. Alguns exemplos:</p>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {INCLUDED.map((item, i) => (
              <motion.div key={item}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.02 }}
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

      {/* SECTION — Diferenciais */}
      <section className="relative px-4 py-16 md:py-20">
        <div className="max-w-6xl mx-auto">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="text-2xl md:text-4xl font-bold tracking-tight text-center">
            Tecnologia é importante. <br className="hidden md:block" /> Entender o seu <span style={{ color: accent }}>negócio é ainda mais.</span>
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
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl drop-shadow-lg ${reduce ? "" : "sys-icon-float"}`}
                    style={{
                      animationDelay: `${(i % 7) * 0.35 + 0.2}s`,
                      background: `linear-gradient(135deg, ${accent}33, ${accent}11)`,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 24px -8px ${accent}66`,
                    }}
                  >
                    <Icon className="h-6 w-6" />
                  </motion.div>
                  <h3 className="mt-4 text-lg font-semibold" style={{ color: theme.text }}>{d.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: theme.textMuted }}>{d.text}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION — PWA */}
      <section className="relative px-4 py-16 md:py-20">
        <div className="max-w-5xl mx-auto rounded-3xl p-8 md:p-12 ring-1 backdrop-blur-xl relative overflow-hidden grid md:grid-cols-[1.2fr_1fr] gap-8 items-center"
          style={{ background: `linear-gradient(135deg, ${accent}18, ${theme.card})`, borderColor: theme.cardBorder }}>
          <div aria-hidden className="absolute -top-20 -left-20 h-64 w-64 rounded-full blur-3xl opacity-30" style={{ background: accent }} />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
              style={{ background: `${accent}22`, color: accent }}>
              <SmartphoneIcon3D className="h-4 w-4" /> Aplicativo PWA
            </div>
            <h2 className="mt-4 text-2xl md:text-4xl font-bold tracking-tight">
              Tenha um aplicativo <span style={{ color: accent }}>sem depender das lojas.</span>
            </h2>
            <p className="mt-4 text-base md:text-lg leading-relaxed" style={{ color: theme.textMuted }}>
              Além do sistema web, podemos desenvolver sua solução como um <strong style={{ color: theme.text }}>Aplicativo PWA</strong>. Instalado diretamente no celular ou computador, com experiência semelhante a um aplicativo tradicional — porém com atualização mais simples, menor custo de manutenção e acesso rápido para toda a equipe.
            </p>
          </div>
          <div className="relative flex items-center justify-center min-h-[320px]">
            <PhoneAppMockup accent={accent} />
          </div>
        </div>
      </section>

      {/* SECTION — Resultado */}
      <section className="relative px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto rounded-3xl p-8 md:p-12 ring-1 backdrop-blur-xl relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${accent}18, ${theme.card})`, borderColor: theme.cardBorder }}>
          <div aria-hidden className="absolute -top-20 -right-20 h-64 w-64 rounded-full blur-3xl opacity-40" style={{ background: accent }} />
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="relative text-2xl md:text-4xl font-bold tracking-tight">
            O verdadeiro resultado não é ter um sistema. <br />
            É ter <span style={{ color: accent }}>uma empresa mais organizada.</span>
          </motion.h2>
          <p className="relative mt-6 text-base md:text-lg leading-relaxed" style={{ color: theme.textMuted }}>
            Quando processos deixam de depender de pessoas e passam a depender de um sistema bem estruturado, sua empresa ganha velocidade, reduz erros, melhora a comunicação e cresce com muito mais segurança.
          </p>
          <p className="relative mt-4 text-base md:text-lg leading-relaxed" style={{ color: theme.text }}>
            Você deixa de apagar incêndios diariamente para focar no que realmente importa: <strong>fazer o negócio evoluir.</strong>
          </p>

          <div className="relative mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { Icon: ChartIcon3D, label: "Mais organização" },
              { Icon: ZapIcon3D,   label: "Mais velocidade" },
              { Icon: GlobeIcon3D, label: "Acesso em qualquer lugar" },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl p-4 text-center ring-1" style={{ background: theme.card, borderColor: theme.cardBorder }}>
                <s.Icon className="h-8 w-8 mx-auto" />
                <div className="mt-2 text-xs font-semibold" style={{ color: theme.text }}>{s.label}</div>
              </div>
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
              Escolha o formato ideal para <span style={{ color: accent }}>o seu projeto.</span>
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
                    href={`${whatsappLink}?text=${buildWaText(plan.title || "este projeto de sistema/app")}`}
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
            Sua empresa merece um sistema que trabalhe a favor do <span style={{ color: accent }}>seu crescimento.</span>
          </h2>
          <p className="relative mt-4 text-base md:text-lg" style={{ color: theme.textMuted }}>
            Cada empresa possui processos únicos. Vamos entender seus desafios, identificar oportunidades de melhoria e criar um sistema que realmente faça diferença no dia a dia da sua equipe.
          </p>
          <a
            href={`${whatsappLink}?text=${buildWaText("meu orçamento personalizado de sistema/app")}`}
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
