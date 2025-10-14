# ----------------------------
# 1️⃣ Etapa de build
# ----------------------------
FROM node:22-slim AS build

# Instala dependências de rede que o npm pode precisar
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

# Configurações de retry e cache para evitar ECONNRESET
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-factor 2 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 

# Usa npm ci (mais rápido e estável em ambientes CI/CD)
RUN npm ci

COPY . .

# Build do frontend
RUN npm run build

# ----------------------------
# 2️⃣ Etapa de produção (Nginx)
# ----------------------------
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
