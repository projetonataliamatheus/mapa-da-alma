-- 024: controle da equipe — quem fez cada ação, responsável pela conversa e notas internas
alter table lead_events add column if not exists actor_id uuid;
alter table lead_events add column if not exists actor_name text;
create index if not exists lead_events_actor_idx on lead_events (actor_id, created_at desc);

alter table leads add column if not exists assigned_to uuid;
alter table leads add column if not exists assigned_name text;

create table if not exists lead_notes (
  id bigserial primary key,
  lead_id uuid not null references leads on delete cascade,
  author_id uuid,
  author_name text,
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists lead_notes_lead_idx on lead_notes (lead_id, created_at);
alter table lead_notes enable row level security;
drop policy if exists equipe on lead_notes;
create policy equipe on lead_notes for select to authenticated using (public.is_team());

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table lead_notes';
  exception when others then null;
  end;
end $$;
