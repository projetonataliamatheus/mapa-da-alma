'use client'
import { useEffect, useState } from 'react'
import { PageHead } from '@/components/PageHead'
import { api, toast } from '@/components/ui'

export default function QuizFunil() {
  const [dias, setDias] = useState(7)
  const [d, setD] = useState<any>(null)
  useEffect(() => { api('/api/quizz/funil?dias=' + dias, 'GET').then(setD).catch((e: any) => toast(e.message)) }, [dias])
  const NOMES = ['País', 'Nome e data', 'Signo', 'Pergunta 1', 'Pergunta 2', 'Pergunta 3', 'Prévia', 'Leitura', 'Oferta']
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
              <tbody>{d.telas.map((t: any) => <tr key={t.tela}><td>{t.tela}. {NOMES[t.tela - 1]}</td><td align="right">{t.chegaram}</td><td align="right">{t.avancaram}</td><td align="right">{t.sairam}</td></tr>)}</tbody>
            </table>
            <p className="muted" style={{ fontSize: 13 }}>Lead quente pula a tela 8 (Leitura): o número de “avançaram” da Prévia já conta quem foi direto para a Oferta.</p>
          </>
        )}
      </div>
    </div>
  )
}
