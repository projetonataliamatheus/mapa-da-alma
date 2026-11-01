'use client';
/* Mapa da Alma: gerador de mapas com prévia ao vivo, lista de mapas, PDF, envio no WhatsApp, textos e marca do mapa. */
import { useEffect, useMemo, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { toast, api, dayLabel, copyText } from '@/components/ui';

const CATEGORIAS: [string, string, string[]][] = [
  ['motivacao', 'Motivação', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '22']],
  ['impressao', 'Impressão', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '22']],
  ['expressao', 'Expressão', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '22']],
  ['diaNascimento', 'Dia de nascimento', ['1', '2', '3', '4', '5', '6', '7', '8', '9']],
  ['destino', 'Destino', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '22']],
  ['missao', 'Missão', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '22']],
  ['talentoOculto', 'Talento oculto', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '22']],
  ['numeroPsiquico', 'Número psíquico', ['1', '2', '3', '4', '5', '6', '7', '8', '9']],
  ['respostaSubconsciente', 'Resposta subconsciente', ['2', '3', '4', '5', '6', '7', '8', '9']],
  ['licoesCarmicas', 'Lições cármicas', ['1', '2', '3', '4', '5', '6', '7', '8', '9']],
  ['dividasCarmicas', 'Dívidas cármicas', ['13', '14', '16', '19']],
  ['anoPessoal', 'Ano pessoal', ['1', '2', '3', '4', '5', '6', '7', '8', '9']],
  ['cores', 'Cores favoráveis', ['1', '2', '3', '4', '5', '6', '7', '8', '9']],
  ['ciclo', 'Ciclos de vida', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '22']],
  ['momento', 'Momentos decisivos', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '22']],
  ['signo', 'Signos', ['Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem', 'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes']],
];

function Gerador({ onCriado }: { onCriado: (m: any) => void }) {
  const [tipo, setTipo] = useState<'pessoal' | 'casal'>('pessoal');
  const [f, setF] = useState({ nome: '', nascimento: '', nome2: '', nascimento2: '' });
  const [resumo, setResumo] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const pronto = f.nome.trim().split(/\s+/).length >= 2 && f.nascimento && (tipo === 'pessoal' || (f.nome2.trim() && f.nascimento2));

  // prévia instantânea dos números enquanto digita
  useEffect(() => {
    if (!pronto) return setResumo(null);
    const t = setTimeout(async () => {
      try {
        const p = new URLSearchParams({ calcular: '1', nome: f.nome, nascimento: f.nascimento, ...(tipo === 'casal' ? { nome2: f.nome2, nascimento2: f.nascimento2 } : {}) });
        setResumo(await api('/api/mapas?' + p.toString(), 'GET'));
      } catch {
        setResumo(null);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [f, tipo, pronto]);

  async function criar(liberado: boolean) {
    setBusy(true);
    try {
      const m = await api('/api/mapas', 'POST', { tipo, ...f, liberado });
      toast(liberado ? 'Mapa completo gerado ✨' : 'Prévia do mapa gerada ✨');
      onCriado(m);
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-h">
        <Ib name="star" tone="ai" size="sm" />
        <h2>Gerar mapa</h2>
        <div className="sp" />
        <div className="seg">
          <button aria-pressed={tipo === 'pessoal'} onClick={() => setTipo('pessoal')}>Pessoal</button>
          <button aria-pressed={tipo === 'casal'} onClick={() => setTipo('casal')}>Casal</button>
        </div>
      </div>
      <div className="formgrid">
        <div className="field">
          <label>Nome completo de nascimento</label>
          <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Como está na certidão, com acentos" />
        </div>
        <div className="field">
          <label>Data de nascimento</label>
          <input type="date" value={f.nascimento} onChange={(e) => setF({ ...f, nascimento: e.target.value })} />
        </div>
        {tipo === 'casal' && (
          <>
            <div className="field">
              <label>Nome completo da outra pessoa</label>
              <input value={f.nome2} onChange={(e) => setF({ ...f, nome2: e.target.value })} />
            </div>
            <div className="field">
              <label>Data de nascimento da outra pessoa</label>
              <input type="date" value={f.nascimento2} onChange={(e) => setF({ ...f, nascimento2: e.target.value })} />
            </div>
          </>
        )}
      </div>
      {resumo && (
        <div className="mapa-resumo">
          {resumo.resumo.slice(0, 12).map((r: any) => (
            <div key={r.rotulo}>
              <small>{r.rotulo}</small>
              <b>{r.valor}</b>
            </div>
          ))}
        </div>
      )}
      <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        <button className="btn btn-g" disabled={!pronto || busy} onClick={() => criar(false)}>
          <Icon name="eye" />
          Gerar prévia (parte bloqueada)
        </button>
        <button className="btn btn-p" disabled={!pronto || busy} onClick={() => criar(true)}>
          <Icon name="spark" />
          Gerar mapa completo
        </button>
      </div>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
        A prévia mostra o resumo e as primeiras seções; o resto aparece desfocado com o convite para liberar. O completo já sai com PDF. A IA faz isso sozinha no WhatsApp: gera a prévia quando o cliente passa nome e data, e libera o completo quando o pagamento cai.
      </p>
    </div>
  );
}

function Textos() {
  const [cat, setCat] = useState(CATEGORIAS[0][0]);
  const [num, setNum] = useState(CATEGORIAS[0][2][0]);
  const [todos, setTodos] = useState<any[]>([]);
  const [txt, setTxt] = useState('');
  const def = CATEGORIAS.find((c) => c[0] === cat)!;
  const load = async () => {
    try {
      const j = await api('/api/mapa-textos', 'GET');
      setTodos(j.textos);
    } catch (e: any) {
      toast(e.message);
    }
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    setTxt(todos.find((t) => t.categoria === cat && t.numero === num)?.conteudo || '');
  }, [cat, num, todos]);
  async function salvar() {
    try {
      await api('/api/mapa-textos', 'PUT', { categoria: cat, numero: num, conteudo: txt });
      toast(txt.trim() ? 'Texto salvo: vale para os mapas e os próximos PDFs' : 'Voltou para o texto padrão');
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  return (
    <div className="card">
      <div className="card-h">
        <Ib name="book" tone="acc" size="sm" />
        <h2>Textos do mapa</h2>
      </div>
      <p className="muted" style={{ fontSize: 12.5 }}>
        Todos os números já vêm com textos próprios. Aqui você personaliza qualquer um: o texto salvo substitui o padrão no mapa ao vivo e nos próximos PDFs. Deixe vazio e salve para voltar ao padrão.
      </p>
      <div className="seg" style={{ margin: '10px 0', flexWrap: 'wrap', height: 'auto' }}>
        {CATEGORIAS.map((c) => (
          <button key={c[0]} aria-pressed={c[0] === cat} onClick={() => { setCat(c[0]); setNum(c[2][0]); }}>
            {c[1]}
          </button>
        ))}
      </div>
      <div className="seg" style={{ marginBottom: 10, flexWrap: 'wrap', height: 'auto' }}>
        {def[2].map((n) => (
          <button key={n} aria-pressed={n === num} onClick={() => setNum(n)}>
            {n}
            {todos.some((t) => t.categoria === cat && t.numero === n) ? ' •' : ''}
          </button>
        ))}
      </div>
      <div className="field">
        <label>
          {def[1]} {num} (parágrafos separados por uma linha em branco)
        </label>
        <textarea rows={10} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Usando o texto padrão do sistema." />
      </div>
      <button className="btn btn-p" onClick={salvar}>
        <Icon name="check" />
        Salvar texto
      </button>
    </div>
  );
}

export default function Mapas() {
  const [d, setD] = useState<any>(null);
  const [q, setQ] = useState('');
  const [aba, setAba] = useState<'mapas' | 'textos'>('mapas');
  const [ver, setVer] = useState<any>(null);
  const [modoVer, setModoVer] = useState<'cliente' | 'completo'>('cliente');
  const [envio, setEnvio] = useState<Record<string, string>>({});

  const load = async () => {
    try {
      setD(await api('/api/mapas' + (q ? '?q=' + encodeURIComponent(q) : ''), 'GET'));
    } catch (e: any) {
      toast(e.message);
    }
  };
  useEffect(() => {
    load();
  }, []);

  async function acao(m: any, a: string, extra: any = {}) {
    try {
      await api(`/api/mapas/${m.id}`, 'POST', { acao: a, ...extra });
      toast(a === 'liberar' ? 'Mapa liberado: o link agora mostra tudo' : a === 'pdf' ? 'PDF gerado de novo' : 'Enviado no WhatsApp ✨');
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function excluir(m: any) {
    if (!window.confirm(`Excluir o mapa de ${m.nome}?`)) return;
    try {
      await api(`/api/mapas/${m.id}`, 'DELETE');
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }

  const k = d?.kpis || {};
  const kpis = useMemo(
    () => [
      ['star', 'ai', 'Mapas no mês', k.mes ?? '—'],
      ['check', 'ok', 'Liberados no mês (pagos)', k.liberados_mes ?? '—'],
      ['eye', 'warn', 'Prévias no mês', k.previas_mes ?? '—'],
      ['pulse', 'acc', 'Visualizações', k.views ?? '—'],
    ],
    [d],
  );

  return (
    <>
      <PageHead title="Gerador de mapas" sub="Numerologia cabalística + signo: prévia ao vivo, mapa completo, PDF e envio no WhatsApp" icon="star" tone="ai" help="mapas">
        <div className="seg">
          <button aria-pressed={aba === 'mapas'} onClick={() => setAba('mapas')}>Mapas</button>
          <button aria-pressed={aba === 'textos'} onClick={() => setAba('textos')}>Textos do mapa</button>
        </div>
      </PageHead>

      {aba === 'textos' ? (
        <Textos />
      ) : (
        <>
          <div className="grid g-kpi">
            {kpis.map((x, i) => (
              <div className="card kpi" key={i}>
                <div className="row">
                  <Ib name={x[0] as string} tone={x[1] as string} delay={i * 0.3} />
                </div>
                <div className="v">{x[3]}</div>
                <div className="l">{x[2]}</div>
              </div>
            ))}
          </div>

          <div className="grid g-2">
            <Gerador onCriado={(m) => { setVer(m); setModoVer(m.liberado ? 'completo' : 'cliente'); load(); }} />
            <div className="card">
              <div className="card-h">
                <Ib name="eye" tone="acc" size="sm" />
                <h2>Prévia ao vivo</h2>
                <div className="sp" />
                {ver && (
                  <div className="seg">
                    <button aria-pressed={modoVer === 'cliente'} onClick={() => setModoVer('cliente')}>Como o cliente vê</button>
                    <button aria-pressed={modoVer === 'completo'} onClick={() => setModoVer('completo')}>Completo</button>
                  </div>
                )}
              </div>
              {ver ? (
                <>
                  <iframe key={ver.id + modoVer} src={modoVer === 'cliente' ? ver.url : ver.url_equipe} className="mapa-frame" title="Prévia do mapa" />
                  <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <button className="btn btn-g btn-sm" onClick={() => copyText(ver.url).then(() => toast('Link copiado'))}><Icon name="link" />Copiar link</button>
                    <a className="btn btn-g btn-sm" href={ver.url} target="_blank" rel="noreferrer"><Icon name="globe" />Abrir</a>
                    <a className="btn btn-g btn-sm" href={ver.pdf_equipe} target="_blank" rel="noreferrer"><Icon name="file" />PDF</a>
                  </div>
                </>
              ) : (
                <p className="muted">Gere um mapa ou clique em "Ver" na lista para ver aqui.</p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <Ib name="book" tone="ai" size="sm" />
              <h2>Mapas gerados</h2>
              <div className="sp" />
              <input placeholder="Buscar por nome" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} style={{ maxWidth: 240 }} />
            </div>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Mapa</th>
                    <th>Situação</th>
                    <th>Conversa</th>
                    <th style={{ textAlign: 'right' }}>Visitas</th>
                    <th>Criado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {!d && (
                    <tr><td colSpan={6} className="muted">Carregando…</td></tr>
                  )}
                  {d && d.mapas.length === 0 && (
                    <tr><td colSpan={6} className="muted">Nenhum mapa ainda. Gere o primeiro acima ou deixe a IA gerar pelo WhatsApp.</td></tr>
                  )}
                  {d?.mapas.map((m: any) => (
                    <tr key={m.id}>
                      <td>
                        <b>{m.tipo === 'casal' ? `${m.nome} & ${m.nome2}` : m.nome}</b>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {m.tipo === 'casal' ? 'Casal' : 'Pessoal'} · {new Date(m.nascimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                          {m.nascimento2 ? ' · ' + new Date(m.nascimento2 + 'T12:00:00').toLocaleDateString('pt-BR') : ''}
                        </div>
                      </td>
                      <td>
                        {m.liberado ? <span className="chip" style={{ ['--t' as any]: 'var(--ok)' }}>Completo</span> : <span className="chip" style={{ ['--t' as any]: 'var(--warn)' }}>Prévia</span>}
                        {m.sent_at && <div className="muted" style={{ fontSize: 11.5 }}>enviado {dayLabel(m.sent_at)}</div>}
                      </td>
                      <td>{m.leads ? <a href={`/conversas?lead=${m.leads.id}`}>{m.leads.name}</a> : <span className="muted">—</span>}</td>
                      <td style={{ textAlign: 'right' }}>{m.views}</td>
                      <td className="muted">{dayLabel(m.created_at)}</td>
                      <td>
                        <div className="row" style={{ gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button className="btn btn-g btn-sm" onClick={() => { setVer(m); setModoVer('cliente'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Icon name="eye" />Ver</button>
                          <a className="btn btn-g btn-sm" href={m.pdf_equipe} target="_blank" rel="noreferrer" title="Abrir o PDF"><Icon name="file" /></a>
                          {!m.liberado && <button className="btn btn-g btn-sm" onClick={() => acao(m, 'liberar')} title="Liberar o mapa completo (ex.: pagamento por fora)"><Icon name="check" />Liberar</button>}
                          {!m.leads && (
                            <input placeholder="WhatsApp do contato" value={envio[m.id] || ''} onChange={(e) => setEnvio({ ...envio, [m.id]: e.target.value })} style={{ width: 150 }} />
                          )}
                          <button className="btn btn-g btn-sm" onClick={() => acao(m, 'enviar_previa', { whatsapp: envio[m.id] })} title="Enviar a prévia no WhatsApp"><Icon name="wa" />Prévia</button>
                          <button className="btn btn-p btn-sm" onClick={() => acao(m, 'enviar_completo', { whatsapp: envio[m.id] })} title="Liberar e enviar o mapa completo com o PDF"><Icon name="spark" />Completo</button>
                          <button className="btn btn-g btn-sm" onClick={() => excluir(m)} title="Excluir"><Icon name="trash" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      <style>{`
        .mapa-frame{width:100%;height:560px;border:1px solid var(--line, #e7e3ef);border-radius:14px;background:#fff}
        .mapa-resumo{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-top:12px}
        .mapa-resumo div{border:1px solid var(--line, #e7e3ef);border-radius:10px;padding:8px 10px;background:var(--panel, #fff)}
        .mapa-resumo small{display:block;color:var(--muted);font-size:11.5px}
        .mapa-resumo b{color:var(--accent)}
      `}</style>
    </>
  );
}
