import { http, HttpResponse, type HttpHandler } from 'msw'
import type { components } from '../api/schema'
import { LOAD_THRESHOLDS } from '../config/loadThresholds'
import {
  baselineLoad,
  coeffProduct,
  getGeometry,
  getRoute,
  getRoutes,
  getStops,
  loadLevel,
  syntheticLoad,
  type Coefficients,
} from './tramData'

const API = '/api/v1'

type UserScenario = components['schemas']['UserScenario']
type UserScenarioCreate = components['schemas']['UserScenarioCreate']

const userScenarios = new Map<string, UserScenario>()

function requestId(request: Request): string {
  return request.headers.get('X-Request-ID') ?? crypto.randomUUID()
}

function apiError(message: string, request_id: string, status: number, code?: string) {
  return HttpResponse.json(
    { message, request_id, ...(code ? { code } : {}) },
    { status, headers: { 'X-Request-ID': request_id } },
  )
}

function requireAuth(request: Request): Response | null {
  const auth = request.headers.get('Authorization')
  if (!auth) {
    const id = requestId(request)
    return apiError('Authorization required', id, 401, 'unauthorized')
  }
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token.startsWith('demo.')) {
    const id = requestId(request)
    return apiError('Invalid or expired token', id, 401, 'unauthorized')
  }
  return null
}

function parseCoeffs(url: URL): Coefficients {
  const num = (key: string) => {
    const v = url.searchParams.get(key)
    if (v == null || v === '') return 1
    const n = Number(v)
    return Number.isFinite(n) ? n : 1
  }
  return {
    k_weather: num('k_weather'),
    k_event: num('k_event'),
    k_season: num('k_season'),
    k_traffic: num('k_traffic'),
  }
}

function parseRouteIds(url: URL): string[] {
  const raw = url.searchParams.get('route') ?? '17'
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

function primaryRouteId(url: URL): string {
  return parseRouteIds(url)[0] ?? '17'
}

function meta(request: Request, estimated = false): components['schemas']['ForecastMeta'] {
  return {
    request_id: requestId(request),
    estimated,
    external_data_stale: false,
  }
}

function effectFromCoeffs(coeffs: Coefficients): components['schemas']['CoefficientEffect'] {
  const product = coeffProduct(coeffs)
  const delta_percent = Math.round((product - 1) * 1000) / 10
  const delta_passengers = Math.round(1200 * (product - 1))
  return { delta_percent, delta_passengers }
}

function routeSumBaselineLoad(routeId: string, hour: number): number {
  const stops = getStops(routeId)
  if (stops.length === 0) return baselineLoad(0, hour)
  return stops.reduce((acc, _s, i) => acc + baselineLoad(i, hour), 0)
}

function routeAvgBaselineLoad(routeId: string, hour: number): number {
  const stops = getStops(routeId)
  if (stops.length === 0) return baselineLoad(0, hour)
  return Math.round(routeSumBaselineLoad(routeId, hour) / stops.length)
}

function routeSumAdjustedLoad(routeId: string, hour: number, coeffs: Coefficients): number {
  const stops = getStops(routeId)
  if (stops.length === 0) return syntheticLoad(0, hour, coeffs)
  return stops.reduce((acc, _s, i) => acc + syntheticLoad(i, hour, coeffs), 0)
}

function horizonPointCount(horizon: string): number {
  switch (horizon) {
    case 'month':
      return 30
    case 'year':
      return 12
    default:
      return 24
  }
}

function seriesTimestamp(baseDate: Date, horizon: string, index: number): string {
  const d = new Date(baseDate)
  if (horizon === 'year') {
    d.setUTCMonth(index, 1)
    d.setUTCHours(12, 0, 0, 0)
    return d.toISOString()
  }
  if (horizon === 'month') {
    d.setUTCDate(index + 1)
    d.setUTCHours(12, 0, 0, 0)
    return d.toISOString()
  }
  d.setUTCHours(index, 0, 0, 0)
  return d.toISOString()
}

function parseBaseDate(url: URL): Date {
  const dateStr = url.searchParams.get('date')
  if (dateStr) {
    const d = new Date(`${dateStr}T00:00:00Z`)
    if (!Number.isNaN(d.getTime())) return d
  }
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function buildForecastSeries(request: Request, url: URL) {
  if (url.searchParams.get('simulate_error') === '503') {
    const id = requestId(request)
    return apiError('Forecast service temporarily unavailable', id, 503, 'service_unavailable')
  }

  const horizon = url.searchParams.get('horizon') ?? 'day'
  const routeId = primaryRouteId(url)
  const coeffs = parseCoeffs(url)
  const k = coeffProduct(coeffs)
  const baseDate = parseBaseDate(url)
  const now = Date.now()
  const count = horizonPointCount(horizon)
  const estimated = horizon === 'month' || horizon === 'year'

  const series: components['schemas']['TimeSeriesPoint'][] = []

  for (let i = 0; i < count; i += 1) {
    const ts = seriesTimestamp(baseDate, horizon, i)
    const hour =
      horizon === 'day' ? i : 8 + (i % 5)
    const baseline = routeSumBaselineLoad(routeId, hour)
    const adjusted = Math.round(baseline * k)
    const tsMs = new Date(ts).getTime()
    const actual =
      tsMs < now
        ? Math.round(baseline * (0.92 + 0.08 * Math.sin(i * 1.7)))
        : null

    series.push({
      ts,
      baseline,
      adjusted,
      ...(actual != null ? { actual } : {}),
    })
  }

  return HttpResponse.json({
    series,
    meta: meta(request, estimated),
    effect: effectFromCoeffs(coeffs),
  } satisfies components['schemas']['ForecastResponse'])
}

export const handlers: HttpHandler[] = [
  http.get(`${API}/routes`, ({ request }) => {
    const denied = requireAuth(request)
    if (denied) return denied
    return HttpResponse.json({ items: getRoutes() })
  }),

  http.get(`${API}/routes/:id`, ({ request, params }) => {
    const denied = requireAuth(request)
    if (denied) return denied
    const route = getRoute(String(params.id))
    if (!route) {
      const id = requestId(request)
      return apiError(`Route ${params.id} not found`, id, 404, 'not_found')
    }
    return HttpResponse.json(route)
  }),

  http.get(`${API}/routes/:id/geometry`, ({ request, params }) => {
    const denied = requireAuth(request)
    if (denied) return denied
    const geometry = getGeometry(String(params.id))
    if (!geometry) {
      const id = requestId(request)
      return apiError(`Route ${params.id} not found`, id, 404, 'not_found')
    }
    return HttpResponse.json(geometry)
  }),

  http.get(`${API}/forecast`, ({ request }) => {
    const denied = requireAuth(request)
    if (denied) return denied
    return buildForecastSeries(request, new URL(request.url))
  }),

  http.get(`${API}/forecast/map`, ({ request }) => {
    const denied = requireAuth(request)
    if (denied) return denied
    const url = new URL(request.url)
    const routeId = primaryRouteId(url)
    const coeffs = parseCoeffs(url)
    const hour = Number(url.searchParams.get('hour') ?? '8')
    const h = Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 8
    const stops = getStops(routeId)

    const mapStops: components['schemas']['MapStopLoad'][] = stops.map((s, i) => {
      const baseline = baselineLoad(i, h)
      const load = syntheticLoad(i, h, coeffs)
      return {
        stop_id: s.id,
        name: s.name,
        lat: s.lat,
        lon: s.lon,
        load,
        baseline_load: baseline,
        level: loadLevel(load, LOAD_THRESHOLDS),
        sequence: s.sequence,
      }
    })

    return HttpResponse.json({
      stops: mapStops,
      hour: h,
      meta: meta(request, false),
      effect: effectFromCoeffs(coeffs),
    } satisfies components['schemas']['ForecastMapResponse'])
  }),

  http.get(`${API}/forecast/heatmap`, ({ request }) => {
    const denied = requireAuth(request)
    if (denied) return denied
    const url = new URL(request.url)
    const routeId = primaryRouteId(url)
    const coeffs = parseCoeffs(url)
    const stops = getStops(routeId)

    const cells: components['schemas']['HeatmapCell'][] = []
    for (let hour = 0; hour < 24; hour += 1) {
      for (let i = 0; i < stops.length; i += 1) {
        cells.push({
          stop_id: stops[i].id,
          hour,
          value: syntheticLoad(i, hour, coeffs),
        })
      }
    }

    return HttpResponse.json({
      stops: stops.map((s) => ({ id: s.id, name: s.name, sequence: s.sequence })),
      cells,
      meta: meta(request, false),
    } satisfies components['schemas']['HeatmapResponse'])
  }),

  http.get(`${API}/forecast/kpi`, ({ request }) => {
    const denied = requireAuth(request)
    if (denied) return denied
    const url = new URL(request.url)
    const routeId = primaryRouteId(url)
    const coeffs = parseCoeffs(url)
    const stops = getStops(routeId)

    let total = 0
    let peakHour = 0
    let peakHourLoad = 0
    const fromH = Number((url.searchParams.get('from') ?? '06:00').slice(0, 2)) || 6
    const toH = Number((url.searchParams.get('to') ?? '23:00').slice(0, 2)) || 23
    for (let hour = fromH; hour <= toH; hour += 1) {
      const load = routeSumAdjustedLoad(routeId, hour, coeffs)
      total += load
      if (load > peakHourLoad) {
        peakHourLoad = load
        peakHour = hour
      }
    }

    let busiest = { id: stops[0]?.id ?? '', name: stops[0]?.name ?? '', load: 0 }
    stops.forEach((s, i) => {
      const load = syntheticLoad(i, peakHour, coeffs)
      if (load > busiest.load) busiest = { id: s.id, name: s.name, load }
    })

    const baselineTotal = Array.from({ length: 24 }, (_, hour) =>
      routeAvgBaselineLoad(routeId, hour),
    ).reduce((a, b) => a + b, 0)
    const delta_vs_baseline_percent =
      baselineTotal > 0
        ? Math.round(((total - baselineTotal) / baselineTotal) * 1000) / 10
        : 0

    return HttpResponse.json({
      total_passengers: total,
      peak_hour: peakHour,
      peak_hour_load: peakHourLoad,
      busiest_stop: busiest,
      delta_vs_baseline_percent,
      meta: meta(request, false),
      effect: effectFromCoeffs(coeffs),
    } satisfies components['schemas']['KpiResponse'])
  }),

  http.get(`${API}/forecast/export`, ({ request }) => {
    const denied = requireAuth(request)
    if (denied) return denied
    const url = new URL(request.url)
    const format = url.searchParams.get('format') ?? 'csv'
    const routeId = primaryRouteId(url)
    const horizon = url.searchParams.get('horizon') ?? 'day'
    const date = url.searchParams.get('date') ?? parseBaseDate(url).toISOString().slice(0, 10)
    const coeffs = parseCoeffs(url)
    const count = horizonPointCount(horizon)
    const baseDate = parseBaseDate(url)

    const header = 'ts,baseline,adjusted\n'
    const rows: string[] = []
    for (let i = 0; i < count; i += 1) {
      const ts = seriesTimestamp(baseDate, horizon, i)
      const hour = horizon === 'day' ? i : 8
      const baseline = routeAvgBaselineLoad(routeId, hour)
      const adjusted = Math.round(baseline * coeffProduct(coeffs))
      rows.push(`${ts},${baseline},${adjusted}`)
    }
    const body = header + rows.join('\n')
    const ext = format === 'xlsx' ? 'xlsx' : 'csv'
    const filename = `forecast_route-${routeId}_${horizon}_${date}.${ext}`
    const contentType =
      format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv'

    return new HttpResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Request-ID': requestId(request),
      },
    })
  }),

  http.get(`${API}/factors`, ({ request }) => {
    const denied = requireAuth(request)
    if (denied) return denied
    const response: components['schemas']['FactorsResponse'] = {
      defaults: { k_weather: 1, k_event: 1, k_season: 1, k_traffic: 1 },
      presets: [
        {
          id: 'rain',
          name: 'Дождь',
          description: 'Умеренный дождь, +5% к пассажиропотоку на коротких перегонах',
          coefficients: { k_weather: 1.05, k_event: 1, k_season: 1, k_traffic: 1 },
        },
        {
          id: 'snow',
          name: 'Снегопад',
          description: 'Сильный снегопад, замедление движения и рост спроса',
          coefficients: { k_weather: 1.12, k_event: 1, k_season: 1.08, k_traffic: 0.95 },
        },
        {
          id: 'holiday',
          name: 'Праздник',
          description: 'Государственный праздник, изменённый режим работы',
          coefficients: { k_weather: 1, k_event: 1.15, k_season: 1, k_traffic: 0.9 },
        },
        {
          id: 'mass_event',
          name: 'Массовое мероприятие',
          description: 'Концерт или матч рядом с маршрутом',
          coefficients: { k_weather: 1, k_event: 1.25, k_season: 1, k_traffic: 1.05 },
        },
      ],
      sources: [
        {
          name: 'OpenWeatherMap',
          url: 'https://openweathermap.org/api',
          description: 'Погода и осадки для k_weather',
        },
        {
          name: 'mos.ru — транспорт',
          url: 'https://transport.mos.ru/',
          description: 'Официальные данные наземного транспорта Москвы',
        },
        {
          name: 'Яндекс.Пробки',
          url: 'https://yandex.ru/maps/114/moscow/traffic/',
          description: 'Индекс загруженности дорог для k_traffic',
        },
        {
          name: 'Календарь mos.ru',
          url: 'https://www.mos.ru/kalendar/',
          description: 'Праздники и городские события',
        },
      ],
    }
    return HttpResponse.json(response)
  }),

  http.get(`${API}/model/info`, ({ request }) => {
    const denied = requireAuth(request)
    if (denied) return denied
    const info: components['schemas']['ModelInfo'] = {
      name: 'MosTransport Tram Load Forecaster',
      version: '1.0.0-hackathon',
      trained_at: '2026-02-15T08:00:00Z',
      wape: 11.4,
      wape_by_horizon: { day: 9.8, month: 12.1, year: 14.6 },
      scope: 'Маршруты 3, 7, 17 — почасовой и агрегированный прогноз пассажиропотока',
      limitations: [
        'Демо-модель на синтетических данных хакатона',
        'Годовой горизонт — оценочный (meta.estimated)',
        'Не учитывает краткосрочные изменения расписания',
      ],
    }
    return HttpResponse.json(info)
  }),

  http.post(`${API}/forecast/recompute`, ({ request }) => {
    const denied = requireAuth(request)
    if (denied) return denied
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim() ?? ''
    // demo.<username>.<ts> — admin role required (mirrors backend RBAC)
    const username = token.startsWith('demo.') ? token.split('.')[1] : ''
    if (username !== 'demo_admin') {
      const id = requestId(request)
      return apiError('Forbidden', id, 403, 'forbidden')
    }
    return HttpResponse.json(
      { job_id: crypto.randomUUID(), status: 'accepted' },
      { status: 202, headers: { 'X-Request-ID': requestId(request) } },
    )
  }),

  http.post(`${API}/telemetry`, async ({ request }) => {
    const denied = requireAuth(request)
    if (denied) return denied
    await request.json().catch(() => null)
    return new HttpResponse(null, {
      status: 204,
      headers: { 'X-Request-ID': requestId(request) },
    })
  }),

  http.get(`${API}/user-scenarios`, ({ request }) => {
    const denied = requireAuth(request)
    if (denied) return denied
    return HttpResponse.json({
      items: [...userScenarios.values()].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    })
  }),

  http.post(`${API}/user-scenarios`, async ({ request }) => {
    const denied = requireAuth(request)
    if (denied) return denied
    const body = (await request.json()) as UserScenarioCreate
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim() ?? 'demo'
    const scenario: UserScenario = {
      id: crypto.randomUUID(),
      user_id: token.slice(0, 32),
      name: body.name,
      coefficients: body.coefficients,
      created_at: new Date().toISOString(),
    }
    userScenarios.set(scenario.id, scenario)
    return HttpResponse.json(scenario, {
      status: 201,
      headers: { 'X-Request-ID': requestId(request) },
    })
  }),

  http.delete(`${API}/user-scenarios/:id`, ({ request, params }) => {
    const denied = requireAuth(request)
    if (denied) return denied
    const id = String(params.id)
    if (!userScenarios.has(id)) {
      return apiError('Scenario not found', requestId(request), 404, 'not_found')
    }
    userScenarios.delete(id)
    return new HttpResponse(null, {
      status: 204,
      headers: { 'X-Request-ID': requestId(request) },
    })
  }),
]
