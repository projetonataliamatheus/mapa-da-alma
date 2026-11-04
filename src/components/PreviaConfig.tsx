'use client';
/* Gerador de mapas › Prévia com bloqueios: faixa de urgência (topo e rodapé), textos do cadeado, valor e proteção. Só o Master altera. */
import { useEffect, useState } from 'react';
import { Icon, Ib } from '@/components/Icon';
import { toast, api } from '@/components/ui';

const mm = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

export function PreviaConfig({ master }: { master: boolean }) {
  const [d, setD] = useState<any>(null);
  const [c, setC] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState(0);
  const [tick, setTick] = useState(0);
  useEffect(() => { api('/api/previa', 'GET').then((r) => { setD(r); setC(r.cfg); }).catch((e: any) => toast(e.message)); }, []);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  if (!c) return <div className="card"><span className="spin" /></div>;
  const set = (k: string, val: any) => setC({ ...c, [k]: val });
  async function salvar() {
    setBusy(true);
    try { await api('/api/settings', 'PATCH', { previa_mapa: c }); toast('Aplicado: o link de visualização atualiza sozinho em poucos segundos ✨'); setV(v + 1); } catch (e: any) { toast(e.message); }
    setBusy(false);
  }
  const vars: any = { '--pv-bg': c.cor_fundo, '--pv-tx': c.cor_texto, '--pv-bd': c.cor_borda, '--pv-fs': c.fonte_px + 'px', '--pv-lh': c.altura_linha, '--pv-pad': c.espaco_px + 'px', '--pv-int': c.piscar / 100, '--pv-vel': c.velocidade + 's' };
  const Num = ({ k, label, min, max, step = 1 }: any) => (
    <div className="field"><label>{label}: <b>{c[k]}</b></label><input type="range" min={min} max={max} step={step} value={c[k]} disabled={!master} onChange={(e) => set(k, Number(e.target.value))} /></div>
  );
  const Cor = ({ k, label }: any) => (
    <div className="field"><label>{label}</label><div style={{ display: 'flex', gap: 6 }}><input type="color" value={c[k]} disabled={!master} onChange={(e) => set(k, e.target.value)} style={{ width: 44, height: 36, padding: 0, border: 0 }} /><input className="input" value={c[k]} disabled={!master} onChange={(e) => set(k, e.target.value)} /></div></div>
  );
  return (
    <div className="pvc">
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-h"><Ib name="lock" tone="ai" size="sm" /><h2>Prévia do mapa com bloqueios</h2><div className="sp" />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={!!c.ativo} disabled={!master} onChange={(e) => set('ativo', e.target.checked)} />Ligada</label></div>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          O cliente abre o <b>mapa inteiro</b>, mas só as seções que a IA já comentou ficam completas; o resto mostra só um pedacinho, com cadeado, o valor e a faixa de urgência com contagem regressiva (começa quando ele abre o link). Passado o tempo, a prévia expira e a equipe pode renovar na conversa. Tentativas de copiar, imprimir ou baixar mostram o aviso de prévia bloqueada. (Print de tela no celular não dá para impedir por completo.) {!master && <b>Só o Master altera.</b>}
        </p>
      </div>
      <div className="pvc-grid">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Faixa de urgência</h3>
          <div className="field"><label>Frase (a contagem entra no fim)</label><textarea className="input" rows={2} value={c.texto} disabled={!master} onChange={(e) => set('texto', e.target.value)} /></div>
          <div className="formgrid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field"><label>Minutos até expirar</label><input className="input" type="number" min={1} max={1440} value={c.minutos} disabled={!master} onChange={(e) => set('minutos', Number(e.target.value))} /></div>
            <div className="field"><label>Onde aparece</label><div style={{ display: 'flex', gap: 12 }}><label><input type="checkbox" checked={!!c.topo} disabled={!master} onChange={(e) => set('topo', e.target.checked)} /> Topo</label><label><input type="checkbox" checked={!!c.rodape} disabled={!master} onChange={(e) => set('rodape', e.target.checked)} /> Rodapé</label></div></div>
            <Cor k="cor_fundo" label="Cor de fundo" /><Cor k="cor_texto" label="Cor do texto" /><Cor k="cor_borda" label="Cor da borda e do brilho" />
            <Num k="piscar" label="Intensidade do pisca (0 = fixo)" min={0} max={100} /><Num k="velocidade" label="Segundos por pisca" min={0.4} max={6} step={0.1} />
            <Num k="fonte_px" label="Tamanho da letra (px)" min={9} max={28} /><Num k="altura_linha" label="Altura da linha" min={1} max={2.4} step={0.05} />
            <Num k="espaco_px" label="Espaço de cima e de baixo (px)" min={0} max={30} />
          </div>
          <div style={{ marginTop: 8, border: '1px solid var(--line,#e5e0ee)', borderRadius: 10, overflow: 'hidden', ...vars }}>
            <style>{`.pvx{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;text-align:center;background:var(--pv-bg);color:var(--pv-tx);border:0 solid var(--pv-bd);border-bottom-width:2px;font:700 var(--pv-fs)/var(--pv-lh) system-ui,Arial,sans-serif;padding:var(--pv-pad) 12px;animation:pvx var(--pv-vel) ease-in-out infinite}.pvx b{background:var(--pv-tx);color:var(--pv-bg);border-radius:6px;padding:0 8px;font-variant-numeric:tabular-nums}@keyframes pvx{0%,100%{filter:none;box-shadow:none}50%{filter:saturate(calc(1 + var(--pv-int)*1.2)) brightness(calc(1 - var(--pv-int)*.07));box-shadow:0 0 calc(var(--pv-int)*22px) calc(var(--pv-int)*3px) var(--pv-bd)}}`}</style>
            <div className="pvx">{c.texto} <b>{mm(c.minutos * 60000 - (tick % (c.minutos * 60)) * 1000)}</b></div>
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Cadeado, valor e proteção</h3>
          <Num k="amostra_chars" label="Texto liberado em cada seção bloqueada (caracteres)" min={150} max={2500} step={50} />
          <div className="field"><label>Título do cadeado</label><input className="input" value={c.titulo_cadeado} disabled={!master} onChange={(e) => set('titulo_cadeado', e.target.value)} /></div>
          <div className="formgrid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field"><label>Valor</label><input className="input" value={c.preco} disabled={!master} onChange={(e) => set('preco', e.target.value)} /></div>
            <div className="field"><label>Nota do valor</label><input className="input" value={c.preco_nota} disabled={!master} onChange={(e) => set('preco_nota', e.target.value)} /></div>
          </div>
          <div className="field"><label>Mensagem do cadeado</label><textarea className="input" rows={2} value={c.msg_cadeado} disabled={!master} onChange={(e) => set('msg_cadeado', e.target.value)} /></div>
          <div className="field"><label>Mensagem "vale para a vida toda"</label><textarea className="input" rows={2} value={c.msg_vida} disabled={!master} onChange={(e) => set('msg_vida', e.target.value)} /></div>
          <div className="field"><label>Aviso ao tentar copiar, imprimir ou baixar</label><input className="input" value={c.msg_bloqueio} disabled={!master} onChange={(e) => set('msg_bloqueio', e.target.value)} /></div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '6px 0 12px' }}><input type="checkbox" checked={!!c.proteger} disabled={!master} onChange={(e) => set('proteger', e.target.checked)} />Bloquear copiar, selecionar, imprimir e menu do botão direito</label>
          {master && <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-p" disabled={busy} onClick={salvar}>{busy ? <span className="spin" /> : <Icon name="check" />}Aplicar</button><button className="btn btn-g" onClick={() => setC({ ...d.padrao })}>Restaurar padrão</button></div>}
        </div>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-h"><h3 style={{ margin: 0 }}>Visualização ao vivo{d?.exemplo ? ` (mapa de ${String(d.exemplo.nome).split(' ')[0]})` : ''}</h3><div className="sp" />{d?.exemplo && <a className="btn btn-g btn-sm" href={`/mapa/${d.exemplo.slug}?previa=1`} target="_blank" rel="noreferrer"><Icon name="eye" />Abrir em outra aba</a>}</div>
        {d?.exemplo ? <iframe key={v} src={`/mapa/${d.exemplo.slug}?previa=1`} style={{ width: '100%', height: 560, border: '1px solid var(--line,#e5e0ee)', borderRadius: 12 }} title="Prévia ao vivo" /> : <p className="muted">Crie um mapa na aba Mapas para ver a prévia aqui.</p>}
      </div>
      <style>{`.pvc-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:900px){.pvc-grid{grid-template-columns:1fr}}`}</style>
    </div>
  );
}
