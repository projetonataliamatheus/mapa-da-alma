// Confere o motor contra um mapa real gerado em 31/10/2026.
// Rodar: node --experimental-strip-types tests/motor.test.ts
import assert from 'node:assert/strict'
import { mapaPessoal, signoSolar } from '../src/lib/numerologia/motor.ts'

const m = mapaPessoal('Natalia Dantas Teixeira', '1996-04-15', '2026-10-31')
const ok: string[] = []
const eq = (rotulo: string, real: unknown, esperado: unknown) => {
  assert.deepEqual(real, esperado, `${rotulo}: veio ${JSON.stringify(real)}, esperado ${JSON.stringify(esperado)}`)
  ok.push(rotulo)
}

eq('Motivação', [m.motivacao.bruto, m.motivacao.valor], [19, 1])
eq('Expressão', [m.expressao.bruto, m.expressao.valor], [59, 5])
eq('Impressão', [m.impressao.bruto, m.impressao.valor], [40, 4])
eq('Destino', [m.destino.bruto, m.destino.valor], [35, 8])
eq('Missão', [m.missao.bruto, m.missao.valor], [13, 4])
eq('Talento oculto', m.talentoOculto.valor, 6)
eq('Número psíquico', m.numeroPsiquico.valor, 6)
eq('Resposta subconsciente', m.respostaSubconsciente, 6)
eq('Tendências ocultas', m.tendenciasOcultas, [1, 4, 5])
eq('Lições cármicas', m.licoesCarmicas, [7, 8, 9])
eq('Ano/mês/dia pessoal', [m.anoPessoal, m.mesPessoal, m.diaPessoal], [2, 3, 7])
eq('Ciclos', m.ciclos, [
  { numero: 4, inicio: 1996, fim: 2025 }, { numero: 6, inicio: 2025, fim: 2052 }, { numero: 7, inicio: 2052, fim: null },
])
eq('Momentos decisivos', m.momentos, [
  { numero: 1, inicio: 1996, fim: 2025 }, { numero: 4, inicio: 2025, fim: 2034 },
  { numero: 5, inicio: 2034, fim: 2043 }, { numero: 11, inicio: 2043, fim: null },
])
eq('Desafios', m.desafios, { primeiro: 2, segundo: 1, principal: 1 })
eq('Arcanos', [m.arcano.quantidade, m.arcano.duracaoMeses, m.arcano.atual, m.arcano.numeroAtual, m.arcano.inicio, m.arcano.fim],
  [20, 54, 7, 14, '2023-04-15', '2027-10-15'])
eq('Arcano dominante', m.arcano.posicao, 6.79)
eq('Triângulo da vida (1ª e últimas linhas)', [m.triangulos.vida.linhas[0].join(''), m.triangulos.vida.linhas.slice(-3).map(l => l.join(' '))],
  ['514131141541345165121', ['7 5 7', '3 3', '6']])
eq('Triângulo pessoal (1ª linha)', m.triangulos.pessoal.linhas[0].join(''), '271797717217912732787')
eq('Triângulo social (1ª linha)', m.triangulos.social.linhas[0].join(''), '958575585985789519565')
eq('Triângulo do destino (1ª linha)', m.triangulos.destino.linhas[0].join(''), '625242252652456276232')
eq('Sequências negativas (vida)', m.triangulos.vida.sequencias.map(s => `${s.digito}x${s.tamanho}`), ['4x3', '4x4', '8x3'])
eq('Dívidas cármicas', m.dividasCarmicas, [14, 19])
eq('Signo', signoSolar('1996-04-15'), 'Áries')

console.log(`✔ ${ok.length} conferências batem com o mapa real:\n  - ` + ok.join('\n  - '))
