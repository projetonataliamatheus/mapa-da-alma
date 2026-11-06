/**
 * Recuperação de vendas do site pelo WhatsApp.
 * Quem fez o teste grátis (com WhatsApp) e não comprou nem chamou a gente é abordado, 1 h depois, no horário comercial do país dele,
 * SÓ pelo chip marcado como "Recuperação". Uma única mensagem de confirmação; a conversa só segue se a pessoa responder (sem follow-up).
 */
import { admin as db } from './supabase/admin';
import { waKey } from './phone';
import { nomeProprio } from './mapa-alma/nome';
import { sendBubbles, logEvent, hasWhatsapp } from './engine';
import { getSettings } from './settings';

// fuso (horas em relação a UTC) por país, para respeitar o horário comercial de quem vai receber
const FUSO: Record<string, number> = { BR: -3, AR: -3, UY: -3, PY: -3, CL: -4, BO: -4, VE: -4, DO: -4, CO: -5, PE: -5, EC: -5, PA: -5, US: -5, MX: -6, CR: -6, GT: -6, PT: 0, ES: 1 };
const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'del', 'la', 'las', 'los', 'y', 'e', 'van', 'von']);

/** Horário comercial no país do contato: seg–sex 9h–18h, sábado 9h–13h. */
export function horarioComercialDo(pais: string | null | undefined, agora = Date.now()): boolean {
  const off = FUSO[String(pais || 'BR').toUpperCase()] ?? -3;
  const d = new Date(agora + off * 3600_000);
  const dia = d.getUTCDay(), h = d.getUTCHours() + d.getUTCMinutes() / 60;
  if (dia === 0) return false;
  return dia === 6 ? h >= 9 && h < 13 : h >= 9 && h < 18;
}

/** "Maria Fernanda Lopes Pereira" → "Maria Pereira" (nome e sobrenome, sem o nome completo). */
export function nomeCurto(nomeCompleto: string, idioma: 'pt' | 'es'): string {
  const p = nomeProprio(nomeCompleto).split(/\s+/).filter(Boolean);
  if (p.length < 2) return p[0] || '';
  const uteis = p.filter((x, i) => i === 0 || !PARTICULAS.has(x.toLowerCase()));
  // espanhol: o 1º sobrenome costuma ser o penúltimo (nome + sobrenome paterno + materno)
  const sobre = idioma === 'es' && uteis.length >= 3 ? uteis[uteis.length - 2] : uteis[uteis.length - 1];
  return `${uteis[0]} ${sobre}`;
}

export async function chipRecuperacao(): Promise<any | null> {
  const { data, error } = await db().from('whatsapp_numbers').select('*').eq('recuperacao', true).limit(1);
  if (error) return null; // migração 063 ainda não rodou
  const n = data?.[0];
  if (!n || n.status !== 'conectado') return null;
  if (n.paused_until && new Date(n.paused_until) > new Date()) return null;
  return n;
}

const MAX_POR_RODADA = 2;
const MAX_POR_DIA = 60;

/** Roda a cada poucos minutos no robô. Devolve quantas mensagens saíram. */
export async function recuperarSite(): Promise<number> {
  const chip = await chipRecuperacao();
  if (!chip) return 0;
  const hoje = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
  const { count: feitosHoje } = await db().from('site_leads').select('id', { count: 'exact', head: true }).eq('recup_status', 'enviado').gte('recup_at', `${hoje}T03:00:00Z`);
  if ((feitosHoje || 0) >= MAX_POR_DIA) return 0;

  const { data: cands, error } = await db().from('site_leads').select('*')
    .is('recup_status', null).not('whatsapp', 'is', null).eq('pago', false).is('lead_id', null).is('wa_click_at', null)
    .lte('created_at', new Date(Date.now() - 3600_000).toISOString())
    .gte('created_at', new Date(Date.now() - 72 * 3600_000).toISOString())
    .order('created_at').limit(40);
  if (error || !cands?.length) return 0;

  const settings = await getSettings(db());
  let enviados = 0;
  for (const s of cands) {
    if (enviados >= MAX_POR_RODADA) break;
    if (!horarioComercialDo(s.pais)) continue;
    const marca = async (recup_status: string, extra: any = {}) => { await db().from('site_leads').update({ recup_status, recup_at: new Date().toISOString(), ...extra }).eq('id', s.id); };
    const k = waKey(s.whatsapp);
    if (!k) { await marca('sem_whatsapp'); continue; }
    const idioma: 'pt' | 'es' = s.idioma === 'pt' ? 'pt' : 'es';
    // quem já é cliente, já conversa com a gente ou pediu para não receber: não incomodar
    const { data: bloq } = await db().from('blocked_phones').select('wa_key').eq('wa_key', k).maybeSingle();
    if (bloq) { await marca('bloqueado'); continue; }
    const { data: ex } = await db().from('leads').select('id,stage,last_inbound_at,last_outbound_at').eq('wa_key', k).limit(5);
    if ((ex || []).some((l: any) => l.stage === 'pago' || l.last_inbound_at || l.last_outbound_at)) { await marca('ja_cliente'); continue; }
    if (!(await hasWhatsapp(chip, { whatsapp: s.whatsapp, wa_key: k }).catch(() => true))) { await marca('sem_whatsapp'); continue; }

    const curto = nomeCurto(s.nome, idioma);
    const nasc = String(s.nascimento).split('-').reverse().join('/');
    const { data: lead, error: e1 } = await db().from('leads').insert({
      name: curto || s.nome, whatsapp: s.whatsapp, wa_key: k, source: 'recuperacao_site', stage: 'abordado', idioma, pais: s.pais, number_id: chip.id, ai_enabled: true,
      memory: { recuperacao: { ref: s.ref, em: Date.now(), site: s.site || (idioma === 'pt' ? 'br' : 'es') }, mapa_nome_completo: s.nome, mapa_nascimento: nasc, nome_cliente: curto.split(' ')[0], leitura_iniciada: Date.now(), site: s.ref },
    }).select('*').single();
    if (e1 || !lead) { await marca('falhou'); continue; }
    const msg = idioma === 'pt' ? `Oi, tudo bem? Falo com ${curto}? 🙂` : `Hola, ¿qué tal? ¿Hablo con ${curto}? 🙂`;
    try {
      await sendBubbles(chip, lead, [msg], 'ai', settings.typing !== false);
      await db().from('leads').update({ last_outbound_at: new Date().toISOString(), wa_status: 'enviado', next_step: 'Esperar a pessoa confirmar o nome. Sem follow-up.' }).eq('id', lead.id);
      await marca('enviado', { recup_lead_id: lead.id, lead_id: lead.id });
      await logEvent(lead.id, 'recuperacao', 'wa', `Recuperação do site: ${chip.label} chamou ${curto} (fez o teste grátis e não comprou)`, { ref: s.ref });
      enviados++;
    } catch (e: any) {
      await db().from('leads').delete().eq('id', lead.id);
      await db().from('site_leads').update({ recup_status: null }).eq('id', s.id);
      console.error('[recuperacao]', e?.message);
      break;
    }
  }
  return enviados;
}

/** Roteiro da conversa de recuperação, injetado na resposta da IA (só para esses contatos). */
export function notaRecuperacao(lead: any, history: any[]): string {
  const rec = lead.memory?.recuperacao;
  if (!rec) return '';
  const falou = history.filter((m) => m.direction === 'in').length;
  const es = lead.idioma === 'es';
  return `

CONVERSA DE RECUPERAÇÃO (este contato fez o TESTE GRÁTIS no nosso site, gerou a prévia do mapa dele e NÃO comprou; nós chamamos primeiro, pelo número de Recuperação). O nome completo e a data de nascimento dele estão na ficha do mapa acima. A primeira mensagem já foi enviada: "${es ? 'Hola, ¿qué tal? ¿Hablo con' : 'Oi, tudo bem? Falo com'} ${lead.name}?". ${es ? 'RESPONDA SEMPRE EM ESPANHOL (tú).' : 'Responda em português (você).'} Já houve ${falou} mensagem(ns) dele.
Regras de ouro: cuidadosa, educada, NADA intrusiva nem intrometida, mensagens curtas, uma ideia por vez, no máximo UMA pergunta. Só conduza e aprofunde se a pessoa demonstrar interesse. Nunca prometa cura ou garantia; use "lidar", "entender", "aprender", "descobrir". Nunca fale do valor logo no começo.
ETAPAS (siga a que corresponde ao ponto em que a conversa está):
1) CONFIRMAÇÃO: se a pessoa confirmou que é ela (ou respondeu algo neutro), agradeça e passe à etapa 3. NÃO diga o nome completo nem a data ainda além do necessário.
2) DESCONFIANÇA/DÚVIDA ("quem é?", "de onde me conhece?", "como conseguiu meu número?"): apresente-se com calma como Natália ("pode me chamar de Natty"), diga que ela entrou no nosso site de trabalho e gerou uma prévia do Mapa da Alma com o nome e a data de nascimento dela (cite o nome e a data que ela mesma digitou), que é por isso que você está falando com ela, e que não vai incomodar. Pergunte se pode continuar. Se ela não quiser, vá para a etapa 6.
3) ABERTURA: diga que está entrando em contato porque viu no mapa dela uma leitura importante para ela saber. Cite de 3 a 4 pontos delicados do mapa dela (use SÓ o que está na ficha: por exemplo falta de dinheiro/instabilidade financeira, dificuldade nos relacionamentos, saúde/desgaste emocional, bloqueios), de forma suave e sem alarmar. Termine perguntando se isso faz sentido e se ela está passando por algo assim agora.
4) ENTENDER: escute, entenda o cenário dela, converse sobre cada situação que ela trouxer e dê dicas curtas e práticas de como lidar. Pergunte, uma vez, se ficou alguma dúvida sobre a prévia que ela viu no site ou se há uma área específica (dinheiro, amor, saúde, família, trabalho) que ela quer olhar mais de perto.
5) OFERTA: só se ela demonstrou interesse, explique que o Mapa completo mostra o "o que fazer" em cada área e ofereça, uma vez, sem insistir; siga o fechamento normal do sistema (preço, formas de pagar) apenas se ela perguntar ou topar.
6) RECUSA: se ela recusar, disser que não quer, ficar com receio ou não for a pessoa: peça desculpas pelo incômodo, diga que vai finalizar o atendimento e excluir o contato, deseje um ótimo dia/tarde/noite e marque opt_out = true. Não responda mais depois disso. Só retome se ela mesma voltar dizendo com clareza que quer comprar.
NUNCA insista, NUNCA mande vários lembretes, NUNCA discuta com quem recusar.`;
}
