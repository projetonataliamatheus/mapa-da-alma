// Consulta ao vivo no WhatsApp: extrai nome + data da conversa e monta a "ficha do mapa" que a IA usa para conversar.
import { montarConteudo } from './mapa/conteudo.ts'
import { montarAnalise } from './analise.ts'
import { textoPiramides } from './mapa/piramides.ts'
import { reduzir } from './numerologia/motor.ts'
import { ESSENCIAS } from './textos/essencias.ts'
import { texto } from './textos/biblioteca/index.ts'
import { SIGNOS_INFO, decanato } from './textos/biblioteca/signos.ts'
import { ARCANOS, arcanoBase } from './textos/biblioteca/arcanos.ts'

/** Converte "15/04/1996", "15-04-96", "15 04 1996" ou "1996-04-15" em AAAA-MM-DD. */
export function dataDoTexto(t: string): string | null {
  const s = String(t || '')
  let m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = /\b(\d{1,2})[\/.\- ](\d{1,2})[\/.\- ](\d{2,4})\b/.exec(s)
  if (!m) return null
  let ano = Number(m[3]); if (ano < 100) ano += ano > (new Date().getFullYear() % 100) ? 1900 : 2000
  const iso = `${ano}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  const d = new Date(iso + 'T12:00:00Z')
  return isNaN(+d) || d.getUTCDate() !== Number(m[1]) || ano < 1900 ? null : iso
}

const NAO_NOME = new Set(['quero', 'sim', 'nao', 'não', 'oi', 'ola', 'olá', 'tudo', 'bem', 'obrigado', 'obrigada', 'mapa', 'pessoal', 'casal', 'meu', 'minha', 'nome', 'data', 'nascimento', 'nasci', 'ok', 'bom', 'dia', 'tarde', 'noite', 'pode', 'claro', 'quanto', 'custa', 'valor', 'preço', 'aqui', 'esta', 'está', 'é', 'eu', 'você', 'voce', 'amor', 'trabalho', 'vida', 'favor', 'por', 'segue', 'meus', 'dados', 'certo', 'isso', 'gostaria', 'saber', 'como', 'funciona'])

/** Nome completo provável numa mensagem (2 a 7 palavras só com letras, depois de tirar a data). */
export function nomeDoTexto(t: string): string | null {
  const limpo = String(t || '').replace(/\d{1,4}[\/.\- ]\d{1,2}[\/.\- ]\d{2,4}/g, ' ').replace(/(meu nome( completo)? (é|e)|nome:?|nasci (em|no dia)|data:?|sou (a|o))/gi, ' ')
  for (const linha of limpo.split(/[\n,;]+/)) {
    const w = linha.trim().split(/\s+/).filter(Boolean)
    if (w.length >= 2 && w.length <= 7 && w.every(x => /^[A-Za-zÀ-ÿ'´`]+$/.test(x)) && w.filter(x => x.length > 2).length >= 2 && !w.some(x => NAO_NOME.has(x.toLowerCase())))
      return w.map(x => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase()).join(' ').replace(/ (Da|De|Do|Das|Dos|E) /g, m => m.toLowerCase())
  }
  return null
}

const pal = (n: number) => (ESSENCIAS[n] || ESSENCIAS[reduzir(n)]).palavras
const um = (cat: string, n: number) => {
  const p = (texto(cat, n, {}, reduzir(n)).find(x => !/^O QUE FAZER/i.test(x)) || '').replace(/^Dívida cármica \d+:\s*/, '')
  return (p.replace(/^\([^)]*\)\s*/, '').match(/[^.!?]+[.!?]/g) || [p]).slice(0, 2).join(' ').trim()
}

/** Ficha do mapa para a IA (dados reais calculados; a IA conversa a partir deles). */
export function fichaDoMapa(nome: string, nascimento: string, hoje = new Date().toISOString().slice(0, 10)): string {
  const c = montarConteudo(nome, nascimento, {}, hoje)
  const m = c.mapa, si = SIGNOS_INFO[c.signo], dec = decanato(c.signo, nascimento)
  const idade = Number(hoje.slice(0, 4)) - m.nascimento.ano - (hoje.slice(5) < nascimento.slice(5) ? 1 : 0)
  const cicloAtual = m.ciclos.find(x => !x.fim || Number(hoje.slice(0, 4)) < x.fim) || m.ciclos[m.ciclos.length - 1]
  const momentoAtual = m.momentos.find(x => !x.fim || Number(hoje.slice(0, 4)) < x.fim) || m.momentos[m.momentos.length - 1]
  const mestres = [['Motivação', m.motivacao.valor], ['Expressão', m.expressao.valor], ['Destino', m.destino.valor], ['Missão', m.missao.valor]].filter(([, v]) => v === 11 || v === 22)
  const seqs = (['vida', 'pessoal', 'social', 'destino'] as const).flatMap(k => m.triangulos[k].sequencias.map(x => `${String(x.digito).repeat(3)} no triângulo ${k}`))
  const curiosos = [
    ...mestres.map(([k, v]) => `${k} ${v} é NÚMERO MESTRE (raro): sensibilidade e missão elevadas.`),
    ...m.dividasCarmicas.map(n => `Dívida cármica ${n}: ${um('dividasCarmicas', n)}`),
    ...m.tendenciasOcultas.map(n => `O ${n} aparece ${m.frequencia[n]} vezes no nome (excesso): ${um('tendenciasOcultas', n).replace(/^O número \d aparece em excesso no seu nome\.\s*/, '')}`),
    ...(seqs.length ? [`Bloqueios no nome (sequências negativas): ${[...new Set(seqs)].join(', ')}.`] : []),
    ...(m.licoesCarmicas.length ? [`Faltam no nome os números ${m.licoesCarmicas.join(', ')} (lições cármicas): ${m.licoesCarmicas.map(n => um('licoesCarmicas', n).replace(/^Lição cármica \d \([^)]*\):\s*/, '')).join(' ')}`] : []),
  ]
  return `FICHA DO MAPA (calculada agora — dados REAIS deste cliente; use como base da consulta)
Nome analisado: ${nome} · nascimento ${nascimento.split('-').reverse().join('/')} · ${idade} anos
Signo: ${si.glifo} ${c.signo} (${dec + 1}º decanato) · ${si.elemento} · regente ${si.regente}. ${si.personalidade.split('. ').slice(0, 2).join('. ')}.
Amor pelo signo: ${si.amor.split('. ').slice(0, 2).join('. ')}.
Motivação ${m.motivacao.valor} (${pal(m.motivacao.valor)}): ${um('motivacao', m.motivacao.valor)}
Impressão ${m.impressao.valor} (${pal(m.impressao.valor)}): ${um('impressao', m.impressao.valor)}
Expressão ${m.expressao.valor} (${pal(m.expressao.valor)}): ${um('expressao', m.expressao.valor)}
Destino ${m.destino.valor} (${pal(m.destino.valor)}): ${um('destino', m.destino.valor)}
Missão ${m.missao.valor} (${pal(m.missao.valor)}): ${um('missao', m.missao.valor)}
Dia ${m.diaNascimento}: ${um('diaNascimento', m.diaNascimento)}
Ano pessoal ${m.anoPessoal} (agora): ${um('anoPessoal', m.anoPessoal)}
Ciclo atual ${cicloAtual.numero}: ${um('ciclo', cicloAtual.numero).replace(/^Ciclo regido pelo \d+:\s*/, '')}
Momento decisivo atual ${momentoAtual.numero}: ${um('momento', momentoAtual.numero).replace(/^Momento regido pelo \d+:\s*/, '')}
Desafio principal ${m.desafios.principal}: ${um('desafio', m.desafios.principal)}
No amor (harmonia ${reduzir(m.missao.valor)}): ${um('harmoniaConjugal', reduzir(m.missao.valor))}
Arcano que rege agora: ${m.arcano.numeroAtual} = ${ARCANOS[arcanoBase(m.arcano.numeroAtual)].nome} (até ${m.arcano.fim.split('-').reverse().join('/')}): ${ARCANOS[arcanoBase(m.arcano.numeroAtual)].periodo.split('. ').slice(0, 2).join('. ')}.
Dias favoráveis: ${c.tabela.find(l => l.item === 'Dias favoráveis')?.valor} · Cores: ${c.tabela.find(l => l.item === 'Cores favoráveis')?.sentido}
POSITIVOS PARA EQUILIBRAR (use 1 a cada 2 revelações negativas):
- Talentos naturais (expressão ${m.expressao.valor}): ${um('expressao', m.expressao.valor)}
- Dom do dia de nascimento (dia ${m.diaNascimento}): ${um('diaNascimento', m.diaNascimento)}
- Dom adormecido (talento oculto ${m.talentoOculto.valor}): ${um('talentoOculto', m.talentoOculto.valor)}
- Propósito da alma (missão ${m.missao.valor}): ${um('missao', m.missao.valor)}
PONTOS CURIOSOS E CRÍTICOS (os que mais impressionam):
${curiosos.length ? curiosos.map(x => '- ' + x).join('\n') : '- Energias bem distribuídas, sem dívidas nem excessos: destaque o equilíbrio e os talentos.'}

${(() => { try { return textoPiramides(montarAnalise(nome, nascimento, {}, hoje)) } catch { return '' } })()}

ESTA FICHA (mapa + pirâmides) É A BASE EXCLUSIVA DESTA CONVERSA: tudo o que você disser sobre a vida desta pessoa sai daqui. Use as pirâmides para falar de dinheiro, amor, família, saúde e emoções.`
}
