'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { signoDe, NOME_SIGNO, TRACOS, TEMAS, PERGUNTAS, UI, PAISES, type Lang, type Tema } from './conteudo'

/** Telas: 1 país · 2 dados · 3 signo · 4-6 perguntas · 7 prévia · 8 leitura (só lead frio/morno) · 9 oferta · 10 retorno */
type Tela = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
const TOTAL = 9

function anoCompleto(a: number, cru: string) {
  if (cru.length === 4) return a
  return a <= 26 ? 2000 + a : 1900 + a // 00–26 = 2000–2026 · 27–99 = 1927–1999
}
export function lerData(txt: string): { d: number; m: number; y: number } | null {
  const m = txt.trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/)
  if (!m) return null
  const d = +m[1], mo = +m[2], y = anoCompleto(+m[3], m[3])
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d || dt.getTime() > Date.now()) return null
  return { d, m: mo, y }
}
function maior18({ d, m, y }: { d: number; m: number; y: number }) {
  const hoje = new Date()
  let idade = hoje.getFullYear() - y
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) idade--
  return idade >= 18
}
const pad = (n: number) => String(n).padStart(2, '0')

export default function Quiz({ linkBR, linkUSD }: { linkBR: string; linkUSD: string }) {
  const [tela, setTela] = useState<Tela>(1)
  const [pais, setPais] = useState('')
  const [nome, setNome] = useState('')
  const [dataTxt, setDataTxt] = useState('')
  const [conf, setConf] = useState(false)
  const [err, setErr] = useState('')
  const [pts, setPts] = useState<number[]>([])
  const [tema, setTema] = useState<Tema>('proposito')
  const [fim, setFim] = useState(false)
  const sid = useRef('')
  const lang: Lang = pais === 'BR' ? 'pt' : 'es'
  const t = UI[lang]
  const data = useMemo(() => lerData(dataTxt), [dataTxt])
  const primeiro = nome.trim().split(/\s+/)[0] || ''
  const signo = data ? signoDe(data.d, data.m) : 'aries'
  const total = pts.reduce((a, b) => a + b, 0)
  const quente = pts.length === 3 && total >= 7

  // sessão anônima + tela de retorno (só se voltou depois de clicar em pagar)
  useEffect(() => {
    try {
      sid.current = sessionStorage.getItem('qz_sid') || Math.random().toString(36).slice(2, 12)
      sessionStorage.setItem('qz_sid', sid.current)
      if (/[?&]novo=1/.test(location.search)) localStorage.removeItem('qz_ret')
      const r = localStorage.getItem('qz_ret')
      if (r) { const o = JSON.parse(r); if (o?.n && o?.p) { setNome(o.n); setPais(o.p); setTela(10) } }
    } catch { sid.current = Math.random().toString(36).slice(2, 12) }
  }, [])

  // medição por tela: só sid anônimo, tela, país e faixa de temperatura (nunca nome nem data)
  useEffect(() => {
    if (!sid.current) return
    const faixa = pts.length === 3 ? (total >= 7 ? 'quente' : total >= 5 ? 'morno' : 'frio') : null
    try { navigator.sendBeacon('/api/quizz/evento', new Blob([JSON.stringify({ sid: sid.current, tela, pais: pais || null, tipo: 'tela', faixa })], { type: 'application/json' })) } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tela])

  function avancar() { setErr(''); setTela((x) => (x + 1) as Tela) }

  function confirmarDados() {
    if (nome.trim().split(/\s+/).length < 2 || nome.trim().length < 5) return setErr(t.errNome)
    if (!data) return setErr(t.errData)
    if (!maior18(data)) { setFim(true); return }
    setErr(''); setConf(true)
  }
  function responder(i: number, p: number, th?: Tema) {
    const n = [...pts]; n[i] = p; setPts(n)
    if (th) setTema(th)
    setTela((x) => (x + 1) as Tela)
  }
  function irParaPagar() {
    const base = lang === 'pt' ? linkBR : linkUSD
    try {
      navigator.sendBeacon('/api/quizz/evento', new Blob([JSON.stringify({ sid: sid.current, tela: 9, pais, tipo: 'checkout' })], { type: 'application/json' }))
      localStorage.setItem('qz_ret', JSON.stringify({ n: primeiro, p: pais }))
    } catch {}
    if (!base) return
    const q = new URLSearchParams(location.search); const extra: string[] = ['src=quiz-' + sid.current]
    q.forEach((v, k) => { if (/^utm_/i.test(k)) extra.push(`${encodeURIComponent(k)}=${encodeURIComponent(v.slice(0, 100))}`) })
    location.href = base + (base.includes('?') ? '&' : '?') + extra.join('&')
  }

  const passo = Math.min(tela, TOTAL)
  const pct = tela === 10 ? 100 : Math.round((passo / TOTAL) * 100)
  const perg = PERGUNTAS[lang]
  const dFmt = data ? `${pad(data.d)}/${pad(data.m)}/${data.y}` : ''
  const tracos = TRACOS[lang][signo]
  const tm = TEMAS[lang][tema]

  if (fim) return <Moldura pct={0}><div className="qz"><p className="qz-lead">{t.fim18}</p></div></Moldura>

  return (
    <Moldura pct={pct} rotulo={tela < 10 && pais ? t.progresso(passo, TOTAL) : ''}>
      <div className="qz" key={tela}>
        {tela === 1 && (
          <>
            <h1 className="qz-h">{UI.es.t1} · {UI.pt.t1}</h1>
            <p className="qz-lead">{UI.es.t1s}</p>
            <label className="qz-l" htmlFor="pais">{UI.es.paisQ} / {UI.pt.paisQ}</label>
            <select id="pais" className="qz-i" value={pais} onChange={(e) => setPais(e.target.value)}>
              <option value="">{UI.es.paisPh} / {UI.pt.paisPh}</option>
              {PAISES.map((p) => <option key={p.c} value={p.c}>{p.n}</option>)}
            </select>
            <p className="qz-s">{UI.es.paisSub}</p>
            <button className="btn big" disabled={!pais} onClick={avancar}>{pais === 'BR' ? UI.pt.ctaStart : UI.es.ctaStart}</button>
          </>
        )}

        {tela === 2 && !conf && (
          <>
            <h1 className="qz-h">{t.t1}</h1>
            <label className="qz-l" htmlFor="nome">{t.nomeL}</label>
            <input id="nome" className="qz-i" autoComplete="name" placeholder={t.nomePh} value={nome} onChange={(e) => setNome(e.target.value)} />
            <label className="qz-l" htmlFor="data">{t.dataL}</label>
            <input id="data" className="qz-i" inputMode="numeric" placeholder={t.dataPh} value={dataTxt} onChange={(e) => setDataTxt(e.target.value.replace(/[^\d/.\-]/g, '').slice(0, 10))} />
            <p className="qz-s">{t.consent}</p>
            {err && <p className="qz-e" role="alert">{err}</p>}
            <button className="btn big" onClick={confirmarDados}>{t.ctaNext}</button>
          </>
        )}
        {tela === 2 && conf && (
          <>
            <h1 className="qz-h">{t.confirmT}</h1>
            <div className="qz-box"><b>{nome.trim()}</b><span>{dFmt}</span></div>
            <button className="btn big" onClick={avancar}>{t.ctaConfirm}</button>
            <button className="btn big sec" onClick={() => setConf(false)}>{t.ctaEdit}</button>
          </>
        )}

        {tela === 3 && (
          <>
            <span className="kick">✦ {NOME_SIGNO[lang][signo]}</span>
            <h1 className="qz-h">{t.signoT(primeiro, NOME_SIGNO[lang][signo])}</h1>
            <p className="qz-lead">{t.signoS}</p>
            <button className="btn big" onClick={avancar}>{t.ctaNext}</button>
          </>
        )}

        {(tela === 4 || tela === 5 || tela === 6) && (() => {
          const i = tela - 4
          const p = perg[i]
          return (
            <>
              <h1 className="qz-h">{p.q}</h1>
              <div className="qz-ops">
                {p.ops.map((o) => <button key={o.t} className="qz-op" onClick={() => responder(i, o.pts, o.tema)}>{o.t}</button>)}
              </div>
            </>
          )
        })()}

        {tela === 7 && (
          <>
            <span className="kick">✦ {t.previaT}</span>
            <h1 className="qz-h">{tm.previa.replace('{n}', primeiro)}</h1>
            <p className="qz-lead">{t.previaS}</p>
            <button className="btn big" onClick={() => setTela(quente ? 9 : 8)}>{t.ctaNext}</button>
          </>
        )}

        {tela === 8 && (
          <>
            <h1 className="qz-h">{t.leituraT(primeiro)}</h1>
            <div className="qz-bl"><h3>{t.b1}</h3><p>{tracos[0]}</p><p>{tracos[1]}</p></div>
            <div className="qz-bl"><h3>{t.b2}: {tm.nome}</h3><p>{tm.leitura}</p></div>
            <div className="qz-bl"><h3>{t.b3}</h3><p>{t.b3t}</p></div>
            <button className="btn big" onClick={avancar}>{t.ctaNext}</button>
          </>
        )}

        {tela === 9 && (
          <>
            <h1 className="qz-h">{t.ofertaT}</h1>
            {quente && <p className="qz-lead">{tm.previa.replace('{n}', primeiro)}</p>}
            <div className="price">
              <div className="v">{t.preco}</div>
              <small>{t.precoS}</small>
              <ul>{t.inclui.map((x) => <li key={x}>{x}</li>)}</ul>
              <button className="btn big pulse" onClick={irParaPagar} disabled={!(lang === 'pt' ? linkBR : linkUSD)}>{t.pagar}</button>
              {!(lang === 'pt' ? linkBR : linkUSD) && <p className="qz-s">{t.semLink}</p>}
            </div>
          </>
        )}

        {tela === 10 && (
          <>
            <h1 className="qz-h">{t.volta(primeiro)}</h1>
            <button className="btn big" onClick={() => { try { localStorage.removeItem('qz_ret') } catch {} ; irParaPagar() }}>{t.voltaCta}</button>
          </>
        )}

        <p className="qz-av">{t.aviso}</p>
      </div>
    </Moldura>
  )
}

function Moldura({ pct, rotulo, children }: { pct: number; rotulo?: string; children: React.ReactNode }) {
  return (
    <main className="qz-w">
      <div className="qz-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: pct + '%' }} /></div>
      <div className="qz-top"><span className="logo"><i>✦</i>MAPA DEL ALMA</span>{rotulo ? <span className="qz-rot">{rotulo}</span> : null}</div>
      {children}
    </main>
  )
}
