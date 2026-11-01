-- 023: nome de quem atende em cada número (a IA se apresenta com ele)
alter table whatsapp_numbers add column if not exists agent_name text;
