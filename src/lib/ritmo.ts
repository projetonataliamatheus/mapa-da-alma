/**
 * RITMO DO ATENDIMENTO — a IA percebe, pela conversa, se o cliente quer atendimento rápido, normal ou acolhedor,
 * e quantas "revelações" do mapa ela pode fazer antes de apresentar o valor. Tudo ajustável no painel (settings.ritmo).
 */

export type ModoRitmo = 'rapido' | 'neutro' | 'acolhedor';

export const RITMO_PADRAO = {
  ativo: true,
  // quantas seções do mapa comentadas (revelações) antes de a IA apresentar o valor
  limite_rapido: 2,
  limite_neutro: 3,
  limite_acolhedor: 5,
};

const palavras = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

const RE_PRESSA = /\b(r[aá]pido|rapidinho|directo|direto|al grano|al punto|sin rodeos|sem rodeios|no tengo tiempo|n[aã]o tenho tempo|estoy apurad|estou apurad|apuro|urgente|ya mismo|agora mesmo|solo quiero|s[oó] quero|vamos al grano|v[aá]monos|sin tanto)\b/i;
const RE_PRECO = /cu[aá]nto (sale|cuesta|vale|es|cobr)|qu[eé] (precio|valor)|\bprecio\b|\bcosto\b|quanto (custa|sai|é|fica)|qual (o )?(pre[cç]o|valor)|\bpre[cç]o\b/i;
const RE_DOR = /(falleci|se (me )?muri[oó]|muri[oó]|enferm|soledad|solid[aã]o|sozinh|sola\b|deprim|llor|chor|luto|perdi (o|a|mi)|viud|abandon|c[aâ]ncer|hospital|grave)/i;

export function detectarRitmo(history: any[]): { modo: ModoRitmo; motivo: string } {
  const ins = history
    .filter((m) => m.direction === 'in')
    .map((m) => String(m.transcript || m.body || '').trim())
    .filter((t) => t && !/^\[(imagem|figurinha|sticker|image)\]/i.test(t))
    .slice(-10);
  if (ins.length < 2) return { modo: 'neutro', motivo: 'poucas mensagens' };

  let rap = 0;
  let aco = 0;
  const notas: string[] = [];
  const palavrasMedia = ins.reduce((n, t) => n + palavras(t), 0) / ins.length;
  const curtas = ins.filter((t) => palavras(t) <= 3).length / ins.length;
  const longas = ins.filter((t) => palavras(t) >= 40).length;

  if (palavrasMedia <= 4) {
    rap += 2;
    notas.push('responde curtinho');
  } else if (palavrasMedia >= 25) {
    aco += 2;
    notas.push('escreve bastante');
  }
  if (curtas >= 0.6) {
    rap += 1;
  }
  if (longas >= 1) {
    aco += 1;
    notas.push('mandou texto/áudio longo');
  }
  if (ins.slice(0, 3).some((t) => RE_PRECO.test(t))) {
    rap += 1;
    notas.push('perguntou preço cedo');
  }
  if (ins.some((t) => RE_PRESSA.test(t))) {
    rap += 2;
    notas.push('pediu rapidez');
  }
  if (ins.some((t) => RE_DOR.test(t))) {
    aco += 2;
    notas.push('momento delicado/emocional');
  }

  const d = rap - aco;
  if (d >= 2) return { modo: 'rapido', motivo: notas.join(', ') };
  if (d <= -2) return { modo: 'acolhedor', motivo: notas.join(', ') };
  return { modo: 'neutro', motivo: notas.join(', ') || 'equilibrado' };
}

export function limiteRitmo(modo: ModoRitmo, cfg: any) {
  const c = { ...RITMO_PADRAO, ...(cfg || {}) };
  return Number(modo === 'rapido' ? c.limite_rapido : modo === 'acolhedor' ? c.limite_acolhedor : c.limite_neutro) || 3;
}

/** Nota para o prompt: ritmo do cliente + se já é hora de apresentar o valor. Só para quem ainda não pagou. */
export function notaRitmo(lead: any, history: any[], cfg: any, es: boolean): string {
  const c = { ...RITMO_PADRAO, ...(cfg || {}) };
  if (c.ativo === false) return '';
  if (lead.stage === 'pago' || lead.cortesia) return '';
  const { modo, motivo } = detectarRitmo(history);
  const limite = limiteRitmo(modo, c);
  const m = lead.memory || {};
  const secoes = Array.isArray(m.secoes_liberadas) ? m.secoes_liberadas.length : 0;
  const precoDito = (Array.isArray(m.precos_ditos) && m.precos_ditos.length > 0) || ['negociando', 'pix'].includes(lead.stage);

  const perfil =
    modo === 'rapido'
      ? 'RÁPIDO: esta pessoa quer objetividade. 1 balão curto por resposta (no máximo 2), sem rodeio, sem enfeitar, sem explicar o que ela não perguntou. Acolhimento em UMA frase curta, e já leve para o mapa e o valor.'
      : modo === 'acolhedor'
        ? 'ACOLHEDOR: esta pessoa gosta de conversar e se sentir ouvida (ou está num momento delicado). Mantenha o carinho e a escuta, sem apressar, mas SEM se alongar além do necessário e sempre caminhando para o mapa completo.'
        : 'EQUILIBRADO: carinho e objetividade na medida; balões curtos, uma ideia por vez.';

  let marcha = '';
  if (!precoDito) {
    if (secoes >= limite) {
      marcha = es
        ? `HORA DE APRESENTAR EL VALOR: ya comentaste ${secoes} partes del mapa (el límite para este perfil es ${limite}). En ESTA respuesta, después de acoger lo que dijo en una frase, presenta el Mapa completo con su precio (pago único) y pregunta cómo prefiere pagar. No abras otra revelación nueva ni hagas otra pregunta de exploración.`
        : `HORA DE APRESENTAR O VALOR: você já comentou ${secoes} partes do mapa (o limite para este perfil é ${limite}). Nesta resposta, depois de acolher o que ela disse em UMA frase, apresente o Mapa completo com o preço (pagamento único) e pergunte como prefere pagar. Não abra mais uma revelação nova nem faça outra pergunta de exploração.`;
    } else {
      marcha = `Faltam no máximo ${Math.max(0, limite - secoes)} revelação(ões) do mapa antes de apresentar o valor. Cada revelação tem de ser forte e ligada à dor dela; não encha de assunto paralelo.`;
    }
  } else {
    marcha = 'O valor já foi apresentado: não enrole e não repita a explicação do mapa. Se ela tem dúvida, responda direto; se demonstrou interesse, leve ao link. Sem pressionar nem cobrar.';
  }

  return `\n\nRITMO DO ATENDIMENTO (percebido na conversa${motivo ? `: ${motivo}` : ''}) — perfil ${perfil}\n${marcha}\nNunca diga ao cliente que você percebeu o ritmo dele.`;
}

/** Remove frases que pedem desculpa pela demora ou agradecem a paciência/espera (a IA demora 1 a 4 min, isso é normal). */
const RE_DEMORA =
  /(desculp\w*|perd[oó]n\w*|disculp\w*|sinto)\s+(a |la |pela |por la |por a |pelo |por )?(demora|espera|tardanza|demorar|tardar|tempo de espera)|obrigad[ao] (pela|por) (a )?(paci[eê]ncia|espera|esperar|compreens[aã]o)|gracias por (tu |la |esperar|su )?(paciencia|espera|esperar|comprensi[oó]n)|(estou|estoy|tô) (bem )?(corrid[oa]|ocupad[oa]|movid[oa])|hoy est[aá] (bien )?(movido|corrido)|hoje (tá|está) (bem )?(movimentad|corrid)|demor[eé] (un poco|um pouco)/i;

const RE_ORACAO = new RegExp(`[^,.!?;:\\n]*?(?:${RE_DEMORA.source})[^,.!?;:\\n]*[,.!?;:]?\\s*(?:\\p{Extended_Pictographic}\\uFE0F?\\s*)*`, 'giu');

export function semDesculpaPorDemora(p: string): string {
  if (!RE_DEMORA.test(p)) return p;
  let r = p.replace(RE_ORACAO, ' ').replace(/\s{2,}/g, ' ').trim();
  // sobra só o nome ou pontuação solta ("Ivonne"): descarta o balão
  if (r.replace(/[^\p{L}]/gu, '').length < 12) return '';
  r = r.replace(/[,;:]\s*$/, '.');
  return r.replace(/^[\s,.;:!¡¿?]+/, '').replace(/^\p{Ll}/u, (c) => c.toUpperCase());
}
