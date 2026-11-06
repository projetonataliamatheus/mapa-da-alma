'use client';
import { useEffect, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { Switch, api, toast } from '@/components/ui';
import { DEFAULT_SETTINGS } from '@/lib/settings';
import { BrandSettings } from '@/components/BrandSettings';
import { useMe } from '@/components/Shell';
import { isMaster } from '@/lib/perms';

function Row({ t, s, children }: { t: string; s: string; children: React.ReactNode }) {
  return (
    <div className="setrow">
      <div className="tx">
        <b>{t}</b>
        <small>{s}</small>
      </div>
      <div className="ctl">{children}</div>
    </div>
  );
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEIGHTS: [string, string][] = [
  ['nosite', 'Sem site'],
  ['estab', 'Bem avaliado (nota 4,3+ e 30+ avaliações) — vale mais se não tem site'],
  ['weak', 'Site fraco'],
  ['fewrev', 'Poucas avaliações'],
  ['lowrate', 'Nota baixa'],
  ['photos', 'Poucas fotos'],
  ['incomplete', 'Ficha incompleta (sem horário)'],
  ['wa', 'Tem WhatsApp'],
  ['ig', 'Tem Instagram'],
];

export default function Config() {
  const me = useMe();
  const [s, setS] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [gt, setGt] = useState<any>(null);
  const [gtBusy, setGtBusy] = useState(false);
  const [at, setAt] = useState<any>(null);
  const [atBusy, setAtBusy] = useState(false);
  async function testAi() {
    setAtBusy(true);
    setAt(null);
    try {
      setAt(await api('/api/ai-test', 'GET'));
    } catch (e: any) {
      setAt({ ok: false, cause: e.message });
    }
    setAtBusy(false);
  }
  async function testGoogle() {
    setGtBusy(true);
    setGt(null);
    try {
      setGt(await api('/api/google', 'GET'));
    } catch (e: any) {
      setGt({ ok: false, cause: e.message });
    }
    setGtBusy(false);
  }

  useEffect(() => {
    api('/api/settings', 'GET').then(setS).catch((e) => toast(e.message));
    api('/api/status', 'GET').then(setStatus).catch(() => {});
  }, []);

  if (!s) return <div className="spin" />;
  const set = (path: string, v: any) => {
    const next = JSON.parse(JSON.stringify(s));
    const keys = path.split('.');
    let o = next;
    keys.slice(0, -1).forEach((k) => (o = o[k]));
    o[keys[keys.length - 1]] = v;
    setS(next);
  };
  const n = (path: string, w = 80) => {
    const v = path.split('.').reduce((o: any, k) => o?.[k], s);
    return <input className="input num" style={{ width: w }} type="number" value={v} onChange={(e) => set(path, Number(e.target.value))} aria-label={path} />;
  };
  async function save() {
    setBusy(true);
    try {
      // a marca tem o próprio botão de salvar (só o Master)
      const { paused, brand, ...rest } = s;
      setS(await api('/api/settings', 'PATCH', rest));
      toast('Configurações salvas');
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }
  const total = Object.values(s.weights).reduce((a: number, b: any) => a + Number(b), 0) as number;

  return (
    <>
      <PageHead title="Configurações" sub="Marca do painel, horários, tempos, limites, pontuação e pagamento" icon="sliders" tone="mut" help="horarios">
        <button className="btn btn-p" onClick={save} disabled={busy}>
          <Icon name="check" />
          {busy ? 'Salvando…' : 'Salvar tudo'}
        </button>
      </PageHead>

      {isMaster(me?.member) && <BrandSettings />}

      {status && (
        <div className="card">
          <div className="card-h">
            <Ib name="bolt" tone="gg" size="sm" />
            <h2>Integrações</h2>
            <span className="sp muted" style={{ fontSize: 12 }}>
              modelo de IA: {status.model}
            </span>
          </div>
          <div className="dl">
            {status.items.map((i: any) => (
              <div key={i.key} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <Icon name={i.ok ? 'check' : 'alert'} className={i.ok ? 'status-ok' : 'status-bad'} />
                <span>{i.label}</span>
                <b style={{ marginLeft: 'auto', color: i.ok ? 'var(--ok)' : 'var(--bad)' }}>{i.ok ? 'ok' : 'falta'}</b>
              </div>
            ))}
          </div>
          <div className="row-actions" style={{ marginTop: 14 }}>
            <button className="btn btn-sm" onClick={testAi} disabled={atBusy}>
              {atBusy ? <span className="spin" /> : <Icon name="robot" />}
              {atBusy ? 'Testando…' : 'Testar IA (Claude)'}
            </button>
          </div>
          {at && (
            <div className="alert" style={{ marginTop: 10, borderColor: at.ok ? 'var(--ok)' : 'var(--bad)' }}>
              <Icon name={at.ok ? 'check' : 'alert'} className={at.ok ? 'status-ok' : 'status-bad'} />
              <div style={{ minWidth: 0, fontSize: 13 }}>
                {at.ok ? (
                  <b>IA funcionando ({at.model}).</b>
                ) : (
                  <>
                    <b>{at.cause}</b>
                    {at.raw && (
                      <p className="muted mono" style={{ marginTop: 6, wordBreak: 'break-word' }}>
                        Resposta: {at.raw}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          {false && gt && (
            <div className="alert" style={{ marginTop: 10, borderColor: gt.ok ? 'var(--ok)' : 'var(--bad)' }}>
              <Icon name={gt.ok ? 'check' : 'alert'} className={gt.ok ? 'status-ok' : 'status-bad'} />
              <div style={{ minWidth: 0, fontSize: 13 }}>
                {gt.ok ? (
                  <>
                    <b>Google Maps funcionando.</b> Exemplo encontrado:{' '}
                    {(gt.sample || []).map((x: any, i: number) => (
                      <a key={i} className="extlink" href={x.url} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>
                        {x.name}
                      </a>
                    ))}
                  </>
                ) : (
                  <>
                    <b>{gt.cause}</b>
                    <p style={{ marginTop: 4 }}>
                      <b>Como resolver:</b> {gt.fix}
                    </p>
                    {(gt.reason || gt.message) && (
                      <p className="muted mono" style={{ marginTop: 6, wordBreak: 'break-word' }}>
                        Resposta do Google: {gt.status || ''} {gt.reason} {gt.message}
                        {gt.keyStart ? ` · chave usada: ${gt.keyStart}` : ''}
                        {gt.keyShape === false ? ' · atenção: a chave não tem o formato normal (AIza… com 39 caracteres)' : ''}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          {status.webhooks?.asaas && (
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              Webhook para cadastrar no Asaas: <span className="mono">{status.webhooks.asaas}</span> (com o token de ASAAS_WEBHOOK_TOKEN).
            </p>
          )}
        </div>
      )}

      <div className="grid g-2">
        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="card">
            <div className="card-h">
              <Ib name="user" tone="ai" size="sm" />
              <h2>Identidade da IA</h2>
            </div>
            <Row t="Nome da assistente" s="Como a IA se apresenta">
              <input className="input" style={{ width: 160 }} value={s.assistant_name} onChange={(e) => set('assistant_name', e.target.value)} aria-label="Nome da assistente" />
            </Row>
            <Row t="Nome da empresa" s="Usado nas mensagens">
              <input className="input" style={{ width: 160 }} value={s.company_name} onChange={(e) => set('company_name', e.target.value)} aria-label="Nome da empresa" />
            </Row>
          </div>
          <div className="card">
            <div className="card-h">
              <Ib name="chat" tone="wa" size="sm" />
              <h2>Saudação inicial</h2>
              <span className="sp" />
              <Switch label="Saudação inicial ligada" checked={s.greeting?.on !== false} onChange={(v) => set('greeting.on', v)} />
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginTop: -4 }}>
              A primeira resposta de toda conversa começa com esta frase. Use <b>{'{saudacao}'}</b> (bom dia/boa tarde/boa noite pelo horário), <b>{'{artigo}'}</b> (o/a), <b>{'{nome}'}</b> (nome de quem atende o chip) e <b>{'{empresa}'}</b>.
            </p>
            <input className="input" value={s.greeting?.template || ''} onChange={(e) => set('greeting.template', e.target.value)} aria-label="Frase da saudação" />
            <div className="greet-rules">
              {(s.greeting?.rules || []).map((r: any, i: number) => (
                <div key={i} className="greet-rule">
                  <span className="muted">Das</span>
                  <input className="input" type="time" value={r.from} onChange={(e) => set('greeting.rules', (s.greeting.rules || []).map((x: any, k: number) => (k === i ? { ...x, from: e.target.value } : x)))} aria-label="Início" />
                  <span className="muted">às</span>
                  <input className="input" type="time" value={r.to} onChange={(e) => set('greeting.rules', (s.greeting.rules || []).map((x: any, k: number) => (k === i ? { ...x, to: e.target.value } : x)))} aria-label="Fim" />
                  <input className="input" value={r.text} onChange={(e) => set('greeting.rules', (s.greeting.rules || []).map((x: any, k: number) => (k === i ? { ...x, text: e.target.value } : x)))} aria-label="Saudação" />
                  <button type="button" className="iconbtn" onClick={() => set('greeting.rules', (s.greeting.rules || []).filter((_: any, k: number) => k !== i))} aria-label="Remover horário">
                    <Icon name="x" />
                  </button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-sm btn-g" onClick={() => set('greeting.rules', [...(s.greeting?.rules || []), { from: '00:00', to: '05:59', text: 'Olá' }])}>
                  <Icon name="plus" /> Horário
                </button>
                <small className="muted">Fora dos horários usa:</small>
                <input className="input" style={{ width: 110 }} value={s.greeting?.fallback || 'Olá'} onChange={(e) => set('greeting.fallback', e.target.value)} aria-label="Saudação fora dos horários" />
              </div>
            </div>
            <p className="greet-prev">
              Exemplo agora:{' '}
              <b>
                {(() => {
                  const now = new Date();
                  const mins = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(now)) * 60 + now.getMinutes();
                  const toMin = (t: string) => Number(String(t).split(':')[0]) * 60 + Number(String(t).split(':')[1] || 0);
                  const r = (s.greeting?.rules || []).find((x: any) => toMin(x.from) <= mins && mins <= toMin(x.to));
                  const nome = s.assistant_name || 'Ana';
                  return String(s.greeting?.template || '')
                    .replace(/\{saudacao\}/g, r?.text || s.greeting?.fallback || 'Olá')
                    .replace(/\{artigo\}\s*/g, /a$/i.test(nome) ? 'a ' : 'o ')
                    .replace(/\{nome\}/g, nome)
                    .replace(/\{empresa\}/g, s.company_name || '');
                })()}
              </b>
              <small className="muted"> (o nome muda conforme o chip que atende)</small>
            </p>
          </div>
          <div className="card">
            <div className="card-h">
              <Ib name="ig" tone="ig" size="sm" />
              <h2>Textos dos anúncios (campanhas)</h2>
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginTop: -4 }}>
              Textos prontos que o Meta manda quando a pessoa clica no anúncio, um por linha. Cada linha é uma campanha: a IA atende já sabendo o que a pessoa quer e o painel mede quanto cada campanha vende (Visão geral › Funil por campanha). Para dar nome à campanha: <code>Site 149 = Quero criar o meu site para atrair mais clientes no Google por apenas R$ 149,00</code>
            </p>
            <textarea className="input" rows={4} value={s.ad_messages || ''} onChange={(e) => set('ad_messages', e.target.value)} aria-label="Mensagens dos anúncios" />
          </div>
          <div className="card">
            <div className="card-h">
              <Ib name="bolt" tone="acc" size="sm" />
              <h2>Respostas rápidas da equipe</h2>
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginTop: -4 }}>
              Na conversa, digite <b>/</b> e o atalho (ex.: <code>/preco</code>) para colar o texto. Use <code>{'{nome}'}</code> para o primeiro nome do cliente.
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              {(s.quick_replies || []).map((q: any, i: number) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr) auto', gap: 8, alignItems: 'start' }}>
                  <input className="input mono" value={q.k} onChange={(e) => set('quick_replies', s.quick_replies.map((x: any, j: number) => (j === i ? { ...x, k: e.target.value.replace(/[^a-z0-9çãáéíóú-]/gi, '').toLowerCase() } : x)))} aria-label="Atalho" placeholder="atalho" />
                  <textarea className="input" rows={2} value={q.t} onChange={(e) => set('quick_replies', s.quick_replies.map((x: any, j: number) => (j === i ? { ...x, t: e.target.value } : x)))} aria-label="Texto" />
                  <button type="button" className="iconbtn" onClick={() => set('quick_replies', s.quick_replies.filter((_: any, j: number) => j !== i))} aria-label="Remover atalho">
                    <Icon name="trash" />
                  </button>
                </div>
              ))}
              <button type="button" className="btn btn-sm" style={{ justifySelf: 'start' }} onClick={() => set('quick_replies', [...(s.quick_replies || []), { k: '', t: '' }])}>
                <Icon name="plus" /> Novo atalho
              </button>
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <Ib name="trend" tone="ok" size="sm" />
              <h2>Vendas extras e relatório</h2>
            </div>
            <Row t="Relatório semanal no WhatsApp" s="Toda segunda de manhã: vendas, receita, conversas, campanhas que mais venderam e gasto de IA da semana.">
              <Switch checked={s.report?.on !== false} onChange={(v) => set('report', { ...(s.report || {}), on: v })} label="Relatório semanal" />
            </Row>
            <Row t="Enviar o relatório para" s="WhatsApp com DDD (ex.: 19999998888). Vazio: vai para o número do primeiro chip conectado.">
              <input className="input" style={{ width: 170 }} inputMode="tel" value={s.report?.to || ''} onChange={(e) => set('report', { ...(s.report || {}), to: e.target.value.replace(/\D/g, '') })} aria-label="Número do relatório" />
            </Row>
            <Row t="Prévia do relatório" s="Veja agora como fica o resumo dos últimos 7 dias.">
              <button
                type="button"
                className="btn btn-sm"
                onClick={async () => {
                  try {
                    const r = await api('/api/report', 'GET');
                    window.alert(r.text);
                  } catch (e: any) {
                    toast(e.message);
                  }
                }}
              >
                <Icon name="eye" /> Ver prévia
              </button>
            </Row>
            <Row t="Recuperação de quem viu a prévia e sumiu" s="O 1º lembrete vira uma mensagem leve com a prévia e uma melhoria oferecida (sem gastar IA).">
              <Switch checked={s.recovery?.on !== false} onChange={(v) => set('recovery', { ...(s.recovery || {}), on: v })} label="Recuperação" />
            </Row>
            <Row t="Desconto padrão do combo (%)" s="Usado ao montar um combo em Links de pagamento (dá para mudar em cada link).">
              {n('combo_discount', 70)}
            </Row>
          </div>
          <div className="card" id="horarios" style={{ scrollMarginTop: 80 }}>
            <div className="card-h">
              <Ib name="clock" tone="gg" size="sm" />
              <h2>Horários e tempos de resposta</h2>
            </div>
            <Row t="Horário de atendimento da IA" s="A IA RESPONDE quem escreveu só neste horário (Brasília). Fora dele, a pessoa recebe o aviso automático e a resposta sai no horário comercial.">
              <input className="input" type="time" style={{ width: 110 }} value={s.hours.start} onChange={(e) => set('hours.start', e.target.value)} aria-label="Início" />
              <span className="muted">até</span>
              <input className="input" type="time" style={{ width: 110 }} value={s.hours.end} onChange={(e) => set('hours.end', e.target.value)} aria-label="Fim" />
            </Row>
            <div className="setrow" style={{ flexWrap: 'wrap' }}>
              <div className="tx">
                <b>Dias de atendimento da IA</b>
                <small>Dias em que a IA responde quem escreveu</small>
              </div>
              <div className="seg" role="group">
                {DAYS.map((d, i) => (
                  <button key={d} type="button" aria-pressed={s.hours.days.includes(i)} onClick={() => set('hours.days', s.hours.days.includes(i) ? s.hours.days.filter((x: number) => x !== i) : [...s.hours.days, i].sort())}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <Row t="Responder 24 horas" s="Ligado: a IA responde a qualquer hora (ignora o horário de atendimento acima)">
              <Switch label="Responder 24h" checked={s.reply_24h} onChange={(v) => set('reply_24h', v)} />
            </Row>
            <div className="setrow" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <div className="tx">
                <b>Horário comercial (para chamar clientes)</b>
                <small>Só nestes horários o sistema chama alguém por conta própria: follow-up, recuperação, prospecção, Link na bio e retomar quem escreveu fora do horário (num minuto aleatório, nunca antes). Quem escreve dentro do horário de atendimento é respondido na hora.</small>
              </div>
              <div className="comm-days">
                {DAYS.map((d, i) => {
                  const c = (s.commercial || {})[i] || { on: false, start: '09:00', end: '18:00' };
                  const put = (patch: any) => set('commercial', { ...(s.commercial || {}), [i]: { ...c, ...patch } });
                  return (
                    <div key={d} className={`comm-day ${c.on ? 'on' : ''}`}>
                      <label>
                        <input type="checkbox" checked={!!c.on} onChange={(e) => put({ on: e.target.checked })} /> <b>{d}</b>
                      </label>
                      <input className="input" type="time" value={c.start} disabled={!c.on} onChange={(e) => put({ start: e.target.value })} aria-label={`${d} início`} />
                      <span className="muted">às</span>
                      <input className="input" type="time" value={c.end} disabled={!c.on} onChange={(e) => put({ end: e.target.value })} aria-label={`${d} fim`} />
                    </div>
                  );
                })}
              </div>
            </div>
            <Row t="Aviso automático fora do horário" s="Quem escrever fora do horário de atendimento recebe esta mensagem na hora (uma vez por noite). Use {inicio}, {fim} e {empresa}.">
              <Switch label="Aviso fora do horário" checked={s.after_hours?.on !== false} onChange={(v) => set('after_hours', { ...(s.after_hours || {}), on: v })} />
            </Row>
            <textarea className="input" rows={2} value={s.after_hours?.text || ''} onChange={(e) => set('after_hours', { ...(s.after_hours || {}), text: e.target.value })} aria-label="Texto do aviso fora do horário" style={{ marginBottom: 12 }} />
            <div className="setrow" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <div className="tx">
                <b>Retomada de quem parou de responder</b>
                <small>Mensagens leves e diretas, sem se apresentar de novo, uma por tentativa (nos dias de follow-up). A última encerra o atendimento. Use {'{saudacao}'} / {'{Saudacao}'} (bom dia, boa tarde…) e {'{nome}'}.</small>
              </div>
              {(s.followup_texts || []).map((t: string, i: number) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px minmax(0,1fr) auto', gap: 8, alignItems: 'start' }}>
                  <b className="muted" style={{ paddingTop: 8 }}>{i + 1}º</b>
                  <textarea className="input" rows={2} value={t} onChange={(e) => set('followup_texts', s.followup_texts.map((x: string, j: number) => (j === i ? e.target.value : x)))} aria-label={`Retomada ${i + 1}`} />
                  <button type="button" className="iconbtn" onClick={() => set('followup_texts', s.followup_texts.filter((_: string, j: number) => j !== i))} aria-label="Remover">
                    <Icon name="trash" />
                  </button>
                </div>
              ))}
              <button type="button" className="btn btn-sm" style={{ justifySelf: 'start' }} onClick={() => set('followup_texts', [...(s.followup_texts || []), ''])}>
                <Icon name="plus" /> Nova mensagem de retomada
              </button>
            </div>
            <div className="setrow" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }} id="clientes">
              <div className="tx">
                <b>Cobrança de renovações (Clientes › Renovações)</b>
                <small>Sai sozinha no horário comercial: a 1ª alguns dias antes e um lembrete no dia do vencimento. Use {'{nome}'}, {'{servico}'}, {'{valor}'}, {'{vencimento}'} e {'{link}'}.</small>
              </div>
              <textarea className="input" rows={2} value={s.renewal?.text || ''} onChange={(e) => set('renewal', { ...(s.renewal || {}), text: e.target.value })} aria-label="Texto da cobrança de renovação" />
              <textarea className="input" rows={2} value={s.renewal?.due_text || ''} onChange={(e) => set('renewal', { ...(s.renewal || {}), due_text: e.target.value })} aria-label="Texto do lembrete no dia do vencimento" />
            </div>
            <Row t="Pedido de depoimento depois da entrega" s="Alguns dias depois de marcar a entrega, pede uma avaliação (uma vez só, no horário comercial). Só funciona com o link de avaliação preenchido (ex.: link de avaliação do Google).">
              <Switch label="Pedir depoimento" checked={s.testimonial?.on !== false} onChange={(v) => set('testimonial', { ...(s.testimonial || {}), on: v })} />
            </Row>
            <div className="setrow" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 120px', gap: 8 }}>
                <input className="input" value={s.testimonial?.link || ''} onChange={(e) => set('testimonial', { ...(s.testimonial || {}), link: e.target.value })} placeholder="Link de avaliação (Google, Instagram…)" aria-label="Link de avaliação" />
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12.5 }}>
                  <input className="input" type="number" min={1} max={30} value={s.testimonial?.days ?? 3} onChange={(e) => set('testimonial', { ...(s.testimonial || {}), days: Number(e.target.value) || 3 })} aria-label="Dias depois da entrega" />
                  dias
                </label>
              </div>
              <textarea className="input" rows={2} value={s.testimonial?.text || ''} onChange={(e) => set('testimonial', { ...(s.testimonial || {}), text: e.target.value })} aria-label="Texto do pedido de depoimento" />
              <small className="muted">Use {'{nome}'} e {'{link}'}.</small>
            </div>
            <Row t="Velocidade das respostas" s="Tempo aleatório entre o mínimo e o máximo, para parecer humano">
              <div className="seg" role="group">
                {(
                  [
                    ['rapida', 'Rápida', 5, 15],
                    ['media', 'Média', 20, 60],
                    ['calma', 'Calma', 60, 180],
                  ] as [string, string, number, number][]
                ).map(([k, l, a, b]) => (
                  <button
                    key={k}
                    type="button"
                    title={`${a} a ${b} segundos`}
                    aria-pressed={s.reply_delay.min === a && s.reply_delay.max === b}
                    onClick={() => setS({ ...s, reply_speed: k, reply_delay: { min: a, max: b } })}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </Row>
            <Row t="Espera antes de responder (segundos)" s="Ajuste fino: mínimo e máximo. Cada nova mensagem do cliente reinicia a espera, para ele terminar de escrever.">
              {n('reply_delay.min')}
              <span className="muted">a</span>
              {n('reply_delay.max')}
            </Row>
            <Row t="Marcar como lida" s="Mostra os dois tiques azuis quando a IA vai responder">
              <Switch label="Marcar como lida" checked={s.read_receipts !== false} onChange={(v) => set('read_receipts', v)} />
            </Row>
            <Row t="Digitação simulada" s="Mostra digitando… antes de enviar">
              <Switch label="Digitação" checked={s.typing} onChange={(v) => set('typing', v)} />
            </Row>
            <Row t="Follow-ups sem resposta" s="Dias depois da última mensagem, separados por vírgula">
              <input className="input num" style={{ width: 130 }} value={s.followup_days.join(', ')} onChange={(e) => set('followup_days', e.target.value.split(/[,\s]+/).map(Number).filter((x) => x > 0))} aria-label="Dias de follow-up" />
            </Row>
            <Row t="Remarketing após follow-ups" s="Dias até tentar de novo quem nunca respondeu">
              {n('remarketing_after_followups_days')}
            </Row>
          </div>
          <div className="card">
            <div className="card-h">
              <Ib name="shield" tone="ok" size="sm" />
              <h2>Limites por número</h2>
            </div>
            <Row t="Semana 1 (aquecimento)" s="Novos contatos por dia">
              {n('limits.week1')}
            </Row>
            <Row t="Semanas 2 e 3" s="Novos contatos por dia">
              {n('limits.week2')}
            </Row>
            <Row t="Número maduro" s="Teto de novos contatos por dia (recomendado até 80)">
              {n('limits.mature')}
            </Row>
            <Row t="Intervalo entre envios" s="Minutos, aleatório">
              {n('interval_min.min')}
              <span className="muted">a</span>
              {n('interval_min.max')}
            </Row>
            <Row t="Pausa longa" s="A cada quantos envios">
              {n('long_pause_every')}
            </Row>
            <Row t="Duração da pausa longa" s="Minutos, aleatório">
              {n('long_pause_min.min')}
              <span className="muted">a</span>
              {n('long_pause_min.max')}
            </Row>
            <Row t="Pausa automática" s="Se recusas + erros passarem de (%) em 24h">
              {n('auto_pause_pct')}
            </Row>
          </div>
        </div>
        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="card" style={{ display: 'none' }}>
            <div className="card-h">
              <Ib name="target" tone="acc" size="sm" />
              <h2>Pesos da pontuação</h2>
              <span className="sp chip" style={{ ['--t' as any]: total > 100 ? 'var(--warn)' : 'var(--accent)' }}>
                soma {total} (máx. 100)
              </span>
            </div>
            {WEIGHTS.map(([k, t]) => (
              <Row key={k} t={t} s="Pontos somados">
                <input type="range" min={0} max={50} value={s.weights[k]} onChange={(e) => set('weights.' + k, Number(e.target.value))} aria-label={t} />
                <b className="num" style={{ width: 26, textAlign: 'right' }}>
                  {s.weights[k]}
                </b>
              </Row>
            ))}
          </div>
          <div className="card">
            <div className="card-h">
              <Ib name="flame" tone="acc" size="sm" />
              <h2>Temperatura e alertas</h2>
            </div>
            <Row t="Lead morno a partir de" s="Pontos de temperatura">
              {n('temp.warm')}
            </Row>
            <Row t="Lead quente a partir de" s="Pontos de temperatura">
              {n('temp.hot')}
            </Row>
            <Row t="Pedir ligação quando esquentar" s="Alerta em Precisa de você">
              <Switch label="Alerta quente" checked={s.alert_hot} onChange={(v) => set('alert_hot', v)} />
            </Row>
            <Row t="IA se identifica como assistente" s="Se perguntarem se é robô. Sempre ligado">
              <Switch label="Honestidade" checked disabled />
            </Row>
            <Row t='Respeitar "não quero"' s="Exclui o contato de todas as abordagens. Sempre ligado">
              <Switch label="Opt-out" checked disabled />
            </Row>
          </div>
          <div className="card">
            <div className="card-h">
              <Ib name="pix" tone="gg" size="sm" />
              <h2>Pagamento e recibo</h2>
            </div>
            <Row t="Banco do Pix" s="Gera a cobrança e confirma o pagamento sozinho">
              <span className="chip" style={{ ['--t' as any]: 'var(--gg)' }}>Asaas</span>
            </Row>
            <Row t="Validade do Pix" s="Horas (mínimo 24, regra do Asaas)">
              {n('pix.validity_hours')}
            </Row>
            <Row t="Enviar recibo em PDF" s="Pelo WhatsApp, assim que o Asaas confirmar">
              <Switch label="Recibo automático" checked={s.receipts.enabled} onChange={(v) => set('receipts.enabled', v)} />
            </Row>
            <div className="field" style={{ marginTop: 8 }}>
              <label htmlFor="rmsg">Mensagem junto com o recibo</label>
              <input id="rmsg" className="input" value={s.receipts.message} onChange={(e) => set('receipts.message', e.target.value)} />
            </div>
            <div className="sect" style={{ marginTop: 14 }}>
              <h3>Dados da empresa no recibo</h3>
            </div>
            <div className="formgrid">
              {[
                ['legal_name', 'Razão social ou nome'],
                ['document', 'CNPJ ou CPF'],
                ['phone', 'Telefone'],
                ['email', 'E-mail'],
                ['address', 'Endereço'],
                ['city', 'Cidade/UF'],
              ].map(([k, label]) => (
                <div className="field" key={k}>
                  <label htmlFor={'c-' + k}>{label}</label>
                  <input id={'c-' + k} className="input" value={s.company[k] || ''} onChange={(e) => set('company.' + k, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ display: 'none' }}>
            <div className="card-h">
              <Ib name="ig" tone="ig" size="sm" />
              <h2>Mensagens do Instagram assistido</h2>
            </div>
            <textarea className="input" style={{ minHeight: 140 }} value={s.ig_templates.join('\n')} onChange={(e) => set('ig_templates', e.target.value.split('\n').filter((x) => x.trim()))} aria-label="Mensagens do Instagram" />
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Uma por linha. O sistema sorteia uma para cada perfil.
            </p>
          </div>
          <button className="btn" onClick={() => setS({ ...DEFAULT_SETTINGS, paused: s.paused })}>
            <Icon name="refresh" />
            Voltar aos valores recomendados (depois clique em Salvar tudo)
          </button>
        </div>
      </div>
    </>
  );
}
