#!/bin/sh
set -eu

TEMPLATE="/usr/share/nginx/html/config.template.js"
OUTPUT="/usr/share/nginx/html/config.js"

API_BASE_URL="${API_BASE_URL:-/api/v1}"
KEYCLOAK_URL="${KEYCLOAK_URL:-}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-transport}"
KEYCLOAK_CLIENT_ID="${KEYCLOAK_CLIENT_ID:-web}"
USE_MSW="${USE_MSW:-false}"
DEMO_AUTH="${DEMO_AUTH:-true}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:8020}"
MAP_STYLE_URL="${MAP_STYLE_URL:-https://basemaps.cartocdn.com/gl/positron-gl-style/style.json}"
DEFAULT_DATE="${DEFAULT_DATE:-}"
DEFAULT_ROUTE="${DEFAULT_ROUTE:-17}"

sed \
  -e "s|\${API_BASE_URL}|${API_BASE_URL}|g" \
  -e "s|\${KEYCLOAK_URL}|${KEYCLOAK_URL}|g" \
  -e "s|\${KEYCLOAK_REALM}|${KEYCLOAK_REALM}|g" \
  -e "s|\${KEYCLOAK_CLIENT_ID}|${KEYCLOAK_CLIENT_ID}|g" \
  -e "s|\${USE_MSW}|${USE_MSW}|g" \
  -e "s|\${DEMO_AUTH}|${DEMO_AUTH}|g" \
  -e "s|\${GRAFANA_URL}|${GRAFANA_URL}|g" \
  -e "s|\${MAP_STYLE_URL}|${MAP_STYLE_URL}|g" \
  -e "s|\${DEFAULT_DATE}|${DEFAULT_DATE}|g" \
  -e "s|\${DEFAULT_ROUTE}|${DEFAULT_ROUTE}|g" \
  "$TEMPLATE" > "$OUTPUT"

# Self-signed certificate so the UI can be served over HTTPS on port 443.
TLS_DIR=/etc/nginx/tls
if [ ! -f "$TLS_DIR/server.crt" ]; then
  mkdir -p "$TLS_DIR"
  openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
    -keyout "$TLS_DIR/server.key" -out "$TLS_DIR/server.crt" \
    -subj "/C=RU/ST=Moscow/L=Moscow/O=MosTransport/CN=${TLS_COMMON_NAME:-localhost}" \
    -addext "subjectAltName=DNS:localhost,DNS:frontend,IP:127.0.0.1" >/dev/null 2>&1
  chmod 600 "$TLS_DIR/server.key"
  echo "Generated self-signed TLS certificate in $TLS_DIR"
fi

echo "Runtime config written to config.js"
