'use client';
/* Mapa da Alma › Aparência › Efeitos e cards: o Master escolhe efeito, cores, moldura, largura, ícone e texto de cada card do mapa. */
import { useEffect, useMemo, useState } from 'react';
import { Icon, Ib } from '@/components/Icon';
import { toast, api } from '@/components/ui';
import { EFEITOS, ESTILO_PADRAO, NOMES_CARD, estiloCompleto, estiloCss, type CardId, type EstiloMapa } from '@/lib/mapa-alma/mapa/estilo';

const AMOSTRA = `
<p class="fazer"><b>O QUE FAZER:</b> Assuma projetos em que você tenha autonomia de decisão e peça ajuda sem sentir que isso diminui a sua força.</p>
<div class="lista luz"><h4>Pontos positivos</h4><ul><li>Iniciativa e coragem para começar</li><li>Capacidade natural de liderar</li></ul></div>
<div class="lista sombra"><h4>Pontos de atenção</h4><ul><li>Impaciência com o ritmo dos outros</li><li>Querer controlar tudo sozinho(a)</li></ul></div>
<div class="lista conselho"><h4>O que você deve fazer</h4><ul><li>Escolha um projeto parado e dê o primeiro passo</li></ul></div>
<div class="plano"><h4>O que fazer: seu plano prático</h4><p><b>Comece nos próximos 7 dias:</b> escolha UM projeto parado e defina hoje o primeiro passo concreto.</p><p class="pl-frase">“A coragem abre o caminho.”</p></div>`;

const BASE = `body{margin:0;padding:16px;font-family:Inter,Arial,sans-serif;color:#241a33;background:#fbf8ff;line-height:1.6;font-size:15px}
.lista{margin:14px 0;border-radius:14px;padding:12px 16px 10px;border:1.5px solid #e7dcf5}.lista h4{margin:0 0 6px;font-size:14px;text-transform:uppercase;letter-spacing:.05em;display:flex;align-items:center;gap:8px}
.lista h4::before{width:22px;height:22px;border-radius:50%;display:inline-grid;place-items:center;color:#fff;font-size:13px;flex:none}.lista ul{margin:0;padding-left:20px}
.plano{margin:16px 0 8px;border:2px solid #b89cf0;border-radius:14px;padding:14px 18px}.plano h4{margin:0 0 6px;font-size:14px;text-transform:uppercase;letter-spacing:.05em}.plano p{margin:4px 0}.pl-frase{text-align:center;font-family:Georgia,serif}
.fazer{padding:12px 16px;margin:12px 0}`;

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="ec-campo"><span>{label}</span>{children}</label>;
}

export function EstiloCards() {
  const [est, setEst] = useState<EstiloMapa | null>(null);
  const [card, setCard] = useState<CardId>('fazer');
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    api('/api/settings', 'GET').then((s: any) => setEst(estiloCompleto(s.mapa_estilo))).catch((e: any) => toast(e.message));
  }, []);
  const doc = useMemo(() => (est ? `<!doctype html><html><head><meta charset="utf-8"><style>${BASE}${estiloCss(est, true)}</style></head><body>${AMOSTRA}<script>setTimeout(function(){document.querySelectorAll('.fazer,.plano,.lista').forEach(function(e){e.classList.add('mf-vis')})},400)</script></body></html>` : ''), [est]);
  if (!est) return <div className="card" style={{ marginTop: 16 }}><span className="spin" /></div>;
  const c = est.cards[card];
  const set = (k: string, v: any) => setEst({ ...est, cards: { ...est.cards, [card]: { ...c, [k]: v } } });
  async function salvar() {
    setSalvando(true);
    try {
      await api('/api/settings', 'PATCH', { mapa_estilo: est });
      toast('Estilo dos cards salvo: já vale no link publicado ✨ (PDFs novos também)');
    } catch (e: any) {
      toast(e.message);
    } finally {
      setSalvando(false);
    }
  }
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <style>{EC_CSS}</style>
      <div className="card-h">
        <Ib name="spark" tone="ai" size="sm" />
        <h2>Efeitos e cards do mapa</h2>
        <div className="sp" />
        <button className="btn btn-g btn-sm" onClick={() => { if (confirm('Voltar este card para o padrão?')) setEst({ ...est, cards: { ...est.cards, [card]: ESTILO_PADRAO.cards[card] } }); }}><Icon name="refresh" />Padrão deste card</button>
        <button className="btn btn-p btn-sm" disabled={salvando} onClick={salvar}>{salvando ? <span className="spin" /> : <Icon name="check" />}Salvar</button>
      </div>
      <div className="seg" style={{ flexWrap: 'wrap', height: 'auto', marginBottom: 12 }}>
        {(Object.keys(NOMES_CARD) as CardId[]).map((k) => <button key={k} aria-pressed={k === card} onClick={() => setCard(k)}>{NOMES_CARD[k]}</button>)}
      </div>
      <div className="ec-grid">
        <div className="ec-form">
          <Campo label="Efeito (20 opções)">
            <select className="input" value={c.efeito} onChange={(e) => set('efeito', e.target.value)}>
              {EFEITOS.map((f, i) => <option key={f.id} value={f.id}>{i + 1}. {f.nome}</option>)}
            </select>
          </Campo>
          <Campo label={`Velocidade do efeito: ${c.duracao}s`}><input type="range" min={0.6} max={10} step={0.2} value={c.duracao} onChange={(e) => set('duracao', Number(e.target.value))} /></Campo>
          <div className="ec-cores">
            <Campo label="Moldura 1"><input type="color" value={c.cor1} onChange={(e) => set('cor1', e.target.value)} /></Campo>
            <Campo label="Moldura 2 / destaque"><input type="color" value={c.cor2} onChange={(e) => set('cor2', e.target.value)} /></Campo>
            <Campo label="Fundo 1"><input type="color" value={c.fundo1} onChange={(e) => set('fundo1', e.target.value)} /></Campo>
            <Campo label="Fundo 2"><input type="color" value={c.fundo2} onChange={(e) => set('fundo2', e.target.value)} /></Campo>
            <Campo label="Texto"><input type="color" value={c.texto} onChange={(e) => set('texto', e.target.value)} /></Campo>
          </div>
          <Campo label={`Espessura da moldura: ${c.borda}px`}><input type="range" min={0} max={8} step={0.5} value={c.borda} onChange={(e) => set('borda', Number(e.target.value))} /></Campo>
          <Campo label={`Cantos arredondados: ${c.raio}px`}><input type="range" min={0} max={30} step={1} value={c.raio} onChange={(e) => set('raio', Number(e.target.value))} /></Campo>
          <Campo label={`Largura do card: ${c.largura}%`}><input type="range" min={60} max={100} step={1} value={c.largura} onChange={(e) => set('largura', Number(e.target.value))} /></Campo>
          <div className="ec-cores">
            <Campo label="Ícone"><input className="input" value={c.icone} maxLength={3} onChange={(e) => set('icone', e.target.value)} style={{ width: 70, textAlign: 'center', fontSize: 18 }} /></Campo>
            <Campo label="Sugestões">
              <span className="ec-icones">{['✦', '✓', '!', '★', '🌟', '💜', '🔮', '🌙', '✨', '☀', '❤', '⚠', '👉', '🙏'].map((i) => <button key={i} type="button" onClick={() => set('icone', i)}>{i}</button>)}</span>
            </Campo>
          </div>
          <Campo label={`Tamanho da letra: ${c.tamanho}%`}><input type="range" min={80} max={140} step={2} value={c.tamanho} onChange={(e) => set('tamanho', Number(e.target.value))} /></Campo>
          <div className="ec-cores">
            <Campo label="Negrito"><input type="checkbox" checked={c.negrito} onChange={(e) => set('negrito', e.target.checked)} /></Campo>
            <Campo label="Alinhamento">
              <select className="input" value={c.alinhamento} onChange={(e) => set('alinhamento', e.target.value)}>
                <option value="left">À esquerda</option><option value="center">Centralizado</option><option value="justify">Justificado</option>
              </select>
            </Campo>
          </div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>Prévia ao vivo (todos os cards, com o que está escolhido agora)</div>
          <iframe title="Prévia dos cards" className="ec-prev" srcDoc={doc} />
        </div>
      </div>
    </div>
  );
}

const EC_CSS = `
.ec-grid{display:grid;grid-template-columns:minmax(260px,1fr) 1.2fr;gap:18px}
@media (max-width:900px){.ec-grid{grid-template-columns:1fr}}
.ec-form{display:flex;flex-direction:column;gap:10px}
.ec-campo{display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--muted)}
.ec-campo input[type=range]{width:100%;accent-color:var(--ai)}
.ec-campo input[type=color]{width:46px;height:32px;border:1px solid var(--line);border-radius:8px;padding:2px;background:var(--surface)}
.ec-cores{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end}
.ec-icones{display:flex;flex-wrap:wrap;gap:4px}.ec-icones button{width:32px;height:32px;border:1px solid var(--line);border-radius:8px;background:var(--surface);cursor:pointer;font-size:15px}
.ec-prev{width:100%;height:620px;border:1px solid var(--line);border-radius:14px;background:#fbf8ff}
`;
