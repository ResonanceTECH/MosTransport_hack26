import { appConfig } from '@/shared/config/env'

/** Grafana URL from env / runtime config — never hardcode. */
export function getGrafanaUrl(): string {
  return appConfig.GRAFANA_URL.trim()
}

export function isGrafanaConfigured(): boolean {
  return getGrafanaUrl().length > 0
}
