-- Mapa da Alma: senha de acesso ao mapa completo (enviada ao cliente depois do pagamento)
alter table mapas add column if not exists senha text;
alter table mapas add column if not exists senha_em timestamptz;
notify pgrst, 'reload schema';
