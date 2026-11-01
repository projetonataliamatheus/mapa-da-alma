// @ts-nocheck
/**
 * Default editable content for quote templates.
 * Each key maps to a section/field in the layout.
 * Used to seed the quote_templates table and as fallback.
 */

export interface TemplateSection {
  [key: string]: string | number | boolean | any[];
}

export const SIMPLE_TEMPLATE: TemplateSection = {
  // Icon size for custom uploaded images (px)
  custom_icon_size: 40,
  // Hero
  hero_badge: "Proposta Exclusiva",
  hero_title: "Orçamento",
  hero_cta: "Ver Planos e Investimento",
  hero_subtitle: "Plano para fazer seu negócio começar a receber clientes todos os dias\nCriado com base no que você me falou — focado em gerar conversas e vendas no WhatsApp.",

  // Strategy
  strategy_title: "Nossa Estratégia",
  strategy_desc: "Vamos trabalhar juntos para atrair novos clientes, construir autoridade no mercado local e transformar seu negócio em uma máquina de resultados.",
  strategy_items: [
    { emoji: "🎯", title: "Atração Inteligente", desc: "Atraímos novos clientes com ofertas estratégicas e depois fidelizamos para aumentar o ticket médio." },
    { emoji: "whatsapp", title: "WhatsApp Humanizado", desc: "Atendimento rápido e profissional no X1, transformando cada contato em uma venda confirmada." },
    { emoji: "instagram", title: "Instagram Estratégico", desc: "Construímos seu perfil com conteúdo que gera seguidores qualificados e engajamento real." },
    { emoji: "gps-pin", title: "Tráfego Local Cirúrgico", desc: "Anúncios segmentados para o público certo na sua região, maximizando conversão." },
  ],
  strategy_tip: "💡 O segredo é simples:\n\nSe todos os dias algumas pessoas entram em contato com você…\n👉 basta fechar 1 ou 2 vendas pra pagar todo o investimento.\n\n👉 O resto vira lucro.",
  strategy_tip_title: "O Pulo do Gato",
  strategy_tip_enabled: true,

  // Platforms
  platforms_title: "Plataformas Que Vamos Usar",
  platforms_desc: "Presença estratégica onde seus futuros clientes estão.",
  platforms_bullets: [
    { icon: "facebook", text: "Pessoas descobrindo seu negócio" },
    { icon: "instagram", text: "Interesse e confiança" },
    { icon: "whatsapp", text: "Conversas que viram cliente" },
    { icon: "google", text: "Quem já está pronto pra comprar" },
  ],

  // Google
  google_title: "Google Meu Negócio: Seu Endereço no Mapa",
  google_texts: [
    "Imagine assim: quando alguém precisa dos seus serviços, o que ela faz? Abre o Google e pesquisa.",
    "O Google mostra uma lista com notas e avaliações. Qual a pessoa escolhe? Aquela que tem mais avaliações boas e aparece em primeiro lugar!",
    "É por isso que vamos criar sua ficha no Google com foto, endereço, telefone e horários. Quanto mais avaliações boas, mais o Google te mostra em primeiro lugar — é como um ranking de confiança!",
    "E é exatamente por isso que vamos trabalhar no pós-atendimento: pedir avaliações no Google para posicionar cada vez melhor nesse ranking. 🚀",
  ],

  // Instagram
  instagram_title: "Estratégia Instagram",
  instagram_desc: "Do zero ao profissional — você posta, eu acompanho e direciono a estratégia.",
  instagram_items: [
    { emoji: "ig-profile-visits", day: "ETAPA 01", title: "Mais visitas no seu perfil", desc: "Seus anúncios também levam pessoas interessadas direto pro seu Instagram todos os dias." },
    { emoji: "ig-new-followers", day: "ETAPA 02", title: "Seguidores com interesse real", desc: "Quem visita seu perfil começa a te seguir, tem interesse no que você vende." },
    { emoji: "ig-money", day: "ETAPA 03", title: "Instagram Também Vende", desc: "Mesmo quem não compra na hora...\ncontinua vendo seus posts, stories e ofertas." },
    { emoji: "ig-growth", day: "ETAPA 04", title: "Você cria uma base de Clientes", desc: "Depois que a pessoa te segue, você pode vender novamente sem precisar investir mais em anúncios." },
  ],

  // WhatsApp
  whatsapp_title: "Atendimento WhatsApp",
  whatsapp_desc: "O WhatsApp é a sua vitrine. Vamos estruturar um fluxo humanizado que converte.",
  whatsapp_items: [
    { emoji: "wa-speed", title: "Você para de perder cliente por demora", desc: "Quem responde primeiro... fecha. Simples assim." },
    { emoji: "wa-script", title: "Você sabe exatamente o que falar", desc: "Sem travar. Sem enrolar. A conversa leva o cliente até a decisão." },
    { emoji: "wa-filter", title: "Você filtra curioso e foca em quem compra", desc: "Menos tempo perdido. Mais gente pronta pra fechar." },
    { emoji: "wa-machine", title: "Seu WhatsApp vira uma máquina de vendas", desc: "Não é mais conversa. É cliente entrando e comprando." },
  ],
  whatsapp_tip: "Vamos implementar uma automação no WhatsApp para agilizar o fluxo de atendimento, mantendo a humanização. Desenvolvimento completo do fluxo de atendimento incluído.",

  // Metrics
  metrics_title: "Expectativa de Resultados",
  metrics_desc: "Projeções conservadoras e realistas para o primeiro mês.",
  metrics_tables: [
    { title: "money-float Expectativa Realista com R$ 30/dia", rows: [
      ["Custo por Conversa (WhatsApp)", "R$ 3,00 a R$ 8,00"],
      ["Volume de Contatos/Dia", "4 a 8 pessoas"],
      ["Taxa de Conversão", "20% com atendimento ágil"],
      ["Novos Clientes/Dia", "1 a 2"],
      ["Novos Clientes/Mês", "10 a 30"],
    ]},
    { title: "money-float Expectativa Realista com R$ 50/dia", rows: [
      ["Custo por Conversa (WhatsApp)", "R$ 3,00 a R$ 8,00"],
      ["Volume de Contatos/Dia", "7 a 14 pessoas"],
      ["Taxa de Conversão", "20% com atendimento ágil"],
      ["Novos Clientes/Dia", "2 a 3"],
      ["Novos Clientes/Mês", "20 a 50"],
    ]},
  ],

  // Plans
  plans_title: "Planos de Investimento",
  plans_desc: "Escolha o plano ideal para começar a transformar seu negócio.",

  // CTA
  cta_title: "Pronto(a) para Transformar Seu Negócio?",
  cta_desc: "Converse comigo agora. Em 15 minutos já te explico como a estratégia vai funcionar especificamente para o seu negócio.",
  cta_button: "Falar no WhatsApp",
  cta_badges: ["Resposta em até 2 horas", "Sem compromisso na primeira conversa", "Proposta personalizada para seu caso"],
  cta_whatsapp_message: "Olá, vi sua proposta e quero conversar sobre o marketing do meu negócio.",
  whatsapp_btn_animation: "pulse",
};

export const DETAILED_TEMPLATE: TemplateSection = {
  ...SIMPLE_TEMPLATE,
  // Extra sections for detailed
  instagram_desc: "Eu crio a pauta semanal e os textos prontos para postar. Você só executa — sem precisar pensar no que publicar.",
  
  // How we work
  howwework_title: "Como Vamos Trabalhar",
  howwework_desc: "Um processo simples e transparente para garantir resultados reais.",
  howwework_items: [
    { step: "1", title: "Análise Inicial", desc: "Conheço seu negócio e defino as melhores estratégias para seu público." },
    { step: "2", title: "Configuração", desc: "Crio suas contas de anúncios, Google Meu Negócio e preparo tudo para rodar." },
    { step: "handshake", title: "Ativação", desc: "Lanço as primeiras campanhas e monitoro em tempo real os resultados." },
    { step: "4", title: "Otimização", desc: "Ajusto diariamente as campanhas para maximizar conversões e reduzir custos." },
  ],

  // Timeline
  timeline_title: "Cronograma de Implementação",
  timeline_items: [
    { week: "Semana 1", title: "Setup Completo", desc: "Criação de contas, configuração de pixel e instalação de tudo que é necessário." },
    { week: "Semana 2", title: "Campanhas no Ar", desc: "Primeiros anúncios rodando e primeiros contatos chegando." },
    { week: "Semana 3", title: "Otimização", desc: "Ajustes nas campanhas para melhores resultados com menor custo." },
    { week: "Semana 4", title: "Escala", desc: "Análise de dados e escala das campanhas que mais convertem." },
  ],

  // Social Proof
  social_proof_title: "Resultados Comprovados",
  social_proof_stats: [
    { value: "+200", label: "Clientes Atendidos" },
    { value: "4.9/5", label: "Nota Média" },
    { value: "+500%", label: "ROI Médio" },
  ],

  // FAQ
  faq_title: "Perguntas Frequentes",
  faq_items: [
    { q: "Quanto tempo leva para começar a aparecer resultados?", a: "Os anúncios entram no ar na segunda semana. Os primeiros contatos no WhatsApp costumam aparecer nos primeiros 3 a 5 dias após ativação." },
    { q: "Preciso entender de marketing ou tecnologia?", a: "Não. Você cuida do seu negócio e eu cuido de tudo relacionado ao marketing digital." },
    { q: "O valor de tráfego vai direto para o Facebook/Meta?", a: "Sim. Você cria uma conta de anúncios no Meta e cadastra seu cartão diretamente lá. Total transparência." },
    { q: "Qual o prazo mínimo de contrato?", a: "O contrato é mensal, sem fidelidade mínima. Recomendamos pelo menos 3 meses." },
    { q: "E se eu não conseguir responder rápido no WhatsApp?", a: "Vamos implementar uma automação inteligente no WhatsApp que responde automaticamente com informações básicas." },
  ],

  // CTA
  cta_title: "Pronto(a) para Transformar Seu Negócio?",
  cta_desc: "Converse comigo agora. Em 15 minutos já te explico como a estratégia vai funcionar especificamente para o seu negócio.",
  cta_button: "Falar no WhatsApp",
  cta_badges: ["Resposta em até 2 horas", "Sem compromisso na primeira conversa", "Proposta personalizada para seu caso"],
  cta_whatsapp_message: "Olá, vi sua proposta e quero conversar sobre o marketing do meu negócio.",
  whatsapp_btn_animation: "pulse",
};

// ---------- Templates por Tipo de Serviço ----------

export const SITES_SIMPLE_TEMPLATE: TemplateSection = {
  ...SIMPLE_TEMPLATE,
  hero_badge: "Proposta Exclusiva • Desenvolvimento de Site",
  hero_title: "Um site profissional que transmite confiança e conquista mais clientes",
  hero_cta: "Ver Como Seu Novo Site Será Desenvolvido",
  hero_subtitle: "Seu site é muito mais do que uma vitrine na internet.\nEle é o primeiro contato que muitas pessoas terão com sua empresa. Por isso desenvolvemos projetos modernos, rápidos e totalmente personalizados para fortalecer sua marca, gerar credibilidade e transformar visitantes em oportunidades de negócio.",

  strategy_title: "Seu cliente pesquisa antes de comprar",
  strategy_desc: "Antes de entrar em contato, pedir um orçamento ou visitar sua empresa, a maioria das pessoas pesquisa na internet. Se encontram um site moderno, organizado e profissional, a confiança aumenta. Se encontram um site antigo, lento — ou nenhum site — muitas vezes escolhem o concorrente. Um bom site trabalha por você todos os dias, mostrando quem você é, o que faz e por que merece a confiança do cliente.",
  strategy_items: [
    { emoji: "🎯", title: "Design Exclusivo", desc: "Layout desenvolvido especialmente para sua empresa, respeitando sua identidade visual." },
    { emoji: "whatsapp", title: "Integração com WhatsApp", desc: "Facilite o contato direto entre sua empresa e seus clientes em cada página." },
    { emoji: "instagram", title: "Totalmente Responsivo", desc: "Perfeito em computadores, tablets e celulares — experiência impecável em qualquer tela." },
    { emoji: "gps-pin", title: "Estrutura para Google", desc: "Organizado seguindo boas práticas de SEO para facilitar o posicionamento nas pesquisas." },
  ],
  strategy_tip: "💡 Seu site trabalhando por você todos os dias:\n\nEnquanto você atende, fecha negócios ou descansa, seu site continua apresentando sua empresa, respondendo dúvidas e incentivando novos contatos.\n\nMais do que um investimento em design, é um investimento na imagem e no crescimento do seu negócio.",
  strategy_tip_title: "Resultado Esperado",
  strategy_tip_enabled: true,

  platforms_title: "Tudo o que seu projeto precisa para causar uma ótima primeira impressão",
  platforms_desc: "Presença profissional nos canais onde seus clientes procuram por você.",
  platforms_bullets: [
    { icon: "google", text: "Google — apareça quando pesquisarem seu serviço" },
    { icon: "instagram", text: "Instagram — link direto do site na bio" },
    { icon: "whatsapp", text: "WhatsApp — botão de contato em todas as páginas" },
    { icon: "facebook", text: "Redes sociais — integração completa com a sua marca" },
  ],

  google_title: "Google: onde todo cliente começa a buscar",
  google_texts: [
    "Quando alguém precisa de um serviço, o que faz primeiro? Abre o Google e pesquisa.",
    "Se sua empresa não aparece nos primeiros resultados, o cliente encontra o concorrente antes de você.",
    "Vamos entregar seu site com estrutura de SEO configurada e ficha no Google Meu Negócio pronta — para você aparecer sempre que pesquisarem na sua região.",
    "Quanto mais organizado e atualizado o site, mais o Google confia e mostra ele em primeiro lugar. 🚀",
  ],

  instagram_title: "Como funciona o desenvolvimento",
  instagram_desc: "Um processo simples, transparente e organizado — você acompanha cada etapa.",
  instagram_items: [
    { emoji: "ig-profile-visits", day: "ETAPA 01", title: "Conhecemos seu negócio", desc: "Entendemos seus objetivos, seu público e como seu site precisa funcionar." },
    { emoji: "ig-new-followers", day: "ETAPA 02", title: "Planejamos a estrutura", desc: "Organizamos páginas, conteúdos e experiência do usuário antes do desenvolvimento." },
    { emoji: "ig-money", day: "ETAPA 03", title: "Criamos o design e programamos", desc: "Layout moderno, alinhado à sua marca, transformado em um site rápido, seguro e responsivo." },
    { emoji: "ig-growth", day: "ETAPA 04", title: "Publicamos", desc: "Seu site entra no ar pronto para receber visitantes e gerar novas oportunidades." },
  ],

  whatsapp_title: "Por que desenvolver seu site conosco",
  whatsapp_desc: "Diferenciais que fazem seu projeto se destacar de verdade.",
  whatsapp_items: [
    { emoji: "wa-speed", title: "Atendimento próximo", desc: "Você acompanha todas as etapas do projeto, com transparência do início ao fim." },
    { emoji: "wa-script", title: "Projeto personalizado", desc: "Nada de modelos genéricos. Seu site será único e feito para a sua empresa." },
    { emoji: "wa-filter", title: "Tecnologia atual", desc: "Utilizamos ferramentas modernas para garantir desempenho e estabilidade." },
    { emoji: "wa-machine", title: "Pensado para crescer", desc: "Seu projeto poderá evoluir junto com sua empresa — e continuamos disponíveis no suporte." },
  ],
  whatsapp_tip: "Depois da entrega continuamos disponíveis para auxiliar sempre que necessário — ajustes, dúvidas e evoluções fazem parte da parceria.",

  metrics_title: "O que está incluso no seu projeto",
  metrics_desc: "Tudo que sua empresa recebe para começar com o pé direito.",
  metrics_tables: [
    { title: "money-float Estrutura e Design", rows: [
      ["Design Personalizado", "Layout exclusivo para sua marca"],
      ["Página Inicial", "Apresentação profissional do negócio"],
      ["Páginas Institucionais", "Sobre, serviços e diferenciais"],
      ["Página de Serviços", "Detalhamento do que você entrega"],
      ["Otimização de Velocidade", "Carregamento rápido em qualquer dispositivo"],
    ]},
    { title: "money-float Recursos e Integrações", rows: [
      ["Formulário de Contato", "Mensagens direto no seu e-mail"],
      ["Botão para WhatsApp", "Contato em um clique"],
      ["Mapa de Localização", "Cliente encontra sua empresa fácil"],
      ["Redes Sociais e SEO Básico", "Presença completa e otimizada"],
      ["Certificado SSL", "Segurança e credibilidade garantidas"],
    ]},
  ],

  plans_title: "Planos de Desenvolvimento",
  plans_desc: "Escolha o plano ideal para colocar seu site profissional no ar.",

  cta_title: "Vamos criar um site que represente a qualidade da sua empresa?",
  cta_desc: "Seu projeto será desenvolvido pensando na experiência do usuário, na credibilidade da sua marca e no crescimento do seu negócio.",
  cta_button: "Solicitar Meu Orçamento Personalizado",
  cta_badges: ["Resposta em até 2 horas", "Sem compromisso na primeira conversa", "Projeto exclusivo para sua empresa"],
  cta_whatsapp_message: "Olá, vi sua proposta de site e quero conversar sobre o desenvolvimento.",
  whatsapp_btn_animation: "pulse",
};

export const LOJA_SIMPLE_TEMPLATE: TemplateSection = {
  ...SIMPLE_TEMPLATE,
  hero_badge: "Proposta de Loja Virtual",
  hero_title: "Desenvolvimento de Loja Virtual",
  hero_cta: "Ver Planos e Investimento",
  hero_subtitle: "Venda seus produtos todos os dias, mesmo enquanto você dorme.\nCriamos lojas virtuais completas que transformam visitantes em compradores.",

  strategy_title: "Por Que Ter Uma Loja Virtual",
  strategy_desc: "Vender apenas pelo WhatsApp limita seu crescimento. Uma loja profissional aumenta a confiança, automatiza os pedidos e escala suas vendas sem precisar contratar mais pessoas.",
  strategy_items: [
    { emoji: "🎯", title: "Catálogo Organizado", desc: "Produtos com fotos, preços e descrições persuasivas, separados por categoria." },
    { emoji: "gps-pin", title: "Pagamento Integrado", desc: "PIX, cartão e boleto direto no checkout, sem redirecionar o cliente." },
    { emoji: "instagram", title: "Frete Automático", desc: "Cálculo em tempo real com Correios e transportadoras." },
    { emoji: "whatsapp", title: "Gestão Simples", desc: "Painel intuitivo para cadastrar produtos, controlar estoque e ver pedidos." },
  ],
  strategy_tip: "💡 A internet nunca fecha:\n\nSua loja vende de madrugada, no fim de semana e nos feriados — sem você precisar estar online.",
  strategy_tip_title: "Vantagem do E-commerce",
  strategy_tip_enabled: true,

  platforms_title: "Onde Sua Loja Vai Vender",
  platforms_desc: "Múltiplos canais integrados para maximizar vendas.",
  platforms_bullets: [
    { icon: "google", text: "Google Shopping — produtos aparecendo na busca" },
    { icon: "instagram", text: "Instagram Shopping — comprar direto do post" },
    { icon: "whatsapp", text: "WhatsApp — atendimento e recuperação de carrinho" },
    { icon: "facebook", text: "Facebook Ads — anúncios direto para o produto" },
  ],

  google_title: "Google Shopping: Seus Produtos na Vitrine",
  google_texts: [
    "Quando alguém pesquisa por um produto, o Google mostra fotos, preços e lojas antes mesmo dos sites.",
    "Vamos cadastrar seus produtos no Google Shopping — assim cada item aparece com foto, preço e link direto pra sua loja.",
    "Combinado com uma boa reputação e avaliações, sua loja ganha destaque frente aos concorrentes.",
    "Resultado: mais visitas qualificadas e mais vendas todos os dias. 🚀",
  ],

  instagram_title: "Loja Virtual + Instagram Shopping",
  instagram_desc: "Do post ao carrinho — sem fricção.",
  instagram_items: [
    { emoji: "ig-profile-visits", day: "ETAPA 01", title: "Produtos marcados nos posts", desc: "O seguidor toca no produto e vai direto para a página de compra." },
    { emoji: "ig-new-followers", day: "ETAPA 02", title: "Loja na aba do perfil", desc: "Catálogo completo dentro do próprio Instagram." },
    { emoji: "ig-money", day: "ETAPA 03", title: "Stories que vendem", desc: "Link direto para o produto em cada story de oferta." },
    { emoji: "ig-growth", day: "ETAPA 04", title: "Recompra automática", desc: "Base de clientes salvos, prontos para comprar de novo." },
  ],

  whatsapp_title: "WhatsApp: Recuperando Vendas Que Iam Ser Perdidas",
  whatsapp_desc: "70% dos carrinhos são abandonados. Vamos recuperar boa parte deles.",
  whatsapp_items: [
    { emoji: "wa-speed", title: "Recuperação de carrinho", desc: "Mensagem automática pra quem colocou no carrinho e não finalizou." },
    { emoji: "wa-script", title: "Suporte pré-venda", desc: "Cliente com dúvida fala com você antes de desistir." },
    { emoji: "wa-filter", title: "Pós-venda ativo", desc: "Confirmação de pedido, envio e chegada — tudo automatizado." },
    { emoji: "wa-machine", title: "Cliente volta a comprar", desc: "Ofertas exclusivas por WhatsApp para quem já é cliente." },
  ],
  whatsapp_tip: "Automação inteligente que responde 24h sem perder o toque humano — você entra só quando realmente precisa.",

  metrics_title: "Tudo Que Está Incluso na Loja",
  metrics_desc: "Estrutura completa para começar a vender no dia do lançamento.",
  metrics_tables: [
    { title: "money-float Funcionalidades Essenciais", rows: [
      ["Catálogo Ilimitado", "Cadastro sem limite de produtos"],
      ["Carrinho e Checkout", "Otimizados para conversão"],
      ["Pagamento", "PIX, cartão e boleto"],
      ["Frete", "Cálculo automático em tempo real"],
      ["Cupons", "Descontos e promoções"],
    ]},
    { title: "money-float Gestão Completa", rows: [
      ["Painel de Pedidos", "Controle tudo pelo celular"],
      ["Relatórios", "Vendas, produtos e clientes"],
      ["Área do Cliente", "Histórico e recompra facilitada"],
      ["Integração Redes Sociais", "Instagram e Facebook"],
      ["Escalabilidade", "Suporta milhares de acessos"],
    ]},
  ],

  plans_title: "Planos de E-commerce",
  plans_desc: "Do essencial ao completo — comece a vender online rápido.",

  cta_title: "Vamos transformar sua empresa em uma loja aberta 24 horas?",
  cta_desc: "Conversa rápida, sem compromisso. Em 15 minutos te mostro como sua loja pode funcionar.",
  cta_button: "Falar no WhatsApp",
  cta_badges: ["Resposta em até 2 horas", "Sem compromisso na primeira conversa", "Projeto sob medida para seus produtos"],
  cta_whatsapp_message: "Olá, vi sua proposta de loja virtual e quero conversar sobre o projeto.",
  whatsapp_btn_animation: "pulse",
};

export const SISTEMAS_SIMPLE_TEMPLATE: TemplateSection = {
  ...SIMPLE_TEMPLATE,
  hero_badge: "Proposta de Sistema Sob Medida",
  hero_title: "Desenvolvimento de Sistema e App",
  hero_cta: "Ver Planos e Investimento",
  hero_subtitle: "Chega de planilhas, retrabalho e processos manuais.\nDesenvolvemos sistemas sob medida para automatizar sua empresa e dar informação em tempo real.",

  strategy_title: "Por Que Automatizar Sua Empresa",
  strategy_desc: "Quando tudo depende de planilhas e controles manuais, sua empresa perde tempo, dinheiro e produtividade. Um sistema sob medida elimina o trabalho repetitivo e libera seu time para o que realmente importa.",
  strategy_items: [
    { emoji: "🎯", title: "Feito Para o Seu Negócio", desc: "Nada de sistema pronto travado — cada tela é pensada pra sua realidade." },
    { emoji: "gps-pin", title: "Automação Inteligente", desc: "Tarefas que hoje tomam horas passam a rodar sozinhas em segundos." },
    { emoji: "instagram", title: "Dados em Tempo Real", desc: "Dashboard com o desempenho da empresa a qualquer momento, de qualquer lugar." },
    { emoji: "whatsapp", title: "App PWA no Celular", desc: "Instale como aplicativo no celular, sem depender de loja de apps." },
  ],
  strategy_tip: "💡 Cada hora automatizada é dinheiro no bolso:\n\nO sistema faz em segundos o que hoje toma horas do seu time — todos os dias, sem falhar.",
  strategy_tip_title: "O Ganho Real",
  strategy_tip_enabled: true,

  platforms_title: "Onde Seu Sistema Vai Funcionar",
  platforms_desc: "Acesso completo, de qualquer dispositivo, sem instalar nada.",
  platforms_bullets: [
    { icon: "google", text: "Computador — painel completo pra gestão" },
    { icon: "instagram", text: "Celular — app PWA instalável" },
    { icon: "whatsapp", text: "Notificações — direto no WhatsApp e e-mail" },
    { icon: "facebook", text: "Nuvem — seus dados seguros e acessíveis" },
  ],

  google_title: "Segurança e Acesso na Nuvem",
  google_texts: [
    "Nada de servidor caro dentro da sua empresa. Seu sistema roda na nuvem, com backup automático diário.",
    "Você acessa de qualquer lugar — escritório, casa, viagem — só precisa de internet.",
    "Cada usuário tem seu próprio login e permissões separadas. Você controla exatamente o que cada pessoa vê e faz.",
    "Certificados de segurança, criptografia e proteção de dados seguindo a LGPD. 🚀",
  ],

  instagram_title: "Do Processo Manual à Automação Completa",
  instagram_desc: "Como o sistema muda o dia a dia da sua empresa.",
  instagram_items: [
    { emoji: "ig-profile-visits", day: "ETAPA 01", title: "Mapeamos seu processo atual", desc: "Entendemos como sua empresa funciona hoje, com todos os detalhes." },
    { emoji: "ig-new-followers", day: "ETAPA 02", title: "Desenhamos a solução", desc: "Cada tela é aprovada por você antes de virar código." },
    { emoji: "ig-money", day: "ETAPA 03", title: "Colocamos no ar", desc: "Sua equipe é treinada e o sistema entra em operação sem trauma." },
    { emoji: "ig-growth", day: "ETAPA 04", title: "Evolui com você", desc: "Novas funcionalidades adicionadas conforme sua empresa cresce." },
  ],

  whatsapp_title: "Integração com WhatsApp e Notificações",
  whatsapp_desc: "O sistema conversa com seus clientes automaticamente.",
  whatsapp_items: [
    { emoji: "wa-speed", title: "Notificações automáticas", desc: "Cliente recebe status do pedido, agendamento ou lembrete no WhatsApp." },
    { emoji: "wa-script", title: "Confirmações", desc: "Compromissos e faturas confirmadas sem esforço da sua equipe." },
    { emoji: "wa-filter", title: "Cobranças automáticas", desc: "Vencimentos e boletos disparados no dia certo, sem esquecer ninguém." },
    { emoji: "wa-machine", title: "Relatórios sob demanda", desc: "Você pede um resumo no WhatsApp e o sistema responde na hora." },
  ],
  whatsapp_tip: "Tudo automatizado sem perder o toque humano — a equipe entra apenas quando é realmente necessário.",

  metrics_title: "Funcionalidades Que Sua Empresa Ganha",
  metrics_desc: "Ferramentas pensadas para eliminar retrabalho e escalar resultados.",
  metrics_tables: [
    { title: "money-float Módulos Principais", rows: [
      ["Cadastros", "Clientes, produtos, fornecedores"],
      ["Financeiro", "Contas a pagar e receber"],
      ["Relatórios", "Vendas, lucro, desempenho"],
      ["Dashboard", "Painel executivo em tempo real"],
      ["Permissões", "Controle por usuário e cargo"],
    ]},
    { title: "money-float Automação e Extras", rows: [
      ["App PWA", "Instalável no celular"],
      ["Integrações", "APIs e sistemas externos"],
      ["Backup Diário", "Seus dados sempre seguros"],
      ["Atualizações", "Novas funções ao longo do tempo"],
      ["Suporte", "Time pronto pra ajudar"],
    ]},
  ],

  plans_title: "Planos de Desenvolvimento",
  plans_desc: "Do MVP à solução corporativa completa.",

  cta_title: "Vamos desenvolver a solução que sua empresa precisa?",
  cta_desc: "Conversa rápida, sem compromisso. Em 15 minutos te mostro o caminho pra automatizar sua operação.",
  cta_button: "Falar no WhatsApp",
  cta_badges: ["Resposta em até 2 horas", "Sem compromisso na primeira conversa", "Projeto sob medida para o seu negócio"],
  cta_whatsapp_message: "Olá, vi sua proposta de sistema e quero conversar sobre o desenvolvimento.",
  whatsapp_btn_animation: "pulse",
};

// --------- DETAILED versions (herdam do base detalhado + copy específica) ---------

export const SITES_DETAILED_TEMPLATE: TemplateSection = {
  ...DETAILED_TEMPLATE,
  ...SITES_SIMPLE_TEMPLATE,
  howwework_title: "Como funciona o desenvolvimento",
  howwework_desc: "Um processo simples, transparente e organizado — do briefing à publicação.",
  howwework_items: [
    { step: "1", title: "Conhecemos seu negócio", desc: "Entendemos seus objetivos, público e como o site precisa funcionar." },
    { step: "2", title: "Planejamos a estrutura", desc: "Páginas, conteúdos e experiência do usuário organizados antes do desenvolvimento." },
    { step: "handshake", title: "Design + Programação", desc: "Layout moderno alinhado à sua marca, transformado em código rápido e seguro." },
    { step: "4", title: "Publicamos", desc: "Seu site entra no ar pronto para receber visitantes e gerar oportunidades." },
  ],
  timeline_title: "Cronograma de Entrega",
  timeline_items: [
    { week: "Semana 1", title: "Briefing e Planejamento", desc: "Levantamento completo, arquitetura das páginas e definição de conteúdos." },
    { week: "Semana 2", title: "Design", desc: "Criação do layout personalizado e aprovação visual antes de programar." },
    { week: "Semana 3", title: "Desenvolvimento", desc: "Codificação, integração WhatsApp, formulários e otimização de velocidade." },
    { week: "Semana 4", title: "Publicação", desc: "Site no ar, Google Meu Negócio configurado e treinamento para você editar." },
  ],
  social_proof_title: "Sites Que Já Entregamos",
  social_proof_stats: [
    { value: "+100", label: "Sites no Ar" },
    { value: "4.9/5", label: "Nota dos Clientes" },
    { value: "< 3s", label: "Tempo de Carregamento" },
  ],
  faq_title: "Perguntas Frequentes",
  faq_items: [
    { q: "Meu site funcionará no celular?", a: "Sim. Todos os projetos são desenvolvidos para oferecer uma ótima experiência em qualquer dispositivo — celular, tablet ou computador." },
    { q: "Em quanto tempo fica pronto?", a: "O prazo varia conforme a complexidade do projeto, mas será informado com clareza antes do início do desenvolvimento." },
    { q: "Posso solicitar alterações durante o processo?", a: "Sim. Durante o desenvolvimento você acompanha o projeto e valida cada etapa antes de seguirmos adiante." },
    { q: "O site aparecerá no Google?", a: "Criamos toda a estrutura seguindo boas práticas de SEO para facilitar o posicionamento nas pesquisas — e configuramos o Google Meu Negócio." },
    { q: "Depois da entrega vocês oferecem suporte?", a: "Sim. Permanecemos disponíveis para auxiliar sempre que necessário — ajustes, dúvidas e evoluções fazem parte da parceria." },
  ],
};

export const LOJA_DETAILED_TEMPLATE: TemplateSection = {
  ...DETAILED_TEMPLATE,
  ...LOJA_SIMPLE_TEMPLATE,
  howwework_title: "Como Vamos Montar Sua Loja",
  howwework_desc: "Da estratégia ao lançamento — sem enrolação e sem letra miúda.",
  howwework_items: [
    { step: "1", title: "Planejamento", desc: "Definimos categorias, meios de pagamento e regras de frete." },
    { step: "2", title: "Layout", desc: "Design aprovado por você antes de começar o desenvolvimento." },
    { step: "handshake", title: "Cadastro e Integrações", desc: "Produtos cadastrados, gateway de pagamento e frete configurados." },
    { step: "4", title: "Testes e Publicação", desc: "Testamos cada etapa da compra antes de colocar no ar." },
  ],
  timeline_title: "Cronograma de Implementação",
  timeline_items: [
    { week: "Semana 1", title: "Setup Estratégico", desc: "Layout, categorias e planejamento das integrações." },
    { week: "Semana 2", title: "Desenvolvimento", desc: "Loja tomando forma com produtos e checkout funcionais." },
    { week: "Semana 3", title: "Integrações", desc: "Pagamento, frete, Instagram Shopping e Google Shopping." },
    { week: "Semana 4", title: "Lançamento", desc: "Loja no ar, treinamento do painel e primeiras vendas." },
  ],
  social_proof_title: "Lojas No Ar Vendendo Todos os Dias",
  social_proof_stats: [
    { value: "+50", label: "Lojas Ativas" },
    { value: "4.9/5", label: "Nota dos Clientes" },
    { value: "24/7", label: "Vendas Automáticas" },
  ],
  faq_title: "Perguntas Frequentes",
  faq_items: [
    { q: "Em quanto tempo minha loja fica pronta?", a: "Em média entre 4 e 6 semanas, dependendo da quantidade de produtos e integrações." },
    { q: "Posso cadastrar meus próprios produtos?", a: "Sim. O painel é simples e você mesma(o) cadastra produtos, fotos, preços e estoque." },
    { q: "Quais formas de pagamento posso aceitar?", a: "PIX, cartão de crédito, débito e boleto, integrados direto no checkout." },
    { q: "Como funciona o frete?", a: "Cálculo automático em tempo real via Correios ou transportadora, mostrando o valor no checkout." },
    { q: "Preciso emitir nota fiscal?", a: "Sim. Podemos integrar com emissor automático de NF-e, tudo dentro do painel." },
  ],
};

export const SISTEMAS_DETAILED_TEMPLATE: TemplateSection = {
  ...DETAILED_TEMPLATE,
  ...SISTEMAS_SIMPLE_TEMPLATE,
  howwework_title: "Como Vamos Desenvolver Seu Sistema",
  howwework_desc: "Do mapeamento à entrega — você acompanha cada decisão e cada tela.",
  howwework_items: [
    { step: "1", title: "Entendimento", desc: "Mapeio todos os fluxos da sua empresa antes de escrever a primeira linha." },
    { step: "2", title: "Prototipagem", desc: "Cada tela desenhada e aprovada por você antes do desenvolvimento." },
    { step: "handshake", title: "Desenvolvimento Ágil", desc: "Entregas semanais pra você acompanhar e sugerir ajustes." },
    { step: "4", title: "Implantação e Suporte", desc: "Treinamento da equipe e suporte contínuo depois do go-live." },
  ],
  timeline_title: "Cronograma de Desenvolvimento",
  timeline_items: [
    { week: "Fase 1", title: "Mapeamento", desc: "Análise completa dos processos e definição de escopo." },
    { week: "Fase 2", title: "Protótipo", desc: "Todas as telas desenhadas e aprovadas antes do código." },
    { week: "Fase 3", title: "Desenvolvimento", desc: "Sistema construído com entregas semanais pra validação." },
    { week: "Fase 4", title: "Implantação", desc: "Treinamento da equipe, migração de dados e go-live." },
  ],
  social_proof_title: "Sistemas Que Já Automatizaram Empresas",
  social_proof_stats: [
    { value: "+30", label: "Sistemas Ativos" },
    { value: "4.9/5", label: "Nota dos Clientes" },
    { value: "-70%", label: "Redução de Retrabalho" },
  ],
  faq_title: "Perguntas Frequentes",
  faq_items: [
    { q: "Em quanto tempo o sistema fica pronto?", a: "Varia conforme a complexidade. MVPs podem sair em 4 a 8 semanas; sistemas completos entre 3 e 6 meses." },
    { q: "Vou conseguir mexer sem depender de programador?", a: "Sim. Cadastros, relatórios e configurações são feitos direto no painel — sem código." },
    { q: "Os dados ficam onde?", a: "Na nuvem, com backup diário e criptografia. Você acessa de qualquer lugar com internet." },
    { q: "E se eu precisar de uma nova funcionalidade?", a: "O sistema é pensado pra evoluir. Novas funções são adicionadas conforme a demanda." },
    { q: "Funciona no celular?", a: "Sim. Entregamos como PWA — o app é instalável no celular direto pelo navegador, sem loja de apps." },
  ],
};

export function getDefaultTemplateBySlugAndService(
  slug: "simple" | "detailed",
  serviceType: string,
): TemplateSection {
  const isDetailed = slug === "detailed";
  switch (serviceType) {
    case "sites_paginas":
      return isDetailed ? SITES_DETAILED_TEMPLATE : SITES_SIMPLE_TEMPLATE;
    case "loja_virtual":
      return isDetailed ? LOJA_DETAILED_TEMPLATE : LOJA_SIMPLE_TEMPLATE;
    case "sistemas_app":
      return isDetailed ? SISTEMAS_DETAILED_TEMPLATE : SISTEMAS_SIMPLE_TEMPLATE;
    case "trafego_pago":
    default:
      return isDetailed ? DETAILED_TEMPLATE : SIMPLE_TEMPLATE;
  }
}

