import type { MapStopLoad } from '@/shared/api/endpoints'
import { appConfig } from '@/shared/config/env'
import { MapLibreForecastMap } from '@/widgets/map/MapLibreForecastMap'

export interface ForecastMapProps {
  onStopSelect?: (stop: MapStopLoad) => void
  height?: string | number
  selectedStopId?: string
  showLegend?: boolean
  showControls?: boolean
}

/**
 * Provider-agnostic map shell.
 * Current project uses MapLibre (react-map-gl). Swap implementation via VITE_MAP_PROVIDER
 * without changing Dashboard consumers.
 */
export function ForecastMap(props: ForecastMapProps) {
  const provider = appConfig.MAP_PROVIDER

  // 2gis / yandex placeholders — fall back to MapLibre until SDK keys/SDK wired
  if (provider === '2gis' || provider === 'yandex') {
    return <MapLibreForecastMap {...props} />
  }

  return <MapLibreForecastMap {...props} />
}
