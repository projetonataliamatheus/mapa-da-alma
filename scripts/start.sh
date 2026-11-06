#!/bin/sh
# Partida rápida: se a imagem já veio compilada com as MESMAS variáveis públicas, sobe em segundos.
# Qualquer dúvida (sem build, variáveis diferentes) cai no comportamento antigo: compila agora e sobe.
cd /app
AGORA=$(node scripts/envhash.cjs)
if [ -f .next/BUILD_ID ] && [ "$(cat .next/.envhash 2>/dev/null)" = "$AGORA" ]; then
  echo "[start] build pronto na imagem: subindo direto"
else
  echo "[start] compilando agora (build da imagem ausente ou variáveis diferentes)"
  npm run build || exit 1
  node scripts/envhash.cjs > .next/.envhash
fi
exec npm run start:all
