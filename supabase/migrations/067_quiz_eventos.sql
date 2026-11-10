-- Quiz de teste (/quizz): uma linha por tela vista (sid anônimo, sem nome nem data de nascimento)
create table if not exists public.quiz_eventos (
  id bigserial primary key,
  sid text not null,
  tela int not null,
  tipo text not null default 'tela',
  pais text,
  faixa text,
  created_at timestamptz not null default now()
);
create index if not exists quiz_eventos_created_idx on public.quiz_eventos (created_at desc);
create index if not exists quiz_eventos_sid_idx on public.quiz_eventos (sid);
alter table public.quiz_eventos enable row level security;
