export type MapProvider = 'maplibre' | '2gis' | 'yandex'

export interface AppRuntimeConfig {
  API_BASE_URL: string
  KEYCLOAK_URL: string
  KEYCLOAK_REALM: string
  KEYCLOAK_CLIENT_ID: string
  USE_MSW: boolean | string
  DEMO_AUTH: boolean | string
  GRAFANA_URL: string
  MAP_STYLE_URL: string
  MAP_PROVIDER: MapProvider
  /** Browser SDK key — never hardcode; only via env / runtime config */
  MAP_2GIS_API_KEY: string
  MAP_YANDEX_API_KEY: string
}

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppRuntimeConfig>
  }
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const v = value.toLowerCase().trim()
    if (v === 'true' || v === '1') return true
    if (v === 'false' || v === '0' || v === '') return false
  }
  return fallback
}

function readConfig(): AppRuntimeConfig {
  const runtime = window.__APP_CONFIG__ ?? {}
  const env = import.meta.env

  return {
    API_BASE_URL:
      runtime.API_BASE_URL ||
      env.VITE_API_BASE_URL ||
      '/api/v1',
    KEYCLOAK_URL: runtime.KEYCLOAK_URL || env.VITE_KEYCLOAK_URL || '',
    KEYCLOAK_REALM: runtime.KEYCLOAK_REALM || env.VITE_KEYCLOAK_REALM || 'transport',
    KEYCLOAK_CLIENT_ID: runtime.KEYCLOAK_CLIENT_ID || env.VITE_KEYCLOAK_CLIENT_ID || 'web',
    USE_MSW: asBool(runtime.USE_MSW ?? env.VITE_USE_MSW, true),
    DEMO_AUTH: asBool(runtime.DEMO_AUTH ?? env.VITE_DEMO_AUTH, true),
    GRAFANA_URL: runtime.GRAFANA_URL || env.VITE_GRAFANA_URL || 'http://localhost:3000',
    MAP_STYLE_URL:
      runtime.MAP_STYLE_URL ||
      env.VITE_MAP_STYLE_URL ||
      'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    MAP_PROVIDER: normalizeMapProvider(
      runtime.MAP_PROVIDER || env.VITE_MAP_PROVIDER || 'maplibre',
    ),
    MAP_2GIS_API_KEY: runtime.MAP_2GIS_API_KEY || env.VITE_2GIS_API_KEY || '',
    MAP_YANDEX_API_KEY: runtime.MAP_YANDEX_API_KEY || env.VITE_YANDEX_MAPS_API_KEY || '',
  }
}

function normalizeMapProvider(value: unknown): MapProvider {
  if (value === '2gis' || value === 'yandex' || value === 'maplibre') return value
  return 'maplibre'
}

export const appConfig = readConfig()
