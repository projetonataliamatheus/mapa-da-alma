import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { admin as db } from '@/lib/supabase/admin';
import { dataISO } from '@/lib/mapa-alma/servico';
import { nomeProprio } from '@/lib/mapa-alma/nome';
import { logEvent } from '@/lib/engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Recupera mapas apagados a partir das conversas: cada conversa guarda o link (mapa_slug), o nome, a data e a senha.
 * O mapa volta com o MESMO link e a MESMA senha; quem já pagou volta liberado. (O mapa é sempre recalculado do nome + data.)
 */
export const POST = withUser(async () => {
  const { data: leads } = await db().from('leads').select('id,name,stage,memory,mapa_slug,preview_slug').or('mapa_slug.not.is.null,preview_slug.not.is.null').limit(2000);
  let recuperados = 0, sem = 0;
  for (const l of leads || []) {
    const slug = l.mapa_slug || l.preview_slug;
    const { data: existe } = await db().from('mapas').select('id').eq('slug', slug).maybeSingle();
    if (existe) continue;
    const m: any = l.memory || {};
    const nasc = dataISO(m.mapa_nascimento);
    const nome = String(m.mapa_nome_completo || '').trim();
    if (!nome || !nasc) { sem++; continue; }
    const casal = /casal/i.test(String(m.mapa_tipo || '')) && m.mapa_nome_2 && dataISO(m.mapa_nascimento_2);
    const pago = l.stage === 'pago';
    const { error } = await db().from('mapas').insert({
      slug, lead_id: l.id, tipo: casal ? 'casal' : 'pessoal', nome: nomeProprio(nome), nascimento: nasc,
      nome2: casal ? nomeProprio(m.mapa_nome_2) : null, nascimento2: casal ? dataISO(m.mapa_nascimento_2) : null,
      liberado: pago, liberado_em: pago ? new Date().toISOString() : null, created_by: 'ia',
      ...(pago && m.senha_mapa ? { senha: m.senha_mapa, senha_em: new Date().toISOString() } : {}),
    });
    if (!error) recuperados++;
  }
  await logEvent(null, 'mapas_recuperados', 'ok', `${recuperados} mapa(s) recuperado(s) a partir das conversas`);
  return NextResponse.json({ ok: true, recuperados, sem_dados: sem });
}, { master: true });
