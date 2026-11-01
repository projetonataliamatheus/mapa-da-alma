# Radar de Vendas — painel + robô (para o Easypanel)
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production TZ=America/Sao_Paulo NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
RUN npm install --include=dev --no-audit --no-fund
COPY . .
EXPOSE 3000
# A compilação acontece ao iniciar, para usar as variáveis que você cadastrou no Easypanel.
CMD ["sh", "-c", "npm run build && npm run start:all"]
