'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { UI, PAISES, type Lang } from './textos'

type Teaser = {
  numeros: { rotulo: string; valor: string }[]
  nascimentoTxt: { dia: string; titulo: string; texto: string[] }
  signoTxt: { nome: string; texto: string[] }
  triangulos: { id: string; nome: string; linhas: number[][]; arcano: string; arcanoTexto: string; sequencias: { codigo: string; texto: string }[] }[]
  sombras: string[]
  financeiro: string[]
}
type Bloco = { titulo: string; linhas?: number[][]; arcano?: string; arcanoTexto?: string; itens?: { cod?: string; txt: string }[]; chips?: string[] }

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const pad = (n: number) => String(n).padStart(2, '0')

export function lerData(txt: string): { d: number; m: number; y: number } | null {
  const m = txt.trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/)
  if (!m) return null
  const a = +m[3], y = m[3].length === 4 ? a : a <= 26 ? 2000 + a : 1900 + a // 00–26 = 2000–2026 · 27–99 = 1927–1999
  const d = +m[1], mo = +m[2]
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d || dt.getTime() > Date.now()) return null
  return { d, m: mo, y }
}
function maior18({ d, m, y }: { d: number; m: number; y: number }) {
  const h = new Date(); let idade = h.getFullYear() - y
  if (h.getMonth() + 1 < m || (h.getMonth() + 1 === m && h.getDate() < d)) idade--
  return idade >= 18
}

function Piramide({ linhas }: { linhas: number[][] }) {
  return (
    <div className="pir" aria-hidden="true">
      {linhas.map((l, i) => <div className="pir-r" key={i} style={{ animationDelay: `${i * 90}ms` }}>{l.map((n, k) => <span key={k}>{n}</span>)}</div>)}
    </div>
  )
}

/** Monta até 4 "sinais" (pontos de atenção) com o que o mapa real trouxe. */
function montarBlocos(t: Teaser, L: (typeof UI)['es']): Bloco[] {
  const tri = (i: number): Bloco | null => {
    const g = t.triangulos[i]; if (!g) return null
    const itens = g.sequencias.slice(0, 2).map((s) => ({ cod: s.codigo, txt: cap(s.texto) }))
    return { titulo: g.nome, linhas: g.linhas, arcano: g.arcano, arcanoTexto: g.arcanoTexto, itens }
  }
  const din: Bloco | null = t.financeiro.length ? { titulo: L.dinT, itens: t.financeiro.slice(0, 4).map((x) => ({ txt: cap(x) })) } : null
  const som: Bloco | null = t.sombras.length ? { titulo: L.sombrasT, chips: t.sombras.slice(0, 8) } : null
  return [tri(0), tri(1), din, som, tri(2), tri(3)].filter(Boolean).slice(0, 4) as Bloco[]
}

export default function Quiz({ linkBR, linkUSD }: { linkBR: string; linkUSD: string }) {
  const [i, setI] = useState(0)                 // índice da etapa
  const [pais, setPais] = useState('')
  const [nome, setNome] = useState('')
  const [dataTxt, setDataTxt] = useState('')
  const [conf, setConf] = useState(false)
  const [err, setErr] = useState('')
  const [fim, setFim] = useState(false)
  const [mapa, setMapa] = useState<{ nombre: string; teaser: Teaser } | null>(null)
  const [prog, setProg] = useState(0)
  const [resp, setResp] = useState<number[]>([])
  const [retorno, setRetorno] = useState(false)
  const sid = useRef('')
  const rodou = useRef(false)

  const lang: Lang = pais === 'BR' ? 'pt' : 'es'
  const L = UI[lang]
  const data = useMemo(() => lerData(dataTxt), [dataTxt])
  const primeiro = (mapa?.nombre || nome).trim().split(/\s+/)[0] || ''
  const blocos = useMemo(() => (mapa ? montarBlocos(mapa.teaser, L) : []), [mapa, L])
  // etapas: país · dados · análise · números · signo · sinais (até 4) · oferta
  const etapas = useMemo(() => ['pais', 'dados', 'analise', 'numeros', 'signo', ...blocos.map((_, k) => 'sinal' + k), 'oferta'], [blocos])
  const et = retorno ? 'retorno' : etapas[i] || 'pais'
  const total = etapas.length
  const soma = resp.reduce((a, b) => a + b, 0)
  const media = resp.length ? soma / resp.length : 2
  const faixa = media >= 2.4 ? 'quente' : media <= 1.6 ? 'frio' : 'morno'

  useEffect(() => {
    try {
      sid.current = sessionStorage.getItem('qz_sid') || Math.random().toString(36).slice(2, 12)
      sessionStorage.setItem('qz_sid', sid.current)
      if (/[?&]novo=1/.test(location.search)) localStorage.removeItem('qz_ret')
      const r = localStorage.getItem('qz_ret')
      if (r) { const o = JSON.parse(r); if (o?.n && o?.p) { setNome(o.n); setPais(o.p); setRetorno(true) } }
    } catch { sid.current = Math.random().toString(36).slice(2, 12) }
  }, [])

  // medição por etapa: só código anônimo, número da etapa, país e faixa (nunca nome nem data)
  useEffect(() => {
    if (!sid.current) return
    const tela = retorno ? 11 : i + 1
    try { navigator.sendBeacon('/api/quizz/evento', new Blob([JSON.stringify({ sid: sid.current, tela, pais: pais || null, tipo: 'tela', faixa: resp.length ? faixa : null })], { type: 'application/json' })) } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, retorno])

  // etapa de análise: chama o gerador do mapa de verdade e mostra a "busca" com barra e passos
  useEffect(() => {
    if (et !== 'analise' || rodou.current) return
    rodou.current = true
    setProg(0)
    const t0 = Date.now()
    const MIN = 13000
    let alvo = 0
    const timer = setInterval(() => {
      const dec = Date.now() - t0
      alvo = Math.min(92, (dec / MIN) * 92)
      setProg((p) => Math.max(p, Math.min(alvo, p + 2.2)))
    }, 180)
    const fd = data ? `${pad(data.d)}/${pad(data.m)}/${data.y}` : ''
    fetch('/api/quizz/mapa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: nome, fecha: fd, idioma: lang }) })
      .then(async (r) => ({ ok: r.ok, j: await r.json().catch(() => ({})) }))
      .then(async ({ ok, j }) => {
        const falta = MIN - (Date.now() - t0)
        if (falta > 0) await new Promise((x) => setTimeout(x, falta))
        clearInterval(timer)
        if (!ok || !j?.teaser) { setErr(j?.error || L.analErr); setConf(false); setI(1); rodou.current = false; return }
        setProg(100)
        setMapa({ nombre: j.nombre, teaser: j.teaser })
        await new Promise((x) => setTimeout(x, 700))
        setI(3)
      })
      .catch(() => { clearInterval(timer); setErr(L.analErr); setConf(false); setI(1); rodou.current = false })
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [et])

  const avancar = () => { setErr(''); setI((x) => x + 1) }
  function confirmar() {
    if (nome.trim().split(/\s+/).length < 2 || nome.trim().length < 5) return setErr(L.errNome)
    if (!data) return setErr(L.errData)
    if (!maior18(data)) return setFim(true)
    setErr(''); setConf(true)
  }
  const responder = (v: number) => { setResp((r) => [...r, v]); setI((x) => x + 1) }
  const base = lang === 'pt' ? linkBR : linkUSD
  function pagar() {
    try {
      navigator.sendBeacon('/api/quizz/evento', new Blob([JSON.stringify({ sid: sid.current, tela: total, pais, tipo: 'checkout' })], { type: 'application/json' }))
      localStorage.setItem('qz_ret', JSON.stringify({ n: primeiro, p: pais }))
    } catch {}
    if (!base) return
    const q = new URLSearchParams(location.search); const ex = ['src=quiz-' + sid.current]
    q.forEach((v, k) => { if (/^utm_/i.test(k)) ex.push(`${encodeURIComponent(k)}=${encodeURIComponent(v.slice(0, 100))}`) })
    location.href = base + (base.includes('?') ? '&' : '?') + ex.join('&')
  }

  const pct = et === 'retorno' ? 100 : et === 'analise' ? Math.round(((2 + prog / 100) / total) * 100) : Math.round(((i + 1) / total) * 100)
  const rot = pais && et !== 'retorno' && et !== 'analise' ? L.passo(Math.min(i + 1, total), total) : ''
  const nums = mapa?.teaser.numeros.slice(0, 3) || []
  const bi = et.startsWith('sinal') ? Number(et.slice(5)) : -1
  const b = bi >= 0 ? blocos[bi] : null
  const topo = useMemo(() => {
    // bloco que mais "soou" (só aparece na oferta)
    let k = -1, v = 0; resp.forEach((x, n) => { if (x > v) { v = x; k = n } })
    return k >= 0 && v >= 2 ? blocos[k]?.titulo : ''
  }, [resp, blocos])

  if (fim) return <Moldura pct={0}><div className="qz"><p className="qz-lead">{L.fim18}</p></div></Moldura>

  return (
    <Moldura pct={pct} rotulo={rot}>
      <div className="qz" key={et}>
        {et === 'pais' && (
          <>
            <h1 className="qz-h">{UI.es.h1} · {UI.pt.h1}</h1>
            <p className="qz-lead">{UI.es.h1s}</p>
            <label className="qz-l" htmlFor="pais">{UI.es.paisQ} / {UI.pt.paisQ}</label>
            <select id="pais" className="qz-i" value={pais} onChange={(e) => setPais(e.target.value)}>
              <option value="">— / —</option>
              {PAISES.map((p) => <option key={p.c} value={p.c}>{p.n}</option>)}
            </select>
            <p className="qz-s">{UI.es.paisSub}</p>
            <button className="btn big" disabled={!pais} onClick={avancar}>{pais === 'BR' ? UI.pt.start : UI.es.start}</button>
          </>
        )}

        {et === 'dados' && !conf && (
          <>
            <h1 className="qz-h">{L.h1}</h1>
            <label className="qz-l" htmlFor="nome">{L.nomeL}</label>
            <input id="nome" className="qz-i" autoComplete="name" placeholder={L.nomePh} value={nome} onChange={(e) => setNome(e.target.value)} />
            <label className="qz-l" htmlFor="data">{L.dataL}</label>
            <input id="data" className="qz-i" inputMode="numeric" placeholder={L.dataPh} value={dataTxt} onChange={(e) => setDataTxt(e.target.value.replace(/[^\d/.\-]/g, '').slice(0, 10))} />
            <p className="qz-s">{L.consent}</p>
            {err && <p className="qz-e" role="alert">{err}</p>}
            <button className="btn big" onClick={confirmar}>{L.next}</button>
          </>
        )}
        {et === 'dados' && conf && (
          <>
            <h1 className="qz-h">{L.confirmT}</h1>
            <div className="qz-box"><b>{nome.trim()}</b><span>{data ? `${pad(data.d)}/${pad(data.m)}/${data.y}` : ''}</span></div>
            <button className="btn big" onClick={avancar}>{L.confirm}</button>
            <button className="btn big sec" onClick={() => setConf(false)}>{L.edit}</button>
          </>
        )}

        {et === 'analise' && (
          <div className="an qz-an" role="status" aria-live="polite">
            <div className="an-orb"><i /><i /><i /><b>🔍</b></div>
            <h3>{L.analT}</h3>
            <div className="qz-pb" aria-hidden="true"><i style={{ width: prog + '%' }} /></div>
            <div className="qz-pn">{Math.round(prog)}%</div>
            <ul className="an-l">
              {L.passos.map((p, k) => {
                const ativo = Math.min(L.passos.length - 1, Math.floor((prog / 100) * L.passos.length))
                return <li key={p} className={k < ativo ? 'ok' : k === ativo ? 'now' : ''}><span>{k < ativo ? '✓' : k === ativo ? '🔎' : '·'}</span>{p}</li>
              })}
            </ul>
          </div>
        )}

        {et === 'numeros' && mapa && (
          <>
            <h1 className="qz-h">{L.numsT(primeiro)}</h1>
            <div className="nums">
              {nums.map((n, k) => <div key={k} className="qz-num" style={{ animationDelay: `${k * 350}ms` }}><small>{L.numsL[k] || n.rotulo}</small><b>{n.valor}</b></div>)}
            </div>
            <div className="qz-bl"><h3>{L.numsDia} · {mapa.teaser.nascimentoTxt.dia}</h3>
              <p className="em">{mapa.teaser.nascimentoTxt.titulo}</p>
              {mapa.teaser.nascimentoTxt.texto.slice(0, 2).map((p, k) => <p key={k}>{p}</p>)}</div>
            <button className="btn big" onClick={avancar}>{L.next}</button>
          </>
        )}

        {et === 'signo' && mapa && (
          <>
            <span className="kick">☾ {mapa.teaser.signoTxt.nome}</span>
            <h1 className="qz-h">{L.signoT(mapa.teaser.signoTxt.nome)}</h1>
            {mapa.teaser.signoTxt.texto.slice(0, 2).map((p, k) => <p key={k} className="qz-lead" style={{ fontSize: 16 }}>{p}</p>)}
            <p className="qz-s">{L.signoS}</p>
            <button className="btn big" onClick={avancar}>{L.next}</button>
          </>
        )}

        {b && (
          <>
            <span className="kick">⚠ {L.sinal(bi + 1, blocos.length)}</span>
            <h1 className="qz-h">{b.titulo}</h1>
            {b.linhas && <Piramide linhas={b.linhas} />}
            {b.arcano && <p className="qz-lead" style={{ fontSize: 15 }}><b>{L.arc}: {b.arcano}.</b> {b.arcanoTexto}</p>}
            {b.itens?.map((s, k) => <p className="seq" key={k}>{s.cod ? <b>{L.sec} {s.cod}</b> : null}{s.txt}</p>)}
            {b.chips && <div className="chips" style={{ marginBottom: 14 }}>{b.chips.map((c, k) => <span key={k}>{c}</span>)}</div>}
            <p className="qz-q">{L.ressoa}</p>
            <div className="qz-3"><button className="qz-op" onClick={() => responder(3)}>{L.r3}</button><button className="qz-op" onClick={() => responder(2)}>{L.r2}</button><button className="qz-op" onClick={() => responder(1)}>{L.r1}</button></div>
          </>
        )}

        {et === 'oferta' && (
          <>
            <h1 className="qz-h">{L.ofT(primeiro, blocos.length)}</h1>
            {topo && <p className="qz-lead" style={{ marginBottom: 10 }}>{L.ofTop(topo)}</p>}
            <p className="qz-lead">{faixa === 'quente' ? L.ofQuente : faixa === 'frio' ? L.ofFrio : L.ofMorno}</p>
            <div className="lock"><div className="lock-b" aria-hidden="true"><p>{L.lock}</p><p>{L.lock}</p></div>
              <div className="lock-c" style={{ padding: '26px 18px' }}>
                <span className="lk">🔒</span>
                <div className="price" style={{ width: '100%', padding: '22px 16px' }}>
                  <div className="v" style={{ fontSize: 48 }}>{L.preco}</div>
                  <small>{L.precoS}</small>
                  <ul>{L.inclui.map((x) => <li key={x}>{x}</li>)}</ul>
                  <button className="btn big pulse" onClick={pagar} disabled={!base}>{L.pagar}</button>
                  {!base && <p className="qz-s">{L.semLink}</p>}
                </div>
              </div>
            </div>
          </>
        )}

        {et === 'retorno' && (
          <>
            <h1 className="qz-h">{L.volta(primeiro)}</h1>
            <button className="btn big" onClick={() => { try { localStorage.removeItem('qz_ret') } catch {} ; pagar() }}>{L.voltaCta}</button>
          </>
        )}
        <p className="qz-av">{L.aviso}</p>
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
