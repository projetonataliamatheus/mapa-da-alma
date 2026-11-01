/** Etapas da Produção (separado para poder ser usado no navegador). */
export const PRODUCTION_STEPS: [string, string, string][] = [
  ['fila', 'Aguardando início', 'mut'],
  ['materiais', 'Aguardando materiais', 'warn'],
  ['producao', 'Em produção', 'ai'],
  ['revisao', 'Revisão com o cliente', 'acc'],
  ['entregue', 'Entregue', 'ok'],
  ['pausado', 'Pausado', 'bad'],
];
