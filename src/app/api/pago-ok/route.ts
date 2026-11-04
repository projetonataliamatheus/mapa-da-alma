export const dynamic = 'force-dynamic';
/** Página simples depois do pagamento no Stripe (espanhol). */
export async function GET() {
  return new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mapa del Alma</title><meta name="robots" content="noindex"></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 50% 20%,#5b2bb0,#1a0b3d 65%,#0d0620);color:#fff;font-family:system-ui,Arial,sans-serif;text-align:center;padding:20px">
<div style="max-width:380px"><div style="font-size:46px">✨</div><h1 style="color:#f3dfa2;font-size:24px">¡Pago recibido!</h1><p style="opacity:.92">Gracias por tu confianza. En unos minutos recibirás tu <b>Mapa del Alma completo</b> por WhatsApp. Puedes volver a la conversación.</p></div></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
