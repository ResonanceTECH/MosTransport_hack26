import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { FilterHorizontalIcon } from '@hugeicons/core-free-icons'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState, type ReactNode } from 'react'
import type { MapStopLoad } from '@/shared/api/endpoints'
import { api } from '@/shared/api/endpoints'
import {
  filtersToForecastQuery,
  useDashboardFilters,
} from '@/features/filters/useDashboardFilters'
import { useFiltersDrawer } from '@/shared/layout/FiltersDrawerContext'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { LOAD_LEVEL_LABELS, loadColor } from '@/shared/lib/loadLevel'
import { Icon } from '@/shared/ui/Icon'
import { FiltersPanel } from '@/widgets/filters/FiltersPanel'
import { ForecastMap } from '@/widgets/map/ForecastMap'
import { TimeSlider } from '@/widgets/map/TimeSlider'
import { KpiBar } from '@/widgets/kpi/KpiBar'
import { ForecastChart } from '@/widgets/charts/ForecastChart'
import { HeatmapChart } from '@/widgets/charts/HeatmapChart'
import { CoefficientsPanel } from '@/widgets/coefficients/CoefficientsPanel'
import { StopInfoCard } from '@/widgets/stop/StopInfoCard'
import { BlockCarousel } from '@/widgets/layout/BlockCarousel'

type MapTab = 'map' | 'stops' | 'traits'

const SIDEBAR_WIDTH = 300

/**
 * Full static grid (map + charts + details together) only when CSS viewport is large —
 * roughly matches ~50% browser zoom on a 1080p screen. At normal zoom / smaller height
 * we switch to swipeable pages so blocks replace each other instead of overflowing.
 */
const MQ_SPACIOUS = '(min-width: 1600px) and (min-height: 1180px)'

function MapWorkspace({
  mapTab,
  setMapTab,
  activeStop,
  onSelectStop,
  showDaySlider,
  stops,
  routeLabel,
  routeName,
  stopCount,
  horizonLabel,
  timeRange,
}: {
  mapTab: MapTab
  setMapTab: (t: MapTab) => void
  activeStop: MapStopLoad | null
  onSelectStop: (stop: MapStopLoad) => void
  showDaySlider: boolean
  stops: MapStopLoad[]
  routeLabel: string
  routeName: string
  stopCount: string | number
  horizonLabel: string
  timeRange: string
}) {
  return (
    <Paper
      sx={{
        p: 1.25,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        height: '100%',
        minHeight: 0,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <Tabs
        value={mapTab}
        onChange={(_, v: MapTab) => setMapTab(v)}
        sx={{
          minHeight: 36,
          flexShrink: 0,
          '& .MuiTabs-indicator': { height: 2 },
          '& .MuiTab-root': { minHeight: 36, py: 0.5, px: 1.5, fontSize: 13 },
        }}
      >
        <Tab value="map" label="Карта маршрута" />
        <Tab value="stops" label="Список остановок" />
        <Tab value="traits" label="Характеристики" />
      </Tabs>

      {mapTab === 'map' ? (
        <ErrorBoundary title="Карта">
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <ForecastMap
              height="100%"
              selectedStopId={activeStop?.stop_id}
              onStopSelect={onSelectStop}
            />
            {showDaySlider ? <TimeSlider /> : null}
          </Box>
        </ErrorBoundary>
      ) : null}

      {mapTab === 'stops' ? (
        <List dense sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {stops.map((s) => (
            <ListItemButton
              key={s.stop_id}
              selected={activeStop?.stop_id === s.stop_id}
              onClick={() => {
                onSelectStop(s)
                setMapTab('map')
              }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: loadColor(s.level),
                  mr: 1.5,
                  flexShrink: 0,
                }}
              />
              <ListItemText
                primary={s.name}
                secondary={`${Math.round(s.load)} пасс. · ${LOAD_LEVEL_LABELS[s.level]}`}
              />
            </ListItemButton>
          ))}
        </List>
      ) : null}

      {mapTab === 'traits' ? (
        <Stack spacing={1.25} sx={{ p: 1, flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Typography variant="body2" color="text.secondary">
            Маршрут №{routeLabel}
          </Typography>
          <Typography variant="subtitle1" fontWeight={700}>
            {routeName}
          </Typography>
          <Typography variant="body2">Остановок: {stopCount}</Typography>
          <Typography variant="body2">Горизонт: {horizonLabel}</Typography>
          <Typography variant="body2">Интервал: {timeRange}</Typography>
          <Typography variant="caption" color="text.secondary">
            Характеристики участка и вместимости будут расширены по мере поступления данных модели.
          </Typography>
        </Stack>
      ) : null}
    </Paper>
  )
}

function ChartsWorkspace() {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.25,
        height: '100%',
        minHeight: 0,
        gridTemplateRows: 'minmax(0, 1fr) minmax(0, 1fr)',
      }}
    >
      <ErrorBoundary title="График">
        <ForecastChart compact height="100%" />
      </ErrorBoundary>
      <ErrorBoundary title="Heatmap">
        <HeatmapChart compact height="100%" />
      </ErrorBoundary>
    </Box>
  )
}

function DetailsWorkspace({ activeStop }: { activeStop: MapStopLoad | null }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.25,
        height: '100%',
        minHeight: 0,
        gridTemplateColumns: { xs: '1fr', sm: 'minmax(280px, 1fr) minmax(0, 1.35fr)' },
        alignItems: 'stretch',
      }}
    >
      <ErrorBoundary title="Остановка">
        <StopInfoCard stop={activeStop} />
      </ErrorBoundary>
      <ErrorBoundary title="Коэффициенты">
        <CoefficientsPanel compact />
      </ErrorBoundary>
    </Box>
  )
}

function SpaciousLayout({ children }: { children: [ReactNode, ReactNode, ReactNode] }) {
  const [mapBlock, chartsBlock, detailsBlock] = children
  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gap: 1.25,
          flex: '1 1 auto',
          minHeight: 0,
          gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)',
          gridTemplateRows: 'minmax(320px, 1fr)',
        }}
      >
        {mapBlock}
        {chartsBlock}
      </Box>
      <Box sx={{ flexShrink: 0, minHeight: 168 }}>{detailsBlock}</Box>
    </>
  )
}

export function DashboardPage() {
  const { filters, patch } = useDashboardFilters()
  const { desktopOpen, setDesktopOpen } = useFiltersDrawer()
  const [selectedStop, setSelectedStop] = useState<MapStopLoad | null>(null)
  const [mapTab, setMapTab] = useState<MapTab>('map')
  const spacious = useMediaQuery(MQ_SPACIOUS)

  const queryParams = useMemo(() => filtersToForecastQuery(filters), [filters])
  const showDaySlider = filters.horizon === 'day'

  const mapQuery = useQuery({
    queryKey: ['forecast-map', queryParams],
    queryFn: () => api.getForecastMap(queryParams),
  })

  const routeDetailQuery = useQuery({
    queryKey: ['route', filters.route],
    queryFn: () => api.getRoute(filters.routes[0] ?? filters.route),
    enabled: Boolean(filters.route),
  })

  const activeStop =
    selectedStop ??
    mapQuery.data?.stops.find((s) => s.stop_id === filters.stop) ??
    mapQuery.data?.stops.find((s) => s.name.includes('ВДНХ')) ??
    mapQuery.data?.stops.reduce<MapStopLoad | null>(
      (best, s) => (!best || s.load > best.load ? s : best),
      null,
    ) ??
    null

  const onSelectStop = (stop: MapStopLoad) => {
    setSelectedStop(stop)
    patch({ stop: stop.stop_id })
  }

  const horizonLabel =
    filters.horizon === 'day' ? 'день' : filters.horizon === 'month' ? 'месяц' : 'год'

  const mapBlock = (
    <MapWorkspace
      mapTab={mapTab}
      setMapTab={setMapTab}
      activeStop={activeStop}
      onSelectStop={onSelectStop}
      showDaySlider={showDaySlider}
      stops={mapQuery.data?.stops ?? []}
      routeLabel={routeDetailQuery.data?.number ?? filters.route}
      routeName={routeDetailQuery.data?.name ?? '—'}
      stopCount={routeDetailQuery.data?.stops.length ?? '—'}
      horizonLabel={horizonLabel}
      timeRange={`${filters.from.slice(0, 5)} – ${filters.to.slice(0, 5)}`}
    />
  )

  const chartsBlock = <ChartsWorkspace />
  const detailsBlock = <DetailsWorkspace activeStop={activeStop} />

  return (
    <Box
      sx={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {desktopOpen ? (
        <Stack
          direction="row"
          alignItems="flex-start"
          spacing={1}
          sx={{
            display: { xs: 'none', lg: 'flex' },
            flexShrink: 0,
            pl: 1.5,
            py: 1.5,
            pr: 0.5,
            minHeight: 0,
            height: '100%',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              width: SIDEBAR_WIDTH,
              height: '100%',
              p: 1.75,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 4px 18px rgba(31, 70, 120, 0.05)',
            }}
          >
            <ErrorBoundary title="Фильтры">
              <FiltersPanel variant="sidebar" />
            </ErrorBoundary>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: 0.25,
              mt: 0.25,
              flexShrink: 0,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2.5,
              boxShadow: '0 4px 18px rgba(31, 70, 120, 0.05)',
            }}
          >
            <Tooltip title="Скрыть параметры">
              <IconButton
                onClick={() => setDesktopOpen(false)}
                aria-label="Скрыть параметры прогноза"
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: 'rgba(40, 103, 216, 0.08)',
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'rgba(40, 103, 216, 0.12)' },
                }}
              >
                <Icon icon={FilterHorizontalIcon} size={18} />
              </IconButton>
            </Tooltip>
          </Paper>
        </Stack>
      ) : null}

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
          p: { xs: 1.25, md: 1.5 },
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <ErrorBoundary title="KPI">
          <KpiBar />
        </ErrorBoundary>

        {spacious ? (
          <SpaciousLayout>
            {mapBlock}
            {chartsBlock}
            {detailsBlock}
          </SpaciousLayout>
        ) : (
          <BlockCarousel
            pages={[
              { id: 'map', label: 'Карта', content: mapBlock },
              { id: 'charts', label: 'Графики', content: chartsBlock },
              { id: 'details', label: 'Детали', content: detailsBlock },
            ]}
          />
        )}
      </Box>
    </Box>
  )
}
