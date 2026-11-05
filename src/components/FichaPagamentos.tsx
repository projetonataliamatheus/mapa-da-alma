'use client';
/* Ficha do cliente: país, idioma, origem (site ou não) e todos os pagamentos dele (data, hora, valor, moeda, plataforma). */
import { useEffect, useState } from 'react';
import { Flag, FlagIdioma } from './Flag';
import { brl } from './ui';
import { sb } from '@/lib/supabase/browser';
import { nomePais, paisDoLeadRow } from '@/lib/ddi';
import { metodoDe, moedaDe, usd } from '@/lib/vendas';

const TZ = 'America/Sao_Paulo';
const dh = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const PLAT: Record<string, string> = { kiwify: 'Kiwify', asaas: 'Asaas', stripe: 'Stripe', mercadopago: 'Mercado Pago', manual: 'WhatsApp (manual)' };

export function FichaPagamentos({ lead, className }: { lead: any; className?: string }) {
  const [pgs, setPgs] = useState<any[] | null>(null);
  const [site, setSite] = useState<any>(null);
  useEffect(() => {
    if (!lead?.id) return;
    sb().from('payments').select('id,amount,status,provider,method,moeda,valor_local,paid_at,created_at,provider_id').eq('lead_id', lead.id).order('created_at', { ascending: false }).then(({ data }: any) => setPgs(data || []));
    sb().from('site_leads').select('ref,nome,nascimento,created_at,wa_click_at,checkout_click_at,matched_by').eq('lead_id', lead.id).maybeSingle().then(({ data }: any) => setSite(data || null), () => {});
  }, [lead?.id]);
  const pais = paisDoLeadRow(lead);
  const idioma = lead.idioma || (pais === 'BR' || !pais ? 'pt' : 'es');
  const origem = lead.source === 'site' ? 'Veio do site (teste gratuito)' : lead.source === 'anuncio' ? `Anúncio${lead.campaign ? ` · ${lead.campaign}` : ''}` : lead.source === 'google' ? 'Prospecção (Google)' : 'Direto no WhatsApp';
  return (
    <div className={className || 'sect'}>
      <h3>País, idioma e pagamentos</h3>
      <p style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', margin: '4px 0' }}>
        <span className="flagtxt"><Flag iso={pais} size={22} /> <b>{pais ? nomePais(pais) : 'País não identificado'}</b></span>
        <span className="flagtxt"><FlagIdioma idioma={idioma} size={20} /> <b>{idioma === 'es' ? 'Espanhol' : 'Português (Brasil)'}</b></span>
      </p>
      <p style={{ margin: '4px 0' }}>Origem: <b>{origem}</b></p>
      {site && (
        <p style={{ margin: '4px 0', fontSize: 12.5 }} className="muted">
          Teste no site em {dh(site.created_at)} · código {site.ref}{site.wa_click_at ? ` · clicou no WhatsApp ${dh(site.wa_click_at)}` : ''}{site.checkout_click_at ? ` · clicou em Pagar ${dh(site.checkout_click_at)}` : ''}{site.matched_by ? ` · ligado por ${site.matched_by === 'codigo' ? 'código' : site.matched_by === 'nome_data' ? 'nome e data' : 'clique recente'}` : ''}
        </p>
      )}
      {pgs === null ? <span className="spin" /> : pgs.length === 0 ? <p className="muted" style={{ margin: '6px 0' }}>Nenhum pagamento ainda.</p> : (
        <div className="tablewrap" style={{ marginTop: 6 }}>
          <table className="funnel-t">
            <thead><tr><th>Data e hora</th><th>Valor</th><th>Moeda</th><th>Plataforma</th><th>Forma</th><th>Situação</th></tr></thead>
            <tbody>
              {pgs.map((p) => { const m = moedaDe(p); return (
                <tr key={p.id}>
                  <td>{dh(p.paid_at || p.created_at)}</td>
                  <td><b>{m === 'USD' ? usd(Number(p.valor_local || 0)) : m === 'BRL' ? brl(p.amount) : `${m} ${Number(p.valor_local || 0).toLocaleString('pt-BR')}`}</b></td>
                  <td>{m}</td><td>{PLAT[String(p.provider || '').toLowerCase()] || p.provider || '—'}</td><td>{metodoDe(p)}</td>
                  <td>{p.status === 'pago' ? 'Pago' : p.status === 'pendente' ? 'Pendente' : p.status === 'estornado' ? 'Estornado' : p.status}</td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
