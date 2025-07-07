FROM node:22.17-slim AS build

WORKDIR /app

COPY . .

RUN npm i && npm run build

FROM nginx:1.29.0-alpine-slim

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
