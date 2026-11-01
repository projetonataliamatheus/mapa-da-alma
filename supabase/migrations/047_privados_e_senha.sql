-- Mapa da Alma: mapas privados do Master, troca de senha obrigatória no 1º acesso e permissões novas do menu.

-- 1) mapa privado: só quem marcou (privado_de) vê — também no banco (RLS), não só no painel
alter table mapas add column if not exists privado_de uuid references auth.users on delete set null;
create index if not exists mapas_privado on mapas(privado_de);
drop policy if exists equipe on mapas;
create policy equipe on mapas for all to authenticated
  using (public.is_team() and (privado_de is null or privado_de = auth.uid()))
  with check (public.is_team() and (privado_de is null or privado_de = auth.uid()));

-- 2) troca de senha obrigatória no primeiro acesso de quem foi cadastrado pela equipe
alter table team_members add column if not exists trocar_senha boolean not null default false;

-- 3) permissões novas (menu do Mapa da Alma): quem já via Leads passa a ver Gerador de mapas e Clientes;
--    quem via Financeiro passa a ver Recibos; quem mandava prévias passa a gerar e enviar mapas
update team_members set perms = (
  select array_agg(distinct x) from unnest(
    perms
    || case when 'leads' = any(perms) then array['mapas','clientes','mapas.gerar'] else array[]::text[] end
    || case when 'financeiro' = any(perms) then array['recibos'] else array[]::text[] end
    || case when 'previas.gerar' = any(perms) then array['mapas.enviar'] else array[]::text[] end
  ) as x
) where perms is not null and array_length(perms, 1) > 0 and role not in ('master','admin');

notify pgrst, 'reload schema';
