import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Add01Icon, Gps01Icon, MinusSignIcon } from '@hugeicons/core-free-icons'
import { useQuery } from '@tanstack/react-query'
import type { FeatureCollection, LineString, Point } from 'geojson'
import { useCallback, useMemo, useRef, useState } from 'react'
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
} from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { api, type MapStopLoad } from '@/shared/api/endpoints'
import {
  filtersToForecastQuery,
  useDashboardFilters,
} from '@/features/filters/useDashboardFilters'
import { appConfig } from '@/shared/config/env'
import { LOAD_LEVEL_LABELS, loadColor } from '@/shared/lib/loadLevel'
import { LOAD_COLORS } from '@/shared/theme/theme'
import { Icon } from '@/shared/ui/Icon'
import { QueryState } from '@/shared/ui/QueryState'

const MOSCOW_VIEW = { longitude: 37.65, latitude: 55.855, zoom: 11.2 }

const LABEL_STOPS = new Set(['Останкино', 'ВДНХ', 'Медведково'])

export interface MapLibreForecastMapProps {
  onStopSelect?: (stop: MapStopLoad) => void
  height?: string | number
  selectedStopId?: string
  showLegend?: boolean
  showControls?: boolean
}

function MapLegend() {
  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        bgcolor: 'background.paper',
        px: 1.5,
        py: 1.25,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 4px 16px rgba(31, 70, 120, 0.08)',
        minWidth: 168,
        zIndex: 2,
      }}
    >
      <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.75 }}>
        Загрузка остановок
      </Typography>
      {(
        [
          ['low', 'Низкая', '0–30%'],
          ['medium', 'Средняя', '30–70%'],
          ['high', 'Высокая', '70–100%'],
        ] as const
      ).map(([level, label, range]) => (
        <Stack key={level} direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.35 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: loadColor(level) }} />
          <Typography variant="caption" sx={{ flex: 1 }}>
            {label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {range}
          </Typography>
        </Stack>
      ))}
      <Divider sx={{ my: 0.75 }} />
      <Stack spacing={0.4}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Box sx={{ width: 18, height: 3, bgcolor: '#2867D8', borderRadius: 1 }} />
          <Typography variant="caption">Трасса маршрута</Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              border: '2px solid #2867D8',
              bgcolor: 'transparent',
            }}
          />
          <Typography variant="caption">Остановка</Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              border: '2px solid #D64545',
              bgcolor: 'transparent',
            }}
          />
          <Typography variant="caption">Выбранная остановка</Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              border: '2px solid #0A1F44',
              bgcolor: 'transparent',
            }}
          />
          <Typography variant="caption">Конечная остановка</Typography>
        </Stack>
      </Stack>
    </Box>
  )
}

export function MapLibreForecastMap({
  onStopSelect,
  height = '100%',
  selectedStopId,
  showLegend = true,
  showControls = true,
}: MapLibreForecastMapProps) {
  const { filters, patch } = useDashboardFilters()
  const queryParams = useMemo(() => filtersToForecastQuery(filters), [filters])
  const primaryRoute = filters.routes[0] ?? filters.route
  const mapRef = useRef<MapRef>(null)
  const activeStopId = selectedStopId ?? filters.stop

  const geometryQuery = useQuery({
    queryKey: ['geometry', primaryRoute],
    queryFn: () => api.getRouteGeometry(primaryRoute),
    enabled: Boolean(primaryRoute),
  })

  const mapQuery = useQuery({
    queryKey: ['forecast-map', queryParams],
    queryFn: () => api.getForecastMap(queryParams),
  })

  const [popupStop, setPopupStop] = useState<MapStopLoad | null>(null)

  const stops = useMemo(() => mapQuery.data?.stops ?? [], [mapQuery.data?.stops])
  const firstStop = stops[0]
  const lastStop = stops[stops.length - 1]

  const routeGeoJson = useMemo((): FeatureCollection<LineString> | null => {
    const g = geometryQuery.data
    if (!g?.coordinates?.length) return null
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: g.coordinates },
        },
      ],
    }
  }, [geometryQuery.data])

  const stopsGeoJson = useMemo((): FeatureCollection<Point> => {
    return {
      type: 'FeatureCollection',
      features: stops.map((s) => ({
        type: 'Feature' as const,
        properties: {
          stop_id: s.stop_id,
          name: s.name,
          load: s.load,
          level: s.level,
          sequence: s.sequence,
          is_selected: s.stop_id === activeStopId,
          is_terminal:
            s.stop_id === firstStop?.stop_id || s.stop_id === lastStop?.stop_id,
        },
        geometry: { type: 'Point' as const, coordinates: [s.lon, s.lat] },
      })),
    }
  }, [stops, activeStopId, firstStop?.stop_id, lastStop?.stop_id])

  const labelStops = useMemo(
    () =>
      stops.filter(
        (s) =>
          LABEL_STOPS.has(s.name) ||
          s.name === 'ВДНХ' ||
          s.name === 'Медведково' ||
          s.name === 'Останкино',
      ),
    [stops],
  )

  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const feature = e.features?.find((f) => f.layer?.id === 'stops-circle')
      if (!feature?.properties) return
      const stopId = String(feature.properties.stop_id)
      const stop = stops.find((s) => s.stop_id === stopId)
      if (!stop) return
      setPopupStop(stop)
      if (onStopSelect) onStopSelect(stop)
      else patch({ stop: stopId })
    },
    [stops, onStopSelect, patch],
  )

  const zoomBy = (delta: number) => {
    const map = mapRef.current
    if (!map) return
    map.zoomTo(map.getZoom() + delta, { duration: 200 })
  }

  const loading = geometryQuery.isLoading || mapQuery.isLoading
  const error = geometryQuery.error ?? mapQuery.error
  const isError = geometryQuery.isError || mapQuery.isError

  return (
    <Box
      sx={{
        position: 'relative',
        height,
        minHeight: 200,
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        flex: 1,
      }}
    >
      <QueryState
        isLoading={loading}
        isError={isError}
        error={error}
        isEmpty={!loading && !isError && stops.length === 0}
        onRetry={() => {
          void geometryQuery.refetch()
          void mapQuery.refetch()
        }}
        loadingHeight={280}
      >
        <Map
          ref={mapRef}
          initialViewState={MOSCOW_VIEW}
          mapStyle={appConfig.MAP_STYLE_URL}
          style={{ width: '100%', height: '100%' }}
          interactiveLayerIds={['stops-circle']}
          onClick={handleMapClick}
          attributionControl={false}
        >
          {showControls ? (
            <NavigationControl position="top-left" showCompass={false} visualizePitch={false} />
          ) : null}

          {routeGeoJson ? (
            <Source id="route" type="geojson" data={routeGeoJson}>
              <Layer
                id="route-line"
                type="line"
                paint={{ 'line-color': '#2867D8', 'line-width': 4.5, 'line-opacity': 0.9 }}
              />
            </Source>
          ) : null}

          <Source id="stops" type="geojson" data={stopsGeoJson}>
            <Layer
              id="stops-circle"
              type="circle"
              paint={{
                'circle-color': [
                  'case',
                  ['get', 'is_terminal'],
                  '#2867D8',
                  [
                    'match',
                    ['get', 'level'],
                    'low',
                    LOAD_COLORS.low,
                    'medium',
                    LOAD_COLORS.medium,
                    'high',
                    LOAD_COLORS.high,
                    LOAD_COLORS.low,
                  ],
                ],
                'circle-radius': [
                  'case',
                  ['get', 'is_selected'],
                  11,
                  ['get', 'is_terminal'],
                  8,
                  ['interpolate', ['linear'], ['get', 'load'], 0, 6, 80, 9, 160, 12, 240, 15],
                ],
                'circle-stroke-width': [
                  'case',
                  ['get', 'is_selected'],
                  3,
                  2,
                ],
                'circle-stroke-color': [
                  'case',
                  ['get', 'is_selected'],
                  '#D64545',
                  ['get', 'is_terminal'],
                  '#0A1F44',
                  '#ffffff',
                ],
              }}
            />
          </Source>

          {labelStops.map((s) => (
            <Marker key={`label-${s.stop_id}`} longitude={s.lon} latitude={s.lat} anchor="bottom">
              <Typography
                variant="caption"
                sx={{
                  mb: 1.25,
                  px: 0.75,
                  py: 0.15,
                  bgcolor: 'rgba(255,255,255,0.92)',
                  borderRadius: 1,
                  fontWeight: 700,
                  fontSize: 11,
                  color: 'text.primary',
                  border: '1px solid',
                  borderColor: 'divider',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                {s.name.replace('Метро ', '').replace(' (конечная)', '').replace(' (цирк)', '')}
              </Typography>
            </Marker>
          ))}

          {popupStop ? (
            <Popup
              longitude={popupStop.lon}
              latitude={popupStop.lat}
              anchor="bottom"
              onClose={() => setPopupStop(null)}
              closeButton
              closeOnClick={false}
              offset={14}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                {popupStop.name}
              </Typography>
              <Typography variant="body2">
                Пассажиры: {Math.round(popupStop.load).toLocaleString('ru-RU')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {LOAD_LEVEL_LABELS[popupStop.level]} загрузка
              </Typography>
            </Popup>
          ) : null}
        </Map>

        {showControls ? (
          <Stack
            spacing={0.5}
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              zIndex: 2,
              display: { xs: 'flex', md: 'none' },
            }}
          >
            <IconButton
              size="small"
              onClick={() => zoomBy(1)}
              sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
            >
              <Icon icon={Add01Icon} size={16} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => zoomBy(-1)}
              sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
            >
              <Icon icon={MinusSignIcon} size={16} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => mapRef.current?.flyTo({ ...MOSCOW_VIEW, duration: 500 })}
              sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
            >
              <Icon icon={Gps01Icon} size={16} />
            </IconButton>
          </Stack>
        ) : null}

        {showLegend ? <MapLegend /> : null}
      </QueryState>
    </Box>
  )
}
