-- 030: ficha de busca dos modelos (texto completo + versão do vetor) para indicar só os modelos que fazem sentido
alter table premium_templates add column if not exists search_text text;
alter table premium_templates add column if not exists embed_v smallint;
