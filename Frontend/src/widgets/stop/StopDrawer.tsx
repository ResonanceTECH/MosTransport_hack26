import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Drawer from '@mui/material/Drawer'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ReactECharts from 'echarts-for-react'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { MapStopLoad } from '@/shared/api/endpoints'
import { api } from '@/shared/api/endpoints'
import {
  filtersToForecastQuery,
  useDashboardFilters,
} from '@/features/filters/useDashboardFilters'
import { LOAD_LEVEL_LABELS, loadColor } from '@/shared/lib/loadLevel'
import { QueryState } from '@/shared/ui/QueryState'

export interface StopDrawerProps {
  open: boolean
  onClose: () => void
  stop: MapStopLoad | null
}

export function StopDrawer({ open, onClose, stop }: StopDrawerProps) {
  const { filters, patch } = useDashboardFilters()

  const forecastQuery = useQuery({
    queryKey: ['forecast-stop-drawer', filters.route, stop?.stop_id, filters.date],
    queryFn: () =>
      api.getForecast({
        ...filtersToForecastQuery(filters),
        stop: stop!.stop_id,
        grouping: 'stop',
      }),
    enabled: open && Boolean(stop),
  })

  const chartOption = useMemo(() => {
    const series = forecastQuery.data?.series ?? []
    return {
      grid: { left: 40, right: 12, top: 24, bottom: 28 },
      tooltip: { trigger: 'axis' as const },
      xAxis: {
        type: 'category' as const,
        data: series.map((p) => p.ts.slice(11, 16) || p.ts),
      },
      yAxis: { type: 'value' as const, name: 'Пасс.' },
      series: [
        {
          name: 'Скорр.',
          type: 'line' as const,
          smooth: true,
          data: series.map((p) => p.adjusted),
          lineStyle: { width: 2 },
        },
      ],
    }
  }, [forecastQuery.data?.series])

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: 320, sm: 380 }, p: 2 }}>
        {!stop ? (
          <Typography color="text.secondary">Остановка не выбрана</Typography>
        ) : (
          <Stack spacing={2}>
            <Typography variant="h6">{stop.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              Маршрут {filters.route}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip size="small" label={`${Math.round(stop.load)} пасс.`} />
              <Chip
                size="small"
                label={LOAD_LEVEL_LABELS[stop.level]}
                sx={{ bgcolor: loadColor(stop.level), color: '#fff' }}
              />
              <Chip size="small" variant="outlined" label={`Час ${String(filters.hour).padStart(2, '0')}:00`} />
            </Stack>

            <QueryState
              isLoading={forecastQuery.isLoading}
              isError={forecastQuery.isError}
              error={forecastQuery.error}
              isEmpty={!forecastQuery.data?.series.length}
              onRetry={() => void forecastQuery.refetch()}
              loadingHeight={180}
            >
              <Typography variant="subtitle2">Почасовой профиль</Typography>
              <ReactECharts option={chartOption} style={{ height: 180 }} opts={{ renderer: 'canvas' }} />
            </QueryState>

            <Button
              variant="contained"
              fullWidth
              onClick={() => {
                patch({ stop: stop.stop_id })
                onClose()
              }}
            >
              Показать на графике
            </Button>
          </Stack>
        )}
      </Box>
    </Drawer>
  )
}
