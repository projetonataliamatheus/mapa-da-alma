-- Confere que a inteligência funciona no banco: busca por significado e por palavras nas duas bases
\set ON_ERROR_STOP 1
create temp table v as
  select (select array_agg(case when i = 1 then 1.0 else 0.0 end)::real[] from generate_series(1, 384) i)::extensions.vector(384) as a,
         (select array_agg(case when i = 2 then 1.0 else 0.0 end)::real[] from generate_series(1, 384) i)::extensions.vector(384) as b;

insert into knowledge_docs (id, name, status) values ('00000000-0000-0000-0000-0000000000d1', 'Livro teste', 'processado');
insert into knowledge_insights (doc_id, kind, title, content, tags, embedding)
  select '00000000-0000-0000-0000-0000000000d1', 'objecao', 'Preço como investimento', 'Quando disser que está caro, compare com o retorno de um cliente novo.', '{preço,objeção}', a from v;
insert into knowledge_insights (doc_id, kind, title, content, tags, embedding)
  select '00000000-0000-0000-0000-0000000000d1', 'abertura', 'Pergunta de curiosidade', 'Abra com uma pergunta sobre o negócio.', '{abertura}', b from v;
insert into knowledge_chunks (doc_id, content, embedding) select '00000000-0000-0000-0000-0000000000d1', 'Reframe the price as an investment.', a from v;

insert into leads (id, name, niche, stage) values ('00000000-0000-0000-0000-0000000000e1', 'Clínica Teste', 'odontologia', 'pago');
insert into messages (id, lead_id, direction, author, body) values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', 'out', 'ai', 'Faz sentido pensar no site como investimento?');

insert into sales_cases (lead_id, outcome, niche, summary, lesson, turning_point, objections, embedding)
  select '00000000-0000-0000-0000-0000000000e1', 'ganho', 'odontologia', 'Dentista achou caro e fechou após a prévia.', 'Mande a prévia antes de baixar o preço.', 'Prévia do site', '[{"objection":"caro","response":"prévia","worked":true}]', a from v;
insert into msg_snippets (message_id, lead_id, niche, kind, situation, text, got_reply, temp_delta, advanced, won, embedding)
  select '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', 'odontologia', 'objecao', 'achei caro', 'Faz sentido pensar no site como investimento?', true, 20, true, true, a from v;

do $$
declare n int; s numeric; t text;
begin
  -- pontuação automática da mensagem: respondeu(1) + esquentou(1.33) + avançou(1) + vendeu(3)
  select score into s from msg_snippets limit 1;
  if s < 6 then raise exception 'pontuação errada: %', s; end if;

  -- busca por significado (vetor) acha a técnica certa primeiro
  select title into t from match_insights('', (select a from v), 3) limit 1;
  if t is distinct from 'Preço como investimento' then raise exception 'match_insights por vetor falhou: %', t; end if;

  -- busca por palavras (sem vetor) também funciona
  select count(*) into n from match_insights('caro | preço', null, 3);
  if n < 1 then raise exception 'match_insights por palavras falhou'; end if;

  select count(*) into n from match_chunks('', (select a from v), 3);
  if n < 1 then raise exception 'match_chunks falhou'; end if;

  select count(*) into n from match_cases('caro', (select a from v), 'odontologia', 'ganho', 2);
  if n < 1 then raise exception 'match_cases falhou'; end if;
  select count(*) into n from match_cases('caro', (select a from v), 'odontologia', 'perdido', 2);
  if n <> 0 then raise exception 'match_cases trouxe caso perdido indevido'; end if;

  select count(*) into n from match_snippets('caro', (select a from v), 'odontologia', array['objecao'], 3);
  if n < 1 then raise exception 'match_snippets falhou'; end if;

  -- 👎 tira a mensagem das campeãs
  update msg_snippets set feedback = -1;
  select count(*) into n from match_snippets('caro', (select a from v), 'odontologia', null, 3);
  if n <> 0 then raise exception 'mensagem com 👎 continuou como campeã'; end if;

  -- técnica com nota baixa deixa de ser usada
  update knowledge_insights set quality = 2 where title = 'Preço como investimento';
  select count(*) into n from match_insights('caro | preço', null, 3) where title = 'Preço como investimento';
  if n <> 0 then raise exception 'técnica com nota baixa continuou sendo usada'; end if;
  update knowledge_insights set quality = 9 where title = 'Preço como investimento';

  perform bump_cases(array[(select id from sales_cases limit 1)], 'wins');
  perform bump_snippets(array[(select id from msg_snippets limit 1)], 'used');
  perform * from usage_month();
  raise notice 'inteligência ok';
end $$;

-- pausa definitiva: nada religa a IA sozinho; só tirando a pausa
do $$
declare lid uuid; r record;
begin
  insert into leads (name, ai_enabled) values ('Pausa teste', true) returning id into lid;
  update leads set ai_locked = true where id = lid;
  update leads set ai_enabled = true, reply_due_at = now() where id = lid;
  select ai_enabled, reply_due_at into r from leads where id = lid;
  if r.ai_enabled or r.reply_due_at is not null then raise exception 'pausa definitiva foi furada'; end if;
  update leads set ai_locked = false, ai_enabled = true where id = lid;
  select ai_enabled into r from leads where id = lid;
  if not r.ai_enabled then raise exception 'reativar a IA não funcionou'; end if;
  delete from leads where id = lid;
  raise notice 'pausa definitiva ok';
end $$;

-- base ativa: prioridade, Prompt Master e limpeza de órfãos
do $$
declare d1 uuid; n int;
begin
  insert into knowledge_docs (name, priority) values ('Livro primário teste', 'primario') returning id into d1;
  insert into knowledge_insights (doc_id, title, content, tags) values (d1, 'Pergunta de implicação', 'Pergunte o custo de não agir', array['preço']);
  select count(*) into n from match_insights_v2('preço', null, 5) where priority = 'primario';
  if n < 1 then raise exception 'match_insights_v2 não trouxe a prioridade'; end if;
  -- órfão forçado (sem a trava da chave estrangeira) é apagado na sincronização
  alter table knowledge_insights disable trigger all;
  insert into knowledge_insights (doc_id, title, content) values (gen_random_uuid(), 'Órfã', 'de livro excluído');
  alter table knowledge_insights enable trigger all;
  perform * from kb_sync_orphans();
  select count(*) into n from knowledge_insights where title = 'Órfã';
  if n <> 0 then raise exception 'sincronização não apagou órfãos'; end if;
  update prompt_master set content = 'Lei' where id = 1;
  update knowledge_brain set content = 'novo cérebro' where id = 1;
  select count(*) into n from prompt_master where content = 'Lei';
  if n <> 1 then raise exception 'prompt master foi mexido'; end if;
  delete from knowledge_docs where id = d1;
  select count(*) into n from knowledge_insights where doc_id = d1;
  if n <> 0 then raise exception 'técnicas ficaram depois de excluir o livro'; end if;
  raise notice 'base ativa ok';
end $$;
