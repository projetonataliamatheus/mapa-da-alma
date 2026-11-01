-- =====================================================================
-- Radar de Vendas — atualização 011: uma resposta por vez em cada conversa
-- Evita duas respostas ao mesmo tempo para o mesmo cliente.
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001 ao 010).
-- =====================================================================
alter table leads add column if not exists reply_lock_until timestamptz;
