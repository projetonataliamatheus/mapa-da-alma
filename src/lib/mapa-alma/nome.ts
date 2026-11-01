// Nome do cliente: sempre com Iniciais Maiúsculas (mesmo se vier em CAIXA ALTA ou tudo minúsculo)
// e uma chave para reconhecer o mesmo nome escrito de jeitos diferentes (maiúsculas, acentos, espaços).

const PARTICULAS = new Set(['da', 'de', 'do', 'das', 'dos', 'e', 'di', 'du', 'del', 'della', 'van', 'von', 'la', 'le', 'y'])

const cap = (w: string) => w.charAt(0).toLocaleUpperCase('pt-BR') + w.slice(1)

/** "MARIA DA SILVA" / "maria da silva" → "Maria da Silva"; "joão d'ávila" → "João D'Ávila"; "ana-luíza" → "Ana-Luíza". */
export function nomeProprio(nome: string): string {
  const ws = String(nome || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR').split(' ').filter(Boolean)
  return ws.map((w, i) => {
    if (i > 0 && PARTICULAS.has(w)) return w
    return w.split('-').map(p => p.split("'").map(cap).join("'")).join('-')
  }).join(' ')
}

/** Chave para comparar nomes: ignora maiúsculas/minúsculas, acentos e espaços a mais. */
export function chaveNome(nome: string): string {
  return String(nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z' -]/g, '').replace(/\s+/g, ' ').trim()
}
