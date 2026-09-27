import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { ArrowUp01Icon } from '@hugeicons/core-free-icons'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { api } from '@/shared/api/endpoints'
import {
  filtersToForecastQuery,
  useDashboardFilters,
} from '@/features/filters/useDashboardFilters'
import { Icon } from '@/shared/ui/Icon'
import { QueryState } from '@/shared/ui/QueryState'

function KpiCell({
  title,
  value,
  unit,
  badge,
  badgeColor,
  caption,
}: {
  title: string
  value: string
  unit?: string
  badge?: string
  badgeColor?: 'success' | 'error' | 'warning' | 'info'
  caption?: string
}) {
  const badgeSx =
    badgeColor === 'success'
      ? { bgcolor: 'rgba(46, 158, 107, 0.12)', color: '#1B7A4F' }
      : badgeColor === 'error'
        ? { bgcolor: 'rgba(214, 69, 69, 0.12)', color: '#C03939' }
        : badgeColor === 'warning'
          ? { bgcolor: 'rgba(229, 160, 0, 0.14)', color: '#A87400' }
          : { bgcolor: 'rgba(40, 103, 216, 0.1)', color: '#1F56B8' }

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        px: { xs: 1.25, md: 1.75 },
        py: 1.1,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.35,
        justifyContent: 'center',
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={600}
        noWrap
        sx={{ fontSize: 11.5, lineHeight: 1.2 }}
      >
        {title}
      </Typography>

      <Stack direction="row" alignItems="baseline" spacing={0.75} minWidth={0}>
        <Typography
          fontWeight={700}
          noWrap
          title={value}
          sx={{
            fontSize: { xs: 18, md: 20 },
            lineHeight: 1.15,
            letterSpacing: '-0.025em',
            color: 'text.primary',
          }}
        >
          {value}
        </Typography>
        {unit ? (
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{ fontSize: 11.5 }}
          >
            {unit}
          </Typography>
        ) : null}
      </Stack>

      {(badge || caption) && (
        <Stack direction="row" alignItems="center" spacing={0.6} minWidth={0}>
          {badge ? (
            <Chip
              size="small"
              label={badge}
              icon={
                badge.startsWith('↑') || badge.startsWith('+') ? (
                  <Icon icon={ArrowUp01Icon} size={11} />
                ) : undefined
              }
              sx={{
                height: 20,
                fontWeight: 700,
                fontSize: 10.5,
                flexShrink: 0,
                ...badgeSx,
                '& .MuiChip-icon': { color: 'inherit', ml: 0.4 },
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          ) : null}
          {caption ? (
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ fontSize: 11 }}
            >
              {caption}
            </Typography>
          ) : null}
        </Stack>
      )}
    </Box>
  )
}

export function KpiBar() {
  const { filters } = useDashboardFilters()
  const queryParams = useMemo(() => filtersToForecastQuery(filters), [filters])

  const kpiQuery = useQuery({
    queryKey: ['kpi', queryParams],
    queryFn: () => api.getForecastKpi(queryParams),
  })

  const data = kpiQuery.data
  const deltaPercent = data?.effect?.delta_percent ?? data?.delta_vs_baseline_percent ?? 0
  const peakLoad = data?.peak_hour_load
  const busiest = data?.busiest_stop
  const occupancyPct = busiest
    ? Math.min(99, Math.max(8, Math.round((busiest.load / 320) * 100)))
    : null

  const weekDelta = 12
  const hoursInRange = Math.max(
    1,
    Number(filters.to.slice(0, 2)) - Number(filters.from.slice(0, 2)) + 1,
  )
  const peakVsAvg =
    peakLoad && data
      ? Math.round((peakLoad / Math.max(data.total_passengers / hoursInRange, 1) - 1) * 100)
      : 28

  const items = [
    {
      title: 'Пассажиропоток',
      value: data ? Math.round(data.total_passengers).toLocaleString('ru-RU') : '—',
      unit: 'пассажиров',
      badge: `↑ +${weekDelta}%`,
      badgeColor: 'success' as const,
      caption: 'к прошлой неделе',
    },
    {
      title: 'Пиковый час',
      value: data
        ? `${String(data.peak_hour).padStart(2, '0')}:00 – ${String((data.peak_hour + 1) % 24).padStart(2, '0')}:00`
        : '—',
      unit: peakLoad != null ? `${Math.round(peakLoad).toLocaleString('ru-RU')} пасс.` : undefined,
      badge: `+${Math.abs(peakVsAvg)}%`,
      badgeColor: 'error' as const,
      caption: 'к среднему',
    },
    {
      title: 'Загруженная остановка',
      value: busiest?.name ?? '—',
      unit: busiest ? `${Math.round(busiest.load).toLocaleString('ru-RU')} пасс.` : undefined,
      badge: occupancyPct != null ? `${occupancyPct}%` : undefined,
      badgeColor: 'warning' as const,
      caption: 'загрузка',
    },
    {
      title: 'Изменение прогноза',
      value: `${deltaPercent > 0 ? '+' : ''}${deltaPercent.toFixed(0)}%`,
      caption: 'к базовому сценарию',
      badgeColor: 'info' as const,
    },
  ]

  return (
    <QueryState
      isLoading={kpiQuery.isLoading}
      isError={kpiQuery.isError}
      error={kpiQuery.error}
      onRetry={() => void kpiQuery.refetch()}
      loadingHeight={64}
    >
      <Paper
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'stretch',
          overflow: 'hidden',
          py: 0.25,
        }}
      >
        {items.map((item, i) => (
          <Box
            key={item.title}
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              borderRight: {
                xs: 'none',
                md: i < items.length - 1 ? '1px solid' : 'none',
              },
              borderBottom: {
                xs: i < items.length - 1 ? '1px solid' : 'none',
                md: 'none',
              },
              borderColor: 'divider',
            }}
          >
            <KpiCell {...item} />
          </Box>
        ))}
      </Paper>
    </QueryState>
  )
}

export const KpiGrid = KpiBar
