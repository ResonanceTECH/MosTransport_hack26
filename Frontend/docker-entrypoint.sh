#!/bin/sh
set -eu

TEMPLATE="/app/public/config.template.js"
OUTPUT="/app/dist/config.js"

API_BASE_URL="${API_BASE_URL:-/api/v1}"
KEYCLOAK_URL="${KEYCLOAK_URL:-}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-transport}"
KEYCLOAK_CLIENT_ID="${KEYCLOAK_CLIENT_ID:-web}"
USE_MSW="${USE_MSW:-false}"
DEMO_AUTH="${DEMO_AUTH:-true}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:8020}"
MAP_STYLE_URL="${MAP_STYLE_URL:-}"
MAP_TILES_URL="${MAP_TILES_URL:-}"
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
  -e "s|\${MAP_TILES_URL}|${MAP_TILES_URL}|g" \
  -e "s|\${DEFAULT_DATE}|${DEFAULT_DATE}|g" \
  -e "s|\${DEFAULT_ROUTE}|${DEFAULT_ROUTE}|g" \
  "$TEMPLATE" > "$OUTPUT"

echo "Runtime config written to $OUTPUT; API proxy -> ${VITE_API_PROXY:-http://localhost:8000}"

exec npx vite preview --host 0.0.0.0 --port "${PORT:-443}" --strictPort
