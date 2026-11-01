-- 042: Contratos com assinatura e Recibos manuais (estrutura do sistema feito no Lovable)
do $lv$
begin
if to_regclass('public.contracts') is null then
CREATE TABLE public.receipt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receipt_number text NOT NULL,
  payer_name text NOT NULL,
  payer_document text,
  payer_state text,
  beneficiary_name text,
  beneficiary_document text,
  beneficiary_email text,
  payment_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  observations text,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.receipts ALTER COLUMN user_id DROP NOT NULL;

CREATE TABLE public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  body text NOT NULL DEFAULT '',
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  template_key text NOT NULL,
  template_id uuid REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,

  
  service_value numeric(12,2),
  payment_terms text,
  service_scope text,
  duration_months int,

  
  contractor_name text NOT NULL DEFAULT 'Matheus Rangel',
  contractor_document text,
  contractor_email text,
  client_name text NOT NULL,
  client_document text,
  client_email text,
  client_phone text,
  client_address text,

  
  status text NOT NULL DEFAULT 'rascunho', 
  sent_at timestamptz,

  
  client_signature text,           
  client_signed_at timestamptz,
  client_ip text,
  client_user_agent text,

  
  provider_signature text,         
  provider_signed_at timestamptz,
  provider_ip text,
  provider_user_agent text,

  
  document_hash text,

  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contracts_token ON public.contracts(token);

CREATE INDEX idx_contracts_client ON public.contracts(client_id);

CREATE INDEX idx_contracts_status ON public.contracts(status);

INSERT INTO public.contract_templates (key, title, description, sort_order, body) VALUES
('trafego_pago', 'Gestão de Tráfego Pago', 'Contrato de prestação de serviços de gestão de anúncios (Meta Ads / Google Ads).', 1,
$$CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE GESTÃO DE TRÁFEGO PAGO

CONTRATANTE: {{cliente.nome}}, inscrito(a) no CPF/CNPJ {{cliente.documento}}, com endereço em {{cliente.endereco}}, e-mail {{cliente.email}}, telefone {{cliente.telefone}}.

CONTRATADO: {{prestador.nome}}, inscrito no CPF/CNPJ {{prestador.documento}}, e-mail {{prestador.email}}.

CLÁUSULA 1 — OBJETO
O CONTRATADO prestará ao CONTRATANTE serviços de gestão profissional de tráfego pago nas plataformas Meta Ads (Facebook e Instagram) e/ou Google Ads, incluindo: criação e otimização de campanhas, segmentação de público, análise de métricas, ajustes de lances e orçamento, criação de conjuntos de anúncios e relatórios periódicos de desempenho.

CLÁUSULA 2 — VALOR E FORMA DE PAGAMENTO
O CONTRATANTE pagará ao CONTRATADO o valor mensal de R$ {{servico.valor}}, referente exclusivamente à gestão dos anúncios. Os valores investidos nas plataformas (verba de anúncios) são de responsabilidade exclusiva do CONTRATANTE e cobrados diretamente pelo Facebook/Google no cartão de crédito cadastrado. Forma de pagamento: {{servico.pagamento}}.

CLÁUSULA 3 — PRAZO
O contrato tem duração de {{servico.duracao}} meses, renovável automaticamente por iguais períodos salvo manifestação em contrário com 30 dias de antecedência.

CLÁUSULA 4 — OBRIGAÇÕES DO CONTRATANTE
a) Fornecer acessos necessários (BM, conta de anúncio, Instagram, site, pixel).
b) Manter cartão de crédito válido cadastrado nas plataformas.
c) Fornecer materiais (fotos, vídeos, textos) quando solicitado.
d) Responder solicitações de aprovação em prazo hábil.

CLÁUSULA 5 — OBRIGAÇÕES DO CONTRATADO
a) Executar as campanhas com técnica e boas práticas de mercado.
b) Enviar relatórios de desempenho no período contratado.
c) Manter sigilo sobre dados e estratégias do CONTRATANTE.

CLÁUSULA 6 — LIMITAÇÃO DE RESULTADOS
O CONTRATADO se compromete com a execução técnica dos serviços, não sendo possível garantir números específicos de vendas, leads ou faturamento, uma vez que o desempenho depende também de fatores externos (produto, atendimento, preço, sazonalidade e comportamento do público).

CLÁUSULA 7 — RESCISÃO
Qualquer das partes poderá rescindir este contrato mediante aviso prévio de 30 dias, sem multa, desde que quitados os valores em aberto até a data da rescisão.

CLÁUSULA 8 — ESCOPO ADICIONAL
{{servico.escopo}}

CLÁUSULA 9 — FORO
Fica eleito o foro da comarca do CONTRATADO para dirimir dúvidas oriundas deste contrato.

E por estarem justos e contratados, assinam eletronicamente o presente instrumento.

Data: {{data.hoje}}$$),

('desenvolvimento_site', 'Desenvolvimento de Site', 'Contrato para criação de site institucional / landing page / página de vendas.', 2,
$$CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE DESENVOLVIMENTO DE SITE

CONTRATANTE: {{cliente.nome}}, CPF/CNPJ {{cliente.documento}}, endereço {{cliente.endereco}}, e-mail {{cliente.email}}, telefone {{cliente.telefone}}.

CONTRATADO: {{prestador.nome}}, CPF/CNPJ {{prestador.documento}}, e-mail {{prestador.email}}.

CLÁUSULA 1 — OBJETO
Desenvolvimento de site conforme escopo abaixo: {{servico.escopo}}

CLÁUSULA 2 — VALOR E PAGAMENTO
Valor total: R$ {{servico.valor}}. Condições: {{servico.pagamento}}.

CLÁUSULA 3 — PRAZO DE ENTREGA
O prazo de entrega é de {{servico.duracao}} dias úteis a partir do recebimento de todo o material (textos, imagens, logo, acessos) por parte do CONTRATANTE.

CLÁUSULA 4 — REVISÕES
Estão inclusas até 3 rodadas de revisão de layout. Alterações adicionais serão cobradas separadamente.

CLÁUSULA 5 — HOSPEDAGEM E DOMÍNIO
Domínio e hospedagem são de responsabilidade e custeio do CONTRATANTE. O CONTRATADO fará a publicação no ambiente indicado.

CLÁUSULA 6 — PROPRIEDADE
Após o pagamento integral, o site será de propriedade do CONTRATANTE, incluindo códigos-fonte e credenciais.

CLÁUSULA 7 — SUPORTE PÓS-ENTREGA
Serão prestados 30 dias de suporte gratuito para correção de erros técnicos. Novas funcionalidades e alterações de conteúdo após esse período serão orçadas separadamente.

CLÁUSULA 8 — RESCISÃO
Em caso de desistência do CONTRATANTE, os valores já pagos não serão devolvidos, ficando o CONTRATADO desobrigado de entregar o projeto.

CLÁUSULA 9 — FORO
Fica eleito o foro da comarca do CONTRATADO.

Data: {{data.hoje}}$$),

('loja_virtual', 'Desenvolvimento de Loja Virtual', 'Contrato para criação de e-commerce completo.', 3,
$$CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE DESENVOLVIMENTO DE LOJA VIRTUAL

CONTRATANTE: {{cliente.nome}}, CPF/CNPJ {{cliente.documento}}, endereço {{cliente.endereco}}, e-mail {{cliente.email}}, telefone {{cliente.telefone}}.

CONTRATADO: {{prestador.nome}}, CPF/CNPJ {{prestador.documento}}, e-mail {{prestador.email}}.

CLÁUSULA 1 — OBJETO
Desenvolvimento de loja virtual (e-commerce) com catálogo de produtos, carrinho, checkout, integração de pagamento e cálculo de frete. Escopo detalhado: {{servico.escopo}}

CLÁUSULA 2 — VALOR E PAGAMENTO
Valor total: R$ {{servico.valor}}. Forma de pagamento: {{servico.pagamento}}.

CLÁUSULA 3 — PRAZO
Prazo estimado de {{servico.duracao}} dias úteis contados a partir da entrega completa dos materiais e acessos pelo CONTRATANTE.

CLÁUSULA 4 — GATEWAYS E INTEGRAÇÕES
As contas nos gateways de pagamento (Mercado Pago, PagSeguro, Asaas, InfinitePay etc.) e nas transportadoras são de responsabilidade e custeio do CONTRATANTE, incluindo taxas cobradas por esses serviços.

CLÁUSULA 5 — CADASTRO DE PRODUTOS
Está inclusa a estruturação da loja e o cadastro de até 20 produtos iniciais. Cadastros adicionais serão cobrados à parte, conforme volume.

CLÁUSULA 6 — SUPORTE PÓS-ENTREGA
30 dias de suporte gratuito para correção de erros técnicos após publicação.

CLÁUSULA 7 — MANUTENÇÃO MENSAL (OPCIONAL)
Manutenção contínua, atualizações e cadastros posteriores podem ser contratados em plano mensal separado.

CLÁUSULA 8 — PROPRIEDADE
Após pagamento integral, a loja e todo o conteúdo passam a ser de propriedade do CONTRATANTE.

CLÁUSULA 9 — RESCISÃO E FORO
Rescisão por qualquer das partes com aviso prévio de 15 dias. Fica eleito o foro da comarca do CONTRATADO.

Data: {{data.hoje}}$$),

('sistema_app', 'Desenvolvimento de Sistema e App PWA', 'Contrato para sistema web/PWA sob medida.', 4,
$$CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE DESENVOLVIMENTO DE SISTEMA E APLICATIVO (PWA)

CONTRATANTE: {{cliente.nome}}, CPF/CNPJ {{cliente.documento}}, endereço {{cliente.endereco}}, e-mail {{cliente.email}}, telefone {{cliente.telefone}}.

CONTRATADO: {{prestador.nome}}, CPF/CNPJ {{prestador.documento}}, e-mail {{prestador.email}}.

CLÁUSULA 1 — OBJETO
Desenvolvimento de sistema web personalizado e/ou aplicativo Progressive Web App (PWA) conforme escopo funcional aprovado: {{servico.escopo}}

CLÁUSULA 2 — VALOR E PAGAMENTO
Valor total do desenvolvimento: R$ {{servico.valor}}. Forma de pagamento: {{servico.pagamento}}.

CLÁUSULA 3 — PRAZO
Prazo estimado: {{servico.duracao}} dias úteis, dividido em entregas parciais (sprints) para validação do CONTRATANTE.

CLÁUSULA 4 — ESCOPO E ALTERAÇÕES
Alterações fora do escopo aprovado serão orçadas separadamente através de aditivo contratual.

CLÁUSULA 5 — INFRAESTRUTURA
Custos de servidores, banco de dados, domínios, APIs de terceiros e serviços externos são de responsabilidade do CONTRATANTE.

CLÁUSULA 6 — PROPRIEDADE INTELECTUAL
Após pagamento integral, os códigos-fonte, banco de dados e documentação passam à propriedade do CONTRATANTE, com direitos totais de uso e modificação.

CLÁUSULA 7 — GARANTIA
90 dias de garantia após entrega final para correção de bugs relacionados ao escopo entregue, sem custo.

CLÁUSULA 8 — MANUTENÇÃO EVOLUTIVA
Novas funcionalidades, evoluções e manutenção contínua podem ser contratadas em plano mensal separado.

CLÁUSULA 9 — SIGILO
Ambas as partes se comprometem a manter sigilo sobre informações confidenciais compartilhadas durante o projeto.

CLÁUSULA 10 — RESCISÃO E FORO
Rescisão mediante aviso prévio de 30 dias. Foro da comarca do CONTRATADO.

Data: {{data.hoje}}$$);

CREATE TABLE IF NOT EXISTS public.empresa_contratada_config (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social   text NOT NULL DEFAULT '',
  documento      text NOT NULL DEFAULT '',
  endereco       text NOT NULL DEFAULT '',
  cidade_uf      text NOT NULL DEFAULT '',
  email          text NOT NULL DEFAULT '',
  whatsapp       text NOT NULL DEFAULT '',
  representante  text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.empresa_contratada_config (razao_social, documento, endereco, cidade_uf, email, whatsapp, representante)
SELECT '', '', '', '', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM public.empresa_contratada_config);

UPDATE public.contract_templates
SET
  title = 'Desenvolvimento de Sistemas e Aplicações PWA',
  body = $BODY$# CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE DESENVOLVIMENTO DE SISTEMAS E APLICAÇÕES PWA

## CONTRATANTE

**Nome/Razão Social:** {{cliente_nome}}

**CPF/CNPJ:** {{cliente_documento}}

**Responsável:** {{cliente_responsavel}}

**E-mail:** {{cliente_email}}

**Telefone / WhatsApp:** {{cliente_whatsapp}}

**Endereço:** {{cliente_endereco}}

---

## CONTRATADA

**Nome/Razão Social:** {{empresa_nome}}

**CPF/CNPJ:** {{empresa_documento}}

**E-mail:** {{empresa_email}}

**Telefone / WhatsApp:** {{empresa_telefone}}

---

# CLÁUSULA 1 – OBJETO DO CONTRATO

O presente contrato tem por objeto a prestação de serviços de **desenvolvimento de sistemas personalizados e aplicações PWA (Progressive Web App)**, conforme o escopo definido entre as partes.

O serviço compreende o planejamento, desenvolvimento, configuração, testes, implantação e entrega do sistema contratado.

---

# CLÁUSULA 2 – DESCRIÇÃO DO PROJETO

O sistema será desenvolvido de acordo com as necessidades apresentadas pelo CONTRATANTE durante a contratação.

**Descrição do Projeto:**

{{descricao_projeto}}

As funcionalidades acima representam o escopo contratado e servirão como referência durante todo o desenvolvimento.

Qualquer funcionalidade, módulo, integração, tela, relatório ou recurso não descrito acima será considerado um **serviço adicional**, dependendo de novo orçamento e aprovação do CONTRATANTE.

---

# CLÁUSULA 3 – TIPO DO PROJETO

Tipo do projeto contratado:

**{{tipo_projeto}}**

---

# CLÁUSULA 4 – PRAZO DE DESENVOLVIMENTO

O prazo estimado para conclusão do projeto é de **30 (trinta) dias corridos**, contados a partir da confirmação do pagamento da primeira parcela e do recebimento de todas as informações, acessos e materiais necessários para execução dos serviços.

Em situações excepcionais, como atrasos no envio de informações, alterações solicitadas durante o desenvolvimento, indisponibilidade de plataformas de terceiros, integrações externas ou outros fatores alheios à vontade da CONTRATADA, o prazo poderá ser prorrogado por até **60 (sessenta) dias**, mediante comunicação ao CONTRATANTE.

---

# CLÁUSULA 5 – VALOR DO PROJETO E FORMA DE PAGAMENTO

Valor total do projeto:

**{{valor_total}}**

O pagamento será realizado em três etapas:

• **30%** na assinatura deste contrato e antes do início do desenvolvimento — **{{parcela_1}}**;

• **30%** quando aproximadamente 50% do projeto estiver concluído, correspondente à entrega da primeira versão funcional (esboço do sistema) — **{{parcela_2}}**;

• **40%** na conclusão do projeto, antes da entrega definitiva — **{{parcela_3}}**.

**Parágrafo Único.** O desenvolvimento somente será iniciado após a confirmação do pagamento da primeira parcela.

---

# CLÁUSULA 6 – DOMÍNIO, SERVIDOR E HOSPEDAGEM

Para funcionamento do sistema será necessária a contratação de serviços de terceiros, como domínio, hospedagem, servidor, banco de dados e demais recursos necessários para manter o sistema online.

Esses serviços **não fazem parte do valor do desenvolvimento** e serão contratados separadamente.

**Plano contratado:** {{plano_hospedagem}}

**Período:** {{periodo_hospedagem}}

**Valor:** {{valor_hospedagem}}

O CONTRATANTE declara estar ciente de que será responsável pelo pagamento da renovação desses serviços durante todo o período de utilização do sistema.

Os valores praticados são definidos exclusivamente pela empresa fornecedora da hospedagem e poderão sofrer reajustes futuros sem qualquer responsabilidade da CONTRATADA. O valor informado neste contrato corresponde ao preço vigente na data da contratação.

---

# CLÁUSULA 7 – ENTREGA E APROVAÇÃO

Após cada etapa do desenvolvimento, o CONTRATANTE poderá acompanhar a evolução do projeto.

Sempre que uma etapa for apresentada, o CONTRATANTE terá até **5 (cinco) dias úteis** para solicitar ajustes relacionados ao escopo contratado.

Caso não haja manifestação dentro desse prazo, a etapa será considerada **automaticamente aprovada**, permitindo o prosseguimento do desenvolvimento.

Ao término do projeto, o sistema será entregue para homologação final antes da publicação definitiva.

---

# CLÁUSULA 8 – GARANTIA, SUPORTE E MANUTENÇÃO

A CONTRATADA prestará **garantia de 6 (seis) meses** para correção de eventuais erros relacionados ao funcionamento do sistema desenvolvido.

Durante esse período também poderão ser realizados pequenos ajustes relacionados ao escopo originalmente contratado, sem custo adicional.

A garantia **não contempla** novas funcionalidades, alterações de layout, mudanças nas regras de negócio, integrações adicionais ou solicitações que não façam parte do escopo contratado.

Após o período de garantia, qualquer suporte, manutenção, atualização, melhoria ou alteração será considerado um serviço adicional.

O valor mínimo para atendimento será de **R$ 250,00** por solicitação, podendo sofrer alteração conforme a complexidade do serviço solicitado.

---

# CLÁUSULA 9 – RESPONSABILIDADES DA CONTRATADA

Compete à **CONTRATADA**: desenvolver o sistema conforme o escopo contratado, configurar as funcionalidades previstas, realizar testes antes da entrega, corrigir eventuais erros relacionados ao desenvolvimento durante o período de garantia, prestar suporte referente ao funcionamento do sistema e entregar o projeto nas condições estabelecidas neste contrato.

---

# CLÁUSULA 10 – RESPONSABILIDADES DO CONTRATANTE

Compete ao **CONTRATANTE**: fornecer todas as informações, documentos, acessos e materiais necessários para o desenvolvimento, responder às solicitações de aprovação dentro dos prazos estabelecidos, realizar os pagamentos conforme contratado, manter os pagamentos referentes à hospedagem, domínio e servidor em dia, realizar testes durante a homologação, comunicar eventuais inconsistências identificadas e responsabilizar-se integralmente pelos dados, conteúdos e informações inseridas no sistema.

---

# CLÁUSULA 11 – LIMITAÇÃO DE RESPONSABILIDADE

A CONTRATADA não poderá ser responsabilizada por atrasos ocasionados pelo não envio de informações pelo CONTRATANTE, alterações solicitadas durante o desenvolvimento, indisponibilidade de servidores, hospedagens, bancos de dados, APIs, gateways de pagamento, serviços de terceiros, alterações realizadas pelo próprio CONTRATANTE ou terceiros após a entrega do sistema, bem como mudanças nas políticas ou funcionamento de plataformas externas como Meta, Google, OpenAI, WhatsApp, Stripe, Mercado Pago, Evolution API, N8N ou qualquer outro serviço utilizado pelo projeto.

Também não será responsabilidade da CONTRATADA qualquer indisponibilidade causada pela empresa responsável pela hospedagem ou servidor.

---

# CLÁUSULA 12 – BACKUP

Após a entrega do sistema, a responsabilidade pela realização de backups periódicos dos dados será **exclusivamente do CONTRATANTE**, salvo quando contratado serviço específico de gerenciamento e manutenção.

---

# CLÁUSULA 13 – PROPRIEDADE DO PROJETO

Após a quitação integral do contrato, o CONTRATANTE terá direito de utilização do sistema desenvolvido.

Ferramentas, componentes reutilizáveis, bibliotecas, metodologias, estruturas de programação, funções genéricas e soluções previamente desenvolvidas pela CONTRATADA permanecerão sendo de sua propriedade intelectual, podendo ser utilizadas em outros projetos.

---

# CLÁUSULA 14 – CONFIDENCIALIDADE

As partes comprometem-se a manter absoluto sigilo sobre todas as informações comerciais, financeiras, estratégicas e técnicas compartilhadas durante a execução deste contrato.

---

# CLÁUSULA 15 – PROTEÇÃO DE DADOS

As partes comprometem-se a utilizar eventuais dados pessoais apenas para execução deste contrato, observando a legislação vigente.

---

# CLÁUSULA 16 – COMUNICAÇÃO

As comunicações entre as partes poderão ocorrer por **e-mail ou WhatsApp**, sendo ambos considerados meios oficiais para solicitações, aprovações e demais comunicações relacionadas ao projeto.

---

# CLÁUSULA 17 – FORO

Fica eleito o foro da Comarca de **{{empresa_cidade_uf}}** para dirimir quaisquer dúvidas oriundas deste contrato, renunciando as partes a qualquer outro foro, por mais privilegiado que seja.

---

## DADOS DO PROJETO

**Projeto:** {{nome_do_plano}}

**Tipo:** {{tipo_projeto}}

**Valor Total:** {{valor_total}}

**1ª Parcela (30%):** {{parcela_1}}

**2ª Parcela (30%):** {{parcela_2}}

**3ª Parcela (40%):** {{parcela_3}}

**Prazo Estimado:** 30 dias

**Prazo Máximo:** 60 dias

**Hospedagem / Servidor:** {{plano_hospedagem}}

**Período:** {{periodo_hospedagem}}

**Valor:** {{valor_hospedagem}}

**Garantia:** 6 meses

**Suporte Gratuito:** 6 meses

**Suporte após garantia:** R$ 250,00 por solicitação.
$BODY$,
  updated_at = now()
WHERE key = 'sistema_app';


end if;
end $lv$;

update empresa_contratada_config set razao_social = 'Agência Fênix Ads' where razao_social = '';

do $$
declare t text;
begin
  foreach t in array array['contracts','contract_templates','empresa_contratada_config','receipts','receipt_templates']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists equipe on %I', t);
    execute format('create policy equipe on %I for all to authenticated using (public.is_team()) with check (public.is_team())', t);
  end loop;
end $$;
