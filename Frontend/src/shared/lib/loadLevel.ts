import type { components } from '@/shared/api/schema'
import { LOAD_THRESHOLDS } from '@/shared/config/loadThresholds'
import { LOAD_COLORS } from '@/shared/theme/theme'

export type LoadLevel = components['schemas']['LoadLevel']

export function loadLevelFromValue(load: number): LoadLevel {
  if (load >= LOAD_THRESHOLDS.high) return 'high'
  if (load >= LOAD_THRESHOLDS.medium) return 'medium'
  return 'low'
}

export function loadColor(level: LoadLevel): string {
  return LOAD_COLORS[level]
}

export const LOAD_LEVEL_LABELS: Record<LoadLevel, string> = {
  low: 'Низкая',
  medium: 'Средняя',
  high: 'Высокая',
}
