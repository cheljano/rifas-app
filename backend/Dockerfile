# -------------------- backend/Dockerfile (Mejorado) --------------------

# Etapa 1: Build - Instalar dependencias y copiar código fuente
FROM node:18-alpine AS build

WORKDIR /usr/src/app

# Usar --omit=dev para no instalar dependencias de desarrollo (como nodemon)
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Etapa 2: Production - Copiar artefactos y ejecutar
FROM node:18-alpine

WORKDIR /usr/src/app

# Copiar solo los artefactos necesarios desde la etapa de build
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/src ./src
COPY --from=build /usr/src/app/package*.json ./

# Exponer el puerto que usa la app
EXPOSE 3000

# Comando para iniciar el servidor directamente con Node.js
CMD ["node", "src/server.js"]