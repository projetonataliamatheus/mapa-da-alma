-- Pausa definitiva da IA por conversa: só volta quando alguém da equipe reativar manualmente.
alter table leads add column if not exists ai_locked boolean not null default false;
alter table leads add column if not exists ai_locked_at timestamptz;
alter table leads add column if not exists ai_locked_by text;

-- Garantia no próprio banco: enquanto a conversa estiver pausada, nada no sistema consegue
-- religar a IA nem agendar resposta. Para reativar, a mesma atualização precisa tirar a pausa (ai_locked = false).
create or replace function public.leads_ai_lock_guard()
returns trigger language plpgsql as $$
begin
  if new.ai_locked then
    new.ai_enabled := false;
    new.reply_due_at := null;
  end if;
  return new;
end $$;

drop trigger if exists leads_ai_lock_guard on leads;
create trigger leads_ai_lock_guard before insert or update on leads
  for each row execute function public.leads_ai_lock_guard();
