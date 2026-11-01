-- =====================================================================
-- Radar de Vendas — atualização 006: Master, perfis e permissões por pessoa
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001 ao 005).
-- =====================================================================

alter table team_members drop constraint if exists team_members_role_check;
alter table team_members add column if not exists perms text[] not null default '{}';
alter table team_members add column if not exists created_by uuid;
alter table team_members add column if not exists active boolean not null default true;

-- o administrador mais antigo vira Master; outros administradores viram Gerente
update team_members set role = 'master'
 where id = (select id from team_members where role in ('admin','master') order by created_at limit 1)
   and not exists (select 1 from team_members where role = 'master');
update team_members set role = 'gerente' where role = 'admin';

alter table team_members add constraint team_members_role_check
  check (role in ('master','gerente','vendedor','atendente','personalizado'));

-- a primeira conta criada vira Master
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.team_members) = 0 then
    insert into public.team_members (id, name, email, role)
    values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email, 'master')
    on conflict (id) do nothing;
  elsif coalesce(new.raw_app_meta_data->>'invited', '') = 'true' then
    insert into public.team_members (id, name, email, role)
    values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email,
            case when new.raw_app_meta_data->>'role' in ('gerente','vendedor','atendente','personalizado')
                 then new.raw_app_meta_data->>'role' else 'vendedor' end)
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

-- membro desativado deixa de ser da equipe
create or replace function public.is_team() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where id = auth.uid() and active)
$$;

create or replace function public.is_master() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where id = auth.uid() and active and role = 'master')
$$;

-- permissão efetiva (mesma regra do painel; perfis sem lista usam o padrão do perfil)
create or replace function public.has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_members m
     where m.id = auth.uid() and m.active
       and (
         m.role = 'master'
         or (p not in ('config','checkout.editor','custos.tetos') and (
              p = any(m.perms)
              or (coalesce(array_length(m.perms, 1), 0) = 0 and (
                   m.role = 'gerente'
                   or (m.role = 'vendedor' and p = any(array['visao','prospeccao','leads','conversas','instagram','servicos','links','modelos','aprendizado','prospeccao.buscar','conversas.responder','leads.editar','previas.gerar','links.criar']))
                   or (m.role in ('atendente','personalizado') and p = any(array['visao','leads','conversas','instagram','conversas.responder','leads.editar']))
              ))
         ))
       )
  )
$$;

-- regras no banco: todos da equipe leem; só quem tem a permissão altera
create or replace function public._perm_policy(t text, p text) returns void
language plpgsql as $$
begin
  execute format('drop policy if exists equipe on %I', t);
  execute format('drop policy if exists ler on %I', t);
  execute format('drop policy if exists alterar on %I', t);
  execute format('create policy ler on %I for select to authenticated using (public.is_team())', t);
  execute format('create policy alterar on %I for all to authenticated using (public.has_perm(%L)) with check (public.has_perm(%L))', t, p, p);
end $$;

select public._perm_policy('services', 'servicos.editar');
select public._perm_policy('approaches', 'abordagens.editar');
select public._perm_policy('site_templates', 'modelos.editar');
select public._perm_policy('whatsapp_numbers', 'numeros.gerenciar');
select public._perm_policy('checkout_links', 'links.criar');
select public._perm_policy('knowledge_docs', 'conhecimento.enviar');
select public._perm_policy('settings', 'config');
select public._perm_policy('team_members', 'config');
select public._perm_policy('usage_log', 'config');

-- leads: todos atualizam (conversa, etapa), mas apagar exige permissão
drop policy if exists equipe on leads;
drop policy if exists ler on leads;
drop policy if exists alterar on leads;
drop policy if exists apagar on leads;
drop policy if exists inserir on leads;
create policy ler on leads for select to authenticated using (public.is_team());
create policy inserir on leads for insert to authenticated with check (public.is_team());
create policy alterar on leads for update to authenticated using (public.has_perm('leads.editar') or public.has_perm('conversas.responder')) with check (public.is_team());
create policy apagar on leads for delete to authenticated using (public.has_perm('leads.excluir'));

drop function public._perm_policy(text, text);

-- imagens públicas do checkout e das prévias (logo, fotos), enviadas pelo editor
do $$
begin
  begin
    insert into storage.buckets (id, name, public) values ('publico', 'publico', true) on conflict (id) do nothing;
    execute 'drop policy if exists publico_enviar on storage.objects';
    execute 'create policy publico_enviar on storage.objects for insert to authenticated with check (bucket_id = ''publico'' and (public.has_perm(''checkout.editor'') or public.has_perm(''modelos.editar'')))';
    execute 'drop policy if exists publico_apagar on storage.objects';
    execute 'create policy publico_apagar on storage.objects for delete to authenticated using (bucket_id = ''publico'' and public.is_master())';
  exception when others then raise notice 'storage: %', sqlerrm;
  end;
end $$;
