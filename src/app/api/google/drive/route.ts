import { NextResponse } from 'next/server';
import { withUser } from '@/lib/supabase/server';
import { oauthConfigured, getDriveIntegration, disconnectDrive, redirectUri } from '@/lib/drive';

export const dynamic = 'force-dynamic';

/** Situação da conexão com o Google Drive. */
export const GET = withUser(async () => {
  const cur = await getDriveIntegration();
  return NextResponse.json({
    configured: oauthConfigured(),
    connected: !!cur?.refresh_token,
    email: cur?.email || null,
    root_url: cur?.root_url || null,
    error: cur?.error || null,
    redirect_uri: redirectUri(),
  });
});

export const DELETE = withUser(async () => {
  await disconnectDrive();
  return NextResponse.json({ ok: true });
}, { master: true });
