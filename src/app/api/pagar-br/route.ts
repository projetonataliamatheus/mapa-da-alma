import { NextResponse } from 'next/server';
import { linkPagamentoMapaBR } from '@/lib/asaas';

export const dynamic = 'force-dynamic';

/** Botão de pagamento da página de vendas em português: leva ao link de pagamento do Asaas (criado automaticamente na 1ª vez). */
export async function GET(req: Request) {
  const wa = `https://wa.me/${String(process.env.WHATSAPP_VENTAS_BR || '5519997732515').replace(/\D/g, '')}`;
  try {
    const manual = String(process.env.LINK_ASAAS_BR || '').trim();
    const url = manual || (await linkPagamentoMapaBR()).url;
    return NextResponse.redirect(url, 302);
  } catch (e) {
    console.error('pagar-br', e);
    return NextResponse.redirect(wa, 302);
  }
}
