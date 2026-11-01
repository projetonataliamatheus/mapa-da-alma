import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Resposta fixa para a página Domínios confirmar que o domínio chega neste sistema. */
export async function GET() {
  return NextResponse.json({ radar: true }, { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } });
}
