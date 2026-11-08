-- Valor REAL das vendas da Kiwify: bruto (US$), taxas, líquido em US$ e em R$. payments.amount passa a ser o líquido em R$.
alter table payments add column if not exists liquido_usd numeric;
alter table payments add column if not exists taxa_usd numeric;
alter table payments add column if not exists liquido_brl numeric;
alter table payments add column if not exists cambio_brl numeric;
alter table payments add column if not exists liquido_origem text;   -- kiwify | manual | estimado
alter table payments add column if not exists kiwify_raw jsonb;      -- Commissions exato do webhook (auditoria)

-- Vendas já feitas (valores lidos no painel da Kiwify): o robô completa o R$ sozinho com o câmbio do dia.
update payments set liquido_usd = 7.81, taxa_usd = 10 - 7.81, valor_local = 10, moeda = 'USD', liquido_origem = 'manual'
 where provider = 'kiwify' and provider_id = 'f2420a9b-5114-47bd-aecd-3424f713a242' and liquido_usd is null;
update payments set liquido_usd = 7.80, taxa_usd = 10 - 7.80, valor_local = 10, moeda = 'USD', liquido_origem = 'manual'
 where provider = 'kiwify' and provider_id = '317d9bc2-a11a-4bdf-8e70-97b308079333' and liquido_usd is null;
