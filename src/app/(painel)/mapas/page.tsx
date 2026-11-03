'use client';
/* Mapa da Alma: gerador de mapas com prévia ao vivo, lista de mapas, PDF, envio no WhatsApp, textos e marca do mapa. */
import { useEffect, useMemo, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { toast, api, dayLabel, copyText } from '@/components/ui';
import { FONTES_TITULO, FONTES_TEXTO } from '@/lib/mapa-alma/mapa/html';
import { TxtSigno } from '@/components/Signo';
import { EstiloCards } from '@/components/EstiloCards';
import { TiragensTaro } from '@/components/TiragensTaro';
import { PreviaConfig } from '@/components/PreviaConfig';

function Gerador({ onCriado, podePrivar }: { onCriado: (m: any) => void; podePrivar?: boolean }) {
  const [tipo, setTipo] = useState<'pessoal' | 'casal'>('pessoal');
  const [f, setF] = useState({ nome: '', nascimento: '', nome2: '', nascimento2: '' });
  const [resumo, setResumo] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [privado, setPrivado] = useState(false);
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
      const m = await api('/api/mapas', 'POST', { tipo, ...f, liberado, privado: podePrivar && privado });
      toast(m.existente ? 'Esse mapa já existia (mesmo nome e data): abri o mesmo, sem duplicar ✨' : liberado ? 'Mapa completo gerado ✨' : 'Prévia do mapa gerada ✨');
      onCriado(m);
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  }

  const signo = resumo?.resumo?.find((r: any) => /^Signos?$/.test(r.rotulo))?.valor;
  const campo = (k: 'nome' | 'nascimento' | 'nome2' | 'nascimento2', label: string, tipoInput: string, ph: string, icon: string) => (
    <label className="gm-campo">
      <span className="gm-lbl">{label}</span>
      <span className="gm-inp">
        <Icon name={icon} />
        <input type={tipoInput} value={f[k]} placeholder={ph} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
      </span>
    </label>
  );

  return (
    <div className="card gm">
      <style>{GM_CSS}</style>
      <div className="gm-top">
        <div className="gm-stars" aria-hidden="true" />
        <div className="gm-titulo">
          <span className="gm-ico">✦</span>
          <div>
            <h2>Gerar mapa</h2>
            <p>Numerologia cabalística + signo, calculados na hora</p>
          </div>
        </div>
        <div className="gm-tipo" role="tablist">
          <button role="tab" aria-selected={tipo === 'pessoal'} onClick={() => setTipo('pessoal')}>☾ Pessoal</button>
          <button role="tab" aria-selected={tipo === 'casal'} onClick={() => setTipo('casal')}>♡ Casal</button>
        </div>
      </div>

      <div className="gm-corpo">
        <div className="gm-pessoa">
          {tipo === 'casal' && <div className="gm-tag">Pessoa 1</div>}
          <div className="gm-linha">
            {campo('nome', 'Nome completo de nascimento', 'text', 'Como está na certidão, com acentos', 'user')}
            {campo('nascimento', 'Data de nascimento', 'date', '', 'clock')}
          </div>
        </div>
        {tipo === 'casal' && (
          <div className="gm-pessoa">
            <div className="gm-tag">Pessoa 2</div>
            <div className="gm-linha">
              {campo('nome2', 'Nome completo de nascimento', 'text', 'Como está na certidão, com acentos', 'user')}
              {campo('nascimento2', 'Data de nascimento', 'date', '', 'clock')}
            </div>
          </div>
        )}

        {resumo ? (
          <div className="gm-resumo">
            <div className="gm-resumo-h">
              <span>Leitura instantânea</span>
              {signo && <b className="gm-signo"><TxtSigno t={signo} /></b>}
            </div>
            <div className="gm-tiles">
              {resumo.resumo.filter((r: any) => !/^(Data|Datas|Signos?|Cores)$/.test(r.rotulo)).slice(0, 12).map((r: any) => (
                <div key={r.rotulo} className="gm-tile">
                  <b>{r.valor}</b>
                  <small>{r.rotulo}</small>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="gm-vazio">
            <span>✧</span> Digite o nome completo e a data: os números aparecem aqui na hora.
          </div>
        )}

        <div className="gm-acoes">
          <button className="gm-btn gm-btn-sec" disabled={!pronto || busy} onClick={() => criar(false)}>
            <Icon name="eye" />
            <span><b>Gerar prévia</b><small>parte bloqueada, para enviar ao cliente</small></span>
          </button>
          <button className="gm-btn gm-btn-pri" disabled={!pronto || busy} onClick={() => criar(true)}>
            <Icon name="spark" />
            <span><b>{busy ? 'Gerando…' : 'Gerar mapa completo'}</b><small>todas as seções + PDF</small></span>
          </button>
        </div>
        {podePrivar && (
          <label className={'gm-priv' + (privado ? ' on' : '')} title="Só você (Master) vê esta opção. Mapa só para mim: a equipe não vê na lista nem na análise.">
            <input type="checkbox" checked={privado} onChange={(e) => setPrivado(e.target.checked)} />
            <Icon name="lock" />
            <span>só para mim</span>
          </label>
        )}
        <p className="gm-nota">No WhatsApp a IA faz isso sozinha: lê o mapa ao vivo na conversa, envia a prévia e libera o completo quando o pagamento cai.</p>
      </div>
    </div>
  );
}

const GM_CSS = `
.gm{padding:0;overflow:hidden}
.gm-top{position:relative;display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:20px 22px;background:radial-gradient(circle at 15% 0%,#6d3fd8,#2a1259 60%,#1a0b3d);color:#fff}
.gm-stars{position:absolute;inset:0;pointer-events:none;opacity:.7;background-image:radial-gradient(1.4px 1.4px at 12% 30%,#fff,transparent),radial-gradient(1px 1px at 38% 70%,#f3dfa2,transparent),radial-gradient(1.2px 1.2px at 64% 22%,#fff,transparent),radial-gradient(1px 1px at 82% 64%,#f3dfa2,transparent),radial-gradient(1px 1px at 92% 18%,#fff,transparent);background-size:260px 120px}
.gm-titulo{position:relative;display:flex;align-items:center;gap:12px;flex:1;min-width:220px}
.gm-titulo h2{margin:0;font-size:18px;color:#fff}.gm-titulo p{margin:2px 0 0;font-size:12.5px;color:#d9ccff}
.gm-ico{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:rgba(243,223,162,.15);border:1px solid rgba(243,223,162,.45);color:#f3dfa2;font-size:18px}
.gm-tipo{position:relative;display:flex;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:3px}
.gm-tipo button{border:0;background:transparent;color:#e9e2ff;padding:7px 16px;border-radius:999px;font-weight:600;font-size:13px;cursor:pointer}
.gm-tipo button[aria-selected=true]{background:#fff;color:#2a1259;box-shadow:0 2px 10px rgba(0,0,0,.18)}
.gm-corpo{padding:20px 22px 18px}
.gm-pessoa{margin-bottom:12px}
.gm-tag{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ai);background:color-mix(in srgb,var(--ai) 10%,transparent);padding:3px 10px;border-radius:999px;margin-bottom:8px}
.gm-linha{display:grid;grid-template-columns:2fr 1fr;gap:12px}
@media (max-width:720px){.gm-linha{grid-template-columns:1fr}}
.gm-campo{display:block}
.gm-lbl{display:block;font-size:12.5px;font-weight:600;color:var(--ink-2);margin-bottom:6px}
.gm-inp{display:flex;align-items:center;gap:10px;border:1.5px solid var(--line-strong);background:var(--surface);border-radius:14px;padding:0 14px;height:48px;transition:border-color .15s,box-shadow .15s}
.gm-inp:focus-within{border-color:var(--ai);box-shadow:0 0 0 4px color-mix(in srgb,var(--ai) 14%,transparent)}
.gm-inp .i{color:var(--faint);flex:none}
.gm-inp input{border:0;outline:0;background:transparent;flex:1;font-size:15px;color:var(--ink);height:100%;min-width:0}
.gm-resumo{margin:6px 0 16px;border:1px solid color-mix(in srgb,var(--ai) 22%,var(--line));background:linear-gradient(180deg,color-mix(in srgb,var(--ai) 6%,var(--surface)),var(--surface));border-radius:16px;padding:14px}
.gm-resumo-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.gm-nome-link{color:inherit;text-decoration:none}.gm-nome-link:hover b{color:var(--ai);text-decoration:underline;text-underline-offset:3px}
.zs-ico svg{width:1.05em;height:1.05em}
.gm-signo{font-size:13px;text-transform:none;letter-spacing:0;color:#2a1259;background:linear-gradient(135deg,#f3dfa2,#d9b45a);padding:4px 12px;border-radius:999px}
.gm-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:8px}
.gm-tile{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px}
.gm-tile b{font-size:16px;color:var(--ai)}.gm-tile small{font-size:11.5px;color:var(--muted)}
.gm-vazio{margin:6px 0 16px;border:1.5px dashed var(--line-strong);border-radius:16px;padding:18px;text-align:center;color:var(--muted);font-size:13px}
.gm-vazio span{color:var(--ai);margin-right:6px}
.gm-priv{display:inline-flex;align-items:center;gap:6px;margin-top:8px;font-size:12px;color:var(--muted);cursor:pointer;user-select:none;opacity:.7}
.gm-priv:hover,.gm-priv.on{opacity:1}.gm-priv.on{color:#4b1f8f}.gm-priv input{width:14px;height:14px;accent-color:#4b1f8f}.gm-priv svg{width:13px;height:13px}
.gm-privdot{display:inline-flex;vertical-align:middle;margin-left:6px;color:#8a7aa0;opacity:.75}.gm-privdot svg{width:13px;height:13px}
.gm-privtag{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;color:#4b1f8f;background:color-mix(in srgb,#4b1f8f 10%,transparent);border-radius:999px;padding:2px 8px;margin-left:6px;vertical-align:middle}
.gm-acoes{display:grid;grid-template-columns:1fr 1.3fr;gap:10px}
@media (max-width:720px){.gm-acoes{grid-template-columns:1fr}}
.gm-btn{display:flex;align-items:center;gap:12px;text-align:left;border-radius:14px;padding:12px 16px;cursor:pointer;border:1.5px solid var(--line-strong);background:var(--surface);color:var(--ink);transition:transform .1s,box-shadow .15s}
.gm-btn span{display:flex;flex-direction:column}.gm-btn b{font-size:14px}.gm-btn small{font-size:11.5px;opacity:.75}
.gm-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 18px rgba(42,18,89,.12)}
.gm-btn:disabled{opacity:.5;cursor:not-allowed}
.gm-btn-pri{border:0;color:#fff;background:linear-gradient(135deg,#7a5af8,#4b1f8f)}
.gm-nota{margin:12px 0 0;font-size:12px;color:var(--muted)}
`;

function Aparencia() {
  const [m, setM] = useState<any>(null);
  useEffect(() => {
    api('/api/settings', 'GET').then((s: any) => setM({ nome: 'Mapa da Alma', subtitulo: 'Estudo Numerológico & Astrológico', assinatura: 'Com carinho, equipe Mapa da Alma', fonteTitulo: 'cinzel', fonteTexto: 'inter', ...(s.mapa_marca || {}) })).catch((e: any) => toast(e.message));
  }, []);
  const ft = FONTES_TITULO[m?.fonteTitulo] || FONTES_TITULO.cinzel, fx = FONTES_TEXTO[m?.fonteTexto] || FONTES_TEXTO.inter;
  useEffect(() => {
    if (!m) return;
    const id = 'fontes-preview';
    let l = document.getElementById(id) as HTMLLinkElement | null;
    if (!l) { l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'; document.head.appendChild(l); }
    l.href = `https://fonts.googleapis.com/css2?${Object.values(FONTES_TITULO).map((f) => 'family=' + f.g).join('&')}&${Object.values(FONTES_TEXTO).map((f) => 'family=' + f.g).join('&')}&display=swap`;
  }, [!!m]);
  if (!m) return <div className="card">Carregando…</div>;
  async function salvar() {
    try { await api('/api/settings', 'PATCH', { mapa_marca: m }); toast('Aparência salva: vale para os links e os próximos PDFs ✨'); } catch (e: any) { toast(e.message); }
  }
  const campo = (k: string, label: string, ph = '') => (
    <div className="field"><label>{label}</label><input value={m[k] || ''} placeholder={ph} onChange={(e) => setM({ ...m, [k]: e.target.value })} /></div>
  );
  return (
    <div className="grid g-2" style={{ alignItems: 'start' }}>
      <div className="card">
        <div className="card-h"><Ib name="sliders" tone="ai" size="sm" /><h2>Aparência do mapa</h2></div>
        <div className="field"><label>Fonte dos títulos</label>
          <select value={m.fonteTitulo} onChange={(e) => setM({ ...m, fonteTitulo: e.target.value })}>{Object.entries(FONTES_TITULO).map(([k, f]) => <option key={k} value={k}>{f.nome}</option>)}</select></div>
        <div className="field"><label>Fonte dos textos</label>
          <select value={m.fonteTexto} onChange={(e) => setM({ ...m, fonteTexto: e.target.value })}>{Object.entries(FONTES_TEXTO).map(([k, f]) => <option key={k} value={k}>{f.nome}</option>)}</select></div>
        {campo('nome', 'Nome no topo do mapa')}
        {campo('subtitulo', 'Subtítulo')}
        {campo('assinatura', 'Assinatura da conclusão')}
        {campo('whatsapp', 'WhatsApp do botão "Liberar meu mapa" (na prévia)', 'Ex.: 5511999999999')}
        <button className="btn btn-p" onClick={salvar}><Icon name="check" />Salvar aparência</button>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>Os PDFs já gerados continuam como estão. Para aplicar a nova aparência num PDF antigo, use "Refazer PDF" no mapa.</p>
      </div>
      <div className="card" style={{ background: '#fbf8ff' }}>
        <div style={{ background: 'radial-gradient(circle at 50% 20%,#5b2bb0,#1a0b3d 70%)', borderRadius: 14, padding: '22px 16px', textAlign: 'center' }}>
          <div style={{ fontFamily: ft.css, color: '#f3dfa2', fontSize: 30, letterSpacing: '.12em' }}>{String(m.nome || '').toUpperCase()}</div>
          <div style={{ fontFamily: fx.css, color: '#e8d9ff', fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase' }}>{m.subtitulo}</div>
        </div>
        <h2 style={{ fontFamily: ft.css, color: '#4b1f8f', fontSize: 24, margin: '18px 0 4px' }}>✦ Desejo da Alma</h2>
        <div style={{ fontFamily: fx.css, fontSize: 12, color: '#6b5b7e', textTransform: 'uppercase', letterSpacing: '.08em' }}>na numerologia tradicional: motivação</div>
        <p style={{ fontFamily: fx.css, fontSize: 16, lineHeight: 1.7, color: '#241a33' }}>Por dentro, você é movido(a) pelo desejo de ser dono(a) do próprio caminho. Nada te deixa mais vivo(a) do que começar algo novo e ver as suas ideias ganharem forma.</p>
        <p style={{ fontFamily: ft.css, textAlign: 'center', color: '#4b1f8f' }}>“Eu confio na minha força e dou o primeiro passo.”</p>
      </div>
    </div>
  );
}

type Cat = { id: string; nome: string; textos: Record<string, string> };

function Textos() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [cat, setCat] = useState('motivacao');
  const [num, setNum] = useState('1');
  const [todos, setTodos] = useState<any[]>([]);
  const [txt, setTxt] = useState('');
  const def = cats.find((c) => c.id === cat);
  const nums = def ? Object.keys(def.textos).sort((a, b) => (Number(a) || 0) - (Number(b) || 0)) : [];
  const padrao = def?.textos[num] || '';
  const load = async () => {
    try {
      const j = await api('/api/mapa-textos', 'GET');
      setTodos(j.textos);
      setCats(j.categorias || []);
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
  const custom = (n: string) => todos.some((t) => t.categoria === cat && t.numero === n);
  const [editando, setEditando] = useState(false);
  useEffect(() => setEditando(!!todos.find((t) => t.categoria === cat && t.numero === num)), [cat, num, todos]);
  const paras = (t: string) => t.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="card tx">
      <style>{TX_CSS}</style>
      <div className="card-h">
        <Ib name="book" tone="ai" size="sm" />
        <h2>Textos do mapa</h2>
        <span className="sp muted" style={{ fontSize: 12.5 }}>Cada número de cada seção tem um texto próprio. Personalize o que quiser: vale para os links e os próximos PDFs.</span>
      </div>
      <div className="tx-grid">
        <nav className="tx-cats" aria-label="Seções do mapa">
          {cats.map((c) => (
            <button key={c.id} aria-current={c.id === cat} onClick={() => { setCat(c.id); setNum(Object.keys(c.textos).sort((a, b) => (Number(a) || 0) - (Number(b) || 0))[0]); }}>
              <span>{NOME_SECAO[c.id] || c.nome}</span>
              {todos.some((t) => t.categoria === c.id) && <i title="Tem textos personalizados">●</i>}
            </button>
          ))}
        </nav>
        <div className="tx-main">
          <div className="tx-head">
            <div>
              <h3>{NOME_SECAO[cat] || def?.nome}</h3>
              {def && NOME_SECAO[cat] && NOME_SECAO[cat] !== def.nome && <small>na numerologia tradicional: {def.nome}</small>}
            </div>
          </div>
          <div className="tx-nums">
            {nums.map((n) => (
              <button key={n} aria-pressed={n === num} onClick={() => setNum(n)} className={custom(n) ? 'tem' : ''}>{n}</button>
            ))}
          </div>
          {!editando ? (
            <div className="tx-ler">
              <div className="tx-badge">{custom(num) ? 'Texto personalizado' : 'Texto padrão do Mapa da Alma'} · {num}</div>
              {paras(txt.trim() ? txt : padrao).map((p, i) => /^O QUE FAZER/i.test(p)
                ? <p key={i} className="tx-fazer"><b>O que fazer:</b> {p.replace(/^O QUE FAZER:?\s*/i, '')}</p>
                : <p key={i}>{p}</p>)}
              <div className="tx-acoes">
                <button className="btn btn-p" onClick={() => { if (!txt.trim()) setTxt(padrao); setEditando(true); }}><Icon name="sliders" />Personalizar este texto</button>
              </div>
            </div>
          ) : (
            <div className="tx-edit">
              <label className="tx-lbl">Seu texto para {NOME_SECAO[cat] || def?.nome} {num} <small>(separe os parágrafos com uma linha em branco; comece um parágrafo com "O QUE FAZER:" para destacá-lo)</small></label>
              <textarea rows={14} value={txt} onChange={(e) => setTxt(e.target.value)} />
              <div className="tx-acoes">
                <button className="btn btn-p" onClick={salvar}><Icon name="check" />Salvar texto</button>
                <button className="btn btn-g" onClick={() => { setTxt(todos.find((t) => t.categoria === cat && t.numero === num)?.conteudo || ''); setEditando(!!custom(num)); }}>Cancelar</button>
                {custom(num) && <button className="btn btn-g" onClick={async () => { setTxt(''); await api('/api/mapa-textos', 'PUT', { categoria: cat, numero: num, conteudo: '' }); toast('Voltou para o texto padrão'); load(); }}><Icon name="refresh" />Voltar ao padrão</button>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const NOME_SECAO: Record<string, string> = {
  motivacao: 'Desejo da Alma', impressao: 'Imagem no Mundo', expressao: 'Talentos Naturais', diaNascimento: 'Dom do seu Dia', destino: 'Caminho de Vida', missao: 'Propósito da Alma',
  talentoOculto: 'Dom Adormecido', numeroPsiquico: 'Eu Íntimo', respostaSubconsciente: 'Reação Instintiva', tendenciasOcultas: 'Energias em Excesso', licoesCarmicas: 'Aprendizados da Alma',
  dividasCarmicas: 'Padrões a Curar', sequencia: 'Bloqueios do Nome', anoPessoal: 'Energia do Ano', mesPessoal: 'Energia do Mês', diaPessoal: 'Energia do Dia', ciclo: 'Estações da Vida',
  desafio: 'Provas de Crescimento', momento: 'Portais da Vida', harmoniaConjugal: 'Numerologia do Amor', cores: 'Cores Favoráveis', signo: 'Signos',
};

const TX_CSS = `
.tx-grid{display:grid;grid-template-columns:230px 1fr;gap:18px;margin-top:6px}
@media (max-width:820px){.tx-grid{grid-template-columns:1fr}}
.tx-cats{display:flex;flex-direction:column;gap:2px;max-height:620px;overflow:auto;border-right:1px solid var(--line);padding-right:10px}
@media (max-width:820px){.tx-cats{flex-direction:row;flex-wrap:wrap;border-right:0;max-height:none}}
.tx-cats button{display:flex;align-items:center;justify-content:space-between;gap:8px;text-align:left;border:0;background:transparent;padding:9px 12px;border-radius:10px;font-size:13.5px;color:var(--ink-2);cursor:pointer}
.tx-cats button:hover{background:var(--surface-2)}
.tx-cats button[aria-current=true]{background:color-mix(in srgb,var(--ai) 12%,transparent);color:var(--ai);font-weight:700}
.tx-cats i{font-style:normal;color:var(--ai);font-size:9px}
.tx-head h3{margin:0;font-size:18px}.tx-head small{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.06em}
.tx-nums{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 14px}
.tx-nums button{min-width:40px;height:36px;padding:0 10px;border-radius:10px;border:1.5px solid var(--line-strong);background:var(--surface);font-weight:700;color:var(--ink-2);cursor:pointer;position:relative}
.tx-nums button[aria-pressed=true]{background:linear-gradient(135deg,#7a5af8,#4b1f8f);color:#fff;border-color:transparent}
.tx-nums button.tem::after{content:'';position:absolute;top:4px;right:4px;width:6px;height:6px;border-radius:50%;background:#d9b45a}
.tx-ler{border:1px solid var(--line);border-radius:16px;padding:18px 22px;background:linear-gradient(180deg,color-mix(in srgb,var(--ai) 4%,var(--surface)),var(--surface));line-height:1.7;font-size:14.5px;color:var(--ink-2)}
.tx-badge{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ai);background:color-mix(in srgb,var(--ai) 10%,transparent);padding:3px 10px;border-radius:999px;margin-bottom:6px}
.tx-fazer{background:color-mix(in srgb,var(--ai) 8%,var(--surface));border-left:4px solid var(--ai);padding:10px 14px;border-radius:10px}
.tx-fazer b{color:var(--ai)}
.tx-acoes{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.tx-lbl{display:block;font-weight:600;font-size:13px;margin-bottom:6px}.tx-lbl small{font-weight:400;color:var(--muted)}
.tx-edit textarea{width:100%;border:1.5px solid var(--line-strong);border-radius:14px;padding:14px;font-size:14.5px;line-height:1.6;background:var(--surface);color:var(--ink);resize:vertical}
.tx-edit textarea:focus{outline:0;border-color:var(--ai);box-shadow:0 0 0 4px color-mix(in srgb,var(--ai) 14%,transparent)}
`;

/** Menu de ações de um mapa: links, senha, pirâmides, prévia com bloqueios, versão, PDF. */
function AcoesMapa({ m, acao, podePrivar }: { m: any; acao: (m: any, a: string, extra?: any) => void; podePrivar?: boolean }) {
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    if (!aberto) return;
    const f = () => setAberto(false);
    setTimeout(() => window.addEventListener('click', f), 0);
    return () => window.removeEventListener('click', f);
  }, [aberto]);
  const pir = String(m.pdf_equipe || '').replace('/pdf?', '/piramides?');
  const previa = `${m.url}?previa=1`;
  const copia = (t: string, msg: string) => copyText(t).then(() => toast(msg));
  const abrir = (u: string) => window.open(u, '_blank', 'noopener');
  const itens: ([string, string, () => void] | null)[] = [
    ['eye', 'Abrir o mapa (equipe)', () => abrir(m.url_equipe)],
    ['link', 'Copiar link do cliente', () => copia(m.url, 'Link do cliente copiado')],
    ['lock', 'Abrir prévia com bloqueios', () => abrir(previa)],
    ['link', 'Copiar link da prévia (com bloqueios)', () => copia(previa, 'Link da prévia copiado')],
    m.tipo !== 'casal' ? ['triangle', 'Abrir as pirâmides (relatório)', () => abrir(pir)] : null,
    m.tipo !== 'casal' ? ['triangle', 'Pirâmides em PDF', () => abrir(pir + '&pdf=1')] : null,
    ['file', 'Abrir o PDF do mapa', () => abrir(m.pdf_equipe)],
    ['refresh', 'Refazer o PDF', () => acao(m, 'pdf')],
    ['clip', 'Ficha de 1 página', () => abrir(`${m.url}/ficha?pdf=1`)],
    m.liberado && m.senha ? ['key', `Copiar senha (${m.senha})`, () => copia(m.senha, 'Senha copiada')] : null,
    m.liberado ? ['refresh', 'Trocar a senha', () => { if (confirm('Gerar uma nova senha? A senha atual deixa de funcionar.')) acao(m, 'nova_senha'); }] : null,
    !m.liberado ? ['check', 'Liberar o mapa (pagamento por fora)', () => acao(m, 'liberar')] : null,
    podePrivar ? ['lock', m.privado_de ? 'Mostrar para a equipe' : 'Deixar só para mim', () => acao(m, 'privado', { privado: !m.privado_de })] : null,
    m.tipo !== 'casal' ? ['star', m.versao === 'simples' ? 'Mudar para versão COMPLETA (com pirâmides)' : 'Mudar para versão SIMPLES (sem pirâmides)', () => acao(m, 'versao', { versao: m.versao === 'simples' ? 'completa' : 'simples' })] : null,
  ];
  return (
    <span className="am-wrap">
      <button className="btn btn-g btn-sm" onClick={(e) => { e.stopPropagation(); setAberto(!aberto); }} aria-haspopup="true" aria-expanded={aberto}>Ações ▾</button>
      {aberto && (
        <span className="am-menu" role="menu" onClick={(e) => e.stopPropagation()}>
          {itens.filter(Boolean).map((x) => { const [ic, t, f] = x!; return <button key={t} role="menuitem" onClick={() => { setAberto(false); f(); }}><Icon name={ic} />{t}</button>; })}
        </span>
      )}
    </span>
  );
}

export default function Mapas() {
  const [d, setD] = useState<any>(null);
  const [q, setQ] = useState('');
  const [aba, setAba] = useState<'mapas' | 'textos' | 'aparencia' | 'taro' | 'previa'>('mapas');
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
      const r = await api(`/api/mapas/${m.id}`, 'POST', { acao: a, ...extra });
      toast(a === 'versao' ? (extra.versao === 'simples' ? 'Versão simples: as pirâmides ficam bloqueadas no link' : 'Versão completa: pirâmides liberadas no link ✨') : a === 'privado' ? (extra.privado ? 'Mapa privado: agora só você vê 🔒' : 'Mapa público: a equipe também vê 👥') : a === 'liberar' ? `Mapa liberado. Senha do cliente: ${r.senha}` : a === 'nova_senha' ? `Nova senha: ${r.senha} (a antiga parou de funcionar)` : a === 'pdf' ? 'PDF gerado de novo' : 'Enviado no WhatsApp ✨');
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
          <button aria-pressed={aba === 'taro'} onClick={() => setAba('taro')}>Tarô</button>
          <button aria-pressed={aba === 'previa'} onClick={() => setAba('previa')}>Prévia bloqueada</button>
          <button aria-pressed={aba === 'aparencia'} onClick={() => setAba('aparencia')}>Aparência</button>
        </div>
      </PageHead>

      {aba === 'previa' ? (
        <PreviaConfig master={!!d?.pode_privar} />
      ) : aba === 'taro' ? (
        <TiragensTaro />
      ) : aba === 'aparencia' ? (
        <>
          <Aparencia />
          <EstiloCards />
        </>
      ) : aba === 'textos' ? (
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
            <Gerador podePrivar={!!d?.pode_privar} onCriado={(m) => { setVer(m); setModoVer(m.liberado ? 'completo' : 'cliente'); load(); }} />
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
              {d?.pode_privar && (
                <button className="btn btn-g btn-sm" title="Recria os mapas apagados a partir das conversas (mesmo link e mesma senha)" onClick={async () => { if (!confirm('Recuperar os mapas a partir das conversas? Os mapas que já existem não mudam.')) return; try { const r = await api('/api/mapas/recuperar', 'POST', {}); toast(`${r.recuperados} mapa(s) recuperado(s)${r.sem_dados ? ` · ${r.sem_dados} sem nome/data na conversa` : ''}`); load(); } catch (e: any) { toast(e.message); } }}><Icon name="refresh" />Recuperar mapas</button>
              )}
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
                        <a className="gm-nome-link" href={`/mapas/${m.id}`} title="Abrir a análise do mapa"><b>{m.tipo === 'casal' ? `${m.nome} & ${m.nome2}` : m.nome}</b></a>{m.privado_de && <span className="gm-privdot" title="Privado: só você vê este mapa" aria-label="Privado"><Icon name="lock" /></span>}{m.tipo !== 'casal' && m.liberado && <span className="gm-privtag" style={{ color: m.versao === 'simples' ? '#b45309' : '#15803d', background: m.versao === 'simples' ? '#fff4e0' : '#e8f8ee' }}>{m.versao === 'simples' ? 'Simples' : 'Completa △'}</span>}
                        <div className="muted" style={{ fontSize: 12 }}>
                          {m.tipo === 'casal' ? 'Casal' : 'Pessoal'} · {new Date(m.nascimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                          {m.nascimento2 ? ' · ' + new Date(m.nascimento2 + 'T12:00:00').toLocaleDateString('pt-BR') : ''}
                        </div>
                      </td>
                      <td>
                        {m.liberado ? <span className="chip" style={{ ['--t' as any]: 'var(--ok)' }}>Completo</span> : <span className="chip" style={{ ['--t' as any]: 'var(--warn)' }}>Prévia</span>}
                        {m.liberado && m.senha && (
                          <div style={{ marginTop: 4, fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span title="Senha do cliente para abrir o mapa">🔐 <b style={{ letterSpacing: '.1em' }}>{m.senha}</b></span>
                            <button className="btn btn-g btn-sm" style={{ height: 24, padding: '0 8px' }} onClick={() => copyText(m.senha).then(() => toast('Senha copiada'))}>copiar</button>
                            <button className="btn btn-g btn-sm" style={{ height: 24, padding: '0 8px' }} onClick={() => confirm('Gerar uma nova senha? A senha atual deixa de funcionar.') && acao(m, 'nova_senha')}>nova</button>
                          </div>
                        )}
                        {m.sent_at && <div className="muted" style={{ fontSize: 11.5 }}>enviado {dayLabel(m.sent_at)}</div>}
                      </td>
                      <td>{m.leads ? <a href={`/conversas?lead=${m.leads.id}`}>{m.leads.name}</a> : <span className="muted">—</span>}</td>
                      <td style={{ textAlign: 'right' }}>{m.views}</td>
                      <td className="muted">{dayLabel(m.created_at)}</td>
                      <td>
                        <div className="row" style={{ gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <a className="btn btn-p btn-sm" href={`/mapas/${m.id}`}><Icon name="star" />Analisar</a>
                          <button className="btn btn-g btn-sm" onClick={() => { setVer(m); setModoVer('cliente'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Icon name="eye" />Ver</button>
                          <AcoesMapa m={m} acao={acao} podePrivar={!!d?.pode_privar} />
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
        .am-wrap{position:relative;display:inline-block}
        .am-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:40;min-width:280px;background:var(--surface,#fff);border:1px solid var(--line,#e7e3ef);border-radius:14px;box-shadow:0 18px 40px rgba(16,24,40,.18);padding:6px;display:flex;flex-direction:column}
        .am-menu button{display:flex;align-items:center;gap:8px;text-align:left;border:0;background:transparent;padding:8px 10px;border-radius:10px;cursor:pointer;color:var(--ink,#1d1530);font-size:13.5px}
        .am-menu button:hover{background:color-mix(in srgb,var(--ai,#7a5af8) 9%,transparent)}
        .mapa-frame{width:100%;height:560px;border:1px solid var(--line, #e7e3ef);border-radius:14px;background:#fff}
        .mapa-resumo{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-top:12px}
        .mapa-resumo div{border:1px solid var(--line, #e7e3ef);border-radius:10px;padding:8px 10px;background:var(--panel, #fff)}
        .mapa-resumo small{display:block;color:var(--muted);font-size:11.5px}
        .mapa-resumo b{color:var(--accent)}
      `}</style>
    </>
  );
}
