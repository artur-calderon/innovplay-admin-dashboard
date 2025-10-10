FROM node:22-slim AS build

WORKDIR /app

COPY . .

RUN npm i && npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
