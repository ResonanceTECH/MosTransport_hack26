/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_KEYCLOAK_URL?: string
  readonly VITE_KEYCLOAK_REALM?: string
  readonly VITE_KEYCLOAK_CLIENT_ID?: string
  readonly VITE_USE_MSW?: string
  readonly VITE_DEMO_AUTH?: string
  readonly VITE_GRAFANA_URL?: string
  readonly VITE_MAP_STYLE_URL?: string
  readonly VITE_MAP_PROVIDER?: string
  readonly VITE_2GIS_API_KEY?: string
  readonly VITE_YANDEX_MAPS_API_KEY?: string
  readonly VITE_API_PROXY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
