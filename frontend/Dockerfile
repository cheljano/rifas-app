# ========== frontend/Dockerfile ==========

# Etapa 1: Construir la aplicación de React
FROM node:18-alpine AS build
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH

COPY package.json ./
# Si tienes un package-lock.json, puedes copiarlo también para instalaciones más rápidas
# COPY package-lock.json ./

# Usamos 'npm install' que es más flexible
RUN npm install

# Copiamos el resto del código de la aplicación
COPY . ./

# IMPORTANTE: Desactivamos CI para evitar que las advertencias fallen la construcción
ENV CI=false

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
