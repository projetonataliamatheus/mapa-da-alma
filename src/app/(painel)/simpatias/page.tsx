'use client';
/* Mapa da Alma › Simpatias: biblioteca de simpatias e orações por tema. A IA oferece como carinho e a equipe manda pela conversa. */
import { useEffect, useMemo, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { toast, api, copyText } from '@/components/ui';

const VAZIA = { id: '', tema: 'amor', tipo: 'simpatia', titulo: '', texto: '', ativo: true };

export default function SimpatiasPage() {
  const [d, setD] = useState<any>(null);
  const [tema, setTema] = useState('todos');
  const [ed, setEd] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const load = () => api('/api/simpatias', 'GET').then(setD).catch((e: any) => toast(e.message));
  useEffect(() => { load(); }, []);
  const lista = useMemo(() => (d?.simpatias || []).filter((s: any) => tema === 'todos' || s.tema === tema), [d, tema]);
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/simpatias', 'POST', { action: 'salvar', ...ed });
      toast(ed.id ? 'Simpatia atualizada ✨' : 'Simpatia criada ✨');
      setEd(null);
      load();
    } catch (err: any) {
      toast(err.message);
    }
    setBusy(false);
  }
  async function alternar(s: any) {
    try {
      await api('/api/simpatias', 'POST', { action: 'salvar', ...s, ativo: !s.ativo });
      load();
    } catch (err: any) {
      toast(err.message);
    }
  }
  async function excluir(s: any) {
    if (!confirm(`Excluir "${s.titulo}"?`)) return;
    try {
      await api('/api/simpatias', 'POST', { action: 'excluir', id: s.id });
      load();
    } catch (err: any) {
      toast(err.message);
    }
  }
  const temas: Record<string, string> = d?.temas || {};
  return (
    <>
      <PageHead title="Simpatias" sub="Simpatias e orações para amor, dinheiro, trabalho, saúde, família e proteção" icon="heart" tone="ai" help="mapas" />
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-h">
          <Ib name="heart" tone="ai" size="sm" />
          <h2>Como funciona</h2>
          <div className="sp" />
          <button className="btn btn-p btn-sm" onClick={() => setEd({ ...VAZIA, tema: tema === 'todos' ? 'amor' : tema })}><Icon name="plus" />Nova simpatia</button>
        </div>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          A IA pode oferecer <b>uma</b> simpatia por conversa como um carinho: de presente depois da compra ou quando a pessoa desabafa sobre amor, dinheiro, trabalho, família ou saúde. Ela sempre fala em <b>acalmar, trazer leveza e ajudar a lidar</b>, nunca em resolver ou curar. Na conversa, a equipe também manda qualquer uma pelo botão <b>Simpatia</b>. Simpatias desligadas não são oferecidas.
        </p>
        {d?.aviso && <p style={{ color: 'var(--warn)', fontWeight: 600, marginBottom: 0 }}>{d.aviso}</p>}
      </div>
      <div className="seg" style={{ flexWrap: 'wrap', height: 'auto', marginBottom: 12 }}>
        <button aria-pressed={tema === 'todos'} onClick={() => setTema('todos')}>Todas ({d?.simpatias?.length || 0})</button>
        {Object.entries(temas).map(([k, v]) => <button key={k} aria-pressed={tema === k} onClick={() => setTema(k)}>{v} ({(d?.simpatias || []).filter((s: any) => s.tema === k).length})</button>)}
      </div>
      {!d ? <div className="card"><span className="spin" /></div> : (
        <div className="sp-grid">
          {lista.map((s: any) => (
            <div key={s.id} className={'card sp-card' + (s.ativo ? '' : ' off')}>
              <div className="sp-top">
                <span className="chip">S{s.codigo} · {temas[s.tema] || s.tema}</span>
                <span className="chip" style={{ ['--t' as any]: s.tipo === 'oracao' ? '#7a5af8' : '#d6336a' }}>{s.tipo === 'oracao' ? 'Oração' : 'Simpatia'}</span>
              </div>
              <h3>{s.titulo}</h3>
              <p className="sp-txt">{s.texto}</p>
              <div className="sp-foot">
                <small className="muted">{s.envios || 0} envio(s)</small>
                <div className="sp" />
                <button className="btn btn-g btn-sm" title="Copiar texto" onClick={() => { copyText(`✨ *${s.titulo}*\n\n${s.texto}`); toast('Texto copiado'); }}><Icon name="copy" /></button>
                <button className="btn btn-g btn-sm" onClick={() => setEd({ ...s })}>Editar</button>
                <button className="btn btn-g btn-sm" onClick={() => alternar(s)}>{s.ativo ? 'Desligar' : 'Ligar'}</button>
                <button className="btn btn-g btn-sm" title="Excluir" onClick={() => excluir(s)}><Icon name="trash" /></button>
              </div>
            </div>
          ))}
          {!lista.length && <div className="card muted">Nenhuma simpatia neste tema ainda.</div>}
        </div>
      )}
      {ed && (
        <div className="modal-bg" onClick={() => setEd(null)}>
          <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={salvar} style={{ width: 'min(620px,100%)' }}>
            <div className="card-h"><Ib name="heart" tone="ai" size="sm" /><h2>{ed.id ? 'Editar simpatia' : 'Nova simpatia'}</h2><div className="sp" /><button type="button" className="btn btn-g btn-sm" onClick={() => setEd(null)}><Icon name="x" /></button></div>
            <div className="formgrid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="field"><label>Tema</label><select className="input" value={ed.tema} onChange={(e) => setEd({ ...ed, tema: e.target.value })}>{Object.entries(temas).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="field"><label>Tipo</label><select className="input" value={ed.tipo} onChange={(e) => setEd({ ...ed, tipo: e.target.value })}><option value="simpatia">Simpatia</option><option value="oracao">Oração</option></select></div>
            </div>
            <div className="field"><label>Título</label><input className="input" value={ed.titulo} onChange={(e) => setEd({ ...ed, titulo: e.target.value })} maxLength={140} required /></div>
            <div className="field"><label>Texto (vai assim no WhatsApp)</label><textarea className="input" rows={10} value={ed.texto} onChange={(e) => setEd({ ...ed, texto: e.target.value })} required /></div>
            <p className="muted" style={{ fontSize: 12.5 }}>Evite prometer resultado ("resolve", "cura", "faz voltar"). Em saúde, deixe claro que não substitui o médico.</p>
            <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn btn-g" onClick={() => setEd(null)}>Cancelar</button>
              <button className="btn btn-p" disabled={busy}>{busy ? <span className="spin" /> : <Icon name="check" />}Salvar</button>
            </div>
          </form>
        </div>
      )}
      <style>{`.sp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.sp-card{display:flex;flex-direction:column;gap:6px;margin:0}.sp-card.off{opacity:.55}
.sp-top{display:flex;gap:6px;flex-wrap:wrap}.sp-card h3{margin:4px 0 0;font-size:15px}
.sp-txt{white-space:pre-line;font-size:13px;color:var(--muted);margin:0;max-height:150px;overflow:auto}
.sp-foot{display:flex;align-items:center;gap:6px;margin-top:auto;padding-top:6px;flex-wrap:wrap}
.modal-bg{position:fixed;inset:0;background:rgba(10,6,20,.45);display:grid;place-items:center;z-index:80;padding:16px}.modal{max-height:92vh;overflow:auto}`}</style>
    </>
  );
}
