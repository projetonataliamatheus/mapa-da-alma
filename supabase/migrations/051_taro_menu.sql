-- Mapa da Alma: menu Tarô na barra lateral (quem já via o Gerador de mapas passa a ver o Tarô; quem gerava mapas pode tirar tarô).
update team_members set perms = (
  select array_agg(distinct x) from unnest(
    perms
    || case when 'mapas' = any(perms) then array['taro'] else array[]::text[] end
    || case when 'mapas.gerar' = any(perms) then array['taro.gerar'] else array[]::text[] end
  ) as x
) where perms is not null and array_length(perms, 1) > 0 and role not in ('master','admin');
notify pgrst, 'reload schema';
