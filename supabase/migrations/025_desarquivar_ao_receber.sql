-- 025: conversa arquivada volta para a caixa de entrada quando chega qualquer mensagem nela
-- (cliente escreveu, equipe respondeu pelo celular, recibo, etc.) — vale para todos os caminhos de entrada.
create or replace function public.desarquivar_ao_receber() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update leads set archived_at = null, updated_at = now()
   where id = new.lead_id and archived_at is not null;
  return new;
end $$;

drop trigger if exists messages_desarquivar on messages;
create trigger messages_desarquivar after insert on messages
for each row execute function public.desarquivar_ao_receber();
