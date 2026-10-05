# MosTransport dispatcher UI: production build served by `vite preview` (no nginx).
FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_USE_MSW=false
ARG VITE_DEMO_AUTH=true
ENV VITE_USE_MSW=$VITE_USE_MSW \
    VITE_DEMO_AUTH=$VITE_DEMO_AUTH
RUN npm run build && chmod +x docker-entrypoint.sh

ENV PORT=443
EXPOSE 443
CMD ["./docker-entrypoint.sh"]
