// Biblioteca de textos padrão do Mapa da Alma: categoria → número → texto.
// No painel (Gerador de mapas → Textos do mapa) qualquer texto pode ser substituído (tabela mapa_textos).
import { MOTIVACAO } from './motivacao.ts'
import { IMPRESSAO } from './impressao.ts'
import { EXPRESSAO } from './expressao.ts'
import { DESTINO } from './destino.ts'
import { MISSAO } from './missao.ts'
import { DIA_NASCIMENTO } from './dias.ts'
import { TALENTO_OCULTO, NUMERO_PSIQUICO, RESPOSTA_SUBCONSCIENTE, TENDENCIAS_OCULTAS } from './interior.ts'
import { LICOES_CARMICAS, DIVIDAS_CARMICAS, SEQUENCIAS_NEGATIVAS } from './carma.ts'
import { ANO_PESSOAL, MES_PESSOAL, DIA_PESSOAL, CICLO, DESAFIO, MOMENTO_DECISIVO, HARMONIA_CONJUGAL_TXT } from './tempo.ts'

export const CATEGORIAS: { id: string; nome: string; textos: Record<string, string> }[] = [
  { id: 'motivacao', nome: 'Motivação', textos: MOTIVACAO },
  { id: 'impressao', nome: 'Impressão', textos: IMPRESSAO },
  { id: 'expressao', nome: 'Expressão', textos: EXPRESSAO },
  { id: 'diaNascimento', nome: 'Dia de nascimento', textos: DIA_NASCIMENTO },
  { id: 'destino', nome: 'Destino', textos: DESTINO },
  { id: 'missao', nome: 'Missão', textos: MISSAO },
  { id: 'talentoOculto', nome: 'Talento oculto', textos: TALENTO_OCULTO },
  { id: 'numeroPsiquico', nome: 'Número psíquico', textos: NUMERO_PSIQUICO },
  { id: 'respostaSubconsciente', nome: 'Resposta subconsciente', textos: RESPOSTA_SUBCONSCIENTE },
  { id: 'tendenciasOcultas', nome: 'Tendências ocultas', textos: TENDENCIAS_OCULTAS },
  { id: 'licoesCarmicas', nome: 'Lições cármicas', textos: LICOES_CARMICAS },
  { id: 'dividasCarmicas', nome: 'Dívidas cármicas', textos: DIVIDAS_CARMICAS },
  { id: 'sequencia', nome: 'Sequência numérica (negativa)', textos: SEQUENCIAS_NEGATIVAS },
  { id: 'anoPessoal', nome: 'Ano pessoal', textos: ANO_PESSOAL },
  { id: 'mesPessoal', nome: 'Mês pessoal', textos: MES_PESSOAL },
  { id: 'diaPessoal', nome: 'Dia pessoal', textos: DIA_PESSOAL },
  { id: 'ciclo', nome: 'Ciclos de vida', textos: CICLO },
  { id: 'desafio', nome: 'Desafio', textos: DESAFIO },
  { id: 'momento', nome: 'Momento decisivo', textos: MOMENTO_DECISIVO },
  { id: 'harmoniaConjugal', nome: 'Harmonia conjugal', textos: HARMONIA_CONJUGAL_TXT },
]

const POR_ID = Object.fromEntries(CATEGORIAS.map(c => [c.id, c.textos]))

/** Texto de uma categoria/número: personalizado (painel) > padrão > número reduzido. Devolve parágrafos. */
export function texto(cat: string, n: number | string, ov: Record<string, string> = {}, reduzido?: number): string[] {
  const t = ov[`${cat}:${n}`] || POR_ID[cat]?.[String(n)] || (reduzido != null ? ov[`${cat}:${reduzido}`] || POR_ID[cat]?.[String(reduzido)] : '') || ''
  return t ? t.split(/\n{2,}/).map(p => p.trim()).filter(Boolean) : []
}
