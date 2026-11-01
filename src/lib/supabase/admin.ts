import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

let client: SupabaseClient | null = null;

/**
 * Sempre lê o banco na hora (cache: 'no-store'): o Next guardava as consultas em cache e o link da prévia
 * continuava mostrando a versão antiga depois de um ajuste.
 * Cliente com a chave de serviço. Só para o servidor e o robô. */
export function admin(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase não configurado: faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
    // nenhuma consulta ao banco pode ficar presa: 30 s e desiste (o robô tenta de novo no próximo ciclo)
    const timedFetch: typeof fetch = (input: any, init: any = {}) => fetch(input, { ...init, cache: 'no-store', signal: init.signal || AbortSignal.timeout(30_000) });
    // Node 20 não tem WebSocket nativo: sem isto o supabase-js novo trava o robô ("detected without native WebSocket support")
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: timedFetch }, realtime: { transport: WebSocket as any } });
  }
  return client;
}
