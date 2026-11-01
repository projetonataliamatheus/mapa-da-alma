import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { evo } from '@/lib/evolution';
import { logEvent } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/** Cria um novo número (instância na Evolution API). */
export const POST = withUser(
  async (req) => {
    const { label } = await req.json();
    const db = admin();
    const { count } = await db.from('whatsapp_numbers').select('id', { count: 'exact', head: true });
    if ((count || 0) >= 10) return NextResponse.json({ error: 'O limite é de 10 números.' }, { status: 400 });
    const name = `mapa-${Date.now().toString(36)}`;
    const created: any = await evo.create(name);
    const qr = created?.qrcode?.base64 || null;
    const { data } = await db
      .from('whatsapp_numbers')
      .insert({ label: label || `Linha ${String((count || 0) + 1).padStart(2, '0')}`, instance_name: name, status: 'qr', qr })
      .select('*')
      .single();
    await logEvent(null, 'number_created', 'wa', `${data.label} criada. Aguardando leitura do QR Code`);
    return NextResponse.json(data);
  },
  { perm: 'numeros.gerenciar' },
);
