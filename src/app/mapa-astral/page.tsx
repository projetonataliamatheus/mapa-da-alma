import type { Metadata } from 'next'
import { admin } from '@/lib/supabase/admin'
import { siteUrl } from '@/lib/site'

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
  { n: '1', t: 'Escríbenos por WhatsApp', d: 'Ana, nuestra asistente, te recibe y te explica qué incluye tu mapa.' },
  { n: '2', t: 'Envía tu nombre y fecha de nacimiento', d: 'Solo tu nombre completo de nacimiento y tu fecha. No necesitas la hora.' },
  { n: '3', t: 'Recibe tu mapa personal', d: 'Un enlace exclusivo con contraseña y un PDF para guardar, listo para leer con calma.' },
]

const INCLUYE = [
  { i: '✦', t: 'Tu número del alma', d: 'Lo que tu nombre revela sobre lo que de verdad deseas y te mueve por dentro.' },
  { i: '△', t: 'Pirámides y triángulos del nombre', d: 'El corazón de la numerología cabalística: los ciclos, retos y talentos que forman tu nombre.' },
  { i: '☾', t: 'Tu signo y sus rasgos', d: 'Cómo se expresan tus fortalezas y tus puntos de atención según tu fecha de nacimiento.' },
  { i: '☼', t: 'Un plan sencillo: qué hacer', d: 'Pasos claros (A, B y C) para llevar lo que descubres a tu día a día.' },
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

const CSS = `
:root{--bg:#0d0620;--bg2:#1a0b3d;--card:rgba(255,255,255,.06);--line:rgba(243,223,162,.28);--gold:#f3dfa2;--gold2:#c9a24a;--txt:#f5f0ff;--mut:#cbbfe6;--btn:linear-gradient(135deg,#f3dfa2,#c9a24a)}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:radial-gradient(1200px 600px at 50% -10%,#4b2397 0%,var(--bg2) 45%,var(--bg) 100%) fixed;color:var(--txt);font-family:Inter,system-ui,-apple-system,"Segoe UI",Arial,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
.w{width:min(1080px,100% - 32px);margin-inline:auto}
h1,h2,h3{font-family:Cinzel,Georgia,"Times New Roman",serif;letter-spacing:.02em;line-height:1.15;margin:0}
.top{display:flex;align-items:center;justify-content:space-between;padding:16px 0}
.logo{font-family:Cinzel,Georgia,serif;font-weight:700;letter-spacing:.18em;color:var(--gold);font-size:15px;text-decoration:none}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:15px 26px;border-radius:999px;font-weight:700;font-size:16px;text-decoration:none;color:#2a1259;background:var(--btn);box-shadow:0 8px 30px rgba(201,162,74,.35);transition:transform .15s,box-shadow .15s;border:0;cursor:pointer}
.btn:hover{transform:translateY(-2px);box-shadow:0 12px 36px rgba(201,162,74,.5)}
.btn.sec{background:transparent;color:var(--gold);border:1.5px solid var(--line);box-shadow:none}
.btn.sm{padding:10px 18px;font-size:14px}
.hero{display:grid;grid-template-columns:1.15fr .85fr;gap:40px;align-items:center;padding:34px 0 64px}
.kick{display:inline-block;color:var(--gold);border:1px solid var(--line);border-radius:999px;padding:6px 14px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:18px}
h1{font-size:clamp(30px,5.2vw,52px);color:#fff}
h1 em{font-style:normal;color:var(--gold)}
.lead{font-size:clamp(16px,2vw,19px);color:var(--mut);margin:18px 0 26px;max-width:560px}
.cta{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.mini{display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:20px;color:var(--mut);font-size:14px;padding:0;list-style:none}
.mini li::before{content:"✓";color:var(--gold);margin-right:6px}
.orb{position:relative;aspect-ratio:1;max-width:430px;margin-inline:auto;width:100%}
.orb svg{width:100%;height:100%;filter:drop-shadow(0 0 40px rgba(243,223,162,.28))}
.sec{padding:56px 0}
.sec h2{font-size:clamp(24px,3.6vw,38px);text-align:center;color:#fff;margin-bottom:12px}
.sub{text-align:center;color:var(--mut);max-width:640px;margin:0 auto 34px}
.grid{display:grid;gap:16px}
.g4{grid-template-columns:repeat(4,1fr)}.g3{grid-template-columns:repeat(3,1fr)}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px;backdrop-filter:blur(6px)}
.card .ic{font-size:30px;color:var(--gold);display:block;margin-bottom:10px;font-family:Georgia,serif}
.card h3{font-size:18px;color:#fff;margin-bottom:8px}
.card p{margin:0;color:var(--mut);font-size:15px}
.num{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;font-family:Cinzel,serif;font-weight:700;color:#2a1259;background:var(--btn);margin-bottom:12px}
.price{max-width:520px;margin:0 auto;text-align:center;background:linear-gradient(180deg,rgba(243,223,162,.12),rgba(255,255,255,.04));border:1.5px solid var(--gold2);border-radius:24px;padding:32px 24px}
.price .v{font-family:Cinzel,serif;font-size:56px;color:var(--gold);line-height:1}
.price small{display:block;color:var(--mut);margin:6px 0 18px}
.price ul{list-style:none;padding:0;margin:0 0 22px;text-align:left;display:inline-block}
.price li{margin:6px 0;color:var(--txt)}.price li::before{content:"✦";color:var(--gold);margin-right:10px}
details{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin:10px 0}
summary{cursor:pointer;font-weight:600;color:#fff;list-style:none}summary::-webkit-details-marker{display:none}
summary::after{content:"+";float:right;color:var(--gold);font-size:20px;line-height:1}
details[open] summary::after{content:"–"}
details p{color:var(--mut);margin:10px 0 0}
.foot{border-top:1px solid var(--line);padding:30px 0 90px;color:var(--mut);font-size:13px;text-align:center}
.foot p{max-width:760px;margin:8px auto}
.stick{position:fixed;left:0;right:0;bottom:0;z-index:50;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:rgba(13,6,32,.92);backdrop-filter:blur(10px);border-top:1px solid var(--line);display:none}
.stick .btn{width:100%}
@media(max-width:860px){.hero{grid-template-columns:1fr;padding-top:10px}.orb{max-width:300px;order:-1}.g4{grid-template-columns:1fr 1fr}.g3{grid-template-columns:1fr}.stick{display:block}.top .btn{display:none}}
@media(max-width:520px){.g4{grid-template-columns:1fr}}
@media(prefers-reduced-motion:no-preference){.orb svg{animation:flo 9s ease-in-out infinite}@keyframes flo{50%{transform:translateY(-8px) rotate(2deg)}}}
`

export default async function Pagina() {
  const base = siteUrl()
  const checkout = String(process.env.LINK_CHECKOUT_INTERNACIONAL || '').trim()
  const wa = await numeroWhatsApp()
  const waUrl = wa ? `https://wa.me/${wa}?text=${encodeURIComponent('Hola, quiero mi Mapa del Alma ✨')}` : ''
  const pixel = String(process.env.META_DATASET_ID || '').replace(/\D/g, '')
  const principal = waUrl || checkout
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'Product', name: 'Mapa del Alma completo', description: DESC, brand: { '@type': 'Brand', name: 'Mapa del Alma' }, url: `${base}/mapa-astral`, inLanguage: 'es', offers: { '@type': 'Offer', price: '10.00', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: `${base}/mapa-astral` } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Mapa del Alma', url: base },
  ]
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Inter:wght@400;500;600;700&display=swap" />
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
          __html: `document.documentElement.lang='es';document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[data-ev]');if(!a||!window.fbq)return;fbq('track',a.getAttribute('data-ev'))});`,
        }}
      />

      <div className="w">
        <header className="top">
          <a className="logo" href="/mapa-astral">MAPA DEL ALMA</a>
          {principal && <a className="btn sm" href={principal} data-ev={waUrl ? 'Contact' : 'InitiateCheckout'}>Quiero mi mapa</a>}
        </header>

        <section className="hero">
          <div>
            <span className="kick">Numerología cabalística + astrología</span>
            <h1>Tu <em>Mapa Astral y Cabalístico</em> personal: descubre lo que tu nombre y tu fecha de nacimiento dicen de ti</h1>
            <p className="lead">Con tu nombre completo y tu fecha de nacimiento preparamos un mapa único: tu número del alma, las pirámides de tu nombre, los rasgos de tu signo y un plan sencillo de qué hacer. Lo recibes por WhatsApp, listo para leer con calma.</p>
            <div className="cta">
              {waUrl && <a className="btn" href={waUrl} data-ev="Contact">Quiero mi Mapa del Alma ✨</a>}
              {checkout && <a className={waUrl ? 'btn sec' : 'btn'} href={checkout} data-ev="InitiateCheckout">{waUrl ? 'Pagar directo · US$ 10' : 'Quiero mi Mapa del Alma · US$ 10'}</a>}
            </div>
            <ul className="mini">
              <li>Pago único de US$ 10</li>
              <li>Sin mensualidades</li>
              <li>Enlace personal + PDF</li>
              <li>No necesitas la hora de nacimiento</li>
            </ul>
          </div>
          <div className="orb" aria-hidden="true">
            <svg viewBox="0 0 400 400" role="img">
              <defs>
                <radialGradient id="g" cx="50%" cy="45%" r="60%"><stop offset="0" stopColor="#f3dfa2" stopOpacity=".35" /><stop offset="1" stopColor="#4b2397" stopOpacity="0" /></radialGradient>
              </defs>
              <circle cx="200" cy="200" r="190" fill="url(#g)" />
              <g fill="none" stroke="#f3dfa2" strokeOpacity=".75" strokeWidth="1.4">
                <circle cx="200" cy="200" r="170" /><circle cx="200" cy="200" r="130" strokeDasharray="3 7" /><circle cx="200" cy="200" r="88" />
                <polygon points="200,60 322,270 78,270" /><polygon points="200,340 78,130 322,130" strokeOpacity=".45" />
              </g>
              <g fill="#f3dfa2" fontFamily="Cinzel,Georgia,serif" textAnchor="middle">
                <text x="200" y="168" fontSize="30">7</text>
                <text x="168" y="226" fontSize="30">3</text><text x="232" y="226" fontSize="30">4</text>
                <text x="136" y="284" fontSize="30" opacity=".7">1</text><text x="200" y="284" fontSize="30" opacity=".7">2</text><text x="264" y="284" fontSize="30" opacity=".7">9</text>
              </g>
              {[[200, 30], [370, 200], [200, 370], [30, 200], [320, 80], [80, 320]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill="#f3dfa2" />)}
            </svg>
          </div>
        </section>

        <section className="sec" id="incluye">
          <h2>¿Qué vas a descubrir en tu mapa?</h2>
          <p className="sub">Un estudio hecho con tu nombre y tu fecha, no un texto genérico de horóscopo.</p>
          <div className="grid g4">
            {INCLUYE.map((x) => (
              <div className="card" key={x.t}><span className="ic" aria-hidden="true">{x.i}</span><h3>{x.t}</h3><p>{x.d}</p></div>
            ))}
          </div>
        </section>

        <section className="sec" id="como">
          <h2>Cómo funciona</h2>
          <p className="sub">Tres pasos, todo por WhatsApp y en pocos minutos.</p>
          <div className="grid g3">
            {PASOS.map((p) => (
              <div className="card" key={p.n}><div className="num">{p.n}</div><h3>{p.t}</h3><p>{p.d}</p></div>
            ))}
          </div>
        </section>

        <section className="sec" id="precio">
          <h2>Tu Mapa del Alma completo</h2>
          <p className="sub">Pago único. Sin suscripciones.</p>
          <div className="price">
            <div className="v">US$ 10</div>
            <small>El pago seguro te muestra el valor en tu moneda local · tarjeta de crédito o débito</small>
            <ul>
              <li>Número del alma y pirámides de tu nombre</li>
              <li>Rasgos de tu signo</li>
              <li>Plan sencillo de qué hacer</li>
              <li>Enlace personal con contraseña + PDF</li>
            </ul>
            <div className="cta" style={{ justifyContent: 'center' }}>
              {waUrl && <a className="btn" href={waUrl} data-ev="Contact">Empezar por WhatsApp ✨</a>}
              {checkout && <a className={waUrl ? 'btn sec' : 'btn'} href={checkout} data-ev="InitiateCheckout">{waUrl ? 'Pagar directo' : 'Quiero mi Mapa del Alma'}</a>}
            </div>
          </div>
        </section>

        <section className="sec" id="faq">
          <h2>Preguntas frecuentes</h2>
          <div style={{ maxWidth: 780, margin: '24px auto 0' }}>
            {FAQ.map((f) => (
              <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
            ))}
          </div>
        </section>

        <section className="sec" style={{ textAlign: 'center' }}>
          <h2>Conoce lo que tu nombre guarda</h2>
          <p className="sub">Empieza hoy y recibe tu mapa personal por WhatsApp.</p>
          {principal && <a className="btn" href={principal} data-ev={waUrl ? 'Contact' : 'InitiateCheckout'}>Quiero mi Mapa del Alma ✨</a>}
        </section>

        <footer className="foot">
          <p>Mapa del Alma es una herramienta de autoconocimiento y entretenimiento. No hace diagnósticos ni promesas de resultados y no reemplaza el consejo de profesionales de la salud, del derecho o de las finanzas.</p>
          <p>© {new Date().getFullYear()} Mapa del Alma</p>
        </footer>
      </div>

      {principal && (
        <div className="stick"><a className="btn" href={principal} data-ev={waUrl ? 'Contact' : 'InitiateCheckout'}>Quiero mi Mapa del Alma · US$ 10</a></div>
      )}
    </>
  )
}
