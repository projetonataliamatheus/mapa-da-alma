# Mapa da Alma

Sistema de mapas de **numerologia cabalística + horóscopo**: gera o mapa a partir do nome e da data de nascimento, entrega **PDF** e **link ao vivo**, atende no **WhatsApp com IA** (calma e focada só em mapas), cobra por **Pix (Asaas)**, envia o mapa sozinho depois do pagamento e tem **painel administrativo** completo.

**Instalação:** siga [docs/INSTALACAO.md](docs/INSTALACAO.md).

## O que já funciona
- **Motor de cálculo** conferido contra um mapa real (23 conferências): motivação, impressão, expressão, destino, missão, talento oculto, número psíquico, lições e dívidas cármicas, tendências ocultas, resposta subconsciente, ano/mês/dia pessoal, ciclos, momentos decisivos, desafios, arcanos e os 4 triângulos invertidos com sequências negativas.
- **Mapa pessoal e mapa do casal** com textos autorais (numerologia + signo solar), editáveis no painel.
- **Link ao vivo** para o cliente (celular) e **PDF A4** com capa própria.
- **Atendimento com IA**: junta mensagens seguidas, guarda resumo e memória de cada cliente, gera o Pix, entrega o mapa e aprende com cada venda; chama você quando precisa.
- **Painel**: visão geral, "precisa de você", conversas ao vivo (assumir/devolver para a IA), clientes, mapas, financeiro (recebimentos, gastos e lucro), IA e aprendizado, produtos e preços, textos, WhatsApp e acessos.

## Estrutura
```
src/server.ts               servidor e rotas
src/lib/numerologia/        motor de cálculo e tabelas
src/lib/textos/             textos autorais padrão
src/lib/mapa/               montagem do conteúdo e HTML (ao vivo + PDF)
src/lib/atendimento.ts      IA do WhatsApp, Pix e entrega
src/lib/integracoes.ts      Supabase, Evolution, Asaas, Browserless, Claude
src/painel/                 telas do painel
supabase/001_inicial.sql    banco de dados
tests/                      testes do motor e teste ponta a ponta
```

## Sem dependências
Roda só com Node 22: não precisa de `npm install`. `npm start` sobe o sistema; `npm test` confere o motor.

## Pendências conhecidas
- Conferir com mapas de teste as tabelas fixas marcadas como "tradicionais" em `src/lib/numerologia/tabelas.ts` (dias, harmônicos, harmonia conjugal fora da linha 4) e o valor das letras acentuadas.
- Áudios no WhatsApp: hoje a IA pede para o cliente escrever.
