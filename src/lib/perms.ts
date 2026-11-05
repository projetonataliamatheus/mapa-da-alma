/**
 * Perfis e permissões da equipe. Usado no painel (menus e botões) e no servidor (API).
 * O Master tem tudo e só ele mexe em integrações, checkout e tetos de custo.
 */

export type Perm = string;

/** [chave, rótulo, grupo, descrição] — espelha o menu lateral do Mapa da Alma. */
export const PERMS: [Perm, string, string, string][] = [
  // menus
  ['visao', 'Visão geral', 'Menus', 'Painel com números e alertas'],
  ['conversas', 'Conversas', 'Menus', 'Ler as conversas do WhatsApp'],
  ['mapas', 'Gerador de mapas', 'Menus', 'Mapas gerados, análise do mapa, pirâmides e PDFs'],
  ['taro', 'Tarô', 'Menus', 'Tiragens de tarô feitas e tiragem manual'],
  ['simpatias', 'Simpatias', 'Menus', 'Biblioteca de simpatias e orações e envio na conversa'],
  ['campanhas', 'Campanhas', 'Menus', 'Campanhas de anúncio, origem dos contatos e resultados'],
  ['fluxo', 'Fluxo', 'Menus', 'Sequência de abertura (mensagens, áudios, imagens e esperas) antes da IA'],
  ['internacional', 'Países e preços', 'Menus', 'Atendimento em espanhol: países, moedas, preços e pagamento internacional'],
  ['simpatias.editar', 'Editar simpatias', 'Ações', 'Criar, editar e desativar simpatias e orações'],
  ['leads', 'Leads e funil', 'Menus', 'Kanban e fichas dos contatos'],
  ['clientes', 'Clientes', 'Menus', 'Quem já comprou um mapa'],
  ['links', 'Links de pagamento', 'Menus', 'Ver links e pagamentos'],
  ['servicos', 'Mapas e preços', 'Menus', 'Ver os mapas à venda e os preços'],
  ['financeiro', 'Financeiro', 'Menus', 'Recebimentos, contas a pagar e relatórios'],
  ['recibos', 'Recibos', 'Menus', 'Recibos das vendas'],
  ['abordagens', 'Abordagens', 'Menus', 'Estilos de conversa'],
  ['inteligencia', 'Inteligência', 'Menus', 'Técnicas e casos que a IA usa'],
  ['aprendizado', 'Aprendizado', 'Menus', 'O que as vendas ensinaram'],
  ['conhecimento', 'Base de conhecimento', 'Menus', 'PDFs e técnicas'],
  ['numeros', 'Números WhatsApp', 'Menus', 'Ver números e saúde'],
  ['vozes', 'Vozes (ElevenLabs)', 'Menus', 'Vozes usadas nos áudios da IA'],
  ['custos', 'Custos', 'Menus', 'Ver gastos do mês'],
  ['equipe', 'Equipe', 'Menus', 'Ver a equipe'],
  ['acessos', 'Acessos', 'Menus', 'Banco de usuários e senhas da equipe (ver e copiar)'],
  // ações
  ['mapas.gerar', 'Gerar mapas e prévias', 'Ações', 'Criar mapas pelo painel'],
  ['mapas.liberar', 'Liberar mapa completo e senhas', 'Ações', 'Liberar, ver e trocar a senha do cliente'],
  ['mapas.enviar', 'Enviar mapas no WhatsApp', 'Ações', 'Mandar prévia ou mapa completo para o cliente'],
  ['mapas.excluir', 'Apagar mapas', 'Ações', 'Remove o mapa gerado'],
  ['mapas.textos', 'Editar textos do mapa', 'Ações', 'Biblioteca de textos de cada número'],
  ['mapas.aparencia', 'Mudar a aparência do mapa', 'Ações', 'Fontes, nome e assinatura do mapa'],
  ['taro.gerar', 'Tirar tarô manualmente', 'Ações', 'Sortear cartas para um contato e mandar no WhatsApp'],
  ['conversas.responder', 'Responder e assumir conversas', 'Ações', 'Escrever para o cliente e tirar a IA'],
  ['leads.editar', 'Mover contatos no funil', 'Ações', 'Arrastar cards e mudar etapa'],
  ['leads.desconto', 'Aprovar descontos', 'Ações', 'Liberar preço abaixo do degrau'],
  ['leads.pago', 'Marcar venda como paga', 'Ações', 'Registrar pagamento recebido por fora'],
  ['leads.excluir', 'Apagar contatos', 'Ações', 'Remove contato e conversa'],
  ['links.criar', 'Criar e editar links de pagamento', 'Ações', 'Inclui mudar valores'],
  ['servicos.editar', 'Mudar mapas e preços', 'Ações', 'Faixas de preço e degraus'],
  ['financeiro.editar', 'Lançar e editar no financeiro', 'Ações', 'Contas a pagar, recebimentos manuais, comprovantes'],
  ['abordagens.editar', 'Editar abordagens', 'Ações', 'Textos e estilos da IA'],
  ['conhecimento.enviar', 'Enviar e apagar PDFs', 'Ações', 'Base de conhecimento'],
  ['numeros.gerenciar', 'Conectar e remover números', 'Ações', 'QR Code e pausas'],
  ['vozes.editar', 'Configurar vozes', 'Ações', 'Escolher e testar as vozes'],
  ['automacao.pausar', 'Pausar a automação', 'Ações', 'Botão "Automação ativa"'],
  ['equipe.gerenciar', 'Criar acessos para a equipe', 'Ações', 'Só pode dar as permissões que ele próprio tem'],
  ['acessos.editar', 'Cadastrar e editar acessos', 'Ações', 'Criar, trocar e apagar usuários e senhas'],
];

/** Cada ação pertence a um menu (na tela de Equipe ela aparece dentro dele). */
export const PARENT: Record<string, Perm> = {
  'mapas.gerar': 'mapas',
  'mapas.liberar': 'mapas',
  'mapas.enviar': 'mapas',
  'mapas.excluir': 'mapas',
  'mapas.textos': 'mapas',
  'mapas.aparencia': 'mapas',
  'taro.gerar': 'taro',
  'simpatias.editar': 'simpatias',
  'conversas.responder': 'conversas',
  'leads.editar': 'leads',
  'leads.desconto': 'leads',
  'leads.pago': 'leads',
  'leads.excluir': 'leads',
  'links.criar': 'links',
  'servicos.editar': 'servicos',
  'financeiro.editar': 'financeiro',
  'abordagens.editar': 'abordagens',
  'conhecimento.enviar': 'conhecimento',
  'numeros.gerenciar': 'numeros',
  'vozes.editar': 'vozes',
  'automacao.pausar': 'visao',
  'equipe.gerenciar': 'equipe',
  'acessos.editar': 'acessos',
};

/** Seções do menu lateral, na mesma ordem: [seção, [permissão, rótulo no menu]]. */
export const SECTIONS: [string, [Perm, string][]][] = [
  ['Operação', [['visao', 'Visão geral'], ['conversas', 'Conversas'], ['mapas', 'Gerador de mapas'], ['taro', 'Tarô'], ['simpatias', 'Simpatias'], ['leads', 'Leads e funil']]],
  ['Clientes', [['clientes', 'Clientes']]],
  ['Vendas', [['links', 'Links de pagamento'], ['servicos', 'Mapas e preços'], ['checkout.editor', 'Editor do checkout']]],
  ['Financeiro', [['financeiro', 'Financeiro'], ['recibos', 'Recibos']]],
  ['Inteligência da IA', [['abordagens', 'Abordagens'], ['fluxo', 'Fluxo'], ['internacional', 'Países e preços'], ['campanhas', 'Campanhas'], ['inteligencia', 'Inteligência'], ['aprendizado', 'Aprendizado'], ['conhecimento', 'Base de conhecimento']]],
  ['Sistema', [['numeros', 'Números WhatsApp'], ['vozes', 'Vozes (ElevenLabs)'], ['custos', 'Custos'], ['config', 'Configurações'], ['equipe', 'Equipe'], ['acessos', 'Acessos']]],
];

/** Só o Master: nunca podem ser liberadas para outros. */
export const MASTER_ONLY: [string, string][] = [
  ['config', 'Configurações e integrações (chaves, horários, limites)'],
  ['mapas.privados', 'Mapas privados (só quem marcou vê)'],
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
  vendedor: ['visao', 'conversas', 'mapas', 'taro', 'taro.gerar', 'simpatias', 'leads', 'clientes', 'links', 'servicos', 'aprendizado', 'inteligencia', 'mapas.gerar', 'mapas.liberar', 'mapas.enviar', 'conversas.responder', 'leads.editar', 'links.criar'],
  atendente: ['visao', 'conversas', 'mapas', 'taro', 'simpatias', 'leads', 'clientes', 'mapas.gerar', 'mapas.enviar', 'conversas.responder', 'leads.editar'],
  personalizado: ['visao', 'conversas', 'mapas', 'leads', 'conversas.responder', 'leads.editar'],
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
  '/fluxo': 'fluxo',
  '/paises': 'internacional',
  '/campanhas': 'campanhas',
  '/aprendizado': 'aprendizado',
  '/inteligencia': 'inteligencia',
  '/conhecimento': 'conhecimento',
  '/producao': 'producao',
  '/numeros': 'numeros',
  '/custos': 'custos',
  '/vozes': 'vozes',
  '/mapas': 'mapas',
  '/taro': 'taro',
  '/simpatias': 'simpatias',
  '/dominios': 'config',
  '/config': 'config',
  '/checkout-editor': 'checkout.editor',
  '/equipe': 'equipe',
  '/acessos': 'acessos',
  '/bio': 'bio',
  '/catalogo': 'catalogo',
  '/packs': 'packs',
  '/clientes': 'clientes',
  '/orcamentos': 'orcamentos',
  '/relatorios-trafego': 'relatorios',
  '/contratos': 'contratos',
  '/recibos': 'recibos',
  '/financeiro': 'financeiro',
  '/pagamentos': 'financeiro',
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
