# Instalação do Radar de Vendas (VPS + Easypanel)

Tempo total: cerca de 1h30. Siga na ordem. Anote cada chave num bloco de notas
e **não mande chaves pelo chat**: elas vão direto no Easypanel (passo 9).

| Passo | O quê | Tempo |
|---|---|---|
| 1 | Supabase — rodar a atualização 002 | 2 min |
| 2 | Contratar a VPS e instalar o Easypanel | 15 min |
| 3 | Evolution API (WhatsApp) no Easypanel | 10 min |
| 4 | Claude | 3 min |
| 5 | Google Maps (Places API) | 10 min |
| 6 | Groq (áudios) | 2 min |
| 7 | Asaas (Pix + webhook) | 5 min |
| 8 | Browserless (recibos em PDF) | 3 min |
| 9 | Painel e robô no Easypanel | 15 min |
| 10 | Primeiro acesso e teste | 20 min |

---

## 1. Supabase — atualização 002
Você já rodou o `001_inicial.sql`. Agora:
1. Supabase › **SQL Editor › New query**.
2. Cole todo o arquivo `supabase/migrations/002_asaas_recibos.sql` e clique em **Run**. Depois faça o mesmo, na ordem, com `003_aprendizado_conversas.sql`, `004_links_pagamento.sql`, `005_custos_previas.sql`, `006_permissoes.sql`, `007_inteligencia.sql`, `008_robo_status.sql`, `009_avaliacao_tecnicas.sql`, `010_memoria_conversa.sql`, `011_trava_resposta.sql`, `012_pausa_definitiva.sql`, `013_base_ativa.sql`, `014_cliente_digitando.sql`, `015_vozes.sql`, `016_producao_drive.sql`, `017_modelos_premium.sql`, `018_dominios.sql`, `019_numeros_cores_vozes.sql`, `020_publico_editor.sql`, `021_previa_agendada.sql`, `022_arquivar_contatos_salvos.sql`, `023_nome_atendente.sql` e `024_equipe_controle.sql`.
3. Em **Authentication › Sign In / Providers › Email**, desligue **Confirm email**.
4. Em **Project Settings › API**, anote: `Project URL`, `anon public` e `service_role`.

## 2. VPS + Easypanel
1. Contrate uma VPS **KVM 2** (2 vCPU, 8 GB) na Hostinger: https://www.hostinger.com.br/vps
   - Se aparecer a opção de sistema com **Easypanel** já instalado, escolha. Se não, escolha **Ubuntu 24.04**.
2. Se escolheu Ubuntu puro: no painel da Hostinger abra o **Terminal do navegador** e rode:
   ```
   curl -sSL https://get.easypanel.io | sh
   ```
3. Abra `http://IP-DA-SUA-VPS:3000` e crie seu usuário do Easypanel.
4. Recomendado: aponte um domínio para o IP da VPS (ex.: `painel.seudominio.com.br` e `whats.seudominio.com.br`)
   no DNS do seu domínio, com registros do tipo **A**. Assim os endereços ficam com cadeado (https).

## 3. Evolution API (WhatsApp)
1. No Easypanel: **Create project** → nome `whatsapp`.
2. Dentro do projeto: **+ Service › Templates** → procure **Evolution API** → **Create**.
   O modelo já cria o banco e o Redis da Evolution.
3. Abra o serviço da Evolution › **Environment** e anote o valor de `AUTHENTICATION_API_KEY` → é o seu `EVOLUTION_API_KEY`.
4. Aba **Domains**: anote o endereço (ou adicione `whats.seudominio.com.br`) → é o seu `EVOLUTION_API_URL`.

## 4. Claude
A assinatura do Claude (Pro/Max) **não** liga o robô: a API é cobrada à parte, por uso.
1. https://console.anthropic.com › **Billing** › adicione créditos (US$ 10 dão para o mês).
2. **Settings › Limits** › coloque o limite de gasto mensal em **US$ 10**. Assim nunca cobra mais que isso.
3. **API Keys › Create Key** → `ANTHROPIC_API_KEY`.
4. No Easypanel: `AI_MODEL_FAST=claude-haiku-5-5` (barato, usado em quase tudo) e `AI_MODEL=claude-sonnet-5-5` (só conversas quentes).

## 5. Google Maps (pode ser a sua conta Google atual)
1. https://console.cloud.google.com › crie um projeto `radar-de-vendas`.
2. **Faturamento**: vincule um cartão ao projeto (há cota gratuita mensal; a conta Workspace/Google One não basta).
3. Ative a **Places API (New)**: https://console.cloud.google.com/apis/library/places.googleapis.com
4. **APIs e serviços › Credenciais › Criar credenciais › Chave de API** → `GOOGLE_MAPS_API_KEY`.
5. Clique na chave › **Restrições de API** › escolha só **Places API (New)** › Salvar.

## 6. Groq (transcrição de áudios)
1. https://console.groq.com/keys › **Create API Key** → `GROQ_API_KEY`.

### 6.1 ElevenLabs (respostas em áudio com a voz da equipe, opcional)
1. Assine o plano **Starter** (ou superior) em https://elevenlabs.io (o Starter já permite clonar voz e uso comercial).
2. **Developers › API Keys › Create** → `ELEVENLABS_API_KEY` no Easypanel (Ambiente) → Implantar.
3. No painel: menu **Vozes (ElevenLabs)** → grave ou envie 10 a 30 s de cada voz, teste em **Ouvir**, ligue e clique em **Salvar**.

### 6.2 Google Drive (backup dos clientes e Produção)
Usa o mesmo projeto do Google Cloud do passo 5.
1. **APIs e serviços › Biblioteca** → ative a **Google Drive API**.
2. **APIs e serviços › Tela de consentimento OAuth** (Google Auth Platform): tipo **Externo**, nome "Radar de Vendas", seu e-mail. Em **Acesso a dados/Escopos**, adicione `.../auth/drive.file`. Em **Público**, clique em **Publicar app** (em "Teste" a autorização expira em 7 dias).
3. **Credenciais › Criar credenciais › ID do cliente OAuth** → tipo **Aplicativo da Web**. Em **URIs de redirecionamento autorizados**, cole `https://SEU-PAINEL/api/google/drive/callback` (o endereço aparece na página Produção).
4. Copie o **ID do cliente** → `GOOGLE_OAUTH_CLIENT_ID` e a **Chave secreta** → `GOOGLE_OAUTH_CLIENT_SECRET` no Easypanel (Ambiente) → Implantar.
5. No painel, **Produção › Conectar Google Drive** → entre com a conta Google da empresa → aparece o aviso "app não verificado": clique em **Avançado › Acessar Radar de Vendas** (é o seu próprio app) → Permitir.

### 6.3 GitHub (pasta Modelos com os modelos premium de site)
1. GitHub › foto › **Settings › Developer settings › Personal access tokens › Fine-grained tokens › Generate new token**.
2. Nome "Radar - Modelos", validade de 1 ano, **Repository access: Only select repositories** → `CRM-Vendas-Automatizado`.
3. **Permissions › Repository permissions**: **Contents: Read and write** e **Actions: Read-only** → Generate token.
4. No Easypanel (Ambiente): `GITHUB_TOKEN=` + o token → Implantar.
5. No painel: **Modelos premium › Sincronizar agora**. Para enviar modelos: **Enviar modelo novo** (o .zip da Arena) ou coloque a pasta direto em `Modelos/` no GitHub.

## 7. Asaas
1. No Asaas: **Integrações › Chave de API** → copie → `ASAAS_API_KEY`.
2. Invente um token (ex.: uma senha longa) → `ASAAS_WEBHOOK_TOKEN`.
3. **Integrações › Webhooks › Adicionar webhook** (pode manter o webhook que você já tem; este é um adicional):
   - Nome: `Radar de Vendas`
   - URL: `https://SEU-PAINEL/api/webhooks/asaas` (o endereço do passo 9)
   - E-mail: o seu · Versão da API: v3 · **Token de autenticação**: o mesmo `ASAAS_WEBHOOK_TOKEN`
   - Fila de sincronização: **ativada** · Tipo de envio: **sequencial**
   - Eventos: **Cobrança recebida**, **Cobrança confirmada**, **Cobrança vencida**, **Cobrança estornada**
4. Confirme que sua conta Asaas tem uma **chave Pix** cadastrada.
5. Para testar sem dinheiro real, use uma conta sandbox (https://sandbox.asaas.com) e `ASAAS_ENV=sandbox`.

## 8. Browserless (recibos em PDF)
1. Crie a conta em https://www.browserless.io (o plano gratuito atende o começo).
2. No painel, copie o **API Token** → `BROWSERLESS_TOKEN`.
3. `BROWSERLESS_URL=https://production-sfo.browserless.io`
   (Alternativa: instalar o Browserless no próprio Easypanel pelo template e usar o endereço interno.)

## 9. Painel e robô no Easypanel
1. **Create project** → nome `radar`.
2. **+ Service › App** → nome `painel`.
3. Aba **Source** › **GitHub** › repositório `contatofenixads/CRM-Vendas-Automatizado`, branch `main`.
   - Se pedir, conecte sua conta do GitHub em **Settings › GitHub** do Easypanel.
   - **Build**: escolha **Dockerfile** (o arquivo já está no repositório).
4. Aba **Domains**: adicione `painel.seudominio.com.br` (ou use o gerado) com **porta 3000**. Esse é o `APP_URL`.
5. Aba **Environment**: cole o conteúdo do `.env.example` preenchido com as suas chaves.
6. Clique em **Deploy**. A primeira subida leva de 3 a 5 minutos (ele compila ao iniciar).
7. Volte ao Asaas e confira se a URL do webhook é exatamente `APP_URL/api/webhooks/asaas`.

## 10. Primeiro acesso e teste
1. Crie a primeira conta no Supabase › **Authentication › Users › Add user › Create new user** (marque *Auto Confirm User*). A primeira conta vira administradora. Depois entre no `APP_URL` com ela; as próximas contas são criadas no painel, em **Equipe**.
   - Recuperar senha: em **Authentication › URL Configuration**, coloque o `APP_URL` em *Site URL* e `APP_URL/login/nova-senha` em *Redirect URLs*. Para o e-mail chegar a qualquer pessoa da equipe, configure um SMTP próprio em **Authentication › Emails › SMTP Settings** (o envio padrão do Supabase só entrega para membros da organização e tem limite baixo).
   - Em **Authentication › Sign In / Providers**, desligue *Allow new users to sign up* (ninguém cria conta sozinho).
2. **Configurações › Integrações**: tudo deve estar "ok". Preencha **Dados da empresa no recibo** e clique em **Salvar tudo**.
3. **Números WhatsApp**: dê um nome e clique em **Conectar via QR Code**. Leia com o celular.
4. Teste rápido: de outro celular, mande "oi" para o número conectado. A conversa deve aparecer em **Conversas** e a IA deve responder.
5. **Prospecção**: faça uma busca pequena (20 resultados) e envie os 5 melhores para a fila.
6. **Equipe**: crie os acessos das outras 2 pessoas.

---

## Se algo der errado
- **Integração com "falta"**: a variável não foi colada ou tem espaço sobrando. Corrija e clique em **Deploy** de novo.
- **QR Code não aparece**: confira `EVOLUTION_API_URL` (com https) e `EVOLUTION_API_KEY`.
- **Mensagens recebidas não aparecem**: confira `APP_URL` e `WEBHOOK_SECRET`, depois clique em **Refazer conexão** no número.
- **Pix não confirma**: confira a URL e o token do webhook no Asaas; em **Integrações › Webhooks › Logs** o Asaas mostra a resposta do painel.
- **Recibo não chega**: confira `BROWSERLESS_TOKEN`; a ficha do lead mostra o erro e tem o botão **Reenviar**.
- **Ver o que o robô está fazendo**: Easypanel › serviço `painel` › **Logs**.

### Custos aproximados por mês
- VPS KVM 2: cerca de R$ 70 · Easypanel: grátis (até 3 projetos)
- Claude API: até US$ 10 (teto travado no Console e na tela **Custos**)
- Google Places: R$ 0 (o sistema para antes da cota grátis: 1.000 buscas de negócios e 5.000 localizações por mês)
- Supabase, Groq e Browserless: planos gratuitos
- Asaas: só a tarifa sobre o que você recebe
