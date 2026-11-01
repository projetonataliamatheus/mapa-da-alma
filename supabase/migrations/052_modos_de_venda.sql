-- Mapa da Alma: modos de venda (Consulta x Modo Grazi). Cada conversa e cada venda registra o modo usado.
alter table leads add column if not exists modo_venda text;
alter table leads add column if not exists modo_venda_venda text;
alter table payments add column if not exists modo_venda text;
create index if not exists leads_modo_venda on leads(modo_venda);
notify pgrst, 'reload schema';
