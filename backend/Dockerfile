# Etapa 1: Instalar dependencias
FROM node:18-alpine AS deps
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

# Etapa 2: Construir la aplicación
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

# Etapa 3: Ejecutar la aplicación
FROM node:18-alpine
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app .

# Exponer el puerto que usa la app
EXPOSE 3000

# Comando para iniciar el servidor
CMD ["npm", "start"]