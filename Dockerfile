# Radar de Vendas — painel + robô (para o Easypanel)
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production TZ=America/Sao_Paulo NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
RUN npm install --include=dev --no-audit --no-fund
# Variáveis públicas (o Easypanel as entrega como "build args"): entram no build já na imagem. Sem elas, nada quebra:
# a partida confere e compila na hora, como antes.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_OLINKS_WHATSAPP
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY NEXT_PUBLIC_OLINKS_WHATSAPP=$NEXT_PUBLIC_OLINKS_WHATSAPP
COPY . .
# Compila na construção da imagem (o deploy leva o tempo de build, mas a troca de container fica em segundos).
# Se falhar (ex.: faltou variável), apaga o resultado parcial e a partida compila como antes.
RUN (npm run build && node scripts/envhash.cjs > .next/.envhash) || rm -rf .next
EXPOSE 3000
CMD ["sh", "scripts/start.sh"]
