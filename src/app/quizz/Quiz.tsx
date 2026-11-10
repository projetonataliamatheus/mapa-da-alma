'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { UI, PAISES, type Lang } from './textos'

type Gen = 'f' | 'm' | 'x' | ''

type Etapa = { tema: string; titulo: string; num?: string; destaque?: string; texto: string[]; pontos?: string[]; linhas?: number[][]; arcano?: string; arcanoTexto?: string }

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

export default function Quiz({ linkBR, linkUSD }: { linkBR: string; linkUSD: string }) {
  const [i, setI] = useState(0)                 // índice da etapa
  const [pais, setPais] = useState('')
  const [nome, setNome] = useState('')
  const [dataTxt, setDataTxt] = useState('')
  const [conf, setConf] = useState(false)
  const [err, setErr] = useState('')
  const [fim, setFim] = useState(false)
  const [mapa, setMapa] = useState<{ nombre: string; etapas: Etapa[] } | null>(null)
  const [gen, setGen] = useState<Gen>('')
  const [carga, setCarga] = useState(false)
  const [prog, setProg] = useState(0)
  const [resp, setResp] = useState<{ t: string; v: number }[]>([])
  const [retorno, setRetorno] = useState(false)
  const sid = useRef('')
  const rodou = useRef(false)

  const lang: Lang = pais === 'BR' ? 'pt' : 'es'
  const L = UI[lang]
  const data = useMemo(() => lerData(dataTxt), [dataTxt])
  const primeiro = (mapa?.nombre || nome).trim().split(/\s+/)[0] || ''
  const etp = mapa?.etapas || []
  // etapas: país · dados · análise · números · signo · sinais (até 4) · oferta
  const etapas = useMemo(() => ['pais', 'dados', 'analise', ...etp.map((_, k) => 'e' + k), 'oferta'], [etp])
  const et = retorno ? 'retorno' : etapas[i] || 'pais'
  const total = etapas.length
  const media = resp.length ? resp.reduce((a, r) => a + r.v, 0) / resp.length : 2
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
    const tela = retorno ? 60 : i + 1
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
        if (!ok || !j?.etapas) { setErr(j?.error || L.analErr); setConf(false); setI(1); rodou.current = false; return }
        setProg(100)
        setMapa({ nombre: j.nombre, etapas: j.etapas })
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
    if (!gen) return setErr(L.errGen)
    setErr(''); setConf(true)
  }
  const responder = (v: number) => { setResp((r) => [...r, { t: e?.titulo || '', v }]); setI((x) => x + 1) }
  const base = lang === 'pt' ? linkBR : linkUSD
  function pagar() {
    try {
      navigator.sendBeacon('/api/quizz/evento', new Blob([JSON.stringify({ sid: sid.current, tela: Math.min(60, i + 1), pais, tipo: 'checkout' })], { type: 'application/json' }))
      localStorage.setItem('qz_ret', JSON.stringify({ n: primeiro, p: pais }))
    } catch {}
    if (!base) return
    const q = new URLSearchParams(location.search); const ex = ['src=quiz-' + sid.current]
    q.forEach((v, k) => { if (/^utm_/i.test(k)) ex.push(`${encodeURIComponent(k)}=${encodeURIComponent(v.slice(0, 100))}`) })
    location.href = base + (base.includes('?') ? '&' : '?') + ex.join('&')
  }

  const k = et.startsWith('e') && et !== 'etapa' && /^e\d+$/.test(et) ? Number(et.slice(1)) : -1
  const e = k >= 0 ? etp[k] : null
  const nEt = etp.length
  const pct = et === 'retorno' ? 100 : et === 'analise' ? Math.round(((2 + prog / 100) / total) * 100) : Math.round(((i + 1) / total) * 100)
  const rot = pais && e ? L.ponto(k + 1, nEt) : ''
  const pergunta = k >= 0 && (k + 1) % 4 === 0 // a cada 4 pontos, pergunta "isso te soa?" (alimenta a temperatura)
  const topo = useMemo(() => {
    let best: { t: string; v: number } | null = null
    for (const r of resp) if (r.v >= 2 && (!best || r.v > best.v)) best = r
    return best?.t || ''
  }, [resp])

  // cada ponto "carrega" um instante: busca no mapa antes de mostrar o resultado
  useEffect(() => {
    if (k < 0) return
    setCarga(true)
    const t = setTimeout(() => setCarga(false), 1100)
    return () => clearTimeout(t)
  }, [k])

  if (fim) return <Moldura pct={0}><div className="qz"><p className="qz-lead">{L.fim18}</p></div></Moldura>

  return (
    <Moldura pct={pct} rotulo={rot}>
      {e && gen && (
        <div className="qz-fin">
          <span>{L.conv[gen as 'f' | 'm' | 'x']}</span>
          <button className="btn sm" onClick={pagar} disabled={!base}>{L.fin}</button>
        </div>
      )}
      <div className="qz" key={et}>
        {et === 'pais' && (
          <>
            <h1 className="qz-h">{UI.es.h1} · {UI.pt.h1}</h1>
            <p className="qz-lead">{UI.es.h1s}</p>
            <label className="qz-l" htmlFor="pais">{UI.es.paisQ} / {UI.pt.paisQ}</label>
            <select id="pais" className="qz-i" value={pais} onChange={(ev) => setPais(ev.target.value)}>
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
            <input id="nome" className="qz-i" autoComplete="name" placeholder={L.nomePh} value={nome} onChange={(ev) => setNome(ev.target.value)} />
            <label className="qz-l" htmlFor="data">{L.dataL}</label>
            <input id="data" className="qz-i" inputMode="numeric" placeholder={L.dataPh} value={dataTxt} onChange={(ev) => setDataTxt(ev.target.value.replace(/[^\d/.\-]/g, '').slice(0, 10))} />
            <span className="qz-l" style={{ display: 'block' }}>{L.genL}</span>
            <div className="qz-3">
              {([['f', L.genF], ['m', L.genM], ['x', L.genX]] as [Gen, string][]).map(([v, t]) => <button key={v} type="button" className={`qz-op ${gen === v ? 'on' : ''}`} onClick={() => setGen(v)}>{t}</button>)}
            </div>
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
              {L.passos.map((p, n) => {
                const ativo = Math.min(L.passos.length - 1, Math.floor((prog / 100) * L.passos.length))
                return <li key={p} className={n < ativo ? 'ok' : n === ativo ? 'now' : ''}><span>{n < ativo ? '✓' : n === ativo ? '🔎' : '·'}</span>{p}</li>
              })}
            </ul>
          </div>
        )}

        {e && carga && (
          <div className="an qz-an" role="status" aria-live="polite">
            <div className="an-orb" style={{ width: 70, height: 70 }}><i /><i /><b style={{ fontSize: 22 }}>🔎</b></div>
            <p className="qz-s" style={{ margin: '14px 0 10px' }}>{L.busca(e.tema)}</p>
            <div className="qz-pb qz-pb-s" aria-hidden="true"><i /></div>
          </div>
        )}

        {e && !carga && (
          <>
            <span className="kick">{e.tema}</span>
            <h1 className="qz-h">{e.titulo}</h1>
            {e.num && <div className="qz-n">{e.num}</div>}
            {e.destaque && <p className="em">{e.destaque}</p>}
            {e.linhas && <Piramide linhas={e.linhas} />}
            {e.arcano && <p className="qz-lead" style={{ fontSize: 15 }}><b>{L.arc}: {e.arcano}.</b> {e.arcanoTexto}</p>}
            {e.texto.map((p, n) => (e.linhas ? <p className="seq" key={n}>{p}</p> : <p className="qz-t" key={n}>{p}</p>))}
            {e.pontos && <ul className="qz-pt">{e.pontos.map((p, n) => <li key={n}>{p}</li>)}</ul>}
            {pergunta ? (
              <>
                <p className="qz-q">{L.ressoa}</p>
                <div className="qz-3"><button className="qz-op" onClick={() => responder(3)}>{L.r3}</button><button className="qz-op" onClick={() => responder(2)}>{L.r2}</button><button className="qz-op" onClick={() => responder(1)}>{L.r1}</button></div>
              </>
            ) : <button className="btn big" onClick={avancar}>{L.next}</button>}
          </>
        )}

        {et === 'oferta' && (
          <>
            <h1 className="qz-h">{L.ofT(primeiro, nEt)}</h1>
            {topo && <p className="qz-lead" style={{ marginBottom: 10 }}>{L.ofTop(topo)}</p>}
            <p className="qz-lead">{faixa === 'quente' ? L.ofQuente : faixa === 'frio' ? L.ofFrio : L.ofMorno}</p>
            <OfertaBox L={L} base={base} pagar={pagar} />
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

function OfertaBox({ L, base, pagar }: { L: (typeof UI)['es']; base: string; pagar: () => void }) {
  return (
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
