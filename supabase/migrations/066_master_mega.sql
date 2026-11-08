-- Prompt Master Mega: coluna de backup do texto anterior (o sistema grava o Master novo sozinho na subida).
alter table prompt_master add column if not exists content_anterior text;
notify pgrst, 'reload schema';
