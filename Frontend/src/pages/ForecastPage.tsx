import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { api } from '@/shared/api/endpoints'
import {
  filtersToForecastQuery,
  useDashboardFilters,
} from '@/features/filters/useDashboardFilters'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { PageHeader } from '@/widgets/layout/PageHeader'
import { FiltersPanel } from '@/widgets/filters/FiltersPanel'
import { ForecastChart } from '@/widgets/charts/ForecastChart'
import { HeatmapChart } from '@/widgets/charts/HeatmapChart'
import { KpiBar } from '@/widgets/kpi/KpiBar'
import { QueryState } from '@/shared/ui/QueryState'

function ForecastSummary() {
  const { filters } = useDashboardFilters()
  const queryParams = useMemo(() => filtersToForecastQuery(filters), [filters])

  const kpiQuery = useQuery({
    queryKey: ['kpi-summary', queryParams],
    queryFn: () => api.getForecastKpi(queryParams),
  })

  const stale = kpiQuery.data?.meta?.external_data_stale === true

  return (
    <Stack spacing={1.5}>
      {stale ? (
        <Alert severity="warning">
          Внешние данные устарели. Прогноз может быть менее точным.
        </Alert>
      ) : null}
      <QueryState
        isLoading={kpiQuery.isLoading}
        isError={kpiQuery.isError}
        error={kpiQuery.error}
        onRetry={() => void kpiQuery.refetch()}
        loadingHeight={80}
      >
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Сводка прогноза
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Маршрут {filters.route} · {filters.date} · горизонт «{filters.horizon}» · час{' '}
            {String(filters.hour).padStart(2, '0')}:00
            {filters.stop ? ` · остановка ${filters.stop}` : ''}
            {filters.segmentFrom && filters.segmentTo
              ? ` · участок ${filters.segmentFrom} → ${filters.segmentTo}`
              : ''}
          </Typography>
        </Paper>
      </QueryState>
      <KpiBar />
    </Stack>
  )
}

export function ForecastPage() {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '300px minmax(0, 1fr)' },
        gap: 1.5,
        p: { xs: 1.5, md: 2 },
        flex: 1,
        minHeight: 0,
      }}
    >
      <Paper sx={{ p: 1.75, height: { lg: 'calc(100dvh - 96px)' }, position: { lg: 'sticky' }, top: 16 }}>
        <ErrorBoundary title="Фильтры">
          <FiltersPanel variant="sidebar" />
        </ErrorBoundary>
      </Paper>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
        <PageHeader
          title="Детальный прогноз"
          subtitle="Графики, тепловая карта и сводка по выбранным параметрам"
        />

        <ErrorBoundary title="Сводка">
          <ForecastSummary />
        </ErrorBoundary>

        <ErrorBoundary title="График">
          <ForecastChart title="Прогноз пассажиропотока" height={420} />
        </ErrorBoundary>

        <ErrorBoundary title="Тепловая карта">
          <HeatmapChart height={440} />
        </ErrorBoundary>
      </Box>
    </Box>
  )
}
