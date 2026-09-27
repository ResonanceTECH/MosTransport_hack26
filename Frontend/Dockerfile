# Multi-stage frontend build for MosTransport dispatcher UI
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_USE_MSW=true
ARG VITE_DEMO_AUTH=true
ENV VITE_USE_MSW=$VITE_USE_MSW \
    VITE_DEMO_AUTH=$VITE_DEMO_AUTH
RUN npm run build

FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.d/40-runtime-config.sh
COPY --from=build /app/dist /usr/share/nginx/html
COPY public/config.template.js /usr/share/nginx/html/config.template.js
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
