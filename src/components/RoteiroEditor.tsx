'use client';
/* Abordagens › Roteiro de atendimento: a base da consulta (a IA segue a ordem e a lógica, com palavras próprias). */
import { useEffect, useState } from 'react';
import { Icon, Ib } from '@/components/Icon';
import { toast, api } from '@/components/ui';
import { ROTEIRO_PADRAO } from '@/lib/mapa-alma/roteiro';

export function RoteiroEditor({ pode }: { pode: boolean }) {
  const [txt, setTxt] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api('/api/settings', 'GET').then((s: any) => setTxt(String(s.roteiro_consulta || '').trim().length > 200 ? s.roteiro_consulta : ROTEIRO_PADRAO)).catch(() => setTxt(ROTEIRO_PADRAO));
  }, []);
  async function salvar(v: string) {
    setBusy(true);
    try {
      await api('/api/settings', 'PATCH', { roteiro_consulta: v === ROTEIRO_PADRAO ? '' : v });
      toast('Roteiro salvo: já vale nas próximas respostas da IA ✨');
    } catch (e: any) { toast(e.message); }
    setBusy(false);
  }
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-h">
        <Ib name="book" tone="ai" size="sm" />
        <h2>Roteiro de atendimento (consulta ao vivo)</h2>
        <div className="sp" />
        <button className="btn btn-g btn-sm" onClick={() => setAberto(!aberto)}>{aberto ? 'Fechar' : 'Ver e editar'}</button>
      </div>
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>É a base de toda conversa: abertura com ar de agenda cheia, pedido do nome de batismo e da data, explicação curta do mapa, leitura direto nos bloqueios das pirâmides pedindo confirmação, um ponto positivo a cada dois negativos, temas de dinheiro, amor e família, oferta (liberado em até 20 minutos) e fechamento. A IA segue a <b>ordem e a lógica</b>, com palavras diferentes em cada conversa.</p>
      {aberto && txt != null && (
        <>
          <textarea className="input" rows={22} style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.5, fontFamily: 'inherit' }} value={txt} disabled={!pode} onChange={(e) => setTxt(e.target.value)} />
          {pode && (
            <div className="row" style={{ gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-g" onClick={() => { if (confirm('Voltar para o roteiro padrão?')) { setTxt(ROTEIRO_PADRAO); salvar(ROTEIRO_PADRAO); } }}><Icon name="refresh" />Padrão</button>
              <button className="btn btn-p" disabled={busy} onClick={() => salvar(txt)}>{busy ? <span className="spin" /> : <Icon name="check" />}Salvar roteiro</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
