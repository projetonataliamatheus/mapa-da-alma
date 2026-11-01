/* Teste real do modelo de significado (roda no CI dentro da imagem node:20-slim, igual ao servidor). */
import assert from 'node:assert/strict';
import { embed, EMBED_DIM } from '../src/lib/embed';

const cos = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);

async function main() {
  const t = Date.now();
  const [caro, bolso, horario] = await embed(['Achei caro demais, não tenho esse dinheiro agora', 'O preço não cabe no meu bolso', 'Qual o horário de funcionamento da clínica?'], 'query');
  assert.equal(caro.length, EMBED_DIM);
  const near = cos(caro, bolso);
  const far = cos(caro, horario);
  console.log(`similaridade preço/bolso=${near.toFixed(3)} preço/horário=${far.toFixed(3)} em ${Date.now() - t}ms`);
  assert.ok(near > far, 'frases com o mesmo sentido deveriam ficar mais próximas');
  const [p] = await embed(['Quando o cliente disser que está caro, compare com o retorno de um cliente novo.'], 'passage');
  assert.ok(cos(caro, p) > cos(horario, p), 'a técnica de preço deveria casar com a objeção de preço');
  console.log('busca por significado ok');
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
