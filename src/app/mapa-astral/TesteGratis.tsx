'use client'
import { useEffect, useRef, useState } from 'react'
import { PAISES_WA, juntarWhatsapp } from '../site-paises'
import { createPortal } from 'react-dom'

type Teaser = {
  numeros: { rotulo: string; valor: string }[]
  nascimentoTxt: { dia: string; titulo: string; texto: string[] }
  signoTxt: { nome: string; texto: string[] }
  triangulos: { id: string; nome: string; linhas: number[][]; arcano: string; arcanoTexto: string; sequencias: { codigo: string; texto: string }[] }[]
  sombras: string[]
  financeiro: string[]
}
type Res = { ref: string; nombre: string; fecha: string; teaser: Teaser }

const PASOS = ['Estudiando tu mapa…', 'Comprobando tu fecha de nacimiento…', 'Estudiando tu nombre completo…', 'Haciendo los cálculos numerológicos…', 'Construyendo tus 4 pirámides…', 'Entendiendo tu signo…', 'Revisando las señales de tu mapa…']
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const ev = (n: string, d?: any, id?: string) => { try { (window as any).fbq?.('track', n, d || {}, id ? { eventID: id } : undefined) } catch {} }
const cookie = (n: string) => { try { return document.cookie.split('; ').find((c) => c.startsWith(n + '='))?.split('=')[1] || '' } catch { return '' } }

function Piramide({ linhas }: { linhas: number[][] }) {
  return (
    <div className="pir" aria-hidden="true">
      {linhas.map((l, i) => (
        <div className="pir-r" key={i} style={{ animationDelay: `${i * 70}ms` }}>
          {l.map((n, k) => <span key={k}>{n}</span>)}
        </div>
      ))}
    </div>
  )
}

export default function TesteGratis({ wa, checkout }: { wa: string; checkout: string }) {
  const [nombre, setNombre] = useState('')
  const [pais, setPais] = useState(PAISES_WA.find((x) => x.c === 'MX')!.c)
  const [tel, setTel] = useState('')
  const [d, setD] = useState(''), [m, setM] = useState(''), [y, setY] = useState('')
  const [fase, setFase] = useState<'form' | 'analisando' | 'resultado'>('form')
  const [paso, setPaso] = useState(0)
  const [err, setErr] = useState('')
  const [res, setRes] = useState<Res | null>(null)
  const topo = useRef<HTMLDivElement>(null)
  const [alvo, setAlvo] = useState<HTMLElement | null>(null)
  useEffect(() => { setAlvo(document.getElementById('resultado')) }, [])

  // revela cada bloco ao rolar a tela
  useEffect(() => {
    if (fase !== 'resultado') return
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { threshold: 0.12 })
    document.querySelectorAll('.rv').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [fase])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    if (nombre.trim().split(/\s+/).length < 2) return setErr('Escribe tu nombre completo de nacimiento (nombre y apellidos).')
    if (!d || !m || y.length !== 4) return setErr('Completa tu fecha de nacimiento (día, mes y año).')
    const ddi = PAISES_WA.find((x) => x.c === pais)!.d
    const whatsapp = juntarWhatsapp(ddi, tel)
    if (!whatsapp) return setErr('Escribe tu WhatsApp (es para enviarte tu estudio y resolver dudas).')
    setFase('analisando'); setPaso(0)
    const t0 = Date.now()
    const q = new URLSearchParams(location.search)
    const utm: Record<string, string> = {}
    q.forEach((v, k) => { if (/^(utm_|fbclid|ad|campaign|adset)/i.test(k)) utm[k] = v.slice(0, 150) })
    const timer = setInterval(() => setPaso((p) => Math.min(p + 1, PASOS.length - 1)), 1500)
    let r: any = null, msg = ''
    try {
      const resp = await fetch('/api/site/teste', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, whatsapp, pais, site: 'es', fecha: `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`, utm: { ...utm, ref_url: document.referrer.slice(0, 200) }, fbp: cookie('_fbp'), fbc: cookie('_fbc') || (utm.fbclid ? `fb.1.${Date.now()}.${utm.fbclid}` : '') }) })
      r = await resp.json()
      if (!resp.ok) msg = r?.error || 'No pudimos preparar tu estudio. Inténtalo de nuevo.'
    } catch { msg = 'Sin conexión. Revisa tu internet e inténtalo de nuevo.' }
    // mínimo de ~9 s de "estudio" para que se lea cada paso
    const falta = 9000 - (Date.now() - t0)
    if (falta > 0) await new Promise((ok) => setTimeout(ok, falta))
    clearInterval(timer)
    if (msg) { setErr(msg); setFase('form'); return }
    setRes(r); setFase('resultado')
    ev('Lead', { content_name: 'Prueba gratis' }, `lead-${r.ref}`)
    setTimeout(() => document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
  }

  const beacon = (tipo: 'whatsapp' | 'checkout') => {
    if (!res) return
    try { navigator.sendBeacon('/api/site/evento', new Blob([JSON.stringify({ ref: res.ref, tipo })], { type: 'application/json' })) } catch {}
  }
  const waUrl = res && wa ? `https://wa.me/${wa}?text=${encodeURIComponent(`Hola, quiero mi Mapa del Alma completo ✨\nMi nombre: ${res.nombre}\nMi fecha de nacimiento: ${res.fecha}\n(Ref: ${res.ref})`)}` : ''
  const payUrl = res && checkout ? `${checkout}${checkout.includes('?') ? '&' : '?'}src=${res.ref}` : ''

  if (fase === 'analisando')
    return (
      <div className="an" role="status" aria-live="polite">
        <div className="an-orb"><i /><i /><i /><b>✦</b></div>
        <h3>Estamos estudiando tu mapa</h3>
        <ul className="an-l">
          {PASOS.map((p, i) => <li key={p} className={i < paso ? 'ok' : i === paso ? 'now' : ''}><span>{i < paso ? '✓' : '✦'}</span>{p}</li>)}
        </ul>
      </div>
    )

  if (fase === 'resultado' && res) {
    const t = res.teaser
    const corpo = (
      <div className="res" ref={topo}>
        <div className="res-h rv">
          <span className="kick">Tu estudio gratuito</span>
          <h3>{res.nombre.split(' ')[0]}, esto es lo que muestra tu mapa</h3>
          <p>Nombre completo: <b>{res.nombre}</b> · Nacimiento: <b>{res.fecha}</b></p>
          <div className="nums">
            {t.numeros.map((n, i) => <div key={i}><small>{['Camino de vida', 'Motivación del alma', 'Expresión del nombre'][i] || n.rotulo}</small><b>{n.valor}</b></div>)}
          </div>
        </div>

        <div className="card rv"><span className="ic">☼</span><h4>Lo que trae tu día de nacimiento · día {t.nascimentoTxt.dia}</h4><p className="em">{t.nascimentoTxt.titulo}</p>{t.nascimentoTxt.texto.map((p, i) => <p key={i}>{p}</p>)}</div>
        <div className="card rv"><span className="ic">☾</span><h4>Tu signo: {t.signoTxt.nome}</h4>{t.signoTxt.texto.map((p, i) => <p key={i}>{p}</p>)}</div>

        <h3 className="rv sub-t">Tus 4 pirámides cabalísticas</h3>
        <div className="tri">
          {t.triangulos.map((g) => (
            <div className="card tcard rv" key={g.id}>
              <h4>{g.nome}</h4>
              <Piramide linhas={g.linhas} />
              <p className="arc"><b>Arcano: {g.arcano}.</b> {g.arcanoTexto}</p>
              {g.sequencias.map((s) => <p className="seq" key={s.codigo}><b>Secuencia {s.codigo}</b>{cap(s.texto)}</p>)}
            </div>
          ))}
        </div>

        {t.financeiro.length > 0 && (
          <div className="card warn rv"><span className="ic">◈</span><h4>Lo que tu mapa señala en el dinero y el trabajo</h4>
            <ul>{t.financeiro.map((f, i) => <li key={i}>{cap(f)}</li>)}</ul>
          </div>
        )}
        {t.sombras.length > 0 && (
          <div className="card rv"><span className="ic">☽</span><h4>Las sombras de tu mapa</h4>
            <div className="chips">{t.sombras.map((s, i) => <span key={i}>{s}</span>)}</div>
          </div>
        )}

        <div className="lock rv">
          <div className="lock-b" aria-hidden="true"><p>Qué hacer con cada una de estas señales · tu plan A, B y C · cómo aprender a manejar tus ciclos · tu año personal · tus próximos años · compatibilidad…</p><p>Pasos claros para tu día a día, en el amor, en el trabajo y en el dinero.</p></div>
          <div className="lock-c">
            <span className="lk">🔒</span>
            <h3>Tu mapa ya muestra las señales.<br />El <em>Mapa del Alma completo</em> te explica qué hacer con ellas</h3>
            <p>Aprende a manejar cada una de estas situaciones con un plan sencillo, hecho con tu nombre y tu fecha. Pago único, sin mensualidades.</p>
            <div className="pr"><b>US$ 10</b><small>pago único · el pago seguro te lo muestra en tu moneda</small></div>
            {payUrl && <a className="btn big pulse" href={payUrl} onClick={() => { beacon('checkout'); ev('InitiateCheckout', { value: 10, currency: 'USD' }) }}>Ir directo al pago · Quiero mi mapa completo</a>}
            {waUrl && <a className="btn sec" href={waUrl} onClick={() => { beacon('whatsapp'); ev('Contact') }}>💬 Resolver dudas por WhatsApp</a>}
            <p className="fine">Recibes un enlace personal con contraseña y un PDF. Herramienta de autoconocimiento: no promete resultados.</p>
          </div>
        </div>
      </div>
    )
    return (
      <>
        <div className="tf done"><span className="kick">Listo ✓</span><h3>Tu estudio está listo</h3><p>Baja para ver lo que muestra tu mapa, {res.nombre.split(' ')[0]}.</p><a className="btn big" href="#resultado">Ver mi estudio ↓</a></div>
        {alvo ? createPortal(corpo, alvo) : corpo}
      </>
    )
  }

  const dias = Array.from({ length: 31 }, (_, i) => i + 1)
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return (
    <form className="tf" onSubmit={enviar} id="prueba" noValidate>
      <div className="tf-t"><span className="kick">Prueba gratis · 30 segundos</span><h3>Descubre ahora lo que dice tu nombre</h3><p>Escribe tu nombre completo de nacimiento y tu fecha. Sin pagar, sin registro.</p></div>
      <label>Nombre completo de nacimiento<input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: María Fernanda López Pérez" autoComplete="name" maxLength={90} /></label>
      <fieldset><legend>Fecha de nacimiento</legend>
        <div className="dt">
          <select value={d} onChange={(e) => setD(e.target.value)} aria-label="Día"><option value="">Día</option>{dias.map((x) => <option key={x} value={x}>{x}</option>)}</select>
          <select value={m} onChange={(e) => setM(e.target.value)} aria-label="Mes"><option value="">Mes</option>{meses.map((x, i) => <option key={x} value={i + 1}>{x}</option>)}</select>
          <input value={y} onChange={(e) => setY(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="Año" aria-label="Año" />
        </div>
      </fieldset>
      <fieldset><legend>Tu WhatsApp</legend>
        <div className="dt" style={{ gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1.6fr)' }}>
          <select value={pais} onChange={(e) => setPais(e.target.value)} aria-label="País">{PAISES_WA.map((x) => <option key={x.c} value={x.c}>{x.n} (+{x.d})</option>)}</select>
          <input value={tel} onChange={(e) => setTel(e.target.value.replace(/[^\d\s()-]/g, '').slice(0, 20))} inputMode="tel" placeholder="Número con código de área" autoComplete="tel-national" aria-label="WhatsApp" />
        </div>
      </fieldset>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn big pulse" type="submit">✨ Hacer mi prueba gratis</button>
      <p className="fine">Usamos tus datos solo para calcular tu estudio. No necesitas la hora de nacimiento.</p>
    </form>
  )
}
