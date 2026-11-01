# Mapa da Alma — CRM de atendimento e venda de mapas

Base: o painel do Radar (mesmos menus, conversas, IA com aprendizado, base de conhecimento, abordagens, financeiro, recibos, números por QR Code e vozes ElevenLabs), adaptado para vender e entregar **mapas de numerologia cabalística + astrologia**.

- Motor de mapas: `src/lib/mapa-alma/` (conferido contra mapa real: `node --experimental-strip-types tests/mapa-motor.test.ts`)
- Banco completo: rode `supabase/BANCO_COMPLETO.sql` no Supabase do Mapa da Alma.

## O que já funciona
- **Prospecção:** busca por nicho, cidade, raio e quantidade (20/50) na Google Places API; análise do site (sem site, Linktree, sem https, não adaptado ao celular); Instagram e WhatsApp encontrados na ficha e no site; pontuação com pesos ajustáveis.
- **Robô 24/7** (`worker/`): primeiras mensagens e follow-ups dentro do horário, limites diários por fase de aquecimento, intervalos aleatórios, pausas longas, pausa automática por recusas/erros, remarketing na data combinada.
- **IA de vendas (Claude):** responde com no máximo 2 linhas em forma de pergunta, entende áudios (transcrição Groq), mede temperatura, move o lead no funil, resume a conversa, registra dores e objeções, negocia por degraus de preço com piso e aprovação, pede ajuda humana quando precisa e nunca finge ser humana.
- **Teste A/B** de 4 abordagens (calma, direta, AIDA, PAS) com distribuição automática para a que mais vende.
- **Pix pelo Asaas:** a IA pede CPF/CNPJ, gera a cobrança na conversa e o Asaas confirma o pagamento.
- **Recibo em PDF automático:** gerado no Browserless com os dados da empresa, guardado no Supabase e enviado pelo WhatsApp.
- **Aprendizado:** cada venda paga é estudada (dor, gancho, fator decisivo, objeções vencidas); playbook por nicho refeito a cada 3 vendas; base de conhecimento com PDFs.
- **Painel:** visão geral ao vivo, alertas "Precisa de você", Kanban, conversas estilo WhatsApp Web, Instagram assistido, números com QR Code e saúde, serviços e preços, abordagens, aprendizado, base de conhecimento, configurações, equipe com perfis e o manual pesquisável.

## Estrutura
```
supabase/migrations/   banco de dados (rodar no SQL Editor do Supabase)
src/app/(painel)/      telas do painel
src/app/api/           rotas da API e webhooks (WhatsApp e Pix)
src/lib/               motor: busca, pontuação, WhatsApp, IA, Pix, aprendizado
worker/                robô que roda 24h junto com o painel
src/data/manual.ts     conteúdo do menu Ajuda e Manuais
prototipo/             protótipo visual original
```

## Comandos
- `npm run dev` — painel em modo desenvolvimento
- `npm run worker` — só o robô
- `npm run start:all` — painel + robô (é o que o servidor usa)
- `npm test` — testes das regras de negócio
