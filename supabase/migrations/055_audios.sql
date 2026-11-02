-- Mapa da Alma: biblioteca de áudios gravados (menu Fluxo › Áudios). Cada áudio tem o intuito e a transcrição:
-- a IA escolhe quando mandar (nunca o mesmo duas vezes para o mesmo contato) e a equipe manda pela conversa.
create table if not exists audios (
  id uuid primary key default gen_random_uuid(),
  codigo serial,
  nome text not null,
  intuito text,
  transcricao text,
  url text not null,
  mime text,
  ativo boolean not null default true,
  usos int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table audios enable row level security;
drop policy if exists audios_equipe on audios;
create policy audios_equipe on audios for all to authenticated using (true) with check (true);
notify pgrst, 'reload schema';
