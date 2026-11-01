'use client';
import { useEffect, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { Switch, toast, api, brl } from '@/components/ui';

const TASKS: Record<string, string> = {
  resposta: 'Respostas na conversa',
  abertura: 'Primeiras mensagens',
  follow_up: 'Follow-ups',
  resumo: 'Resumos',
  previa: 'Prévias de site',
  livro: 'Estudo de livros (PDF)',
  cerebro: 'Cérebro de vendas',
  aprendizado: 'Estudo das vendas',
  playbook: 'Playbooks',
  teste: 'Testes da base',
  busca: 'Buscas de negócios',
  cidade: 'Localização da cidade',
};
/** Gráfico do gasto diário: passando o mouse (ou tocando) mostra a data, o custo em US$ e R$ e quantas chamadas. */
function DayBars({ days, max, rate }: { days: any[]; max: number; rate: number }) {
  const [hi, setHi] = useState<number | null>(null);
  const x = hi != null ? days[hi] : null;
  const wd = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  return (
    <div className="bars-wrap" onMouseLeave={() => setHi(null)}>
      {x && (
        <div className="bars-tip" style={{ left: `clamp(80px, ${((hi! + 0.5) / days.length) * 100}%, calc(100% - 80px))` }} role="status">
          <b>{wd(x.day)}</b>
          <span>
            {usd(x.ai)} <small>≈ {brl(x.ai * rate)}</small>
          </span>
          <small>
            {x.calls || 0} chamada(s) de IA{x.google ? ` · ${x.google} consulta(s) Google` : ''}
          </small>
        </div>
      )}
      <div className="bars" aria-label="Gasto diário da IA nos últimos 30 dias">
        {days.map((d: any, i: number) => (
          <span
            key={d.day}
            className={hi === i ? 'on' : ''}
            onMouseEnter={() => setHi(i)}
            onClick={() => setHi(hi === i ? null : i)}
            aria-label={`${wd(d.day)}: ${usd(d.ai)}`}
            style={{ height: Math.max(3, (d.ai / max) * 100) + '%' }}
          />
        ))}
      </div>
    </div>
  );
}

const usd = (v: number) => 'US$ ' + v.toFixed(v < 1 ? 3 : 2).replace('.', ',');

function Meter({ value, cap, warn = 0.8 }: { value: number; cap: number; warn?: number }) {
  const pct = cap > 0 ? Math.min(100, (value / cap) * 100) : 0;
  const tone = pct >= 100 ? 'var(--bad)' : pct >= warn * 100 ? 'var(--warn)' : 'var(--ok)';
  return (
    <div className="meter" role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: pct + '%', background: tone }} />
    </div>
  );
}

export default function Custos() {
  const [d, setD] = useState<any>(null);
  const [b, setB] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const j = await api('/api/usage', 'GET');
      setD(j);
      setB(j.budget);
    } catch (e: any) {
      toast(e.message);
    }
  };
  useEffect(() => {
    load();
  }, []);

  async function save() {
    setBusy(true);
    try {
      const n = (v: any) => Number(String(v).replace(',', '.')) || 0;
      await api('/api/settings', 'PATCH', {
        budget: { ...b, ai_usd: n(b.ai_usd), usd_brl: n(b.usd_brl), google_ent_cap: Math.min(n(b.google_ent_cap), 100000), google_pro_cap: n(b.google_pro_cap), monthly_brl: n(b.monthly_brl), fixed_brl: n(b.fixed_brl) },
      });
      toast('Tetos salvos');
      load();
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }

  if (!d || !b) return <PageHead title="Custos" sub="Carregando…" icon="trend" help="custos" />;

  const u = d.usage;
  const rate = Number(b.usd_brl) || 5.6;
  const aiBrl = u.ai_usd * rate;
  const total = Number(b.fixed_brl || 0) + aiBrl;
  const day = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const forecast = (u.ai_usd / Math.max(1, day)) * daysInMonth;
  const aiRows = u.rows.filter((r: any) => r.kind === 'ai').sort((a: any, z: any) => z.cost_usd - a.cost_usd);
  const gRows = u.rows.filter((r: any) => r.kind !== 'ai');
  const max = Math.max(0.0001, ...d.days.map((x: any) => x.ai));
  const over = b.google_ent_cap > d.free.google_ent || b.google_pro_cap > d.free.google_pro;

  const kpis = [
    ['money', 'acc', 'Total do mês (estimado)', brl(total), `de ${brl(b.monthly_brl)} do orçamento`],
    ['robot', 'ai', 'IA (Claude API) no mês', usd(u.ai_usd), `≈ ${brl(aiBrl)} · previsão ${usd(forecast)}`],
    ['search', 'gg', 'Buscas Google (grátis)', `${u.google_ent} / ${b.google_ent_cap}`, `cota grátis: ${d.free.google_ent}/mês`],
    ['pin', 'ok', 'Localizações (grátis)', `${u.google_pro} / ${b.google_pro_cap}`, `cota grátis: ${d.free.google_pro}/mês`],
  ];

  return (
    <>
      <PageHead title="Custos" sub="Quanto o sistema gastou neste mês e os tetos que impedem surpresas" icon="trend" tone="ok" help="custos">
        <button className="btn btn-g btn-sm" onClick={load}>
          <Icon name="refresh" />
          Atualizar
        </button>
      </PageHead>

      <div className="grid g-kpi">
        {kpis.map((k, i) => (
          <div className="card kpi" key={i}>
            <div className="row">
              <Ib name={k[0]} tone={k[1]} delay={i * 0.3} />
            </div>
            <div className="v">{k[3]}</div>
            <div className="l">{k[2]}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {k[4]}
            </div>
          </div>
        ))}
      </div>

      <div className="grid g-2">
        <div className="card">
          <div className="card-h">
            <Ib name="robot" tone="ai" size="sm" />
            <h2>IA neste mês</h2>
            <span className="sp muted" style={{ fontSize: 12.5 }}>
              {usd(u.ai_usd)} de {usd(Number(b.ai_usd))}
            </span>
          </div>
          <Meter value={u.ai_usd} cap={Number(b.ai_usd)} />
          <p className="muted" style={{ fontSize: 12.5, margin: '8px 0 14px' }}>
            Padrão: <b>{d.models.fast}</b> (barato). {b.smart_for_hot ? <>Conversas quentes: <b>{d.models.smart}</b>.</> : 'Sonnet desligado.'} Ao passar do teto, tudo vai para o modelo barato; passando 20% do teto, a IA para.
          </p>
          <DayBars days={d.days} max={max} rate={rate} />
          <div className="tablewrap" style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr>
                  <th>Uso</th>
                  <th>Modelo</th>
                  <th style={{ textAlign: 'right' }}>Chamadas</th>
                  <th style={{ textAlign: 'right' }}>Custo</th>
                </tr>
              </thead>
              <tbody>
                {aiRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted">
                      Nada gasto ainda neste mês.
                    </td>
                  </tr>
                )}
                {aiRows.map((r: any, i: number) => (
                  <tr key={i}>
                    <td>{TASKS[r.task] || r.task}</td>
                    <td className="muted">{String(r.model || '').replace('claude-', '')}</td>
                    <td style={{ textAlign: 'right' }}>{r.calls}</td>
                    <td style={{ textAlign: 'right' }}>{usd(r.cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <Ib name="search" tone="gg" size="sm" />
            <h2>Google Maps neste mês</h2>
          </div>
          <div className="field">
            <label>Buscas de negócios (com telefone, site e avaliações)</label>
            <Meter value={u.google_ent} cap={Number(b.google_ent_cap)} />
            <small className="muted">
              {u.google_ent} de {b.google_ent_cap} · cada consulta traz até 20 negócios. Uma busca de 20 usa 1; de 50 usa até 3.
            </small>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>Localização de cidades</label>
            <Meter value={u.google_pro} cap={Number(b.google_pro_cap)} />
            <small className="muted">
              {u.google_pro} de {b.google_pro_cap}
            </small>
          </div>
          {gRows.length > 0 && (
            <div className="chips" style={{ marginTop: 12 }}>
              {gRows.map((r: any, i: number) => (
                <span key={i} className="chip">
                  {TASKS[r.task] || r.task}: {r.calls}
                </span>
              ))}
            </div>
          )}
          <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>
            Ao chegar no teto, a busca é bloqueada até o dia 1º. Com os tetos abaixo da cota grátis, o Google não cobra nada.
          </p>
        </div>
      </div>

      <div data-perm="custos.tetos" className="card">
        <div className="card-h">
          <Ib name="shield" tone="acc" size="sm" />
          <h2>Tetos e orçamento</h2>
        </div>
        <div className="formgrid">
          <div className="field">
            <label>Teto da IA por mês (US$)</label>
            <input className="input num" value={b.ai_usd} onChange={(e) => setB({ ...b, ai_usd: e.target.value })} />
            <small className="muted">≈ {brl((Number(String(b.ai_usd).replace(',', '.')) || 0) * rate)}. Coloque o mesmo limite no Console da Anthropic.</small>
          </div>
          <div className="field">
            <label>Cotação do dólar (R$)</label>
            <input className="input num" value={b.usd_brl} onChange={(e) => setB({ ...b, usd_brl: e.target.value })} />
          </div>
          <div className="field">
            <label>Teto de buscas Google</label>
            <input className="input num" value={b.google_ent_cap} onChange={(e) => setB({ ...b, google_ent_cap: e.target.value })} />
            <small className="muted">Grátis até {d.free.google_ent}.</small>
          </div>
          <div className="field">
            <label>Teto de localizações Google</label>
            <input className="input num" value={b.google_pro_cap} onChange={(e) => setB({ ...b, google_pro_cap: e.target.value })} />
            <small className="muted">Grátis até {d.free.google_pro}.</small>
          </div>
          <div className="field">
            <label>Orçamento total por mês (R$)</label>
            <input className="input num" value={b.monthly_brl} onChange={(e) => setB({ ...b, monthly_brl: e.target.value })} />
          </div>
          <div className="field">
            <label>Custos fixos (VPS + assinatura) R$</label>
            <input className="input num" value={b.fixed_brl} onChange={(e) => setB({ ...b, fixed_brl: e.target.value })} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14, fontSize: 13.5 }}>
          <Switch label="Usar Sonnet nas conversas quentes" checked={!!b.smart_for_hot} onChange={(v) => setB({ ...b, smart_for_hot: v })} />
          Usar o Sonnet (mais caprichado) só nas conversas quentes e em negociação
        </div>
        {over && (
          <p className="err" style={{ marginTop: 10 }}>
            Atenção: um teto do Google está acima da cota grátis. O que passar da cota será cobrado pelo Google.
          </p>
        )}
        <div style={{ marginTop: 14 }}>
          <button className="btn btn-p" disabled={busy} onClick={save}>
            <Icon name="check" />
            {busy ? 'Salvando…' : 'Salvar tetos'}
          </button>
        </div>
      </div>
    </>
  );
}
