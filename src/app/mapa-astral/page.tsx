import type { Metadata } from 'next'
import TesteGratis from './TesteGratis'
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

const CSS = `
:root{--bg:#07031a;--bg2:#140a33;--card:rgba(255,255,255,.055);--line:rgba(243,223,162,.26);--gold:#f3dfa2;--gold2:#c9a24a;--txt:#f6f1ff;--mut:#c9bde6;--btn:linear-gradient(135deg,#fff0b8,#e3b94f 55%,#b98a2e);--rose:#ff8fb1}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--txt);font-family:Inter,system-ui,-apple-system,"Segoe UI",Arial,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
.sky{position:fixed;inset:0;z-index:-1;background:radial-gradient(900px 520px at 78% -8%,#5a2bb3 0%,transparent 62%),radial-gradient(700px 500px at 0% 30%,#2a1066 0%,transparent 60%),linear-gradient(180deg,var(--bg2),var(--bg) 70%)}
.sky::before,.sky::after{content:"";position:absolute;inset:0;background-image:radial-gradient(1.2px 1.2px at 12% 18%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 33% 64%,#fff 50%,transparent 51%),radial-gradient(1.6px 1.6px at 55% 28%,#f3dfa2 50%,transparent 51%),radial-gradient(1px 1px at 72% 78%,#fff 50%,transparent 51%),radial-gradient(1.3px 1.3px at 90% 42%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 22% 88%,#f3dfa2 50%,transparent 51%),radial-gradient(1.4px 1.4px at 64% 10%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 44% 48%,#fff 50%,transparent 51%);background-size:420px 420px;opacity:.7}
.sky::after{background-size:260px 260px;opacity:.35;transform:translate(60px,40px)}
.w{width:min(1120px,100% - 32px);margin-inline:auto}
h1,h2,h3,h4{font-family:Cinzel,Georgia,"Times New Roman",serif;letter-spacing:.02em;line-height:1.15;margin:0}
.top{display:flex;align-items:center;justify-content:space-between;padding:18px 0}
.logo{font-family:Cinzel,Georgia,serif;font-weight:700;letter-spacing:.2em;color:var(--gold);font-size:15px;text-decoration:none;display:flex;gap:10px;align-items:center}
.logo i{font-style:normal;display:inline-grid;place-items:center;width:30px;height:30px;border-radius:50%;border:1px solid var(--line)}
.btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:15px 28px;border-radius:999px;font-weight:800;font-size:16px;text-decoration:none;color:#2a1259;background:var(--btn);box-shadow:0 10px 34px rgba(227,185,79,.38),inset 0 1px 0 rgba(255,255,255,.6);transition:transform .18s,box-shadow .18s;border:0;cursor:pointer;font-family:inherit;text-align:center}
.btn::after{content:"";position:absolute;top:0;left:-70%;width:45%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.65),transparent);transform:skewX(-20deg);animation:shine 3.6s ease-in-out infinite}
.btn:hover{transform:translateY(-3px) scale(1.02);box-shadow:0 16px 42px rgba(227,185,79,.55)}
.btn:active{transform:scale(.98)}
.btn.sec{background:rgba(255,255,255,.06);color:var(--gold);border:1.5px solid var(--line);box-shadow:none}.btn.sec::after{display:none}
.btn.sm{padding:10px 20px;font-size:14px}
.btn.big{width:100%;padding:18px 26px;font-size:17px}
.pulse{animation:pulse 2.4s ease-in-out infinite}
@keyframes pulse{0%,100%{box-shadow:0 10px 34px rgba(227,185,79,.38),0 0 0 0 rgba(243,223,162,.5)}50%{box-shadow:0 10px 34px rgba(227,185,79,.5),0 0 0 14px rgba(243,223,162,0)}}
@keyframes shine{0%,55%{left:-70%}100%{left:130%}}
.hero{display:grid;grid-template-columns:1.05fr .95fr;gap:44px;align-items:center;padding:30px 0 70px}
.kick{display:inline-block;color:var(--gold);border:1px solid var(--line);background:rgba(243,223,162,.07);border-radius:999px;padding:6px 14px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px}
h1{font-size:clamp(30px,5vw,54px);color:#fff}
h1 em{font-style:normal;background:linear-gradient(90deg,#fff0b8,#e3b94f,#ff9ec0);-webkit-background-clip:text;background-clip:text;color:transparent}
.lead{font-size:clamp(16px,2vw,19px);color:var(--mut);margin:18px 0 24px;max-width:560px}
.mini{display:flex;flex-wrap:wrap;gap:8px 18px;margin:22px 0 0;color:var(--mut);font-size:14px;padding:0;list-style:none}
.mini li::before{content:"✓";color:var(--gold);margin-right:6px}
.heroR{position:relative}
.wheel{position:absolute;inset:-60px -40px auto auto;width:min(520px,95%);aspect-ratio:1;opacity:.5;z-index:-1;animation:spin 90s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.sec{padding:60px 0}
.sec>h2,.h2{font-size:clamp(24px,3.6vw,40px);text-align:center;color:#fff;margin-bottom:12px}
.sub{text-align:center;color:var(--mut);max-width:660px;margin:0 auto 34px}
.grid{display:grid;gap:16px}.g4{grid-template-columns:repeat(4,1fr)}.g3{grid-template-columns:repeat(3,1fr)}.g2{grid-template-columns:repeat(2,1fr)}
.card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:22px;backdrop-filter:blur(8px);transition:transform .25s,border-color .25s,box-shadow .25s}
.grid .card:hover{transform:translateY(-4px);border-color:rgba(243,223,162,.6);box-shadow:0 14px 40px rgba(0,0,0,.35)}
.card .ic{font-size:30px;color:var(--gold);display:block;margin-bottom:10px;font-family:Georgia,serif}
.card h3,.card h4{font-size:18px;color:#fff;margin-bottom:8px}
.card p{margin:0 0 8px;color:var(--mut);font-size:15px}
.num{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-family:Cinzel,serif;font-weight:700;color:#2a1259;background:var(--btn);margin-bottom:12px}
.senal{border-color:rgba(255,143,177,.35);background:linear-gradient(180deg,rgba(255,143,177,.08),rgba(255,255,255,.03))}
.price{max-width:540px;margin:0 auto;text-align:center;background:linear-gradient(180deg,rgba(243,223,162,.14),rgba(255,255,255,.04));border:1.5px solid var(--gold2);border-radius:26px;padding:34px 24px;box-shadow:0 0 80px rgba(201,162,74,.18)}
.price .v{font-family:Cinzel,serif;font-size:60px;color:var(--gold);line-height:1}
.price small{display:block;color:var(--mut);margin:8px 0 18px}
.price ul{list-style:none;padding:0;margin:0 0 22px;text-align:left;display:inline-block}
.price li{margin:6px 0}.price li::before{content:"✦";color:var(--gold);margin-right:10px}
.trust{display:flex;flex-wrap:wrap;justify-content:center;gap:10px 22px;color:var(--mut);font-size:13px;margin-top:16px}
details{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin:10px 0}
summary{cursor:pointer;font-weight:600;color:#fff;list-style:none}summary::-webkit-details-marker{display:none}
summary::after{content:"+";float:right;color:var(--gold);font-size:20px;line-height:1}details[open] summary::after{content:"–"}
details p{color:var(--mut);margin:10px 0 0}
.foot{border-top:1px solid var(--line);padding:30px 0 100px;color:var(--mut);font-size:13px;text-align:center}.foot p{max-width:780px;margin:8px auto}
.stick{position:fixed;left:0;right:0;bottom:0;z-index:50;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:rgba(7,3,26,.92);backdrop-filter:blur(10px);border-top:1px solid var(--line);display:none}
/* teste gratuito */
.tf,.an,.res{background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.04));border:1.5px solid rgba(243,223,162,.4);border-radius:24px;padding:26px;box-shadow:0 20px 70px rgba(0,0,0,.45),0 0 60px rgba(120,70,220,.25);backdrop-filter:blur(10px)}
.tf-t h3{font-size:24px;color:#fff}.tf-t p{color:var(--mut);margin:8px 0 18px;font-size:15px}
.tf label,.tf legend{display:block;font-size:13px;color:var(--gold);margin:14px 0 6px;letter-spacing:.04em;padding:0}.tf fieldset{border:0;margin:0;padding:0}
.tf input,.tf select{width:100%;padding:14px 14px;border-radius:12px;border:1px solid rgba(243,223,162,.3);background:rgba(7,3,26,.55);color:#fff;font-size:16px;font-family:inherit;outline:none;transition:border-color .2s,box-shadow .2s}
.tf input:focus,.tf select:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(243,223,162,.18)}
.tf select option{color:#111}
.dt{display:grid;grid-template-columns:.8fr 1.4fr 1fr;gap:10px}
.tf .btn{margin-top:20px}
.err{color:#ffb4b4;background:rgba(255,80,80,.12);border:1px solid rgba(255,120,120,.4);padding:10px 12px;border-radius:10px;font-size:14px;margin:14px 0 0}
.fine{font-size:12px;color:var(--mut);text-align:center;margin:12px 0 0}
.an{text-align:center;padding:36px 22px}.an h3{font-size:22px;margin:22px 0 16px;color:#fff}
.an-orb{position:relative;width:110px;height:110px;margin:0 auto}
.an-orb i{position:absolute;inset:0;border-radius:50%;border:1.5px solid rgba(243,223,162,.7);border-top-color:transparent;animation:spin 3s linear infinite}
.an-orb i:nth-child(2){inset:12px;animation-duration:2s;animation-direction:reverse;border-color:rgba(255,143,177,.7);border-bottom-color:transparent}
.an-orb i:nth-child(3){inset:26px;animation-duration:1.4s}
.an-orb b{position:absolute;inset:0;display:grid;place-items:center;font-size:30px;color:var(--gold);animation:tw 1.6s ease-in-out infinite}
@keyframes tw{50%{opacity:.4;transform:scale(.85)}}
.an-l{list-style:none;padding:0;margin:0 auto;max-width:360px;text-align:left}
.an-l li{padding:6px 0;color:rgba(201,189,230,.45);font-size:15px;transition:all .4s;display:flex;gap:10px}
.an-l li.now{color:#fff;transform:translateX(4px)}.an-l li.ok{color:var(--gold)}
.res{padding:22px;max-width:1040px;margin:30px auto 0}
.res-h{text-align:center;margin-bottom:18px}.res-h h3{font-size:clamp(22px,3.4vw,32px);color:#fff;margin-bottom:8px}.res-h p{color:var(--mut);font-size:14px;margin:0}
.nums{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px}
.nums div{background:rgba(7,3,26,.5);border:1px solid var(--line);border-radius:14px;padding:12px 6px}
.nums small{display:block;color:var(--mut);font-size:11px;letter-spacing:.05em;text-transform:uppercase}.nums b{font-family:Cinzel,serif;font-size:24px;color:var(--gold)}
.res .card{margin:14px 0}.res .em{color:var(--gold)!important;font-style:italic}
.sub-t{text-align:center;font-size:clamp(20px,3vw,28px);margin:30px 0 14px;color:#fff}
.tri{display:grid;grid-template-columns:1fr 1fr;gap:14px}.tri .card{margin:0}
.pir{margin:10px auto 12px;text-align:center;font-family:"Cinzel",Georgia,serif;overflow:hidden}
.pir-r{display:flex;justify-content:center;gap:1px;width:100%;opacity:0;animation:fadeUp .5s forwards}
.pir-r span{flex:1 1 0;min-width:0;max-width:17px;text-align:center;font-size:clamp(8px,2.5vw,12px);color:var(--gold);line-height:1.55}
.pir-r:first-child span{color:#fff;text-shadow:0 0 10px rgba(243,223,162,.8)}
@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.arc{font-size:14px!important}.seq{background:rgba(255,143,177,.1);border:1px solid rgba(255,143,177,.45);border-radius:12px;padding:10px 12px;color:#fff!important;font-size:14px!important}
.seq b{display:block;color:var(--rose);font-family:Cinzel,serif;letter-spacing:.06em;margin-bottom:2px}
.warn{border-color:rgba(255,143,177,.5);background:linear-gradient(180deg,rgba(255,143,177,.1),rgba(255,255,255,.03))}.warn ul{margin:0;padding-left:20px;color:#fff}.warn li{margin:8px 0}
.chips{display:flex;flex-wrap:wrap;gap:8px}.chips span{border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:13px;color:var(--txt);background:rgba(7,3,26,.4)}
.lock{position:relative;margin-top:22px;border-radius:22px;overflow:hidden;border:1.5px solid var(--gold2);background:rgba(7,3,26,.6)}
.lock-b{position:absolute;inset:0;filter:blur(6px);opacity:.4;padding:24px;color:var(--mut);overflow:hidden}
.lock-c{position:relative;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:12px;text-align:center;padding:34px 22px;background:linear-gradient(180deg,rgba(7,3,26,.5),rgba(7,3,26,.92) 35%)}
.lock-c h3{font-size:clamp(19px,2.8vw,26px);color:#fff}.lock-c h3 em{font-style:normal;color:var(--gold)}.lock-c>p{max-width:520px;color:var(--mut);margin:0}
.lk{font-size:30px}.pr b{font-family:Cinzel,serif;font-size:40px;color:var(--gold);display:block;line-height:1}.pr small{color:var(--mut)}
.lock-c .btn{max-width:460px}
.done{text-align:center}.done h3{font-size:22px;color:#fff;margin:6px 0}.done p{color:var(--mut);margin:0 0 14px}
#resultado:empty{display:none}
.rv{opacity:0;transform:translateY(22px);transition:opacity .7s ease,transform .7s ease}.rv.in{opacity:1;transform:none}
.nojs .rv{opacity:1;transform:none}
@media(max-width:900px){.hero{grid-template-columns:1fr;padding-top:6px;gap:28px}.g4{grid-template-columns:1fr 1fr}.g3{grid-template-columns:1fr}.stick{display:block}.top .btn{display:none}.wheel{inset:-30px -120px auto auto;opacity:.3}}
@media(max-width:640px){.g4,.g2,.tri{grid-template-columns:1fr}.tf,.an,.res{padding:18px 14px;border-radius:20px}.res .card{padding:16px}.nums b{font-size:20px}.sec{padding:40px 0}.hero{padding-bottom:40px}.btn.big{padding:16px 18px;font-size:16px}.lock-c{padding:26px 14px}.dt{grid-template-columns:.8fr 1.3fr 1fr;gap:8px}.wheel{display:none}h1{font-size:clamp(27px,8vw,38px)}.foot{padding-bottom:110px}}
@media(max-width:420px){.nums{grid-template-columns:1fr 1fr 1fr;gap:6px}.nums small{font-size:9px}.chips span{font-size:12px}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.rv{opacity:1;transform:none}}
`

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
