-- Prévia do mapa com bloqueios: quando começou a contagem regressiva (primeira vez que o cliente abriu o link).
alter table mapas add column if not exists previa_inicio timestamptz;
notify pgrst, 'reload schema';
