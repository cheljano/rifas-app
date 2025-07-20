# Etapa 1: Construir la aplicación de React
FROM node:18-alpine AS build
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
COPY package.json ./
COPY package-lock.json ./
RUN npm ci --silent
COPY . ./
RUN npm run build

# Etapa 2: Servir la aplicación con Nginx
FROM nginx:stable-alpine
# Copiar la build de React al directorio de Nginx
COPY --from=build /app/build /usr/share/nginx/html
# Copiar una configuración personalizada de Nginx si es necesario
# COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]