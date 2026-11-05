import type { Metadata } from 'next'
import { CSS } from '../mapa-astral/css'
import { siteUrl } from '@/lib/site'

export const revalidate = 1800

const TITULO = 'Mapa Astral e Cabalístico personalizado: descubra seu número da alma | Mapa da Alma'
const DESC = 'Receba pelo WhatsApp o seu mapa de numerologia cabalística e astrologia com seu nome e data de nascimento: número da alma, pirâmides do nome, signo e um plano para os próximos passos. Pagamento único de R$ 49.'
// Número do WhatsApp de vendas (chip novo). Pode trocar pela variável WHATSAPP_VENTAS_BR no Easypanel.
const WA = String(process.env.WHATSAPP_VENTAS_BR || '5519997732515').replace(/\D/g, '')
const WA_MSG = 'Olá! Quero o meu Mapa da Alma completo ✨'

export function generateMetadata(): Metadata {
  const base = siteUrl()
  return {
    title: TITULO,
    description: DESC,
    keywords: ['mapa astral', 'mapa cabalístico', 'numerologia cabalística', 'número da alma', 'mapa da alma', 'pirâmides do nome', 'mapa astral online'],
    alternates: { canonical: base + '/' },
    robots: { index: true, follow: true },
    openGraph: { title: TITULO, description: DESC, url: base + '/', siteName: 'Mapa da Alma', locale: 'pt_BR', type: 'website' },
    twitter: { card: 'summary_large_image', title: TITULO, description: DESC },
    other: { 'content-language': 'pt-BR' },
  }
}

const FAQ: { q: string; a: string }[] = [
  { q: 'O que é o Mapa da Alma?', a: 'É um estudo personalizado que une numerologia cabalística e astrologia. A partir do seu nome completo de nascimento e da sua data de nascimento calculamos o seu número da alma, as suas pirâmides do nome e os traços do seu signo, e reunimos tudo em um mapa que você lê com calma no celular.' },
  { q: 'O que é um mapa cabalístico?', a: 'Na numerologia cabalística cada letra do seu nome tem um valor numérico. Esses números formam triângulos e pirâmides, que falam de tendências, talentos e temas que se repetem na sua vida.' },
  { q: 'Como recebo o meu mapa?', a: 'Pelo WhatsApp. Você envia o nome completo e a data de nascimento, confirma o pagamento e recebe um link pessoal e exclusivo com o seu mapa, além de um PDF para guardar.' },
  { q: 'Preciso da hora de nascimento?', a: 'Não. O nome completo de nascimento e a data de nascimento são suficientes.' },
  { q: 'Quanto custa e como pago?', a: 'O Mapa da Alma completo custa R$ 49, pagamento único e sem mensalidade. O pagamento é seguro e feito por Pix ou cartão.' },
  { q: 'O mapa prevê o meu futuro?', a: 'Não. É uma ferramenta de autoconhecimento: ajuda você a entender seus traços e ciclos e a pensar nas suas decisões com mais clareza. Não promete resultados nem substitui a orientação de um profissional de saúde, de direito ou de finanças.' },
  { q: 'As minhas informações são privadas?', a: 'Sim. O seu mapa tem um link pessoal com senha, não é público e não aparece em buscadores.' },
]

const INCLUI = [
  { i: '✦', t: 'Seu número da alma', d: 'O que o seu nome revela sobre o que você realmente deseja e o que te move por dentro.' },
  { i: '△', t: '4 pirâmides cabalísticas', d: 'Vida, pirâmide pessoal, social e do destino: seus ciclos, desafios e sequências que se repetem.' },
  { i: '☾', t: 'Seu signo e seu dia de nascimento', d: 'Como se expressam as suas forças e os seus pontos de atenção.' },
  { i: '☼', t: 'O que fazer: plano A, B e C', d: 'Passos claros para aprender a lidar com cada sinal no amor, no trabalho e no dinheiro.' },
]
const SINAIS = [
  { t: 'Os mesmos problemas, de novo e de novo', d: 'Mudam as pessoas e as situações, mas a história se repete. O mapa mostra o padrão por trás.' },
  { t: 'O dinheiro entra e vai embora', d: 'Você se esforça e mesmo assim ele não fica. Descubra qual ciclo do seu mapa está por trás.' },
  { t: 'Amor e relações que machucam', d: 'Dar muito, receber pouco, escolher o mesmo de novo. Entenda por que acontece e como lidar com isso.' },
  { t: 'Bloqueios que você não sabe explicar', d: 'Cansaço, medo de decidir, a sensação de que algo te segura. Sua data e seu nome têm pistas.' },
]
const PASSOS = [
  { n: '1', t: 'Escolha como começar', d: 'Pague direto pelo link seguro ou chame no WhatsApp para tirar dúvidas antes.' },
  { n: '2', t: 'Envie seus dados', d: 'Nome completo de nascimento e data de nascimento, pelo WhatsApp.' },
  { n: '3', t: 'Receba o seu mapa', d: 'Link pessoal com senha e PDF, direto no seu WhatsApp.' },
]

export default function Pagina() {
  const base = siteUrl()
  const pagar = '/api/pagar-br'
  const pixel = String(process.env.META_DATASET_ID || '').replace(/\D/g, '')
  const wa = `https://wa.me/${WA}?text=${encodeURIComponent(WA_MSG)}`
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'Product', name: 'Mapa da Alma completo', description: DESC, brand: { '@type': 'Brand', name: 'Mapa da Alma' }, url: base + '/', inLanguage: 'pt-BR', offers: { '@type': 'Offer', price: '49.00', priceCurrency: 'BRL', availability: 'https://schema.org/InStock', url: base + '/' } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ]
  const Botoes = ({ big = true }: { big?: boolean }) => (
    <div style={{ display: 'grid', gap: 12, maxWidth: 440 }}>
      {pagar && <a className={`btn${big ? ' big' : ''} pulse`} href={pagar} data-ev="InitiateCheckout">✨ Quero meu mapa completo · R$ 49</a>}
      <a className={`btn${big ? ' big' : ''}${pagar ? ' sec' : ' pulse'}`} href={wa} data-ev="Contact">💬 Chamar no WhatsApp</a>
    </div>
  )
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Inter:wght@400;500;600;700;800&display=swap" />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {pixel && (
        <script dangerouslySetInnerHTML={{ __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');` }} />
      )}
      <script dangerouslySetInnerHTML={{ __html: `document.documentElement.lang='pt-BR';document.documentElement.classList.add('nojs');(function(){try{document.documentElement.classList.remove('nojs');var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('.rv:not(.in)').forEach(function(el){io.observe(el)})})}catch(e){document.documentElement.classList.add('nojs')}})();document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[data-ev]');if(!a||!window.fbq)return;var n=a.getAttribute('data-ev');fbq('track',n,n==='InitiateCheckout'?{value:49,currency:'BRL'}:{})});` }} />
      <div className="sky" aria-hidden="true" />
      <div className="w">
        <header className="top">
          <a className="logo" href="/"><i>✦</i>MAPA DA ALMA</a>
          <a className="btn sm" href={wa} data-ev="Contact">WhatsApp</a>
        </header>

        <section className="hero" style={{ display: 'block', textAlign: 'center' }}>
          <span className="kick">Numerologia cabalística + astrologia</span>
          <h1>Seu nome e sua data de nascimento guardam <em>sinais que se repetem na sua vida</em></h1>
          <p className="lead" style={{ margin: '16px auto 24px', maxWidth: 640 }}>Descubra o seu Mapa Astral e Cabalístico: seu número da alma, suas 4 pirâmides, seu signo e os pontos de atenção do seu mapa. Receba tudo pelo WhatsApp.</p>
          <div style={{ display: 'flex', justifyContent: 'center' }}><Botoes /></div>
          <ul className="mini" style={{ justifyContent: 'center' }}>
            <li>Pagamento único de R$ 49</li>
            <li>Pix ou cartão</li>
            <li>Sem a hora de nascimento</li>
            <li>Entrega pelo WhatsApp</li>
          </ul>
        </section>

        <section className="sec rv">
          <h2>Algum desses sinais soa familiar?</h2>
          <p className="sub">Muita gente chega ao mapa com estas perguntas. Seu nome e sua data ajudam a entender por que esses temas se repetem.</p>
          <div className="grid g4">{SINAIS.map((x) => (<div className="card senal" key={x.t}><h3>{x.t}</h3><p>{x.d}</p></div>))}</div>
        </section>

        <section className="sec rv" id="inclui">
          <h2>O que você vai descobrir no mapa completo?</h2>
          <p className="sub">Um estudo feito com o seu nome e a sua data, não um texto genérico de horóscopo.</p>
          <div className="grid g4">{INCLUI.map((x) => (<div className="card" key={x.t}><span className="ic" aria-hidden="true">{x.i}</span><h3>{x.t}</h3><p>{x.d}</p></div>))}</div>
        </section>

        <section className="sec rv" id="como">
          <h2>Como funciona</h2>
          <p className="sub">Três passos, em poucos minutos.</p>
          <div className="grid g3">{PASSOS.map((p) => (<div className="card" key={p.n}><div className="num">{p.n}</div><h3>{p.t}</h3><p>{p.d}</p></div>))}</div>
        </section>

        <section className="sec rv" id="preco">
          <h2>Seu Mapa da Alma completo</h2>
          <p className="sub">Pagamento único. Sem assinatura.</p>
          <div className="price">
            <div className="v">R$ 49</div>
            <small>Pix ou cartão de crédito · pagamento seguro</small>
            <ul>
              <li>Número da alma e suas 4 pirâmides</li>
              <li>Seu signo e seu dia de nascimento</li>
              <li>O que fazer: plano A, B e C para cada sinal</li>
              <li>Link pessoal com senha + PDF</li>
            </ul>
            <Botoes />
            <div className="trust"><span>🔒 Pagamento seguro</span><span>💬 Entrega pelo WhatsApp</span><span>♾ Uma vez só, para sempre</span></div>
          </div>
        </section>

        <section className="sec rv" id="faq">
          <h2>Perguntas frequentes</h2>
          <div style={{ maxWidth: 780, margin: '24px auto 0' }}>{FAQ.map((f) => (<details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>))}</div>
        </section>

        <footer className="foot">
          <p>O Mapa da Alma é uma ferramenta de autoconhecimento e entretenimento. Não faz diagnósticos nem promessas de resultado e não substitui a orientação de profissionais de saúde, de direito ou de finanças.</p>
          <p>© {new Date().getFullYear()} Mapa da Alma</p>
        </footer>
      </div>
      <div className="stick"><a className="btn big" href={pagar || wa} data-ev={pagar ? 'InitiateCheckout' : 'Contact'}>{pagar ? '✨ Quero meu mapa · R$ 49' : '💬 Chamar no WhatsApp'}</a></div>
    </>
  )
}
