import { useMutation } from '@tanstack/react-query'
import { recalculateForecasts } from '@/features/recalculate-forecast/recalculateForecasts'

export function useRecalculateForecast() {
  return useMutation({
    mutationKey: ['forecast-recompute'],
    mutationFn: recalculateForecasts,
  })
}
