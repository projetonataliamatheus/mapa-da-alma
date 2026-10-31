# Mapa da Alma — sem dependências externas: não precisa de npm install.
FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY . .
RUN node --experimental-strip-types --no-warnings tests/motor.test.ts
EXPOSE 3000
CMD ["node", "--experimental-strip-types", "--no-warnings", "src/server.ts"]
