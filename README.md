# Mapa da Alma

Sistema de mapas de numerologia cabalística + horóscopo: gera o mapa a partir do nome e da data de nascimento, entrega PDF e link ao vivo, atende no WhatsApp com IA e tem painel administrativo.

## Status
- [x] Motor de cálculo (`src/lib/numerologia/motor.ts`) — conferido contra um mapa real (23 conferências)
- [ ] Mapa ao vivo + PDF
- [ ] Painel admin (Supabase)
- [ ] Atendimento WhatsApp com IA + Pix (Asaas)

## Testes
```
node --experimental-strip-types tests/motor.test.ts
```
