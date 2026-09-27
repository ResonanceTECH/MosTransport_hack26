import { apiRequest, downloadFile, type QueryValue } from '@/shared/api/client'
import type { components } from '@/shared/api/schema'

export type RouteSummary = components['schemas']['RouteSummary']
export type RouteDetail = components['schemas']['RouteDetail']
export type RouteGeometry = components['schemas']['RouteGeometry']
export type ForecastResponse = components['schemas']['ForecastResponse']
export type ForecastMapResponse = components['schemas']['ForecastMapResponse']
export type MapStopLoad = components['schemas']['MapStopLoad']
export type HeatmapResponse = components['schemas']['HeatmapResponse']
export type KpiResponse = components['schemas']['KpiResponse']
export type FactorsResponse = components['schemas']['FactorsResponse']
export type ModelInfo = components['schemas']['ModelInfo']
export type Coefficients = components['schemas']['Coefficients']
export type UserScenario = components['schemas']['UserScenario']
export type UserScenarioList = components['schemas']['UserScenarioList']
export type Horizon = components['schemas']['Horizon']
export type Grouping = components['schemas']['Grouping']
export type CoefficientEffect = components['schemas']['CoefficientEffect']

export interface ForecastQuery {
  route: string
  horizon: Horizon
  date?: string
  date_from?: string
  date_to?: string
  stop?: string
  segment_from?: string
  segment_to?: string
  from?: string
  to?: string
  grouping?: Grouping
  hour?: number
  k_weather?: number
  k_event?: number
  k_season?: number
  k_traffic?: number
  simulate_error?: string
}

function toQuery(params: ForecastQuery): Record<string, QueryValue> {
  return { ...params }
}

export const api = {
  listRoutes: () => apiRequest<{ items: RouteSummary[] }>('/routes'),

  getRoute: (id: string) => apiRequest<RouteDetail>(`/routes/${id}`),

  getRouteGeometry: (id: string) => apiRequest<RouteGeometry>(`/routes/${id}/geometry`),

  getForecast: (params: ForecastQuery) =>
    apiRequest<ForecastResponse>('/forecast', { query: toQuery(params) }),

  getForecastMap: (params: ForecastQuery) =>
    apiRequest<ForecastMapResponse>('/forecast/map', { query: toQuery(params) }),

  getForecastHeatmap: (params: ForecastQuery) =>
    apiRequest<HeatmapResponse>('/forecast/heatmap', { query: toQuery(params) }),

  getForecastKpi: (params: ForecastQuery) =>
    apiRequest<KpiResponse>('/forecast/kpi', { query: toQuery(params) }),

  getFactors: () => apiRequest<FactorsResponse>('/factors'),

  getModelInfo: () => apiRequest<ModelInfo>('/model/info'),

  recomputeForecast: () =>
    apiRequest<{ job_id: string; status: string }>('/forecast/recompute', { method: 'POST' }),

  exportForecast: async (params: ForecastQuery & { format: 'csv' | 'xlsx' }) => {
    const { format, ...rest } = params
    const name = `forecast_route-${rest.route}_${rest.horizon}_${rest.date ?? 'period'}.${format}`
    await downloadFile('/forecast/export', { ...toQuery(rest), format }, name)
  },

  postTelemetry: (events: components['schemas']['TelemetryBatch']['events']) =>
    apiRequest<void>('/telemetry', {
      method: 'POST',
      body: { events },
      skipAuth: false,
    }),

  listScenarios: () => apiRequest<UserScenarioList>('/user-scenarios'),

  createScenario: (body: { name: string; coefficients: Coefficients }) =>
    apiRequest<UserScenario>('/user-scenarios', { method: 'POST', body }),

  deleteScenario: (id: string) =>
    apiRequest<void>(`/user-scenarios/${id}`, { method: 'DELETE' }),
}
