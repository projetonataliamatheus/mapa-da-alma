-- =====================================================================
-- Radar de Vendas — atualização 010: memória de cada conversa
-- O que já se sabe do cliente, o que já foi dito e oferecido (para não repetir nem pular etapas).
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001 ao 009).
-- =====================================================================
alter table leads add column if not exists memory jsonb not null default '{}'::jsonb;
