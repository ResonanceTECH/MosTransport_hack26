import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useMemo } from 'react'
import { useDashboardFilters } from '@/features/filters/useDashboardFilters'
import { PageHeader } from '@/widgets/layout/PageHeader'
import { ExportButtons } from '@/widgets/export/ExportButtons'

const HORIZON_LABELS = { day: 'День', month: 'Месяц', year: 'Год' } as const
const GROUPING_LABELS = {
  route: 'по маршруту',
  stop: 'по остановке',
  segment: 'по участку',
} as const

function ParamRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" gap={2} flexWrap="wrap">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} textAlign="right">
        {value}
      </Typography>
    </Stack>
  )
}

export function ExportsPage() {
  const { filters } = useDashboardFilters()
  const coeffs = filters.coefficients

  const segmentLabel = useMemo(() => {
    if (filters.segmentFrom && filters.segmentTo) {
      return `${filters.segmentFrom} → ${filters.segmentTo}`
    }
    return filters.stop ?? 'Все остановки'
  }, [filters.segmentFrom, filters.segmentTo, filters.stop])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxWidth: 800, p: { xs: 1.5, md: 2 } }}>
      <PageHeader
        title="Выгрузки"
        subtitle="Скачать прогноз в CSV или XLSX по текущим параметрам"
      />

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Параметры выгрузки
        </Typography>
        <Stack spacing={1.25} sx={{ mb: 2 }}>
          <ParamRow label="Горизонт" value={HORIZON_LABELS[filters.horizon]} />
          <ParamRow label="Маршрут" value={filters.route} />
          <ParamRow label="Остановка / участок" value={segmentLabel} />
          <ParamRow label="Дата" value={filters.date} />
          <ParamRow label="Интервал" value={`${filters.from.slice(0, 5)} – ${filters.to.slice(0, 5)}`} />
          <ParamRow label="Группировка" value={GROUPING_LABELS[filters.grouping]} />
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={1}
          >
            <Typography variant="body2" color="text.secondary">
              Коэффициенты
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={`k_weather ${coeffs.k_weather.toFixed(2)}`} />
              <Chip size="small" label={`k_event ${coeffs.k_event.toFixed(2)}`} />
              <Chip size="small" label={`k_season ${coeffs.k_season.toFixed(2)}`} />
              <Chip size="small" label={`k_traffic ${coeffs.k_traffic.toFixed(2)}`} />
            </Stack>
          </Stack>
        </Stack>

        <ExportButtons labels={{ csv: 'Скачать CSV', xlsx: 'Скачать XLSX' }} />

        <Alert severity="info" sx={{ mt: 2 }}>
          Выгрузка не блокирует интерфейс — можно продолжать работу с фильтрами.
        </Alert>
      </Paper>
    </Box>
  )
}
