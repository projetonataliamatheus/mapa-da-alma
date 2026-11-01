/**
 * Perfis e permissões da equipe. Usado no painel (menus e botões) e no servidor (API).
 * O Master tem tudo e só ele mexe em integrações, checkout e tetos de custo.
 */

export type Perm = string;

/** [chave, rótulo, grupo, descrição] */
export const PERMS: [Perm, string, string, string][] = [
  // menus
  ['visao', 'Visão geral', 'Menus', 'Painel com números e alertas'],
  ['prospeccao', 'Prospecção', 'Menus', 'Ver buscas e resultados'],
  ['leads', 'Leads e funil', 'Menus', 'Kanban e fichas dos leads'],
  ['conversas', 'Conversas', 'Menus', 'Ler as conversas do WhatsApp'],
  ['producao', 'Produção', 'Menus', 'Clientes pagos, tarefas, resumo e pastas do Drive'],
  ['instagram', 'Instagram assistido', 'Menus', 'Fila de directs'],
  ['servicos', 'Serviços e preços', 'Menus', 'Ver serviços e preços'],
  ['links', 'Links de pagamento', 'Menus', 'Ver links e pagamentos'],
  ['modelos', 'Modelos e prévias', 'Menus', 'Modelos de site e prévias'],
  ['modelos_premium', 'Modelos premium', 'Menus', 'Sites prontos que a IA personaliza'],
  ['bio', 'Link na bio', 'Menus', 'Páginas de links dos clientes (olinks)'],
  ['catalogo', 'Catálogo digital', 'Menus', 'Cardápios com QR Code dos clientes'],
  ['packs', 'Packs Canva', 'Menus', 'Packs de artes no Canva e galerias de prévia'],
  ['abordagens', 'Abordagens', 'Menus', 'Estilos de conversa'],
  ['inteligencia', 'Inteligência', 'Menus', 'Técnicas e casos que a IA usa'],
  ['aprendizado', 'Aprendizado', 'Menus', 'O que as vendas ensinaram'],
  ['conhecimento', 'Base de conhecimento', 'Menus', 'PDFs e técnicas'],
  ['numeros', 'Números WhatsApp', 'Menus', 'Ver números e saúde'],
  ['custos', 'Custos', 'Menus', 'Ver gastos do mês'],
  ['equipe', 'Equipe', 'Menus', 'Ver a equipe'],
  ['acessos', 'Acessos', 'Menus', 'Banco de usuários e senhas da equipe (ver e copiar)'],
  ['financeiro', 'Financeiro', 'Menus', 'Recebimentos, contas a pagar e relatórios'],
  ['orcamentos', 'Orçamentos', 'Menus', 'Gerador de orçamentos por link'],
  ['relatorios', 'Relatórios de tráfego', 'Menus', 'Relatórios de tráfego pago para clientes'],
  ['contratos', 'Contratos', 'Menus', 'Contratos de prestação de serviço com assinatura'],
  // ações
  ['prospeccao.buscar', 'Fazer buscas no Google', 'Ações', 'Gasta da cota do Google'],
  ['conversas.responder', 'Responder e assumir conversas', 'Ações', 'Escrever para o cliente e tirar a IA'],
  ['leads.editar', 'Mover leads no funil', 'Ações', 'Arrastar cards e mudar etapa'],
  ['leads.desconto', 'Aprovar descontos', 'Ações', 'Liberar preço abaixo do degrau'],
  ['leads.pago', 'Marcar venda como paga', 'Ações', 'Registrar pagamento recebido por fora'],
  ['leads.excluir', 'Apagar leads', 'Ações', 'Remove lead e conversa'],
  ['producao.editar', 'Tocar a produção', 'Ações', 'Mudar etapa, tarefas, responsável, prazo e refazer o resumo'],
  ['previas.gerar', 'Gerar e enviar prévias', 'Ações', 'Prévia do site para o cliente'],
  ['links.criar', 'Criar e editar links de pagamento', 'Ações', 'Inclui mudar valores'],
  ['servicos.editar', 'Mudar serviços e preços', 'Ações', 'Faixas de preço e degraus'],
  ['modelos.editar', 'Editar modelos de site', 'Ações', 'Cadastrar exemplos e aparência'],
  ['abordagens.editar', 'Editar abordagens', 'Ações', 'Textos e estilos da IA'],
  ['conhecimento.enviar', 'Enviar e apagar PDFs', 'Ações', 'Base de conhecimento'],
  ['numeros.gerenciar', 'Conectar e remover números', 'Ações', 'QR Code e pausas'],
  ['automacao.pausar', 'Pausar a automação', 'Ações', 'Botão "Automação ativa"'],
  ['equipe.gerenciar', 'Criar acessos para a equipe', 'Ações', 'Só pode dar as permissões que ele próprio tem'],
  ['acessos.editar', 'Cadastrar e editar acessos', 'Ações', 'Criar, trocar e apagar usuários e senhas'],
  ['bio.editar', 'Criar e editar links na bio', 'Ações', 'Montar, publicar e pausar as páginas'],
  ['catalogo.editar', 'Criar e editar catálogos', 'Ações', 'Montar cardápios, publicar e pausar'],
  ['packs.editar', 'Criar e editar packs Canva', 'Ações', 'Cadastrar packs, prévias e link do Canva'],
  ['financeiro.editar', 'Lançar e editar no financeiro', 'Ações', 'Contas a pagar, recebimentos manuais, comprovantes'],
];

/** Cada ação pertence a um menu (na tela de Equipe ela aparece dentro dele). */
export const PARENT: Record<string, Perm> = {
  'prospeccao.buscar': 'prospeccao',
  'conversas.responder': 'conversas',
  'leads.editar': 'leads',
  'leads.desconto': 'leads',
  'leads.pago': 'leads',
  'leads.excluir': 'leads',
  'producao.editar': 'producao',
  'previas.gerar': 'modelos',
  'links.criar': 'links',
  'servicos.editar': 'servicos',
  'modelos.editar': 'modelos',
  'abordagens.editar': 'abordagens',
  'conhecimento.enviar': 'conhecimento',
  'numeros.gerenciar': 'numeros',
  'automacao.pausar': 'visao',
  'equipe.gerenciar': 'equipe',
  'acessos.editar': 'acessos',
  'bio.editar': 'bio',
  'catalogo.editar': 'catalogo',
  'packs.editar': 'packs',
  'financeiro.editar': 'financeiro',
};

/** Seções do menu lateral, na mesma ordem: [seção, [permissão, rótulo no menu]]. */
export const SECTIONS: [string, [Perm, string][]][] = [
  ['Operação', [['visao', 'Visão geral'], ['conversas', 'Conversas'], ['leads', 'Leads e funil'], ['prospeccao', 'Prospecção'], ['instagram', 'Instagram assistido']]],
  ['Clientes', [['producao', 'Produção'], ['relatorios', 'Relatórios de tráfego']]],
  ['Vendas', [['orcamentos', 'Orçamentos'], ['contratos', 'Contratos'], ['links', 'Links de pagamento'], ['servicos', 'Serviços e preços'], ['checkout.editor', 'Editor do checkout']]],
  ['Financeiro', [['financeiro', 'Financeiro e recibos']]],
  ['Produtos', [['modelos', 'Modelos e prévias'], ['modelos_premium', 'Modelos premium'], ['bio', 'Link na bio'], ['catalogo', 'Catálogo digital'], ['packs', 'Packs Canva']]],
  ['Inteligência da IA', [['abordagens', 'Abordagens'], ['inteligencia', 'Inteligência'], ['aprendizado', 'Aprendizado'], ['conhecimento', 'Base de conhecimento']]],
  ['Sistema', [['numeros', 'Números WhatsApp'], ['custos', 'Custos'], ['config', 'Vozes, Domínios e Configurações'], ['equipe', 'Equipe'], ['acessos', 'Acessos']]],
];

/** Só o Master: nunca podem ser liberadas para outros. */
export const MASTER_ONLY: [string, string][] = [
  ['config', 'Configurações e integrações (chaves, horários, limites)'],
  ['checkout.editor', 'Editor visual do checkout e domínio'],
  ['custos.tetos', 'Tetos de gasto (IA e Google)'],
];

export const ROLES: [string, string, string][] = [
  ['master', 'Master', 'Dono do sistema. Acessa e configura tudo.'],
  ['gerente', 'Gerente', 'Toca a operação e cria acessos de vendedores.'],
  ['vendedor', 'Vendedor', 'Prospecta, conversa, manda prévias e links.'],
  ['atendente', 'Atendente', 'Acompanha e responde conversas.'],
  ['personalizado', 'Personalizado', 'Você escolhe item por item.'],
];

const ALL = PERMS.map((p) => p[0]);
export const PRESETS: Record<string, Perm[]> = {
  gerente: ALL,
  vendedor: ['visao', 'prospeccao', 'leads', 'conversas', 'producao', 'instagram', 'servicos', 'links', 'modelos', 'modelos_premium', 'bio', 'catalogo', 'packs', 'aprendizado', 'inteligencia', 'acessos', 'bio.editar', 'catalogo.editar', 'packs.editar', 'prospeccao.buscar', 'conversas.responder', 'leads.editar', 'previas.gerar', 'links.criar'],
  atendente: ['visao', 'leads', 'conversas', 'producao', 'instagram', 'acessos', 'conversas.responder', 'leads.editar', 'producao.editar'],
  personalizado: ['visao', 'leads', 'conversas', 'instagram', 'conversas.responder', 'leads.editar'],
};

export function roleLabel(role?: string | null) {
  return ROLES.find((r) => r[0] === role)?.[1] || (role === 'admin' ? 'Master' : 'Vendedor');
}

export function isMaster(member: any) {
  return member?.role === 'master' || member?.role === 'admin';
}

/** Lista efetiva de permissões de um membro. */
export function permsOf(member: any): Perm[] {
  if (!member) return [];
  if (isMaster(member)) return [...ALL, ...MASTER_ONLY.map((m) => m[0])];
  if (Array.isArray(member.perms) && member.perms.length) return member.perms;
  return PRESETS[member.role] || PRESETS.atendente;
}

export function can(member: any, perm: Perm) {
  if (!member) return false;
  if (isMaster(member)) return true;
  if (MASTER_ONLY.some((m) => m[0] === perm)) return false;
  return permsOf(member).includes(perm);
}

/** Qual permissão libera cada tela do painel. */
export const PAGE_PERM: Record<string, Perm> = {
  '/': 'visao',
  '/prospeccao': 'prospeccao',
  '/leads': 'leads',
  '/conversas': 'conversas',
  '/instagram': 'instagram',
  '/servicos': 'servicos',
  '/links': 'links',
  '/modelos-premium': 'modelos_premium',
  '/modelos': 'modelos',
  '/abordagens': 'abordagens',
  '/aprendizado': 'aprendizado',
  '/inteligencia': 'inteligencia',
  '/conhecimento': 'conhecimento',
  '/producao': 'producao',
  '/numeros': 'numeros',
  '/custos': 'custos',
  '/vozes': 'config',
  '/dominios': 'config',
  '/config': 'config',
  '/checkout-editor': 'checkout.editor',
  '/equipe': 'equipe',
  '/acessos': 'acessos',
  '/bio': 'bio',
  '/catalogo': 'catalogo',
  '/packs': 'packs',
  '/clientes': 'leads',
  '/orcamentos': 'orcamentos',
  '/relatorios-trafego': 'relatorios',
  '/contratos': 'contratos',
  '/recibos': 'financeiro',
  '/financeiro': 'financeiro',
};

export function pagePerm(path: string): Perm | null {
  if (path === '/') return 'visao';
  const hit = Object.keys(PAGE_PERM)
    .filter((k) => k !== '/' && path.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return hit ? PAGE_PERM[hit] : null;
}

/** Quem cria acesso só pode dar o que ele próprio tem (e nunca Master). */
export function grantable(granter: any, perms: Perm[]) {
  return perms.filter((p) => ALL.includes(p) && can(granter, p));
}
