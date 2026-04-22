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

# Corrige DNS, aumenta timeouts e reduz sockets simultâneos
# RUN echo "nameserver 8.8.8.8" > /etc/resolv.conf \
#     && npm config set registry https://registry.npmjs.org/ \
#     && npm config set fetch-retries 5 \
#     && npm config set fetch-retry-factor 2 \
#     && npm config set fetch-retry-mintimeout 20000 \
#     && npm config set fetch-retry-maxtimeout 120000 \
#     && npm config set network-timeout 600000 \
#     && npm set maxsockets 5


# Usa npm ci (mais rápido e estável em ambientes CI/CD)
RUN npm ci
#RUN --mount=type=cache,target=/root/.npm npm ci --prefer-offline --no-audit


COPY . .

# Build do frontend
RUN npm run build

# ----------------------------
# 2️⃣ Etapa de produção (Nginx)
# ----------------------------
FROM nginx:alpine

RUN apk add --no-cache gettext

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf.template /etc/nginx/nginx.conf.template
CMD envsubst '$API_CONTAINER' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g 'daemon off';