/** Financeiro: regras comuns (datas de vencimento e próxima recorrência). */
export const FIN_CATEGORIES = {
  despesa: ['Anúncios (Meta/Google)', 'Ferramentas e assinaturas', 'Hospedagem e domínios', 'Inteligência artificial', 'Equipe e freelancers', 'Impostos e taxas', 'Aluguel e contas', 'Equipamentos', 'Marketing', 'Outros'],
  receita: ['Site', 'Link na bio', 'Catálogo digital', 'Pack Canva', 'Tráfego pago', 'Gestão de Instagram', 'Mensalidade', 'Consultoria', 'Outros'],
};

/** Próximo vencimento de uma conta recorrente (mantém o dia; fim de mês ajusta). */
export function nextDue(due: string, rec: 'mensal' | 'anual') {
  const [y, m, d] = due.split('-').map(Number);
  const ny = rec === 'anual' ? y + 1 : m === 12 ? y + 1 : y;
  const nm = rec === 'anual' ? m : m === 12 ? 1 : m + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

/** Hoje no fuso de São Paulo (AAAA-MM-DD). */
export function todaySP(d = new Date()) {
  return new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 10);
}

export function daysUntil(due: string, today = todaySP()) {
  return Math.round((Date.parse(due + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400_000);
}
