import type { Metadata } from 'next'
import Quiz from './Quiz'
import { CSS } from '../mapa-astral/css'
import { QCSS, QCSS2 } from './css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tu lectura personalizada | Mapa del Alma',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export default function Pagina() {
  // links reais de pagamento vêm do Easypanel (teste): QUIZ_LINK_BR (Asaas, R$ 49) e QUIZ_LINK_USD (Kiwify; padrão = o mesmo do site em espanhol)
  const linkBR = String(process.env.QUIZ_LINK_BR || '/api/pagar-br').trim()
  const linkUSD = String(process.env.QUIZ_LINK_USD || process.env.LINK_CHECKOUT_INTERNACIONAL || '').trim()
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Inter:wght@400;500;600;700;800&display=swap" />
      <style dangerouslySetInnerHTML={{ __html: CSS + QCSS + QCSS2 }} />
      <div className="sky" aria-hidden="true" />
      <Quiz linkBR={linkBR} linkUSD={linkUSD} />
    </>
  )
}
