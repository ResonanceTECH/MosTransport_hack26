import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Coefficients, Grouping, Horizon } from '@/shared/api/endpoints'
import { trackAction } from '@/shared/telemetry/telemetry'

export interface DashboardFilters {
  route: string
  routes: string[]
  date: string
  dateFrom?: string
  dateTo?: string
  horizon: Horizon
  from: string
  to: string
  stop?: string
  segmentFrom?: string
  segmentTo?: string
  grouping: Grouping
  hour: number
  coefficients: Coefficients
}

const DEFAULT_COEFFS: Coefficients = {
  k_weather: 1.2,
  k_event: 1.15,
  k_season: 1,
  k_traffic: 1.1,
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function parseNumber(value: string | null, fallback: number): number {
  if (value == null || value === '') return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function useDashboardFilters() {
  const [params, setParams] = useSearchParams()

  const filters = useMemo<DashboardFilters>(() => {
    const route = params.get('route') ?? '17'
    return {
      route,
      routes: route.split(',').filter(Boolean),
      date: params.get('date') ?? todayIso(),
      dateFrom: params.get('date_from') || undefined,
      dateTo: params.get('date_to') || undefined,
      horizon: (params.get('horizon') as Horizon) || 'day',
      from: params.get('from') ?? '06:00',
      to: params.get('to') ?? '23:00',
      stop: params.get('stop') || undefined,
      segmentFrom: params.get('segment_from') || undefined,
      segmentTo: params.get('segment_to') || undefined,
      grouping: (params.get('grouping') as Grouping) || 'route',
      hour: parseNumber(params.get('hour'), 8),
      coefficients: {
        k_weather: parseNumber(params.get('k_weather'), DEFAULT_COEFFS.k_weather),
        k_event: parseNumber(params.get('k_event'), DEFAULT_COEFFS.k_event),
        k_season: parseNumber(params.get('k_season'), DEFAULT_COEFFS.k_season),
        k_traffic: parseNumber(params.get('k_traffic'), DEFAULT_COEFFS.k_traffic),
      },
    }
  }, [params])

  const patch = useCallback(
    (next: Partial<DashboardFilters>, options?: { replace?: boolean }) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          const apply = (key: string, value: string | number | undefined | null) => {
            if (value === undefined || value === null || value === '') p.delete(key)
            else p.set(key, String(value))
          }

          if (next.route !== undefined) {
            apply('route', next.route)
            trackAction('route_changed', { route: next.route })
          }
          if (next.date !== undefined) apply('date', next.date)
          if (next.dateFrom !== undefined) apply('date_from', next.dateFrom)
          if (next.dateTo !== undefined) apply('date_to', next.dateTo)
          if (next.horizon !== undefined) {
            apply('horizon', next.horizon)
            trackAction('horizon_changed', { horizon: next.horizon })
          }
          if (next.from !== undefined) apply('from', next.from)
          if (next.to !== undefined) apply('to', next.to)
          if (next.stop !== undefined) apply('stop', next.stop)
          if (next.segmentFrom !== undefined) apply('segment_from', next.segmentFrom)
          if (next.segmentTo !== undefined) apply('segment_to', next.segmentTo)
          if (next.grouping !== undefined) apply('grouping', next.grouping)
          if (next.hour !== undefined) apply('hour', next.hour)
          if (next.coefficients) {
            apply('k_weather', next.coefficients.k_weather)
            apply('k_event', next.coefficients.k_event)
            apply('k_season', next.coefficients.k_season)
            apply('k_traffic', next.coefficients.k_traffic)
            trackAction('coefficients_changed', next.coefficients)
          }
          return p
        },
        { replace: options?.replace ?? true },
      )
    },
    [setParams],
  )

  const resetCoefficients = useCallback(() => {
    patch({ coefficients: DEFAULT_COEFFS })
  }, [patch])

  return { filters, patch, resetCoefficients, defaultCoefficients: DEFAULT_COEFFS }
}

export function filtersToForecastQuery(filters: DashboardFilters) {
  return {
    route: filters.route,
    horizon: filters.horizon,
    date: filters.date,
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    stop: filters.stop,
    segment_from: filters.segmentFrom,
    segment_to: filters.segmentTo,
    from: filters.from,
    to: filters.to,
    grouping: filters.grouping,
    hour: filters.hour,
    k_weather: filters.coefficients.k_weather,
    k_event: filters.coefficients.k_event,
    k_season: filters.coefficients.k_season,
    k_traffic: filters.coefficients.k_traffic,
  }
}
