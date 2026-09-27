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
import { FilterHorizontalIcon } from '@hugeicons/core-free-icons'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
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

type MapTab = 'map' | 'stops' | 'traits'

const SIDEBAR_WIDTH = 300

export function DashboardPage() {
  const { filters, patch } = useDashboardFilters()
  const { desktopOpen, setDesktopOpen } = useFiltersDrawer()
  const [selectedStop, setSelectedStop] = useState<MapStopLoad | null>(null)
  const [mapTab, setMapTab] = useState<MapTab>('map')

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
      {/* Desktop collapsible filters sidebar */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          flexShrink: 0,
          width: desktopOpen ? SIDEBAR_WIDTH : 0,
          borderRight: desktopOpen ? '1px solid' : 'none',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          minHeight: 0,
          overflow: 'hidden',
          transition: (t) =>
            t.transitions.create('width', {
              duration: t.transitions.duration.shorter,
            }),
        }}
      >
        <Box
          sx={{
            width: SIDEBAR_WIDTH,
            height: '100%',
            p: 1.75,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
            opacity: desktopOpen ? 1 : 0,
            transition: (t) =>
              t.transitions.create('opacity', {
                duration: t.transitions.duration.shorter,
              }),
          }}
        >
          <ErrorBoundary title="Фильтры">
            <FiltersPanel variant="sidebar" />
          </ErrorBoundary>
        </Box>
      </Box>

      {/* Re-open control when sidebar collapsed */}
      {!desktopOpen ? (
        <Tooltip title="Показать параметры прогноза" placement="right">
          <IconButton
            onClick={() => setDesktopOpen(true)}
            aria-label="Показать параметры прогноза"
            sx={{
              display: { xs: 'none', lg: 'inline-flex' },
              position: 'absolute',
              top: 12,
              left: 12,
              zIndex: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              color: 'primary.main',
              boxShadow: '0 4px 14px rgba(31, 70, 120, 0.08)',
              '&:hover': { bgcolor: 'background.paper' },
            }}
          >
            <Icon icon={FilterHorizontalIcon} size={18} />
          </IconButton>
        </Tooltip>
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
          overflow: 'auto',
        }}
      >
        <ErrorBoundary title="KPI">
          <KpiBar />
        </ErrorBoundary>

        <Box
          sx={{
            display: 'grid',
            gap: 1.25,
            flex: '1 1 auto',
            minHeight: { xs: 'auto', lg: 0 },
            gridTemplateColumns: {
              xs: '1fr',
              md: 'minmax(0, 1.35fr) minmax(0, 1fr)',
            },
            gridTemplateRows: {
              xs: 'auto',
              lg: 'minmax(320px, 1fr)',
            },
          }}
        >
          <Paper
            sx={{
              p: 1.25,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              minHeight: { xs: 360, lg: 0 },
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            <Tabs
              value={mapTab}
              onChange={(_, v: MapTab) => setMapTab(v)}
              sx={{
                minHeight: 36,
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
                    onStopSelect={(stop) => {
                      setSelectedStop(stop)
                      patch({ stop: stop.stop_id })
                    }}
                  />
                  {showDaySlider ? <TimeSlider /> : null}
                </Box>
              </ErrorBoundary>
            ) : null}

            {mapTab === 'stops' ? (
              <List dense sx={{ flex: 1, overflow: 'auto', minHeight: 240 }}>
                {(mapQuery.data?.stops ?? []).map((s) => (
                  <ListItemButton
                    key={s.stop_id}
                    selected={activeStop?.stop_id === s.stop_id}
                    onClick={() => {
                      setSelectedStop(s)
                      patch({ stop: s.stop_id })
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
              <Stack spacing={1.25} sx={{ p: 1, flex: 1, minHeight: 240 }}>
                <Typography variant="body2" color="text.secondary">
                  Маршрут №{routeDetailQuery.data?.number ?? filters.route}
                </Typography>
                <Typography variant="subtitle1" fontWeight={700}>
                  {routeDetailQuery.data?.name ?? '—'}
                </Typography>
                <Typography variant="body2">
                  Остановок: {routeDetailQuery.data?.stops.length ?? '—'}
                </Typography>
                <Typography variant="body2">
                  Горизонт:{' '}
                  {filters.horizon === 'day'
                    ? 'день'
                    : filters.horizon === 'month'
                      ? 'месяц'
                      : 'год'}
                </Typography>
                <Typography variant="body2">
                  Интервал: {filters.from.slice(0, 5)} – {filters.to.slice(0, 5)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Характеристики участка и вместимости будут расширены по мере поступления данных
                  модели.
                </Typography>
              </Stack>
            ) : null}
          </Paper>

          <Box
            sx={{
              display: 'grid',
              gap: 1.25,
              minWidth: 0,
              minHeight: { xs: 420, lg: 0 },
              gridTemplateRows: { xs: '220px 220px', lg: 'minmax(0, 1fr) minmax(0, 1fr)' },
            }}
          >
            <ErrorBoundary title="График">
              <ForecastChart compact height="100%" />
            </ErrorBoundary>
            <ErrorBoundary title="Heatmap">
              <HeatmapChart compact height="100%" />
            </ErrorBoundary>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 1.25,
            flexShrink: 0,
            gridTemplateColumns: {
              xs: '1fr',
              md: 'minmax(0, 1fr) minmax(0, 1.6fr)',
            },
            minHeight: { md: 168 },
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
      </Box>
    </Box>
  )
}
