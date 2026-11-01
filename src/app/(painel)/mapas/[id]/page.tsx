'use client';
/* Mapa da Alma: análise do mapa para a equipe — números por tema (clique abre o detalhe ao lado) e as 4 pirâmides do nome. */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHead } from '@/components/PageHead';
import { Icon } from '@/components/Icon';
import { toast, api, copyText } from '@/components/ui';
import { TxtSigno } from '@/components/Signo';

const par = (p: string) => p.replace(/\*\*(.+?)\*\*/g, '$1');

function Detalhe({ it, onClose }: { it: any; onClose: () => void }) {
  const d = it.detalhe;
  return (
    <>
      <div className="an-overlay" onClick={onClose} />
      <aside className="an-drawer" role="dialog" aria-label={d.titulo}>
        <div className="an-dh">
          <div>
            <h3><TxtSigno t={it.rotulo} /></h3>
            {(it.sub || d.classico) && <small>{it.sub || d.classico}</small>}
          </div>
          <button className="btn btn-g btn-sm" onClick={onClose} aria-label="Fechar"><Icon name="x" /></button>
        </div>
        <div className="an-db">
          <div className="an-big"><TxtSigno t={it.valor} /></div>
          {d.intro && (
            <details className="an-intro">
              <summary>O que significa {d.titulo}?</summary>
              {d.intro.split(/\n{2,}/).map((p: string, i: number) => <p key={i}>{par(p)}</p>)}
            </details>
          )}
          {d.blocos.map((b: any, i: number) => (
            <div key={i} className="an-bloco">
              {(b.rotulo || b.numero) && <div className="an-rot"><span><TxtSigno t={b.rotulo} /></span>{b.numero && <b>{b.numero}</b>}</div>}
              {b.destaque && <p className="an-dest">{b.destaque}</p>}
              {(b.texto || []).map((p: string, k: number) => /^O QUE FAZER/i.test(p)
                ? <p key={k} className="an-fazer"><b>O que fazer:</b> {par(p.replace(/^O QUE FAZER:?\s*/i, ''))}</p>
                : <p key={k}><TxtSigno t={par(p)} /></p>)}
              {b.triangulo && <MiniPiramide linhas={b.triangulo.linhas} marcas={b.triangulo.marcas} />}
              {b.luz?.length ? <div className="an-luz"><h5>Pontos positivos</h5><ul>{b.luz.map((x: string) => <li key={x}>{x}</li>)}</ul></div> : null}
              {b.sombra?.length ? <div className="an-sombra"><h5>Pontos de atenção</h5><ul>{b.sombra.map((x: string) => <li key={x}>{x}</li>)}</ul></div> : null}
              {b.plano && (b.plano.intro || b.plano.partes?.length) ? (
                <div className="an-plano">
                  <h5>O que fazer: plano prático</h5>
                  {b.plano.intro && <p className="an-pi">{par(b.plano.intro)}</p>}
                  {(b.plano.partes || []).map((pt: any) => (
                    <div key={pt.titulo}><h6>{pt.titulo}</h6>{pt.itens ? <ol>{pt.itens.map((x: string) => <li key={x}>{x}</li>)}</ol> : <p>{pt.texto}</p>}</div>
                  ))}
                  {b.plano.frase && <p className="an-frase">“{b.plano.frase}”</p>}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}

function MiniPiramide({ linhas, marcas, arcano }: { linhas: number[][]; marcas: string[]; arcano?: number }) {
  const set = new Set(marcas);
  return (
    <div className="an-pir">
      {linhas.map((l, li) => (
        <div key={li} className="an-pl">
          {l.map((d, i) => <span key={i} className={set.has(`${li}:${i}`) ? 'neg' : li === 0 && arcano != null && (i === arcano || i === arcano + 1) ? 'arc' : ''}>{d}</span>)}
        </div>
      ))}
    </div>
  );
}

function Piramides({ a }: { a: any }) {
  const [k, setK] = useState('vida');
  const t = a.triangulos.find((x: any) => x.id === k);
  return (
    <div className="card an-tri">
      <div className="an-tri-h">
        <div className="an-info"><small>Nome</small><b>{a.nome}</b></div>
        <div className="an-info"><small>Nascimento</small><b>{a.nascimentoTxt}</b></div>
        <div className="an-info"><small>Arcanos do nome</small><b>{a.arcano.quantidade}</b></div>
        <div className="an-info"><small>Arcano atual</small><b>{a.arcano.atual}º arcano</b></div>
        <div className="an-info"><small>Arcano vibrando nesta pirâmide</small><b>{t.arcano.numero} · {a.arcano.inicio} – {a.arcano.fim}</b></div>
        {a.destaques.map((d: any) => <div key={d.rotulo} className="an-info"><small>{d.rotulo}</small><b>{d.valor}</b></div>)}
      </div>
      <div className="seg" style={{ margin: '14px 0', flexWrap: 'wrap', height: 'auto' }}>
        {a.triangulos.map((x: any) => <button key={x.id} aria-pressed={x.id === k} onClick={() => setK(x.id)}>{x.nome}</button>)}
      </div>
      <p className="muted" style={{ fontSize: 13 }}>{t.sobre}</p>
      <div className="an-letras">{t.letras.map((l: any, i: number) => <span key={i}>{l.l}</span>)}</div>
      <MiniPiramide linhas={t.linhas} marcas={t.marcas} arcano={t.arcano.pos} />
      <div className="an-leg"><span className="arc">■</span> arcano vibrando agora <span className="neg">■</span> bloqueio (sequência negativa)</div>
      <div className="an-expl">
        <p><b className="arc">{t.arcano.numero}{t.arcano.numero !== t.arcano.base ? ` → ${t.arcano.base}` : ''} · {t.arcano.nome}:</b> {t.arcano.texto} {t.arcano.periodo}</p>
        {t.sequencias.length ? t.sequencias.map((s: any) => <p key={s.codigo}><b className="neg">{s.codigo}:</b> {s.texto}</p>) : <p className="muted">Nenhum bloqueio nesta pirâmide: a energia flui bem nesta área.</p>}
      </div>
    </div>
  );
}

export default function AnaliseMapa({ params }: { params: { id: string } }) {
  const [dados, setDados] = useState<any>(null);
  const [aba, setAba] = useState<'nome' | 'piramide'>('nome');
  const [pessoa, setPessoa] = useState<'1' | '2'>('1');
  const [aberto, setAberto] = useState<any>(null);
  useEffect(() => {
    setDados(null);
    api(`/api/mapas/${params.id}?pessoa=${pessoa}`, 'GET').then(setDados).catch((e: any) => toast(e.message));
  }, [params.id, pessoa]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(null);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);
  if (!dados) return <div className="card" style={{ margin: 24 }}>Calculando o mapa…</div>;
  const { mapa, analise: a } = dados;
  return (
    <>
      <style>{AN_CSS}</style>
      <div className="an-head">
      <Link className="an-voltar" href="/mapas" title="Voltar para o Gerador de mapas"><span aria-hidden="true">←</span> Voltar</Link>
      <PageHead title={a.nome} sub={`${a.nascimentoTxt} · ${a.signo}${mapa.tipo === 'casal' ? ' · mapa do casal' : ''}`} icon="star" tone="ai" help="gerador">
        <a className="btn btn-g btn-sm" href={mapa.url_equipe} target="_blank" rel="noreferrer"><Icon name="eye" />Mapa do cliente</a>
        <a className="btn btn-g btn-sm" href={mapa.pdf_equipe} target="_blank" rel="noreferrer"><Icon name="file" />PDF</a>
        <a className="btn btn-g btn-sm" href={`${mapa.url}/ficha?pdf=1`} target="_blank" rel="noreferrer"><Icon name="clip" />Ficha 1 página</a>
        <a className="btn btn-g btn-sm" href={String(mapa.pdf_equipe || '').replace('/pdf?', '/piramides?')} target="_blank" rel="noreferrer" title="Relatório das pirâmides com o resumo geral">△ Pirâmides</a>
        <button className="btn btn-g btn-sm" onClick={() => copyText(mapa.url).then(() => toast('Link do cliente copiado'))}><Icon name="link" />Copiar link</button>
        {dados.pode_privar && (
          <button className="btn btn-g btn-sm" title={mapa.privado_de ? 'Só você vê. Clique para mostrar à equipe.' : 'A equipe vê. Clique para deixar privado.'} onClick={async () => { try { const r = await api(`/api/mapas/${mapa.id}`, 'POST', { acao: 'privado', privado: !mapa.privado_de }); setDados({ ...dados, mapa: { ...mapa, privado_de: r.privado ? 'eu' : null } }); toast(r.privado ? 'Mapa privado: só você vê 🔒' : 'Mapa público para a equipe 👥'); } catch (e: any) { toast(e.message); } }}>{mapa.privado_de ? '🔒 Privado' : '👥 Público'}</button>
        )}
        {mapa.liberado && mapa.senha && (
          <button className="btn btn-g btn-sm" title="Senha do cliente (clique para copiar)" onClick={() => copyText(mapa.senha).then(() => toast('Senha copiada'))}>🔐 {mapa.senha}</button>
        )}
        {mapa.liberado && (
          <button className="btn btn-g btn-sm" onClick={async () => { if (!confirm('Gerar uma nova senha? A senha atual deixa de funcionar.')) return; try { const r = await api(`/api/mapas/${mapa.id}`, 'POST', { acao: 'nova_senha' }); setDados({ ...dados, mapa: { ...mapa, senha: r.senha } }); toast(`Nova senha: ${r.senha}`); } catch (e: any) { toast(e.message); } }}><Icon name="refresh" />Nova senha</button>
        )}
      </PageHead>
      </div>
      <div className="an-tabs">
        <div className="seg">
          <button aria-pressed={aba === 'nome'} onClick={() => setAba('nome')}>Análise do nome</button>
          <button aria-pressed={aba === 'piramide'} onClick={() => setAba('piramide')}>Análise das pirâmides</button>
        </div>
        {mapa.tipo === 'casal' && mapa.nome2 && (
          <div className="seg">
            <button aria-pressed={pessoa === '1'} onClick={() => setPessoa('1')}>{String(mapa.nome).split(' ')[0]}</button>
            <button aria-pressed={pessoa === '2'} onClick={() => setPessoa('2')}>{String(mapa.nome2).split(' ')[0]}</button>
          </div>
        )}
        <span className="muted" style={{ fontSize: 12.5 }}>Clique em qualquer número para ver a explicação completa.</span>
      </div>
      {aba === 'nome' ? (
        <div className="an-grid">
          {a.grupos.map((g: any) => (
            <section key={g.id} className={`card an-card an-${g.id}`}>
              <h2><Icon name={g.icone} />{g.titulo}</h2>
              {g.subgrupos.map((sg: any, si: number) => (
                <div key={si}>
                  {sg.titulo && <h4 className="an-sub">{sg.titulo}</h4>}
                  <div className="an-itens">
                    {sg.itens.map((it: any) => (
                      <button key={it.id} className={'an-item' + (aberto?.id === it.id ? ' on' : '')} onClick={() => setAberto(it)}>
                        <span className="an-ico" style={{ animationDelay: `${(it.id.length * 0.37) % 2.4}s` }}><Icon name={g.icone} /></span>
                        <span className="an-txt"><b><TxtSigno t={it.valor} /></b><span>{it.rotulo}</span>{it.sub && <small>{it.sub}</small>}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <Piramides a={a} />
      )}
      {aberto && <Detalhe it={aberto} onClose={() => setAberto(null)} />}
    </>
  );
}

const AN_CSS = `
.an-tabs{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:4px 0 14px}
.an-head{display:flex;align-items:center;gap:14px}.an-head>.topbar{flex:1;min-width:0}
.an-voltar{flex:none;display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 16px;border-radius:12px;background:#16a34a;color:#fff!important;font-weight:700;text-decoration:none;box-shadow:0 6px 16px rgba(22,163,74,.28);transition:transform .15s,background .15s}
.an-voltar:hover{background:#15803d;transform:translateX(-2px)}.an-voltar span{font-size:18px;line-height:1}
@media (max-width:700px){.an-head{flex-direction:column;align-items:stretch}.an-voltar{align-self:flex-start}}
/* cartões encaixados (sem buracos): colunas tipo mural */
.an-grid{column-width:400px;column-gap:16px}
.an-grid>.an-card{break-inside:avoid;display:inline-block;width:100%;margin:0 0 16px}
@media (max-width:560px){.an-grid{column-width:auto;columns:1}}
.an-card{position:relative;overflow:hidden}
.an-card::before{content:'';position:absolute;inset:0 0 auto 0;height:4px;background:linear-gradient(90deg,var(--ai),#d9b45a,#22c55e)}
.zs-ico svg{width:1.05em;height:1.05em}
.an-card h2{display:flex;align-items:center;gap:8px;margin:0 0 12px;font-size:17px;color:var(--ai)}
.an-sub{margin:14px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.an-itens{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:4px}
.an-item{display:flex;gap:10px;align-items:flex-start;text-align:left;border:0;background:transparent;padding:9px 10px;border-radius:12px;cursor:pointer;color:var(--ink)}
.an-item:hover{background:color-mix(in srgb,var(--ai) 7%,transparent)}
.an-item.on{background:color-mix(in srgb,var(--ai) 12%,transparent)}
.an-ico{flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--ai) 10%,var(--surface-2));color:var(--ai);animation:anPulsa 2.6s ease-in-out infinite}
@keyframes anPulsa{0%,100%{transform:scale(1);box-shadow:0 0 0 0 color-mix(in srgb,var(--ai) 35%,transparent)}50%{transform:scale(1.08);box-shadow:0 0 0 7px color-mix(in srgb,var(--ai) 0%,transparent)}}
.an-item:hover .an-ico{animation-duration:1s}
.an-card h2 svg{animation:anFlutua 3.5s ease-in-out infinite}
@keyframes anFlutua{0%,100%{transform:translateY(1px)}50%{transform:translateY(-3px)}}
@media (prefers-reduced-motion:reduce){.an-ico,.an-card h2 svg{animation:none}}
.an-item.on .an-ico{background:var(--ai);color:#fff}
.an-txt{display:flex;flex-direction:column;min-width:0}.an-txt b{color:var(--ai);font-size:14px;font-weight:600}.an-txt span{font-size:14px}.an-txt small{font-size:11.5px;color:var(--muted)}
.an-overlay{position:fixed;inset:0;background:rgba(16,24,40,.18);z-index:60}
.an-drawer{position:fixed;top:0;right:0;bottom:0;width:min(520px,100vw);background:var(--surface);z-index:61;box-shadow:-12px 0 40px rgba(16,24,40,.18);display:flex;flex-direction:column;animation:anIn .18s ease-out}
@keyframes anIn{from{transform:translateX(30px);opacity:0}to{transform:none;opacity:1}}
.an-dh{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:18px 20px;border-bottom:1px solid var(--line)}
.an-dh h3{margin:0;font-size:18px}.an-dh small{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.06em}
.an-db{padding:16px 20px 30px;overflow:auto;font-size:14px;line-height:1.65;color:var(--ink-2)}
.an-big{font-size:38px;font-weight:800;color:var(--ai);line-height:1.1;margin-bottom:8px;font-family:Georgia,serif}
.an-intro{background:var(--surface-2);border-radius:10px;padding:8px 12px;margin-bottom:10px}.an-intro summary{cursor:pointer;font-weight:600;color:var(--ai)}
.an-bloco{margin:12px 0 18px}
.an-rot{display:flex;justify-content:space-between;gap:8px;align-items:center;background:color-mix(in srgb,var(--ai) 8%,transparent);border-left:3px solid #d9b45a;padding:7px 10px;border-radius:8px;font-weight:700;font-size:12.5px;text-transform:uppercase;letter-spacing:.04em}
.an-rot b{color:var(--ai);font-size:15px}
.an-dest{font-weight:600;color:var(--ai)}
.an-fazer{background:linear-gradient(135deg,#f1e8ff,#faf7ff 50%,#e3f8ec);border:2px solid #b89cf0;padding:9px 12px;border-radius:12px;color:#2a1f3d}.an-fazer b{color:var(--ai)}
.an-luz,.an-sombra{border-radius:12px;padding:10px 14px;margin-top:10px;border:1.5px solid}
.an-luz{background:#ecfbf3;border-color:#9fdcbc;color:#1d3a2a}.an-sombra{background:#fff0f0;border-color:#f3b3b3;color:#4a1d1d}
.an-luz h5{color:#15803d}.an-sombra h5{color:#c0262d}.an-luz h5::before{content:'✓ '}.an-sombra h5::before{content:'! '}
.an-luz h5,.an-sombra h5{margin:0 0 4px}.an-plano h5{margin:12px 0 4px;font-size:12.5px;text-transform:uppercase;letter-spacing:.05em}
.an-luz li::marker{color:#16a34a}.an-sombra li::marker{color:#dc2626}
.an-luz ul,.an-sombra ul,.an-plano ol{margin:0;padding-left:20px}
.an-plano{border:2px solid #b89cf0;background:linear-gradient(135deg,#f3ecff,#fbf8ff 50%,#e6faef);border-radius:12px;padding:10px 14px;margin-top:12px;color:#2a1f3d}
.an-plano h5{color:var(--ai);margin-top:2px}.an-plano h6{margin:8px 0 2px;font-size:13px}.an-pi{font-weight:600}
.an-frase{text-align:center;font-family:Georgia,serif;color:var(--ai)}
.an-tri-h{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
.an-info{display:flex;flex-direction:column}.an-info small{color:var(--muted);font-size:12px}.an-info b{color:var(--ai);font-weight:600}
.an-letras,.an-pl{display:flex;justify-content:center;gap:0}
.an-letras span{width:22px;text-align:center;color:#16a34a;font-weight:700;font-size:13px}
.an-pir{margin:6px 0 10px;overflow-x:auto;font-family:ui-monospace,Consolas,monospace}
.an-pl span{width:22px;text-align:center;font-size:13px;color:var(--ink-2)}
.an-pl span.neg,.neg{color:#dc2626!important;font-weight:800}
.an-pl span.arc,.arc{color:#16a34a!important;font-weight:800}
.an-db .an-pir .an-pl span{width:16px;font-size:11px}
.an-leg{text-align:center;font-size:12px;color:var(--muted);margin-bottom:10px}
.an-expl p{font-size:14px;line-height:1.65}
`;
