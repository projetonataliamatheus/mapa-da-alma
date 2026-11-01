'use client';
/* Mapa da Alma › Tarô: tirar as cartas manualmente para um contato (e a IA lê na conversa) + todas as tiragens feitas. */
import { useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { toast, api, copyText } from '@/components/ui';
import { TiragensTaro } from '@/components/TiragensTaro';

export default function TaroPage() {
  const [f, setF] = useState({ phone: '', nome: '', pergunta: '', tipo: '3cartas', enviar: true });
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [v, setV] = useState(0);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  async function tirar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api('/api/tiragens', 'POST', f);
      setRes(r);
      setV(v + 1);
      toast(f.phone && f.enviar ? 'Cartas tiradas e enviadas: a IA faz a leitura na conversa em alguns minutos 🔮' : 'Cartas tiradas: copie o link para enviar');
    } catch (err: any) {
      toast(err.message);
    }
    setBusy(false);
  }
  return (
    <>
      <PageHead title="Tarô" sub="Tirar as cartas para um contato e ver todas as tiragens feitas" icon="spark" tone="ai" help="mapas" />
      <form className="card" onSubmit={tirar} style={{ marginBottom: 16 }}>
        <div className="card-h">
          <Ib name="spark" tone="ai" size="sm" />
          <h2>Tirar as cartas agora</h2>
        </div>
        <div className="formgrid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
          <div className="field">
            <label htmlFor="tr-phone">WhatsApp (opcional)</label>
            <input id="tr-phone" className="input" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="(19) 99999-9999" />
          </div>
          <div className="field">
            <label htmlFor="tr-nome">Nome</label>
            <input id="tr-nome" className="input" value={f.nome} onChange={set('nome')} placeholder="Maria" />
          </div>
          <div className="field">
            <label htmlFor="tr-tipo">Tiragem</label>
            <select id="tr-tipo" className="input" value={f.tipo} onChange={set('tipo')}>
              <option value="3cartas">Passado, Presente e Futuro (3 cartas)</option>
              <option value="cruz">Cruz Celta (10 cartas)</option>
            </select>
          </div>
        </div>
        <div className="field" style={{ marginTop: 8 }}>
          <label htmlFor="tr-perg">Pergunta da pessoa (opcional)</label>
          <input id="tr-perg" className="input" value={f.pergunta} onChange={set('pergunta')} placeholder="Ex.: meu casamento vai melhorar?" />
        </div>
        {f.phone && (
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, marginTop: 8 }}>
            <input type="checkbox" checked={f.enviar} onChange={set('enviar')} />
            Mandar o link no WhatsApp e a IA faz a leitura das cartas na conversa (sem cobrar)
          </label>
        )}
        <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-p" disabled={busy}>{busy ? <span className="spin" /> : <Icon name="spark" />}Tirar as cartas</button>
          {res?.url && (
            <>
              <a className="btn btn-g" href={res.url} target="_blank" rel="noreferrer"><Icon name="eye" />Abrir a tiragem</a>
              <button type="button" className="btn btn-g" onClick={() => copyText(res.url).then(() => toast('Link copiado'))}><Icon name="link" />Copiar link</button>
              {res.lead_id && <a className="btn btn-g" href={`/conversas?lead=${res.lead_id}`}><Icon name="chat" />Ver a conversa</a>}
            </>
          )}
        </div>
      </form>
      <TiragensTaro key={v} />
    </>
  );
}
