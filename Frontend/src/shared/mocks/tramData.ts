import { LOAD_THRESHOLDS } from '../config/loadThresholds'

export type LoadLevel = 'low' | 'medium' | 'high'

export interface RouteSummary {
  id: string
  name: string
  number: string
}

export interface Stop {
  id: string
  name: string
  lat: number
  lon: number
  sequence: number
}

export interface RouteDetail extends RouteSummary {
  stops: Stop[]
}

export interface Coefficients {
  k_weather: number
  k_event: number
  k_season: number
  k_traffic: number
}

export interface RouteGeometry {
  route_id: string
  type: 'LineString'
  coordinates: number[][]
}

const ROUTE_META: Record<string, Omit<RouteSummary, 'id'>> = {
  '17': {
    number: '17',
    name: 'Останкино — Медведково',
  },
  '3': {
    number: '3',
    name: 'Метро Чистые пруды — Метро Китай-город',
  },
  '7': {
    number: '7',
    name: 'Метро Китай-город — Университет',
  },
}

/** Stops for route 17 — NE Moscow corridor (mockup order: Medvedkovo → Ostankino) */
const STOPS_ROUTE_17: Omit<Stop, 'sequence'>[] = [
  { id: '17-01', name: 'Медведково', lat: 55.8889, lon: 37.6614 },
  { id: '17-02', name: 'Ул. Полярная', lat: 55.8842, lon: 37.6378 },
  { id: '17-03', name: 'Ул. Молодцова', lat: 55.8796, lon: 37.6285 },
  { id: '17-04', name: 'Бабушкинская', lat: 55.8751, lon: 37.6192 },
  { id: '17-05', name: 'Свиблово', lat: 55.8704, lon: 37.6521 },
  { id: '17-06', name: 'Ботанический сад', lat: 55.8625, lon: 37.6398 },
  { id: '17-07', name: 'ВДНХ', lat: 55.8589, lon: 37.6486 },
  { id: '17-08', name: 'Ул. Академика Королёва', lat: 55.8482, lon: 37.6581 },
  { id: '17-09', name: 'Останкино', lat: 55.8375, lon: 37.6382 },
]

const STOPS_ROUTE_3: Omit<Stop, 'sequence'>[] = [
  { id: '3-01', name: 'Метро Чистые пруды', lat: 55.7648, lon: 37.6389 },
  { id: '3-02', name: 'Покровка', lat: 55.7589, lon: 37.6452 },
  { id: '3-03', name: 'Китай-город', lat: 55.7553, lon: 37.6336 },
  { id: '3-04', name: 'Лубянка', lat: 55.7598, lon: 37.6254 },
  { id: '3-05', name: 'Мясницкая', lat: 55.7621, lon: 37.6312 },
]

const STOPS_ROUTE_7: Omit<Stop, 'sequence'>[] = [
  { id: '7-01', name: 'Метро Китай-город', lat: 55.7553, lon: 37.6336 },
  { id: '7-02', name: 'Боровицкая', lat: 55.7498, lon: 37.6089 },
  { id: '7-03', name: 'Метро Арбатская', lat: 55.7524, lon: 37.6031 },
  { id: '7-04', name: 'Смоленская', lat: 55.7476, lon: 37.5824 },
  { id: '7-05', name: 'Киевская', lat: 55.7436, lon: 37.5652 },
  { id: '7-06', name: 'Метро Университет', lat: 55.6934, lon: 37.5348 },
]

const STOPS_BY_ROUTE: Record<string, Omit<Stop, 'sequence'>[]> = {
  '17': STOPS_ROUTE_17,
  '3': STOPS_ROUTE_3,
  '7': STOPS_ROUTE_7,
}

function withSequence(raw: Omit<Stop, 'sequence'>[]): Stop[] {
  return raw.map((s, i) => ({ ...s, sequence: i + 1 }))
}

function buildGeometry(stops: Stop[]): number[][] {
  return stops.map((s) => [s.lon, s.lat])
}

const GEOMETRY_BY_ROUTE: Record<string, RouteGeometry> = Object.fromEntries(
  Object.entries(STOPS_BY_ROUTE).map(([routeId, raw]) => {
    const stops = withSequence(raw)
    return [
      routeId,
      {
        route_id: routeId,
        type: 'LineString' as const,
        coordinates: buildGeometry(stops),
      },
    ]
  }),
)

export function getRoutes(): RouteSummary[] {
  return Object.entries(ROUTE_META).map(([id, meta]) => ({ id, ...meta }))
}

export function getRoute(id: string): RouteDetail | undefined {
  const meta = ROUTE_META[id]
  const raw = STOPS_BY_ROUTE[id]
  if (!meta || !raw) return undefined
  return { id, ...meta, stops: withSequence(raw) }
}

export function getStops(routeId: string): Stop[] {
  const raw = STOPS_BY_ROUTE[routeId]
  if (!raw) return []
  return withSequence(raw)
}

export function getGeometry(routeId: string): RouteGeometry | undefined {
  return GEOMETRY_BY_ROUTE[routeId]
}

const DEFAULT_COEFFS: Coefficients = {
  k_weather: 1,
  k_event: 1,
  k_season: 1,
  k_traffic: 1,
}

/** Sinusoidal rush hours at 08:00 and 18:00, scaled by stop position and coefficient product. */
export function syntheticLoad(
  stopIndex: number,
  hour: number,
  coeffs: Coefficients = DEFAULT_COEFFS,
): number {
  const h = hour % 24
  const morning = Math.cos(((h - 8) / 12) * Math.PI)
  const evening = Math.cos(((h - 18) / 12) * Math.PI)
  const rush = Math.max(0, morning) + Math.max(0, evening)
  const offPeak = 0.22 + 0.08 * Math.sin((h * Math.PI) / 12)
  const daily = offPeak + 0.78 * (rush / 2)

  const stopCount = 9
  const position = stopIndex / Math.max(stopCount - 1, 1)
  const stopFactor = 0.85 + 0.45 * Math.sin(position * Math.PI)
  // Boost VDNKh-ish middle stops
  const hubBoost = stopIndex === 6 ? 1.35 : 1

  const kProduct =
    coeffs.k_weather * coeffs.k_event * coeffs.k_season * coeffs.k_traffic

  return Math.round(200 * daily * stopFactor * hubBoost * kProduct)
}

export function loadLevel(
  load: number,
  thresholds: { medium: number; high: number } = LOAD_THRESHOLDS,
): LoadLevel {
  if (load >= thresholds.high) return 'high'
  if (load >= thresholds.medium) return 'medium'
  return 'low'
}

export function coeffProduct(coeffs: Coefficients): number {
  return coeffs.k_weather * coeffs.k_event * coeffs.k_season * coeffs.k_traffic
}

export function baselineLoad(stopIndex: number, hour: number): number {
  return syntheticLoad(stopIndex, hour, DEFAULT_COEFFS)
}
