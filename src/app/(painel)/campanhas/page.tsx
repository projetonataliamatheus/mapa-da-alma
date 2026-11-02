'use client';
/* Inteligência da IA › Campanhas: de onde os contatos vêm (Meta, Google, indicação), mensagem padrão de cada anúncio e resultados. */
import { useEffect, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { toast, api, brl } from '@/components/ui';

const VAZIA = { id: '', nome: '', origem: 'meta', mensagem: '', palavras: '', inicio: new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10), fim: '', ativo: true, fluxo_id: '', verba: '', notas: '' };
const dt = (s?: string | null) => (s ? s.slice(0, 10).split('-').reverse().join('/') : '—');

export default function CampanhasPage() {
  const [d, setD] = useState<any>(null);
  const [ed, setEd] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const load = () => api('/api/campanhas', 'GET').then(setD).catch((e: any) => toast(e.message));
  useEffect(() => { load(); }, []);
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/campanhas', 'POST', { action: 'salvar', ...ed });
      toast(ed.id ? 'Campanha atualizada' : 'Campanha criada: as conversas que chegarem com essa mensagem já são marcadas ✨');
      setEd(null);
      load();
    } catch (err: any) { toast(err.message); }
    setBusy(false);
  }
  async function excluir(c: any) {
    if (!confirm(`Excluir a campanha "${c.nome}"? As conversas continuam, só perdem a ligação com ela.`)) return;
    try { await api('/api/campanhas', 'POST', { action: 'excluir', id: c.id }); load(); } catch (err: any) { toast(err.message); }
  }
  const origens: Record<string, string> = d?.origens || {};
  const total = (d?.campanhas || []).reduce((a: any, c: any) => ({ conversas: a.conversas + c.stats.conversas, vendas: a.vendas + c.stats.vendas, receita: a.receita + c.stats.receita }), { conversas: 0, vendas: 0, receita: 0 });
  return (
    <>
      <PageHead title="Campanhas" sub="De onde os contatos vêm, a mensagem padrão de cada anúncio e quanto cada campanha vende" icon="target" tone="ai" help="abordagens" />
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-h">
          <Ib name="target" tone="ai" size="sm" />
          <h2>Como funciona</h2>
          <div className="sp" />
          <button className="btn btn-p btn-sm" onClick={() => setEd({ ...VAZIA })}><Icon name="plus" />Nova campanha</button>
        </div>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          Cole a <b>mensagem pronta</b> que o anúncio coloca no WhatsApp do cliente (a mesma que você configurou no Meta ou no botão da página do Google). Quando a 1ª mensagem do contato bater com ela (ou com uma das palavras-chave), a conversa é marcada com a campanha, a IA trata como interesse e, se você escolher, roda um <b>fluxo de abertura</b> próprio. Para indicação, use palavras como “indicação”, “me indicou”.
        </p>
        {d?.aviso && <p style={{ color: 'var(--warn)', fontWeight: 600, marginBottom: 0 }}>{d.aviso}</p>}
        {d && !d.aviso && (
          <div className="cp-tot">
            <div><b>{(d.campanhas || []).filter((c: any) => c.ativo).length}</b><small>campanhas ativas</small></div>
            <div><b>{total.conversas}</b><small>conversas de campanha</small></div>
            <div><b>{total.vendas}</b><small>vendas</small></div>
            <div><b>{brl(total.receita)}</b><small>receita</small></div>
            <div><b>{d.semCampanha?.conversas || 0}</b><small>conversas sem campanha</small></div>
          </div>
        )}
      </div>
      {!d ? <div className="card"><span className="spin" /></div> : (
        <div className="cp-grid">
          {(d.campanhas || []).map((c: any) => {
            const conv = c.stats.conversas ? Math.round((c.stats.vendas / c.stats.conversas) * 1000) / 10 : 0;
            const fl = (d.fluxos || []).find((f: any) => f.id === c.fluxo_id);
            return (
              <div key={c.id} className={'card cp-card' + (c.ativo ? '' : ' off')}>
                <div className="cp-top"><span className="chip">{origens[c.origem] || c.origem}</span>{!c.ativo && <span className="chip">pausada</span>}</div>
                <h3>{c.nome}</h3>
                <small className="muted">Início {dt(c.inicio)}{c.fim ? ` · fim ${dt(c.fim)}` : ''}{fl ? ` · fluxo: ${fl.nome}` : ' · fluxo: abertura padrão'}</small>
                {c.mensagem && <p className="cp-msg">“{c.mensagem}”</p>}
                <div className="cp-num">
                  <div><b>{c.stats.conversas}</b><small>conversas</small></div>
                  <div><b>{c.stats.vendas}</b><small>vendas</small></div>
                  <div><b>{conv}%</b><small>conversão</small></div>
                  <div><b>{brl(c.stats.receita)}</b><small>receita</small></div>
                </div>
                {c.verba ? <small className="muted">Verba: {brl(c.verba)}{c.stats.vendas ? ` · custo por venda ${brl(Number(c.verba) / c.stats.vendas)}` : ''}</small> : null}
                <div className="cp-foot"><small className="muted">{c.stats.ultima ? `Última conversa ${dt(c.stats.ultima)}` : 'Nenhuma conversa ainda'}</small><div className="sp" />
                  <button className="btn btn-g btn-sm" onClick={() => setEd({ ...VAZIA, ...c, fim: c.fim || '', fluxo_id: c.fluxo_id || '', verba: c.verba ?? '', palavras: c.palavras || '', notas: c.notas || '' })}>Editar</button>
                  <button className="btn btn-g btn-sm" onClick={() => excluir(c)}><Icon name="trash" /></button>
                </div>
              </div>
            );
          })}
          {!(d.campanhas || []).length && !d.aviso && <div className="card muted">Nenhuma campanha ainda. Crie a primeira com a mensagem pronta do seu anúncio.</div>}
        </div>
      )}
      {ed && (
        <div className="cp-bg" onClick={() => setEd(null)}>
          <form className="card cp-modal" onClick={(e) => e.stopPropagation()} onSubmit={salvar}>
            <div className="card-h"><Ib name="target" tone="ai" size="sm" /><h2>{ed.id ? 'Editar campanha' : 'Nova campanha'}</h2><div className="sp" /><button type="button" className="btn btn-g btn-sm" onClick={() => setEd(null)}><Icon name="x" /></button></div>
            <div className="formgrid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="field" style={{ gridColumn: '1/-1' }}><label>Nome da campanha</label><input className="input" value={ed.nome} onChange={(e) => setEd({ ...ed, nome: e.target.value })} placeholder="Ex.: Reels Mapa da Alma — novembro" required /></div>
              <div className="field"><label>Origem</label><select className="input" value={ed.origem} onChange={(e) => setEd({ ...ed, origem: e.target.value })}>{Object.entries(origens).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="field"><label>Fluxo de abertura</label><select className="input" value={ed.fluxo_id} onChange={(e) => setEd({ ...ed, fluxo_id: e.target.value })}><option value="">Abertura padrão</option>{(d?.fluxos || []).map((f: any) => <option key={f.id} value={f.id}>{f.nome}{f.ativo ? '' : ' (desligado)'}</option>)}</select></div>
              <div className="field" style={{ gridColumn: '1/-1' }}><label>Mensagem padrão do anúncio (o texto que chega pronto no WhatsApp)</label><textarea className="input" rows={3} value={ed.mensagem} onChange={(e) => setEd({ ...ed, mensagem: e.target.value })} placeholder="Ex.: Olá! Quero saber mais sobre o Mapa da Alma." /></div>
              <div className="field" style={{ gridColumn: '1/-1' }}><label>Palavras-chave extras (uma por linha, opcional)</label><textarea className="input" rows={2} value={ed.palavras} onChange={(e) => setEd({ ...ed, palavras: e.target.value })} placeholder={'mapa da alma\nme indicou'} /></div>
              <div className="field"><label>Começou em</label><input className="input" type="date" value={ed.inicio || ''} onChange={(e) => setEd({ ...ed, inicio: e.target.value })} /></div>
              <div className="field"><label>Termina em (opcional)</label><input className="input" type="date" value={ed.fim || ''} onChange={(e) => setEd({ ...ed, fim: e.target.value })} /></div>
              <div className="field"><label>Verba investida (opcional)</label><input className="input" inputMode="decimal" value={ed.verba} onChange={(e) => setEd({ ...ed, verba: e.target.value })} placeholder="R$" /></div>
              <div className="field" style={{ display: 'flex', alignItems: 'flex-end' }}><label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={!!ed.ativo} onChange={(e) => setEd({ ...ed, ativo: e.target.checked })} />Campanha ativa</label></div>
              <div className="field" style={{ gridColumn: '1/-1' }}><label>Anotações</label><textarea className="input" rows={2} value={ed.notas} onChange={(e) => setEd({ ...ed, notas: e.target.value })} placeholder="Público, criativo, onde está rodando…" /></div>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn btn-g" onClick={() => setEd(null)}>Cancelar</button>
              <button className="btn btn-p" disabled={busy}>{busy ? <span className="spin" /> : <Icon name="check" />}Salvar</button>
            </div>
          </form>
        </div>
      )}
      <style>{`.cp-tot{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-top:12px}.cp-tot div{background:var(--bg);border-radius:10px;padding:8px 10px}.cp-tot b{display:block;font-size:18px}.cp-tot small{color:var(--muted);font-size:12px}
.cp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}.cp-card{margin:0;display:flex;flex-direction:column;gap:6px}.cp-card.off{opacity:.6}.cp-card h3{margin:0;font-size:15.5px}
.cp-top{display:flex;gap:6px;flex-wrap:wrap}.cp-msg{font-size:13px;color:var(--muted);margin:0;font-style:italic}
.cp-num{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center}.cp-num b{display:block;font-size:16px}.cp-num small{font-size:11px;color:var(--muted)}
.cp-foot{display:flex;gap:6px;align-items:center;margin-top:auto;padding-top:4px}
.cp-bg{position:fixed;inset:0;background:rgba(10,6,20,.45);display:grid;place-items:center;z-index:80;padding:16px}.cp-modal{width:min(640px,100%);max-height:92vh;overflow:auto}`}</style>
    </>
  );
}
