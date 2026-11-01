-- 038: Verificação em 2 etapas obrigatória também no banco: dados da equipe só para sessões com código (aal2)
-- Rodar depois que o painel com a tela de 2 etapas estiver no ar.

-- 2 etapas: a sessão precisa ter passado pelo código do autenticador
create or replace function public.aal2() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

create or replace function public.is_team() returns boolean
language sql stable security definer set search_path = public as $$
  select public.aal2() and exists (select 1 from public.team_members where id = auth.uid() and active)
$$;

create or replace function public.is_master() returns boolean
language sql stable security definer set search_path = public as $$
  select public.aal2() and exists (select 1 from public.team_members where id = auth.uid() and active and role = 'master')
$$;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.has_perm(text)'::regprocedure);
  if position('public.aal2()' in d) = 0 then
    d := replace(d, 'where m.id = auth.uid() and m.active', 'where public.aal2() and m.id = auth.uid() and m.active');
    execute d;
  end if;
end $$;

