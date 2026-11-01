-- =====================================================================
-- Radar de Vendas — atualização 008: sinal de vida do robô
-- O robô grava a cada ciclo; o painel avisa se ele parar.
-- Cole no Supabase > SQL Editor > New query > Run (depois do 001 ao 007).
-- =====================================================================
create table if not exists worker_status (
  id int primary key default 1 check (id = 1),
  beat_at timestamptz not null default now(),
  started_at timestamptz,
  info jsonb not null default '{}'::jsonb
);
insert into worker_status (id) values (1) on conflict do nothing;
alter table worker_status enable row level security;
drop policy if exists ler on worker_status;
create policy ler on worker_status for select to authenticated using (public.is_team());
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table worker_status';
  exception when others then null;
  end;
end $$;
