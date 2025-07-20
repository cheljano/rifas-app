# -------------------- frontend/Dockerfile (Mejorado) --------------------

# Etapa 1: Construir la aplicación de React
FROM node:18-alpine AS build
WORKDIR /app

# Declarar los argumentos que se pueden pasar durante el build
ARG REACT_APP_API_URL
ARG REACT_APP_SOCKET_URL

# Asignar los argumentos a variables de entorno para que `npm run build` los use
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_SOCKET_URL=$REACT_APP_SOCKET_URL

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
# (Opcional) Copiar una configuración personalizada de Nginx
# COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]