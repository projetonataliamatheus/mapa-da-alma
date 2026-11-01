-- Vozes da equipe (clonadas na ElevenLabs) para respostas em áudio.
create table if not exists voices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  member text,
  provider text not null default 'elevenlabs',
  voice_id text not null,
  active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now()
);
alter table voices enable row level security;
drop policy if exists equipe_ler on voices;
create policy equipe_ler on voices for select to authenticated using (public.is_team());
drop policy if exists master_grava on voices;
create policy master_grava on voices for all to authenticated using (public.is_master()) with check (public.is_master());

-- a voz fica fixa na conversa: do primeiro ao último áudio, o cliente ouve sempre a mesma pessoa
alter table leads add column if not exists voice_id uuid references voices on delete set null;
