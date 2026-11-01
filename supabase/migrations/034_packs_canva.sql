-- Packs de artes no Canva: galeria pública de prévia por nicho + link de entrega (Canva) depois do pagamento
create table if not exists canva_packs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  niche text,                       -- nicho principal (ex.: "estética", "pizzaria")
  keywords text,                    -- outras palavras do nicho, separadas por vírgula
  description text,
  cover text,                       -- imagem de capa
  images jsonb not null default '[]'::jsonb, -- prévias (urls)
  items int,                        -- quantas artes vêm no pack
  canva_url text,                   -- link do modelo no Canva (só a equipe vê; vai para o cliente depois do pagamento)
  price numeric,                    -- preço (opcional; se vazio usa o do serviço "Pack de artes no Canva")
  active boolean not null default true,
  views int not null default 0,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table canva_packs enable row level security;
drop policy if exists canva_packs_team on canva_packs;
create policy canva_packs_team on canva_packs for all using (is_team()) with check (is_team());
create index if not exists canva_packs_niche_idx on canva_packs (niche);
-- quem edita packs também pode enviar as imagens de prévia
drop policy if exists publico_enviar on storage.objects;
create policy publico_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'publico' and (public.has_perm('checkout.editor') or public.has_perm('modelos.editar') or public.has_perm('packs.editar') or public.is_master()));
