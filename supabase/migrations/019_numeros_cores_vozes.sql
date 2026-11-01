-- 019: cada número de WhatsApp com cor (etiqueta), voz própria e conversas separadas por número
alter table whatsapp_numbers add column if not exists color text;
alter table whatsapp_numbers add column if not exists voice_id uuid references voices on delete set null;
alter table whatsapp_numbers add column if not exists voice_enabled boolean not null default true;

-- o mesmo cliente pode falar com mais de um número: cada número tem a sua conversa (lead),
-- ligadas entre si para a equipe ver que é a mesma pessoa
alter table leads add column if not exists related_lead_id uuid references leads on delete set null;
create index if not exists leads_wa_key_number_idx on leads (wa_key, number_id);

-- conversas que já ficaram misturadas (o mesmo cliente falou com dois números e tudo caiu numa conversa só):
-- as mensagens de cada número vão para uma conversa própria daquele número
do $$
declare
  r record;
  novo uuid;
begin
  for r in
    select distinct m.lead_id, m.number_id
    from messages m
    join leads l on l.id = m.lead_id
    where m.number_id is not null and l.number_id is not null and m.number_id <> l.number_id
  loop
    select id into novo from leads
      where wa_key = (select wa_key from leads where id = r.lead_id) and number_id = r.number_id
      limit 1;
    if novo is null then
      insert into leads (name, source, whatsapp, wa_key, niche, city, instagram, number_id, related_lead_id,
                         stage, wa_status, temperature, ai_enabled, summary, next_step, last_inbound_at, last_outbound_at)
      select l.name, l.source, l.whatsapp, l.wa_key, l.niche, l.city, l.instagram, r.number_id, l.id,
             'respondeu', 'conversa', 30, l.ai_enabled, 'Conversa separada por número (o cliente falou com dois números).', 'Continuar o atendimento por este número.',
             (select max(created_at) from messages where lead_id = r.lead_id and number_id = r.number_id and direction = 'in'),
             (select max(created_at) from messages where lead_id = r.lead_id and number_id = r.number_id and direction = 'out')
      from leads l where l.id = r.lead_id
      returning id into novo;
    end if;
    update messages set lead_id = novo where lead_id = r.lead_id and number_id = r.number_id;
    update leads set related_lead_id = coalesce(related_lead_id, novo) where id = r.lead_id;
    novo := null;
  end loop;
end $$;
