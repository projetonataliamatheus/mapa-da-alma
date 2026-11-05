import type { Metadata } from 'next'
import TesteGratis from './TesteGratis'
import { admin } from '@/lib/supabase/admin'
import { siteUrl } from '@/lib/site'
import { CSS } from './css'

export const revalidate = 1800

const TITULO = 'Mapa Astral y Cabalístico personalizado: descubre tu número del alma | Mapa del Alma'
const DESC = 'Recibe por WhatsApp tu mapa de numerología cabalística y astrología con tu nombre y fecha de nacimiento: número del alma, pirámides del nombre, signo y un plan para tus próximos pasos. Pago único de US$ 10.'

export function generateMetadata(): Metadata {
  const base = siteUrl()
  return {
    title: TITULO,
    description: DESC,
    keywords: ['mapa astral', 'mapa cabalístico', 'numerología cabalística', 'número del alma', 'horóscopo personalizado', 'signos', 'mapa del alma', 'pirámides del nombre', 'carta astral online'],
    alternates: { canonical: `${base}/mapa-astral`, languages: { es: `${base}/mapa-astral`, 'x-default': `${base}/mapa-astral` } },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    openGraph: { title: TITULO, description: DESC, url: `${base}/mapa-astral`, siteName: 'Mapa del Alma', locale: 'es_LA', type: 'website' },
    twitter: { card: 'summary_large_image', title: TITULO, description: DESC },
    other: { 'content-language': 'es' },
  }
}

const FAQ: { q: string; a: string }[] = [
  { q: '¿Qué es el Mapa del Alma?', a: 'Es un estudio personalizado que une numerología cabalística y astrología. A partir de tu nombre completo de nacimiento y tu fecha de nacimiento calculamos tu número del alma, tus pirámides del nombre y los rasgos de tu signo, y los reunimos en un mapa que lees con calma en el celular.' },
  { q: '¿Qué es un mapa cabalístico?', a: 'En la numerología cabalística cada letra de tu nombre tiene un valor numérico. Esos números forman tus triángulos y pirámides, que hablan de tus tendencias, tus talentos y los temas que se repiten en tu vida.' },
  { q: '¿Cómo recibo mi mapa?', a: 'Te escribimos por WhatsApp. Nos envías tu nombre completo y tu fecha de nacimiento, confirmas el pago y recibes un enlace personal y exclusivo con tu mapa, además de un PDF para guardar.' },
  { q: '¿Necesito la hora de nacimiento?', a: 'No. Con tu nombre completo de nacimiento y tu fecha de nacimiento es suficiente.' },
  { q: '¿Cuánto cuesta y cómo pago?', a: 'El Mapa del Alma completo cuesta US$ 10, pago único y sin mensualidades. En el pago seguro verás el valor convertido a tu moneda local y puedes pagar con tarjeta de crédito o débito.' },
  { q: '¿El mapa predice mi futuro?', a: 'No. Es una herramienta de autoconocimiento: te ayuda a entender tus rasgos, tus ciclos y a pensar en tus decisiones con más claridad. No promete resultados ni reemplaza la opinión de un profesional de la salud, del derecho o de las finanzas.' },
  { q: '¿Mi información es privada?', a: 'Sí. Tu mapa tiene un enlace personal con contraseña, no se puede descargar de forma pública y no aparece en buscadores.' },
]

const PASOS = [
  { n: '1', t: 'Haz tu prueba gratis', d: 'Escribe tu nombre completo y tu fecha de nacimiento aquí mismo y mira lo que tu mapa ya muestra.' },
  { n: '2', t: 'Mira tus señales', d: 'Tus 4 pirámides, tu signo, tu día de nacimiento y los puntos de atención de tu mapa.' },
  { n: '3', t: 'Recibe tu mapa completo', d: 'Con el plan de qué hacer para cada señal: enlace personal con contraseña y PDF, por WhatsApp.' },
]

const INCLUYE = [
  { i: '✦', t: 'Tu número del alma', d: 'Lo que tu nombre revela sobre lo que de verdad deseas y te mueve por dentro.' },
  { i: '△', t: '4 pirámides cabalísticas', d: 'Vida, pirámide personal, social y del destino: tus ciclos, retos y secuencias que se repiten.' },
  { i: '☾', t: 'Tu signo y tu día de nacimiento', d: 'Cómo se expresan tus fortalezas y tus puntos de atención.' },
  { i: '☼', t: 'Qué hacer: tu plan A, B y C', d: 'Pasos claros para aprender a manejar cada señal en el amor, el trabajo y el dinero.' },
]

const SENALES = [
  { t: 'Los mismos problemas, una y otra vez', d: 'Cambian las personas y las situaciones, pero la historia se repite. Tu mapa muestra el patrón detrás.' },
  { t: 'El dinero entra y se va', d: 'Trabajas, te esfuerzas y aun así la plata no se queda. Descubre qué ciclo de tu mapa está detrás.' },
  { t: 'Amor y relaciones que duelen', d: 'Dar mucho, recibir poco, volver a elegir lo mismo. Entiende por qué pasa y cómo lidiar con eso.' },
  { t: 'Bloqueos que no sabes explicar', d: 'Cansancio, miedo a decidir, la sensación de que algo te frena. Tu fecha y tu nombre tienen respuestas.' },
]

async function numeroWhatsApp(): Promise<string> {
  try {
    const { data } = await admin().from('whatsapp_numbers').select('phone,status').order('created_at').limit(5)
    const n = (data || []).find((x: any) => x.status === 'conectado' && x.phone) || (data || []).find((x: any) => x.phone)
    const d = String(n?.phone || process.env.WHATSAPP_VENTAS || '').replace(/\D/g, '')
    return d
  } catch {
    return String(process.env.WHATSAPP_VENTAS || '').replace(/\D/g, '')
  }
}


export default async function Pagina() {
  const base = siteUrl()
  const checkout = String(process.env.LINK_CHECKOUT_INTERNACIONAL || '').trim()
  const wa = await numeroWhatsApp()
  const pixel = String(process.env.META_DATASET_ID || '').replace(/\D/g, '')
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'Product', name: 'Mapa del Alma completo', description: DESC, brand: { '@type': 'Brand', name: 'Mapa del Alma' }, url: `${base}/mapa-astral`, inLanguage: 'es', offers: { '@type': 'Offer', price: '10.00', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: `${base}/mapa-astral` } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Mapa del Alma', url: base },
  ]
  const wheel = (
    <svg className="wheel" viewBox="0 0 400 400" aria-hidden="true">
      <g fill="none" stroke="#f3dfa2" strokeWidth="1">
        <circle cx="200" cy="200" r="190" strokeOpacity=".5" /><circle cx="200" cy="200" r="160" strokeDasharray="2 8" strokeOpacity=".7" /><circle cx="200" cy="200" r="120" strokeOpacity=".4" /><circle cx="200" cy="200" r="70" strokeOpacity=".5" />
        <polygon points="200,40 338,280 62,280" strokeOpacity=".6" /><polygon points="200,360 62,120 338,120" strokeOpacity=".35" />
        {Array.from({ length: 12 }).map((_, i) => <line key={i} x1="200" y1="200" x2={200 + 190 * Math.cos((i * Math.PI) / 6)} y2={200 + 190 * Math.sin((i * Math.PI) / 6)} strokeOpacity=".18" />)}
      </g>
      {Array.from({ length: 12 }).map((_, i) => <circle key={i} cx={200 + 190 * Math.cos((i * Math.PI) / 6)} cy={200 + 190 * Math.sin((i * Math.PI) / 6)} r="4" fill="#f3dfa2" />)}
    </svg>
  )
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Inter:wght@400;500;600;700;800&display=swap" />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {pixel && (
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`,
          }}
        />
      )}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang='es';document.documentElement.classList.add('nojs');(function(){try{document.documentElement.classList.remove('nojs');var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});window.__rv=function(){document.querySelectorAll('.rv:not(.in)').forEach(function(el){io.observe(el)})};document.addEventListener('DOMContentLoaded',window.__rv)}catch(e){document.documentElement.classList.add('nojs')}})();document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[data-ev]');if(!a||!window.fbq)return;fbq('track',a.getAttribute('data-ev'))});`,
        }}
      />
      <div className="sky" aria-hidden="true" />

      <div className="w">
        <header className="top">
          <a className="logo" href="/"><i>✦</i>MAPA DEL ALMA</a>
          <a className="btn sm" href="#prueba">Prueba gratis</a>
        </header>

        <section className="hero">
          <div>
            <span className="kick">Numerología cabalística + astrología</span>
            <h1>Tu nombre y tu fecha de nacimiento guardan <em>señales que se repiten en tu vida</em></h1>
            <p className="lead">Descubre tu Mapa Astral y Cabalístico: tu número del alma, tus 4 pirámides, tu signo y los puntos de atención de tu mapa. Haz la prueba gratis ahora y mira lo que ya muestra.</p>
            <a className="btn big pulse" style={{ maxWidth: 440 }} href="#prueba">✨ Hacer mi prueba gratis</a>
            <ul className="mini">
              <li>Prueba 100% gratis</li>
              <li>Mapa completo: pago único US$ 10</li>
              <li>Sin la hora de nacimiento</li>
              <li>Lo recibes por WhatsApp</li>
            </ul>
          </div>
          <div className="heroR">
            {wheel}
            <TesteGratis wa={wa} checkout={checkout} />
          </div>
        </section>

        <div id="resultado" style={{ scrollMarginTop: 12 }} />

        <section className="sec rv">
          <h2>¿Te suena familiar alguna de estas señales?</h2>
          <p className="sub">Muchas personas llegan a su mapa con estas preguntas. Tu nombre y tu fecha ayudan a entender por qué estos temas se repiten. La atención es personal y por orden de llegada: elige el tema que más te pesa hoy y empieza por ahí.</p>
          <div className="grid g4">
            {SENALES.map((x) => (<div className="card senal" key={x.t}><h3>{x.t}</h3><p>{x.d}</p></div>))}
          </div>
        </section>

        <section className="sec rv" id="incluye">
          <h2>¿Qué vas a descubrir en tu mapa completo?</h2>
          <p className="sub">Un estudio hecho con tu nombre y tu fecha, no un texto genérico de horóscopo.</p>
          <div className="grid g4">
            {INCLUYE.map((x) => (<div className="card" key={x.t}><span className="ic" aria-hidden="true">{x.i}</span><h3>{x.t}</h3><p>{x.d}</p></div>))}
          </div>
        </section>

        <section className="sec rv" id="como">
          <h2>Cómo funciona</h2>
          <p className="sub">Tres pasos, en pocos minutos.</p>
          <div className="grid g3">
            {PASOS.map((p) => (<div className="card" key={p.n}><div className="num">{p.n}</div><h3>{p.t}</h3><p>{p.d}</p></div>))}
          </div>
        </section>

        <section className="sec rv" id="precio">
          <h2>Tu Mapa del Alma completo</h2>
          <p className="sub">Pago único. Sin suscripciones.</p>
          <div className="price">
            <div className="v">US$ 10</div>
            <small>El pago seguro te muestra el valor en tu moneda local · tarjeta de crédito o débito</small>
            <ul>
              <li>Número del alma y tus 4 pirámides</li>
              <li>Tu signo y tu día de nacimiento</li>
              <li>Qué hacer: plan A, B y C para cada señal</li>
              <li>Enlace personal con contraseña + PDF</li>
            </ul>
            <a className="btn big pulse" href="#prueba">✨ Empezar con mi prueba gratis</a>
            <div className="trust"><span>🔒 Pago seguro</span><span>💬 Entrega por WhatsApp</span><span>♾ Una sola vez, para toda la vida</span></div>
          </div>
        </section>

        <section className="sec rv" id="faq">
          <h2>Preguntas frecuentes</h2>
          <div style={{ maxWidth: 780, margin: '24px auto 0' }}>
            {FAQ.map((f) => (<details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>))}
          </div>
        </section>

        <section className="sec rv" style={{ textAlign: 'center' }}>
          <h2>Conoce lo que tu nombre guarda</h2>
          <p className="sub">Empieza con la prueba gratis: son 30 segundos.</p>
          <a className="btn pulse" href="#prueba">✨ Hacer mi prueba gratis</a>
        </section>

        <footer className="foot">
          <p>Mapa del Alma es una herramienta de autoconocimiento y entretenimiento. No hace diagnósticos ni promesas de resultados y no reemplaza el consejo de profesionales de la salud, del derecho o de las finanzas.</p>
          <p>© {new Date().getFullYear()} Mapa del Alma</p>
        </footer>
      </div>

      <div className="stick"><a className="btn big" href="#prueba">✨ Hacer mi prueba gratis</a></div>
    </>
  )
}
