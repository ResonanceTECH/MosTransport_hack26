#!/bin/sh
set -eu

TEMPLATE="/usr/share/nginx/html/config.template.js"
OUTPUT="/usr/share/nginx/html/config.js"

API_BASE_URL="${API_BASE_URL:-/api/v1}"
KEYCLOAK_URL="${KEYCLOAK_URL:-}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-transport}"
KEYCLOAK_CLIENT_ID="${KEYCLOAK_CLIENT_ID:-web}"
USE_MSW="${USE_MSW:-true}"
DEMO_AUTH="${DEMO_AUTH:-true}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3000}"
MAP_STYLE_URL="${MAP_STYLE_URL:-https://basemaps.cartocdn.com/gl/positron-gl-style/style.json}"

sed \
  -e "s|\${API_BASE_URL}|${API_BASE_URL}|g" \
  -e "s|\${KEYCLOAK_URL}|${KEYCLOAK_URL}|g" \
  -e "s|\${KEYCLOAK_REALM}|${KEYCLOAK_REALM}|g" \
  -e "s|\${KEYCLOAK_CLIENT_ID}|${KEYCLOAK_CLIENT_ID}|g" \
  -e "s|\${USE_MSW}|${USE_MSW}|g" \
  -e "s|\${DEMO_AUTH}|${DEMO_AUTH}|g" \
  -e "s|\${GRAFANA_URL}|${GRAFANA_URL}|g" \
  -e "s|\${MAP_STYLE_URL}|${MAP_STYLE_URL}|g" \
  "$TEMPLATE" > "$OUTPUT"

echo "Runtime config written to config.js"
