/**
 * Links sempre isolados nas mensagens para o cliente:
 *   frase que apresenta o link 👇
 *   https://link
 *   (linha em branco)
 *   resto do texto
 * O link nunca fica no meio da frase. Vale para qualquer link (prévia, link na bio, pagamento, catálogo…).
 */

const URL_RE = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
const HAND = '👇';
const ENDS_HAND = /👇️?\s*$/u;
const INTROS = ['Confere o link abaixo', 'É só tocar no link abaixo', 'Segue o link', 'O link está aqui embaixo'];

/** A frase apresenta o link? (curta, termina em ":" ou fala de link/abaixo/aqui no final) */
const presents = (t: string) => /:\s*(👇\uFE0F?)?\s*$/u.test(t) || ENDS_HAND.test(t) || t.trim().length <= 70 || /\b(link|abaixo|aqui|segue|acess[ae]|clique|toque)\b[^.!?]*$/i.test(t.slice(-40));

const isUrlLine = (l: string) => /^(https?:\/\/|www\.)\S+$/i.test(l.trim());

/** Coloca a mãozinha no fim da frase que apresenta o link (troca 👉 / ⬇️ por 👇). */
function withHand(t: string) {
  let s = t.replace(/\s+$/, '');
  if (ENDS_HAND.test(s)) return s;
  s = s.replace(/\s*(👉|⬇️|⬇|➡️|➡|🔗)️?\s*$/u, '');
  // "aqui:" / "abaixo:" / "link." → mantém os dois pontos, tira ponto final e vírgula
  s = s.replace(/[.,;]+$/, '');
  return `${s} ${HAND}`;
}

export function hasLink(text: string) {
  return new RegExp(URL_RE.source, 'i').test(String(text || ''));
}

export function isolateLinks(text: string) {
  const src = String(text ?? '');
  if (!hasLink(src)) return src;
  const out: string[] = [];
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  let n = 0;
  const intro = () => INTROS[(src.length + n++) % INTROS.length];

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (!hasLink(line)) {
      // texto logo depois de uma linha só com link: separa com uma linha em branco
      if (line.trim() && out.length && isUrlLine(out[out.length - 1])) out.push('');
      out.push(line);
      continue;
    }
    // separa o texto e os links da linha
    const parts = line.split(URL_RE).filter((p) => p !== undefined && p !== '');
    let acc = '';
    for (const part of parts) {
      if (!new RegExp('^' + URL_RE.source + '$', 'i').test(part)) {
        acc += part;
        continue;
      }
      // pontuação colada no fim do link vai para fora (não quebra o link)
      const m = part.match(/^(.*?)([.,;:!?)\]]+)$/);
      const url = m ? m[1] : part;
      const tail = m ? m[2] : '';
      const before = acc.replace(/^[\s:–-]+$/, '').trim();
      acc = tail.replace(/^[.,;:]+/, '');
      if (before) {
        if (out.length && isUrlLine(out[out.length - 1])) out.push('');
        // frase curta ou que termina em ":" apresenta o link; texto longo fica na linha dele e ganha uma chamada curta
        if (presents(before)) out.push(withHand(before));
        else {
          out.push(before, '');
          out.push(`${intro()} ${HAND}`);
        }
      } else {
        // sem frase antes na mesma linha: usa a linha de cima (tirando linhas em branco entre ela e o link)
        while (out.length && !out[out.length - 1].trim()) out.pop();
        const prev = out.length ? out[out.length - 1] : '';
        if (prev.trim() && !isUrlLine(prev) && presents(prev)) out[out.length - 1] = withHand(prev);
        else {
          if (prev.trim()) out.push('');
          out.push(`${intro()} ${HAND}`);
        }
      }
      out.push(url);
    }
    const rest = acc.trim();
    if (rest && !/^[.,;:!?)]+$/.test(rest)) {
      out.push('');
      out.push(rest);
    }
  }
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
