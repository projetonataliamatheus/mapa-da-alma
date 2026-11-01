# Mapa da Alma — guia de instalação

Tudo fica **separado da agência**: projeto próprio no Easypanel, banco Supabase próprio, WhatsApp próprio e conta Asaas no seu CPF. Da agência, só a VPS (o mesmo servidor) é aproveitada.

Tempo estimado: 40 a 60 minutos.

---

## 1. Supabase (banco de dados)

1. Em supabase.com, crie um projeto novo chamado **Mapa da Alma** (separado do Radar).
2. Vá em **SQL Editor → New query**, cole todo o conteúdo do arquivo `supabase/001_inicial.sql` e clique em **Run**. Deve aparecer "Success".
3. Vá em **Project Settings → API** e anote:
   - **Project URL** → vai na variável `SUPABASE_URL`
   - **service_role** (em "Project API keys", clique em revelar) → vai em `SUPABASE_SERVICE_ROLE_KEY`

> A chave service_role dá acesso total ao banco. Cole só no Easypanel, nunca no chat ou no GitHub.

## 2. Domínio

1. Registre o domínio (ex.: `mapadaalma.com.br` no registro.br).
2. No painel de DNS do domínio, crie um registro **A** apontando `@` (e `www`, se quiser) para o **IP da sua VPS Hostinger**.

## 3. Easypanel: projeto novo

No seu Easypanel (o mesmo de sempre), clique em **+ Criar projeto** e dê o nome **mapa-da-alma**. Tudo abaixo é criado **dentro desse projeto**.

### 3.1 WhatsApp (Evolution API)

1. Dentro do projeto, **+ Serviço → Templates → Evolution API**.
2. Em `AUTHENTICATION_API_KEY`, coloque uma senha longa e anote: ela vai em `EVOLUTION_API_KEY`.
3. Crie e aguarde ficar verde. O nome interno do serviço aparece no Easypanel (ex.: `mapa-da-alma_evolution-api`). O endereço interno fica `http://mapa-da-alma_evolution-api:8080` → `EVOLUTION_API_URL`.

### 3.2 PDF (Browserless)

1. **+ Serviço → Templates → Browserless** (ou um App com a imagem `ghcr.io/browserless/chromium`).
2. Defina a variável `TOKEN` com uma senha longa → vai em `BROWSERLESS_TOKEN`.
3. Endereço interno: `http://mapa-da-alma_browserless:3000` → `BROWSERLESS_URL`.

### 3.3 O sistema (App)

1. Em **Configurações do Easypanel → GitHub**, conecte a conta **projetonataliamatheus** (token do GitHub com acesso ao repositório `mapa-da-alma`).
2. No projeto, **+ Serviço → App**, nome `app`.
3. **Fonte:** GitHub → `projetonataliamatheus/mapa-da-alma`, branch `main`. **Build:** Dockerfile.
4. **Ambiente:** copie as variáveis do arquivo `.env.example` e preencha cada valor.
5. **Domínios:** adicione `mapadaalma.com.br` apontando para a porta **3000**, com HTTPS ligado.
6. Clique em **Implantar**. Quando ficar verde, abra `https://mapadaalma.com.br/saude`: deve aparecer `{"ok":true}`.

## 4. Primeiro acesso ao painel

1. Abra `https://mapadaalma.com.br`. Na primeira vez, o sistema pede para criar o seu acesso (nome, e-mail e senha).
2. O login é feito pelo **Supabase Auth**, igual ao Radar: os acessos ficam em Supabase → **Authentication → Users**.
3. Em **Configurações** do painel, você pode adicionar outros acessos.

> Nas variáveis do Easypanel, use só letras e números nos segredos: o Easypanel corta o valor no `#` e interpreta o `$`.

## 5. Conectar o WhatsApp

1. No painel, abra **WhatsApp → Conectar / mostrar QR Code**.
2. No celular do número do Mapa da Alma: WhatsApp → **Aparelhos conectados → Conectar aparelho** → leia o QR Code.
3. Quando aparecer "conectado", a IA já começa a responder as conversas.

## 6. Pix (Asaas no seu CPF)

1. Abra a conta no Asaas como pessoa física.
2. **Integrações → Chaves de API → Gerar chave** → vai em `ASAAS_API_KEY`.
3. **Integrações → Webhooks → Adicionar**:
   - URL: `https://mapadaalma.com.br/api/webhooks/asaas`
   - Token de autenticação: invente uma senha longa → vai em `ASAAS_WEBHOOK_TOKEN`
   - Eventos: **Cobrança recebida** (PAYMENT_RECEIVED) e **Cobrança confirmada** (PAYMENT_CONFIRMED)
4. Atualize as variáveis no Easypanel e clique em **Implantar** de novo.

> Para testar sem dinheiro de verdade, use uma conta sandbox do Asaas e `ASAAS_ENV=sandbox`.

## 7. Ajustes finais no painel

- **IA e aprendizado:** nome e tom da atendente, preços dos mapas (pessoal e casal) e regras extras.
- **Textos do mapa:** personalize qualquer texto (opcional; o sistema já vem com todos prontos).
- **Configurações:** nome, subtítulo e assinatura do mapa.

## Teste rápido

1. Em **Mapas**, crie um mapa com o seu nome e data. Abra o link ao vivo e o PDF.
2. De outro celular, mande "oi" para o número do WhatsApp e converse com a IA até o Pix.

---

### Como o sistema funciona

```
Anúncio → WhatsApp → IA (Clara) conversa com calma → coleta nome + data + CPF
      → Pix (Asaas) → pagamento confirmado → mapa gerado → link ao vivo + PDF no WhatsApp
      → a IA estuda a venda e guarda um aprendizado
```

- Se a IA não souber resolver, ela pausa a conversa e o cliente aparece em **Visão geral → Precisa de você**.
- Você pode assumir qualquer conversa em **Conversas → Pausar IA e assumir**.
- A cada 10 minutos o sistema confere os Pix pendentes, caso algum aviso do Asaas se perca.
