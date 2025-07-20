# -------------------- backend/Dockerfile --------------------

# Etapa 1: Build - Instalar dependencias y copiar código fuente
FROM node:18-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./
# Puedes usar 'npm install' como solución rápida o 'npm ci' si ya subiste el package-lock.json
RUN npm install

COPY . .

# Etapa 2: Production - Copiar artefactos y ejecutar
FROM node:18-alpine

WORKDIR /usr/src/app

COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/src ./src
COPY --from=build /usr/src/app/package*.json ./

EXPOSE 3000

CMD ["node", "src/server.js"]