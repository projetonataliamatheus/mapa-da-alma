'use client';
/* Países e preços: atendimento em espanhol (preço na moeda do cliente, link de pagamento por país, Stripe). */
import { useEffect, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { toast, api } from '@/components/ui';

export default function PaisesPage() {
  const [d, setD] = useState<any>(null);
  const [ps, setPs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const load = () => api('/api/paises', 'GET').then((r: any) => { setD(r); setPs(r.paises || []); }).catch((e: any) => toast(e.message));
  useEffect(() => { load(); }, []);
  const set = (i: number, k: string, v: any) => setPs(ps.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  async function salvar(restaurar = false) {
    if (restaurar && !confirm('Voltar para a lista inicial de países e preços?')) return;
    setBusy(true);
    try { await api('/api/paises', 'POST', restaurar ? { restaurar: true } : { paises: ps }); toast('Salvo ✨'); load(); } catch (e: any) { toast(e.message); }
    setBusy(false);
  }
  if (!d) return <div className="page"><PageHead title="Países e preços" sub="Atendimento em espanhol" icon="globe" help="Cada país tem a sua moeda e o seu preço. O sistema escolhe pelo DDI do WhatsApp (+55 Brasil fica em português e em reais)." /><p className="muted">Carregando…</p></div>;
  const st = d.stripe || {};
  return (
    <div className="page">
      <PageHead title="Países e preços" sub="Atendimento em espanhol: o cliente vê o preço na moeda do país dele" icon="globe" help="Cada país tem a sua moeda e o seu preço. O sistema escolhe pelo DDI do WhatsApp (+55 Brasil fica em português e em reais)." />
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Pagamento internacional (Stripe)</h2>
        <p>Chave secreta no Easypanel (STRIPE_SECRET_KEY): <b>{st.chave ? '✅ configurada' : '❌ falta'}</b> · Segredo do webhook (STRIPE_WEBHOOK_SECRET): <b>{st.webhook_secret ? '✅ configurado' : '❌ falta'}</b></p>
        <p className="muted" style={{ fontSize: 13 }}>No painel da Stripe, crie um webhook para o evento <b>checkout.session.completed</b> (e <b>checkout.session.async_payment_succeeded</b>) apontando para: <code>{st.webhook_url}</code>. Sem o Stripe ligado, a IA envia o <b>link manual</b> do país (Mercado Pago, PayPal, Kiwify…) e a equipe confirma o pagamento à mão.</p>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Pagamento pela Kiwify (link manual + aviso automático)</h2>
        <p>Token do webhook (KIWIFY_WEBHOOK_TOKEN no Easypanel): <b>{d.kiwify?.token ? '✅ configurado' : '❌ falta'}</b></p>
        <p className="muted" style={{ fontSize: 13 }}>Na Kiwify, em Apps › Webhooks, crie um webhook do produto “Mapa del Alma completo” com o evento <b>Compra aprovada</b> apontando para <code>{d.kiwify?.webhook_url}</code> e use um token longo e aleatório (o mesmo da variável). Cole o link do checkout em “Link manual” dos países abaixo: o sistema acrescenta o código da cobrança no link e, quando a Kiwify avisar a venda, entrega o mapa sozinho e informa o Meta.</p>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Preço do Mapa completo por país</h2>
        <p className="muted" style={{ fontSize: 13 }}>Os valores iniciais são <b>aproximados</b> (cerca de US$ 10). Revise com o câmbio de hoje. “Valor em R$” é só referência para o financeiro.</p>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', minWidth: 860 }}>
            <thead><tr><th>Ativo</th><th>País</th><th>DDI</th><th>Moeda</th><th>Nome da moeda</th><th>Preço</th><th>≈ R$</th><th>Link manual (opcional)</th></tr></thead>
            <tbody>
              {ps.map((p, i) => (
                <tr key={i}>
                  <td><input type="checkbox" checked={p.ativo !== false} onChange={(e) => set(i, 'ativo', e.target.checked)} /></td>
                  <td><input className="input" style={{ minWidth: 120 }} value={p.nome} onChange={(e) => set(i, 'nome', e.target.value)} /></td>
                  <td><input className="input" style={{ width: 60 }} value={p.ddi} onChange={(e) => set(i, 'ddi', e.target.value)} /></td>
                  <td><input className="input" style={{ width: 70 }} value={p.moeda} onChange={(e) => set(i, 'moeda', e.target.value)} /></td>
                  <td><input className="input" style={{ minWidth: 130 }} value={p.nome_moeda} onChange={(e) => set(i, 'nome_moeda', e.target.value)} /></td>
                  <td><input className="input" style={{ width: 100 }} type="number" value={p.preco} onChange={(e) => set(i, 'preco', e.target.value)} /></td>
                  <td><input className="input" style={{ width: 80 }} type="number" value={p.brl} onChange={(e) => set(i, 'brl', e.target.value)} /></td>
                  <td><input className="input" style={{ minWidth: 200 }} placeholder="https://…" value={p.link || ''} onChange={(e) => set(i, 'link', e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn btn-p" disabled={busy} onClick={() => salvar(false)}>Salvar</button>
          <button className="btn btn-g" disabled={busy} onClick={() => salvar(true)}>Restaurar lista inicial</button>
        </div>
      </div>
    </div>
  );
}
