import { api } from '@/shared/api/endpoints'
import type { components } from '@/shared/api/schema'

export type RecomputeResponse = components['schemas']['RecomputeResponse']

/**
 * Typed abstraction over POST /forecast/recompute.
 * Uses the OpenAPI contract — no invented endpoints.
 */
export function recalculateForecasts(): Promise<RecomputeResponse> {
  return api.recomputeForecast()
}
