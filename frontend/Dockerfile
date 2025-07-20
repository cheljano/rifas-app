# ========== frontend/Dockerfile ==========

# Etapa 1: Construir la aplicación de React
FROM node:18-alpine AS build
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH

# Copiamos solo package.json. 'npm install' se encargará del resto.
COPY package.json ./

# Usamos 'npm install' en lugar de 'npm ci' porque no garantizamos tener un package-lock.json
RUN npm install --silent

# Copiamos el resto del código de la aplicación
COPY . ./

# Construimos la versión de producción de la app
RUN npm run build

# Etapa 2: Servir la aplicación con Nginx
FROM nginx:stable-alpine

# Copiar la build de React al directorio de Nginx
COPY --from=build /app/build /usr/share/nginx/html

# Exponer el puerto 80
EXPOSE 80

# Comando para iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]