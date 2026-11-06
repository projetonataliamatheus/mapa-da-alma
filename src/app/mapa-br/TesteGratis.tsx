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

const PASOS = ['Estudando o seu mapa…', 'Conferindo a sua data de nascimento…', 'Estudando o seu nome completo…', 'Fazendo os cálculos numerológicos…', 'Construindo as suas 4 pirâmides…', 'Entendendo o seu signo…', 'Revisando os sinais do seu mapa…']
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
  const [pais, setPais] = useState(PAISES_WA.find((x) => x.c === 'BR')!.c)
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
    if (nombre.trim().split(/\s+/).length < 2) return setErr('Escreva o seu nome completo de nascimento (nome e sobrenomes).')
    if (!d || !m || y.length !== 4) return setErr('Complete a sua data de nascimento (dia, mês e ano).')
    const ddi = PAISES_WA.find((x) => x.c === pais)!.d
    const whatsapp = juntarWhatsapp(ddi, tel)
    if (!whatsapp) return setErr('Informe o seu WhatsApp com DDD (é para enviar o seu estudo e tirar dúvidas).')
    setFase('analisando'); setPaso(0)
    const t0 = Date.now()
    const q = new URLSearchParams(location.search)
    const utm: Record<string, string> = {}
    q.forEach((v, k) => { if (/^(utm_|fbclid|ad|campaign|adset)/i.test(k)) utm[k] = v.slice(0, 150) })
    const timer = setInterval(() => setPaso((p) => Math.min(p + 1, PASOS.length - 1)), 1500)
    let r: any = null, msg = ''
    try {
      const resp = await fetch('/api/site/teste', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idioma: 'pt', nombre, whatsapp, pais, fecha: `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`, utm: { ...utm, ref_url: document.referrer.slice(0, 200) }, fbp: cookie('_fbp'), fbc: cookie('_fbc') || (utm.fbclid ? `fb.1.${Date.now()}.${utm.fbclid}` : '') }) })
      r = await resp.json()
      if (!resp.ok) msg = r?.error || 'Não conseguimos preparar o seu estudo. Tente de novo.'
    } catch { msg = 'Sem conexão. Confira a sua internet e tente de novo.' }
    // mínimo de ~9 s de "estudo" para dar tempo de ler cada passo
    const falta = 9000 - (Date.now() - t0)
    if (falta > 0) await new Promise((ok) => setTimeout(ok, falta))
    clearInterval(timer)
    if (msg) { setErr(msg); setFase('form'); return }
    setRes(r); setFase('resultado')
    ev('Lead', { content_name: 'Teste grátis' }, `lead-${r.ref}`)
    setTimeout(() => document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
  }

  const beacon = (tipo: 'whatsapp' | 'checkout') => {
    if (!res) return
    try { navigator.sendBeacon('/api/site/evento', new Blob([JSON.stringify({ ref: res.ref, tipo })], { type: 'application/json' })) } catch {}
  }
  const waUrl = res && wa ? `https://wa.me/${wa}?text=${encodeURIComponent(`Olá! Quero o meu Mapa da Alma completo ✨\nMeu nome: ${res.nombre}\nMinha data de nascimento: ${res.fecha}\n(Ref: ${res.ref})`)}` : ''
  const payUrl = res && checkout ? `${checkout}${checkout.includes('?') ? '&' : '?'}src=${res.ref}` : ''

  if (fase === 'analisando')
    return (
      <div className="an" role="status" aria-live="polite">
        <div className="an-orb"><i /><i /><i /><b>✦</b></div>
        <h3>Estamos estudando o seu mapa</h3>
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
          <span className="kick">O seu estudo gratuito</span>
          <h3>{res.nombre.split(' ')[0]}, isto é o que o seu mapa mostra</h3>
          <p>Nome completo: <b>{res.nombre}</b> · Nascimento: <b>{res.fecha}</b></p>
          <div className="nums">
            {t.numeros.map((n, i) => <div key={i}><small>{['Caminho de vida', 'Motivação da alma', 'Expressão do nome'][i] || n.rotulo}</small><b>{n.valor}</b></div>)}
          </div>
        </div>

        <div className="card rv"><span className="ic">☼</span><h4>O que o seu dia de nascimento traz · dia {t.nascimentoTxt.dia}</h4><p className="em">{t.nascimentoTxt.titulo}</p>{t.nascimentoTxt.texto.map((p, i) => <p key={i}>{p}</p>)}</div>
        <div className="card rv"><span className="ic">☾</span><h4>O seu signo: {t.signoTxt.nome}</h4>{t.signoTxt.texto.map((p, i) => <p key={i}>{p}</p>)}</div>

        <h3 className="rv sub-t">As suas 4 pirâmides cabalísticas</h3>
        <div className="tri">
          {t.triangulos.map((g) => (
            <div className="card tcard rv" key={g.id}>
              <h4>{g.nome}</h4>
              <Piramide linhas={g.linhas} />
              <p className="arc"><b>Arcano: {g.arcano}.</b> {g.arcanoTexto}</p>
              {g.sequencias.map((s) => <p className="seq" key={s.codigo}><b>Sequência {s.codigo}</b>{cap(s.texto)}</p>)}
            </div>
          ))}
        </div>

        {t.financeiro.length > 0 && (
          <div className="card warn rv"><span className="ic">◈</span><h4>O que o seu mapa aponta no dinheiro e no trabalho</h4>
            <ul>{t.financeiro.map((f, i) => <li key={i}>{cap(f)}</li>)}</ul>
          </div>
        )}
        {t.sombras.length > 0 && (
          <div className="card rv"><span className="ic">☽</span><h4>As sombras do seu mapa</h4>
            <div className="chips">{t.sombras.map((s, i) => <span key={i}>{s}</span>)}</div>
          </div>
        )}

        <div className="lock rv">
          <div className="lock-b" aria-hidden="true"><p>O que fazer com cada um desses sinais · o seu plano A, B e C · como aprender a lidar com os seus ciclos · o seu ano pessoal · os próximos anos · compatibilidade…</p><p>Passos claros para o seu dia a dia, no amor, no trabalho e no dinheiro.</p></div>
          <div className="lock-c">
            <span className="lk">🔒</span>
            <h3>O seu mapa já mostra os sinais.<br />O <em>Mapa da Alma completo</em> explica o que fazer com eles</h3>
            <p>Aprenda a lidar com cada uma dessas situações com um plano simples, feito com o seu nome e a sua data. Pagamento único, sem mensalidade.</p>
            <div className="pr"><b>R$ 49</b><small>pagamento único · Pix ou cartão</small></div>
            {payUrl && <a className="btn big pulse" href={payUrl} onClick={() => { beacon('checkout'); ev('InitiateCheckout', { value: 49, currency: 'BRL' }) }}>Ir direto ao pagamento · Quero o meu mapa completo</a>}
            {waUrl && <a className="btn sec" href={waUrl} onClick={() => { beacon('whatsapp'); ev('Contact') }}>💬 Tirar dúvidas pelo WhatsApp</a>}
            <p className="fine">Você recebe um link pessoal com senha e um PDF. Ferramenta de autoconhecimento: não promete resultados.</p>
          </div>
        </div>
      </div>
    )
    return (
      <>
        <div className="tf done"><span className="kick">Pronto ✓</span><h3>O seu estudo está pronto</h3><p>Role para ver o que o seu mapa mostra, {res.nombre.split(' ')[0]}.</p><a className="btn big" href="#resultado">Ver o meu estudo ↓</a></div>
        {alvo ? createPortal(corpo, alvo) : corpo}
      </>
    )
  }

  const dias = Array.from({ length: 31 }, (_, i) => i + 1)
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  return (
    <form className="tf" onSubmit={enviar} id="prueba" noValidate>
      <div className="tf-t"><span className="kick">Teste grátis · 30 segundos</span><h3>Descubra agora o que o seu nome diz</h3><p>Escreva o seu nome completo de nascimento e a sua data. Sem pagar, sem cadastro.</p></div>
      <label>Nome completo de nascimento<input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ex.: Maria Fernanda Lopes Pereira" autoComplete="name" maxLength={90} /></label>
      <fieldset><legend>Data de nascimento</legend>
        <div className="dt">
          <select value={d} onChange={(e) => setD(e.target.value)} aria-label="Dia"><option value="">Dia</option>{dias.map((x) => <option key={x} value={x}>{x}</option>)}</select>
          <select value={m} onChange={(e) => setM(e.target.value)} aria-label="Mês"><option value="">Mês</option>{meses.map((x, i) => <option key={x} value={i + 1}>{x}</option>)}</select>
          <input value={y} onChange={(e) => setY(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="Ano" aria-label="Ano" />
        </div>
      </fieldset>
      <fieldset><legend>Seu WhatsApp</legend>
        <div className="dt" style={{ gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1.6fr)' }}>
          <select value={pais} onChange={(e) => setPais(e.target.value)} aria-label="País">{PAISES_WA.map((x) => <option key={x.c} value={x.c}>{x.n} (+{x.d})</option>)}</select>
          <input value={tel} onChange={(e) => setTel(e.target.value.replace(/[^\d\s()-]/g, '').slice(0, 20))} inputMode="tel" placeholder="DDD + número" autoComplete="tel-national" aria-label="WhatsApp" />
        </div>
      </fieldset>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn big pulse" type="submit">✨ Fazer o meu teste grátis</button>
      <p className="fine">Usamos os seus dados só para calcular o seu estudo. Não precisa da hora de nascimento.</p>
    </form>
  )
}
