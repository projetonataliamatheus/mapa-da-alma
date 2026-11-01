-- Mapa da Alma: tira do banco os vestígios do Radar (agência) e ajusta a IA para a consulta ao vivo (sem "prévia").
-- Não mexe em nada do Radar: este banco é só do Mapa da Alma.

-- 1) Prompt Master: o caminho da venda é a CONSULTA, não a prévia
update prompt_master set content = replace(content,
  'enviar a prévia gratuita do mapa → apresentar o mapa completo e o preço',
  'fazer a consulta ao vivo na conversa (abrir o mapa e as pirâmides e explicar, em segunda pessoa, o que eles mostram sobre a dor da pessoa) → apresentar o mapa completo (primeiro a versão completa, com as pirâmides) e o preço')
where id = 1;
update prompt_master set content = replace(content,
  'vende exclusivamente mapas: o Mapa da Alma Pessoal e o Mapa da Alma do Casal.',
  'vende exclusivamente o Mapa da Alma (versão completa com as pirâmides do nome, versão simples e mapa do casal) e, depois do mapa, leituras de tarô.')
where id = 1;
update prompt_master set content = content || E'\n- NUNCA mande link do mapa nem fale em "prévia" antes do pagamento: a consulta acontece na conversa.\n- Explique o mapa com as suas palavras, em segunda pessoa ("o seu mapa mostra que você... e isso muito provavelmente acontece por causa de..."), nunca copiando o texto.'
where id = 1 and content not like '%NUNCA mande link do mapa%';

-- 2) Abordagens: sem "prévia gratuita"
update approaches set description = 'Vai direto: pede o nome completo de nascimento e a data e já abre o mapa da pessoa na conversa.',
  opening_example = 'Oi! Aqui é a Clara, do Mapa da Alma ✨ Me passa o seu nome completo de nascimento e a sua data que eu já abro o seu mapa aqui pra gente olhar juntas?',
  followup_example = 'Ainda quer que eu abra o seu mapa? É só me mandar o seu nome completo de nascimento e a data ✨'
where slug = 'direta';
update approaches set opening_example = replace(opening_example, 'prévia', 'leitura'), followup_example = replace(followup_example, 'prévia', 'leitura'), description = replace(description, 'prévia', 'leitura');

-- 3) prévias agendadas que ainda iam sair sozinhas: canceladas
update leads set preview_due_at = null where preview_due_at is not null;

-- 4) Base de conhecimento: as técnicas foram extraídas com o contexto do Radar (sites, agência, negócios).
--    Apaga as técnicas e o cérebro e manda os livros serem estudados de novo, agora no contexto do Mapa da Alma.
--    (só UMA vez: rodar o arquivo de novo não apaga o que já foi reestudado)
do $$
begin
  if coalesce((select data->>'kb_mapa_reset' from settings where id = 1), '') = '' then
    delete from knowledge_insights;
    update knowledge_docs set status = 'aprendendo', sections_done = 0, insights = 0 where status in ('processado', 'aprendendo', 'erro');
    update knowledge_brain set content = null, insights = 0 where id = 1;
    update settings set data = coalesce(data, '{}'::jsonb) || '{"kb_mapa_reset": "1"}'::jsonb where id = 1;
  end if;
end $$;

-- 5) etapas antigas do Radar que não existem no Mapa da Alma
update leads set steps = array(select x from unnest(steps) x where x not in ('maps', 'valid', 'ig', 'wa', 'preview')) where steps && array['maps','valid','ig','wa','preview'];

notify pgrst, 'reload schema';
