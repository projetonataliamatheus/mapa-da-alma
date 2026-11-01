// Tarô do Mapa da Alma: as 78 cartas (22 arcanos maiores + 56 menores), com textos próprios em linguagem simples.
// Os arcanos maiores reaproveitam os textos de ../textos/biblioteca/arcanos.ts. Cartas sempre lidas "de pé" (sem invertidas):
// a leitura é acolhedora e o lado de atenção de cada carta já vem no texto.
import { ARCANOS } from '../textos/biblioteca/arcanos.ts'

export type Naipe = 'copas' | 'ouros' | 'espadas' | 'paus'
export interface Carta {
  id: string            // "M0".."M21" (maiores) ou "copas-1".."paus-14"
  nome: string          // "O Louco", "Ás de Copas"
  tipo: 'maior' | 'menor'
  numero: number        // 0..21 nos maiores; 1..14 nos menores (11 Valete, 12 Cavaleiro, 13 Rainha, 14 Rei)
  naipe?: Naipe
  palavras: string      // palavras-chave
  texto: string         // o que a carta diz
  conselho: string      // o que fazer
  temas: { amor: string; dinheiro: string } // leitura curta para as duas dores mais comuns
}

export const NAIPES: Record<Naipe, { nome: string; elemento: string; area: string; simbolo: string; cor: string }> = {
  copas: { nome: 'Copas', elemento: 'Água', area: 'emoções, amor, família e relações', simbolo: '♥', cor: '#d6336a' },
  ouros: { nome: 'Ouros', elemento: 'Terra', area: 'dinheiro, trabalho, casa e corpo', simbolo: '◆', cor: '#c9821a' },
  espadas: { nome: 'Espadas', elemento: 'Ar', area: 'pensamentos, decisões, conflitos e verdade', simbolo: '⚔', cor: '#2f6feb' },
  paus: { nome: 'Paus', elemento: 'Fogo', area: 'ação, coragem, projetos e vontade', simbolo: '✦', cor: '#e8590c' },
}

const RANK = ['', 'Ás', 'Dois', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove', 'Dez', 'Valete', 'Cavaleiro', 'Rainha', 'Rei']

// [palavras, texto, conselho, amor, dinheiro]
type T = [string, string, string, string, string]
const MENORES: Record<Naipe, T[]> = {
  copas: [
    ['amor novo, alegria, coração aberto', 'Um cálice transbordando: o coração está pronto para receber. Pode ser um amor que começa, uma amizade linda ou uma emoção boa que volta a aparecer.', 'Deixe o coração aberto e aceite o carinho que chegar, sem desconfiar de tudo.', 'Novo começo afetivo ou um reencontro cheio de ternura.', 'Dinheiro que vem por algo que você faz com amor.'],
    ['união, parceria, encontro de almas', 'Duas pessoas que se olham de igual para igual. Fala de união, reconciliação e de uma parceria em que os dois dão e recebem.', 'Converse de coração aberto e busque o meio-termo.', 'Relação equilibrada, recíproca; boa carta para reconciliação.', 'Sociedade ou parceria vantajosa.'],
    ['celebração, amigas, comemoração', 'Taças erguidas entre amigas: é tempo de festa, de apoio das pessoas queridas e de comemorar pequenas vitórias.', 'Procure quem te faz bem e celebre o que já deu certo.', 'Fase leve e alegre; cuidado com terceiros se metendo na relação.', 'Boas notícias que pedem comemoração, sem exageros nos gastos.'],
    ['tédio, insatisfação, olhar para dentro', 'Alguém sentado de braços cruzados, sem enxergar a taça nova que está sendo oferecida. Fala de desânimo e de não perceber as oportunidades.', 'Saia da reclamação e repare no que a vida já está oferecendo.', 'Relação morna; é preciso reacender o interesse.', 'Oportunidade passando despercebida: preste atenção.'],
    ['perda, tristeza, luto', 'Três taças derramadas e duas ainda de pé. É a dor de uma perda, mas também o lembrete de que nem tudo foi embora.', 'Chore o que precisa e depois olhe para o que ainda está de pé.', 'Mágoa ou decepção; o perdão abre caminho.', 'Prejuízo emocional ou financeiro que ensina.'],
    ['saudade, infância, lembranças boas', 'Lembranças doces do passado, gente querida, a criança de dentro. Pode trazer alguém de volta ou um carinho antigo.', 'Resgate a leveza e a pureza que você tinha.', 'Alguém do passado pode reaparecer; amor inocente.', 'Ajuda de família ou de alguém antigo.'],
    ['ilusão, muitas opções, sonhos', 'Muitas taças cheias de promessas, mas nem todas são reais. Fala de fantasias, de escolhas demais e de ver o que se quer ver.', 'Pé no chão: escolha uma opção real e siga com ela.', 'Cuidado com idealizar alguém; veja a pessoa como ela é.', 'Promessas fáceis demais: desconfie de dinheiro "milagroso".'],
    ['partida, deixar para trás, buscar mais', 'Alguém vai embora deixando as taças arrumadas. Fala de largar o que já não preenche para buscar algo mais verdadeiro.', 'Tenha coragem de sair do que só te esvazia.', 'Afastamento ou fim de ciclo afetivo.', 'Deixar um trabalho que não realiza mais.'],
    ['desejo realizado, satisfação, gratidão', 'É a carta do desejo atendido: conforto, alegria e sensação de que a vida está sorrindo.', 'Agradeça e faça um pedido com clareza: esta é uma boa carta para isso.', 'Felicidade no amor e sonhos se realizando.', 'Fartura e conforto material.'],
    ['família feliz, harmonia, lar', 'O arco-íris sobre a casa: família em paz, amor que dura e felicidade completa.', 'Cuide do seu lar e das pessoas que você ama.', 'Relação madura, casamento, família unida.', 'Estabilidade que traz paz para a casa.'],
    ['mensagem de amor, sensibilidade, convite', 'Um jovem sensível trazendo uma notícia boa do coração: convite, recado carinhoso ou intuição forte.', 'Ouça a sua intuição e responda com delicadeza.', 'Recado, flerte ou declaração chegando.', 'Ideia criativa que pode virar renda.'],
    ['romance, proposta, sonhador', 'O cavaleiro que chega com uma taça na mão: proposta romântica, convite, gestos de carinho.', 'Aceite o que é bonito, mas confira se é verdadeiro.', 'Pedido, proposta ou pessoa romântica se aproximando.', 'Proposta atraente; leia as letras miúdas.'],
    ['acolhimento, intuição, cuidado', 'A mulher que cuida e sente tudo. Fala de empatia, intuição muito forte e de amor maternal.', 'Cuide de você com o mesmo carinho que cuida dos outros.', 'Amor que acolhe; cuidado para não se anular.', 'Ganhos que vêm do cuidado com pessoas.'],
    ['equilíbrio emocional, conselho, maturidade', 'O homem calmo no meio do mar agitado: domina as emoções sem perder a ternura.', 'Responda com calma, mesmo quando por dentro estiver tudo mexido.', 'Parceiro maduro e estável.', 'Decisões financeiras tomadas com serenidade.'],
  ],
  ouros: [
    ['oportunidade, dinheiro novo, semente', 'Uma moeda oferecida pela mão do céu: oportunidade concreta de ganho, um trabalho novo ou um começo próspero.', 'Agarre a chance e plante hoje o que quer colher.', 'Relação que traz segurança e base sólida.', 'Dinheiro novo, emprego ou negócio começando.'],
    ['malabarismo, adaptação, contas', 'Alguém equilibrando duas moedas: fala de jogo de cintura com as contas e de muitas coisas ao mesmo tempo.', 'Organize prioridades para não deixar nada cair.', 'Dividir o tempo entre amor e obrigações.', 'Fase de equilibrar contas; dá certo com organização.'],
    ['trabalho em equipe, aprendizado, reconhecimento', 'O artesão sendo reconhecido pelo seu trabalho bem feito. Fala de competência e de parcerias que funcionam.', 'Mostre o seu trabalho e aprenda com quem sabe mais.', 'Construir a relação juntos, tijolo por tijolo.', 'Reconhecimento profissional e crescimento.'],
    ['apego, segurar, medo de perder', 'Alguém agarrado às suas moedas. Fala de segurança, mas também de apego e de medo de gastar ou de se abrir.', 'Guarde com sabedoria, mas sem viver com medo da falta.', 'Ciúme ou possessividade; solte um pouco.', 'Bom para poupar; ruim para a avareza.'],
    ['dificuldade, falta, sentir-se de fora', 'Duas pessoas passando frio do lado de fora. É a carta da fase apertada, de dívidas ou de se sentir sem apoio.', 'Peça ajuda: a porta está mais perto do que parece.', 'Sentir-se sozinho(a) mesmo acompanhado(a).', 'Aperto financeiro passageiro: corte gastos e busque apoio.'],
    ['ajuda, generosidade, dar e receber', 'Alguém dividindo moedas com quem precisa: fala de ajuda que chega, de doação e de equilíbrio entre dar e receber.', 'Aceite ajuda sem vergonha e ajude quando puder.', 'Relação generosa; cuidado com desequilíbrio.', 'Empréstimo, ajuda ou pagamento que chega.'],
    ['paciência, esperar a colheita, avaliar', 'O agricultor olhando a plantação crescer. Os resultados vêm, mas não de um dia para o outro.', 'Persista: o que você plantou está crescendo.', 'Relação que precisa de tempo para amadurecer.', 'Investimento de longo prazo; não desista agora.'],
    ['dedicação, esforço, aprender um ofício', 'O artesão trabalhando com capricho, moeda por moeda. Fala de dedicação, estudo e trabalho bem feito.', 'Aperfeiçoe o que você faz: o capricho vira dinheiro.', 'Mostrar amor com atitudes do dia a dia.', 'Esforço que traz renda estável.'],
    ['independência, conforto, conquista', 'Uma mulher num jardim farto, segura de si. É a recompensa de quem trabalhou e agora colhe com elegância.', 'Valorize a sua independência e aproveite o que conquistou.', 'Amor que não tira a sua liberdade.', 'Conforto financeiro conquistado com esforço.'],
    ['herança, família, riqueza duradoura', 'Várias gerações juntas e protegidas: fala de patrimônio, de família e de prosperidade que dura.', 'Pense no longo prazo e no que vai deixar para os seus.', 'Relação sólida com planos de família.', 'Estabilidade, imóveis ou herança.'],
    ['estudo, notícia de dinheiro, planejar', 'Um jovem olhando a moeda com atenção: fala de estudo, curso e de uma notícia boa ligada a dinheiro.', 'Estude e planeje antes de investir.', 'Começo de relação com os pés no chão.', 'Proposta de trabalho ou curso que dá retorno.'],
    ['constância, rotina, confiança', 'O cavaleiro que avança devagar e sempre. Não é rápido, mas chega.', 'Mantenha a rotina e cumpra o que promete.', 'Pessoa confiável e fiel.', 'Ganhos lentos e seguros.'],
    ['cuidado, prosperidade, mão na massa', 'A mulher que transforma a casa e o trabalho em lugar de fartura. Prática, generosa e prudente.', 'Cuide do seu corpo, da sua casa e do seu dinheiro com carinho.', 'Amor que cuida e protege.', 'Boa administração do dinheiro da família.'],
    ['sucesso material, segurança, liderança', 'O rei rodeado de fartura: sucesso nos negócios, segurança e capacidade de prover.', 'Assuma a liderança da sua vida financeira.', 'Parceiro provedor e estável.', 'Sucesso, aumento de renda e negócios sólidos.'],
  ],
  espadas: [
    ['clareza, verdade, decisão', 'Uma espada erguida cortando a névoa: chegou a hora da verdade e de decidir com a cabeça.', 'Diga a verdade com carinho e decida.', 'Conversa franca que esclarece tudo.', 'Decisão financeira clara; corte o que dá prejuízo.'],
    ['indecisão, bloqueio, não querer ver', 'Alguém de olhos vendados segurando duas espadas: fala de dúvida, de adiar uma escolha e de evitar o assunto.', 'Tire a venda: enfrentar a decisão dói menos do que adiar.', 'Relação parada por falta de conversa.', 'Escolha adiada gerando perda.'],
    ['dor no coração, mágoa, decepção', 'Um coração atravessado por três espadas. É a dor da decepção, da traição ou de palavras que machucaram.', 'Acolha a sua dor e não tome decisões no calor dela.', 'Mágoa, ciúme ou terceira pessoa; o tempo cura.', 'Decepção com alguém em negócios.'],
    ['descanso, pausa, recuperação', 'Alguém descansando em paz. Depois de tanta luta, a carta pede pausa para o corpo e a mente.', 'Durma, descanse e recupere as energias antes de agir.', 'Dar um tempo para pensar.', 'Pausa estratégica antes de investir.'],
    ['briga, orgulho, vitória vazia', 'Alguém recolhendo espadas depois de uma briga. Fala de discussões em que todo mundo perde.', 'Escolha ter paz em vez de ter razão.', 'Brigas por orgulho; ceda um pouco.', 'Disputa que custa mais do que vale.'],
    ['mudança, travessia, dias melhores', 'Um barco atravessando para águas mais calmas: fala de sair de uma fase difícil rumo a dias melhores.', 'Siga em frente: a margem calma está chegando.', 'Superar uma crise juntos ou seguir em paz.', 'Mudança que melhora a situação.'],
    ['estratégia, cuidado, segredos', 'Alguém saindo de fininho com espadas. Fala de esperteza, de agir em silêncio e também de desconfiança.', 'Seja estratégico(a), mas sem enganar ninguém.', 'Atenção a segredos ou mentiras.', 'Cuidado com golpes e contratos.'],
    ['prisão mental, medo, sentir-se preso(a)', 'Alguém amarrado no meio das espadas, mas os nós estão frouxos. O que prende é mais o medo do que a realidade.', 'Você pode sair: comece desfazendo um nó de cada vez.', 'Sentir-se preso(a) numa relação; peça ajuda.', 'Sensação de não ter saída nas contas: há saída.'],
    ['ansiedade, insônia, preocupação', 'Alguém acordado no meio da noite com a cabeça a mil. É a carta da ansiedade e das preocupações que crescem no escuro.', 'Fale sobre o que te aflige; muito medo não vira realidade.', 'Insegurança que atrapalha o amor.', 'Preocupação com dívidas: monte um plano no papel.'],
    ['fim de ciclo, fundo do poço, recomeço', 'O ponto mais baixo, mas o sol já nasce no horizonte. Depois daqui, só dá para subir.', 'Aceite o fim e prepare o recomeço.', 'Fim doloroso que liberta.', 'Fim de uma fase ruim; a recuperação começa.'],
    ['curiosidade, vigilância, notícias', 'Um jovem atento, de espada em punho: fala de curiosidade, de observar antes de agir e de notícias.', 'Observe mais, fale menos.', 'Fofoca ou desconfiança; cuidado com o que se diz.', 'Fique de olho nos detalhes e nos papéis.'],
    ['pressa, impulso, ir com tudo', 'O cavaleiro galopando a toda velocidade. Fala de coragem, mas também de pressa e de falar sem pensar.', 'Respire antes de responder.', 'Discussões rápidas e palavras duras.', 'Decisão apressada pode custar caro.'],
    ['independência, sinceridade, limites', 'A mulher que já sofreu e aprendeu: sincera, clara e dona de si.', 'Coloque limites com firmeza e educação.', 'Saber o que aceita e o que não aceita.', 'Organização e clareza nas finanças.'],
    ['razão, justiça, autoridade', 'O rei que decide com a cabeça: justo, inteligente e firme.', 'Decida pela lógica e busque orientação de quem entende.', 'Relação que precisa de mais diálogo e menos frieza.', 'Questões jurídicas ou contratos resolvidos com cuidado.'],
  ],
  paus: [
    ['início, inspiração, energia nova', 'Um bastão florescendo na mão: é a faísca de um começo, de uma ideia nova ou de uma vontade que acorda.', 'Comece: a energia está a seu favor.', 'Atração forte, paixão começando.', 'Projeto novo com potencial de ganho.'],
    ['planejamento, visão, decidir o rumo', 'Alguém olhando o mundo com o globo na mão: fala de planos e de escolher para onde ir.', 'Faça um plano e dê o primeiro passo dele.', 'Pensar no futuro da relação.', 'Planejar antes de expandir.'],
    ['expansão, horizontes, esperar retorno', 'Alguém olhando os navios no horizonte: os resultados do que você lançou estão a caminho.', 'Amplie os horizontes e confie no que plantou.', 'Relação a distância ou que se expande.', 'Retorno de investimento ou negócios fora.'],
    ['celebração, estabilidade, lar feliz', 'Uma festa sob uma porta enfeitada: fala de conquista, casamento, casa nova e alegria.', 'Comemore e reúna as pessoas queridas.', 'Compromisso, noivado ou casamento.', 'Conquista material que traz alegria.'],
    ['competição, conflitos, disputas', 'Vários bastões se batendo: fala de competição, discussões e de cada um puxando para um lado.', 'Escolha bem as suas brigas e busque o objetivo comum.', 'Discussões bobas; falta acordo.', 'Concorrência forte: destaque o seu diferencial.'],
    ['vitória, reconhecimento, sucesso', 'Alguém voltando vitorioso, aplaudido. É a carta do reconhecimento e da vitória merecida.', 'Acredite no seu valor e receba os aplausos.', 'Amor que admira e valoriza.', 'Promoção, conquista ou venda importante.'],
    ['defender, firmeza, coragem', 'Alguém no alto do morro defendendo a sua posição. Fala de não desistir do que é seu.', 'Defenda o que você acredita, sem agressividade.', 'Lutar pela relação, se valer a pena.', 'Defender o seu espaço no trabalho.'],
    ['rapidez, notícias, movimento', 'Bastões voando pelo céu: tudo acontece rápido; notícias, viagens e respostas chegando.', 'Aproveite o embalo e responda logo.', 'Mensagens e reaproximação rápida.', 'Negócios que andam depressa.'],
    ['resistência, cansaço, última prova', 'Alguém ferido mas de pé, guardando os bastões. Está cansado(a), mas falta pouco.', 'Não desista agora: é a última etapa.', 'Desconfiança por feridas antigas.', 'Resistir mais um pouco antes da virada.'],
    ['sobrecarga, peso, responsabilidades', 'Alguém carregando dez bastões nas costas. É a carta de quem leva tudo sozinho(a).', 'Divida o peso: você não precisa carregar tudo.', 'Sobrecarga na relação; peça parceria.', 'Trabalho demais para pouco retorno: reorganize.'],
    ['entusiasmo, novidade, mensageiro', 'Um jovem animado com uma notícia boa: entusiasmo, ideia nova e curiosidade.', 'Experimente algo novo.', 'Paquera divertida, convite.', 'Ideia criativa que pode render.'],
    ['aventura, mudança, impulso', 'O cavaleiro que parte em aventura: viagem, mudança de casa ou de vida.', 'Mude com coragem, mas com algum plano.', 'Paixão intensa e rápida.', 'Mudança de emprego ou de cidade.'],
    ['confiança, carisma, brilho', 'A mulher segura de si, alegre e magnética: atrai pessoas e oportunidades.', 'Mostre-se: a sua luz atrai o que você busca.', 'Atração, charme e autoestima.', 'Vender, liderar e se destacar.'],
    ['liderança, visão, empreender', 'O rei visionário: lidera com paixão e enxerga longe.', 'Assuma o comando dos seus projetos.', 'Parceiro(a) apaixonado(a) e protetor(a).', 'Empreender e crescer com coragem.'],
  ],
}

const PALAVRAS_MAIORES: Record<number, [string, string, string]> = {
  // n: [palavras, amor, dinheiro]
  0: ['liberdade, começo, fé no caminho', 'Amor leve e novo; cuidado com a imaturidade.', 'Arriscar com consciência; não gaste por impulso.'],
  1: ['vontade, poder pessoal, comunicação', 'Iniciativa e conquista no amor.', 'Começar um negócio ou vender bem.'],
  2: ['intuição, segredo, paciência', 'Sentimentos guardados; ouça a intuição.', 'Espere e observe antes de decidir.'],
  3: ['fertilidade, abundância, beleza', 'Amor que floresce, até gravidez.', 'Crescimento e fartura.'],
  4: ['estrutura, autoridade, estabilidade', 'Relação estável, talvez rígida.', 'Organização financeira e carreira.'],
  5: ['ensinamento, tradição, compromisso', 'Casamento e compromisso sério.', 'Acordos formais e orientação.'],
  6: ['escolha, amor, união', 'Escolha amorosa importante.', 'Decisão entre dois caminhos.'],
  7: ['vitória, avanço, determinação', 'Relação que avança.', 'Conquista pelo esforço.'],
  8: ['justiça, equilíbrio, verdade', 'Relação justa; colhe-se o que planta.', 'Questões legais resolvidas.'],
  9: ['solidão, sabedoria, busca interior', 'Tempo sozinho(a) para se entender.', 'Prudência e planejamento.'],
  10: ['ciclos, sorte, mudança', 'Virada no amor.', 'A sorte muda: aproveite a maré.'],
  11: ['força interior, coragem, gentileza', 'Paciência que conquista.', 'Superar dificuldades com calma.'],
  12: ['pausa, entrega, novo olhar', 'Relação parada; mude o ponto de vista.', 'Espera necessária; não force.'],
  13: ['transformação, fim, renascimento', 'Fim de um ciclo e começo de outro.', 'Mudança profunda de trabalho.'],
  14: ['equilíbrio, cura, moderação', 'Harmonia e reconciliação.', 'Equilíbrio entre ganhar e gastar.'],
  15: ['apego, vícios, tentação', 'Paixão intensa ou relação que prende.', 'Cuidado com dívidas e gastos compulsivos.'],
  16: ['ruptura, revelação, libertação', 'Crise que revela a verdade.', 'Mudança brusca; reconstrua em base firme.'],
  17: ['esperança, cura, inspiração', 'Amor sincero e esperança renovada.', 'Dias melhores chegando.'],
  18: ['ilusão, medo, intuição', 'Dúvidas e inseguranças; não imagine coisas.', 'Cuidado com enganos.'],
  19: ['alegria, sucesso, clareza', 'Felicidade no amor.', 'Sucesso e reconhecimento.'],
  20: ['despertar, chamado, renovação', 'Segunda chance ou reencontro.', 'Decisão importante e recomeço.'],
  21: ['realização, conclusão, plenitude', 'Amor completo.', 'Objetivo alcançado.'],
}

function maior(n: number): Carta {
  const a = ARCANOS[n === 0 ? 22 : n]
  const [palavras, amor, dinheiro] = PALAVRAS_MAIORES[n]
  return { id: `M${n}`, nome: a.nome, tipo: 'maior', numero: n, palavras, texto: `${a.texto} ${a.periodo}`, conselho: a.fazer[0] || '', temas: { amor, dinheiro } }
}

export const BARALHO: Carta[] = [
  ...Array.from({ length: 22 }, (_, n) => maior(n)),
  ...(Object.keys(MENORES) as Naipe[]).flatMap(np => MENORES[np].map((t, i) => {
    const r = i + 1
    return { id: `${np}-${r}`, nome: `${RANK[r]} de ${NAIPES[np].nome}`, tipo: 'menor' as const, numero: r, naipe: np, palavras: t[0], texto: t[1], conselho: t[2], temas: { amor: t[3], dinheiro: t[4] } }
  })),
]

export const cartaPorId = (id: string) => BARALHO.find(c => c.id === id)

/** Tiragens à venda. A chave combina com o fim do slug do produto em "Mapas e preços" (taro-3-cartas, taro-cruz-celta). */
export const TIRAGENS: Record<string, { nome: string; servico: string; posicoes: { nome: string; sentido: string }[] }> = {
  '3cartas': {
    nome: 'Tarô: Passado, Presente e Futuro', servico: 'taro-3-cartas',
    posicoes: [
      { nome: 'Passado', sentido: 'o que trouxe você até aqui' },
      { nome: 'Presente', sentido: 'a energia que você vive agora' },
      { nome: 'Futuro', sentido: 'para onde o caminho aponta se nada mudar' },
    ],
  },
  cruz: {
    nome: 'Tarô: Cruz Celta', servico: 'taro-cruz-celta',
    posicoes: [
      { nome: 'A situação', sentido: 'o centro da sua pergunta, como ela está hoje' },
      { nome: 'O desafio', sentido: 'o que cruza o seu caminho e atrapalha' },
      { nome: 'A raiz', sentido: 'o que está por baixo, a origem do assunto' },
      { nome: 'O passado recente', sentido: 'o que acabou de acontecer e ainda pesa' },
      { nome: 'O que pode ser', sentido: 'o melhor que pode sair disso' },
      { nome: 'O futuro próximo', sentido: 'o que vem nas próximas semanas' },
      { nome: 'Você', sentido: 'a sua atitude diante da situação' },
      { nome: 'As pessoas ao redor', sentido: 'como os outros influenciam' },
      { nome: 'Esperanças e medos', sentido: 'o que você deseja e o que teme' },
      { nome: 'O resultado provável', sentido: 'onde isso tende a chegar' },
    ],
  },
}

export const tipoPorServico = (slug?: string | null) => (Object.keys(TIRAGENS).find(k => TIRAGENS[k].servico === slug) || (/(cruz|celta)/.test(String(slug || '')) ? 'cruz' : /taro/.test(String(slug || '')) ? '3cartas' : null))
