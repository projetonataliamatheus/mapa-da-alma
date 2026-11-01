-- Simula o que o Supabase já tem pronto (para testar as migrações no CI)
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}');
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('t.uid', true), '')::uuid $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal', coalesce(nullif(current_setting('t.aal', true), ''), 'aal2')) $$;
create table if not exists auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid);
create or replace function auth.role() returns text language sql stable as $$ select 'service_role'::text $$;
do $$ begin create role authenticated; exception when others then null; end $$;
do $$ begin create role anon; exception when others then null; end $$;
do $$ begin create role service_role; exception when others then null; end $$;
do $$ begin create publication supabase_realtime; exception when others then null; end $$;
create schema if not exists storage;
create table if not exists storage.buckets (id text primary key, name text, public boolean);
create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create schema if not exists extensions;
