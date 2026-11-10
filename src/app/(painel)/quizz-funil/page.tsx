'use client'
import { useEffect, useState } from 'react'
import { PageHead } from '@/components/PageHead'
import { api, toast } from '@/components/ui'

export default function QuizFunil() {
  const [dias, setDias] = useState(7)
  const [d, setD] = useState<any>(null)
  useEffect(() => { api('/api/quizz/funil?dias=' + dias, 'GET').then(setD).catch((e: any) => toast(e.message)) }, [dias])
  const nome = (n: number) => (n === 1 ? 'País' : n === 2 ? 'Nome, data e gênero' : n === 3 ? 'Análise (barra)' : n >= 4 ? `Ponto ${n - 3}` : '')
  return (
    <div className="page">
      <PageHead title="Funil do Quiz (teste)" sub="Onde as pessoas saem em /quizz. Só contagens anônimas, sem nome nem data" icon="globe" help="conversas" />
      <div className="card">
        <p>Período: {[1, 7, 30].map((x) => <button key={x} className={`btn btn-sm ${dias === x ? '' : 'btn-g'}`} style={{ marginRight: 6 }} onClick={() => setDias(x)}>{x === 1 ? 'Hoje' : x + ' dias'}</button>)}</p>
        {!d ? <p>Carregando…</p> : (
          <>
            <p><b>{d.visitantes}</b> visitantes · <b>{d.cliques_pagar}</b> clicaram em pagar · Brasil {d.idiomas.br} / Espanhol {d.idiomas.es} · Frio {d.faixas.frio} · Morno {d.faixas.morno} · Quente {d.faixas.quente}</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th align="left">Tela</th><th align="right">Chegaram</th><th align="right">Avançaram</th><th align="right">Saíram</th></tr></thead>
              <tbody>{d.telas.map((t: any) => <tr key={t.tela}><td>{t.tela}. {nome(t.tela)}</td><td align="right">{t.chegaram}</td><td align="right">{t.avancaram}</td><td align="right">{t.sairam}</td></tr>)}</tbody>
            </table>
            <p className="muted" style={{ fontSize: 13 }}>A última etapa de cada pessoa é a Oferta. Quem clicou em “Finalizar” pula direto ao pagamento (aparece em cliques em pagar).</p>
          </>
        )}
      </div>
    </div>
  )
}
