import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { Csv02Icon, InformationCircleIcon, Xls01Icon } from '@hugeicons/core-free-icons'
import { useMutation } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { api } from '@/shared/api/endpoints'
import {
  filtersToForecastQuery,
  useDashboardFilters,
} from '@/features/filters/useDashboardFilters'
import { trackAction } from '@/shared/telemetry/telemetry'
import { Icon } from '@/shared/ui/Icon'
import { ApiError, isApiError } from '@/shared/api/errors'

type ExportFormat = 'csv' | 'xlsx'

export interface ExportButtonsProps {
  labels?: { csv?: string; xlsx?: string }
  /** Card layout for dashboard bottom row */
  variant?: 'inline' | 'card'
}

export function ExportButtons({ labels, variant = 'inline' }: ExportButtonsProps) {
  const { filters } = useDashboardFilters()
  const queryParams = useMemo(() => filtersToForecastQuery(filters), [filters])
  const [activeFormat, setActiveFormat] = useState<ExportFormat | null>(null)

  const exportMutation = useMutation({
    mutationFn: (format: ExportFormat) => {
      trackAction('export_started', { format, route: filters.route })
      return api.exportForecast({ ...queryParams, format })
    },
    onSuccess: (_, format) => {
      trackAction('export_finished', { format, route: filters.route })
      setActiveFormat(null)
    },
    onError: (_, format) => {
      trackAction('export_finished', { format, route: filters.route, ok: false })
      setActiveFormat(null)
    },
  })

  const runExport = (format: ExportFormat) => {
    setActiveFormat(format)
    exportMutation.mutate(format)
  }

  const error = exportMutation.error
  const errorMessage = isApiError(error)
    ? error.message
    : error instanceof Error
      ? error.message
      : null
  const requestId = error instanceof ApiError ? error.requestId : undefined

  if (variant === 'card') {
    return (
      <Paper
        sx={{
          p: 1.5,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
          minHeight: 0,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }} noWrap>
            Экспорт данных
          </Typography>
          <Tooltip title="Выгрузка текущего прогноза с учётом фильтров и коэффициентов">
            <IconButton size="small" aria-label="Информация">
              <Icon icon={InformationCircleIcon} size={16} color="#6B819C" />
            </IconButton>
          </Tooltip>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 'auto' }}>
          <Tooltip
            title={
              <Box sx={{ py: 0.25 }}>
                <Typography variant="body2" fontWeight={700} sx={{ color: '#fff' }}>
                  {labels?.csv ?? 'Скачать CSV'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Почасовой прогноз маршрута
                </Typography>
              </Box>
            }
            arrow
            placement="top"
          >
            <span style={{ flex: 1 }}>
              <Button
                variant="outlined"
                fullWidth
                size="small"
                disabled={exportMutation.isPending}
                onClick={() => runExport('csv')}
                startIcon={
                  exportMutation.isPending && activeFormat === 'csv' ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <Icon icon={Csv02Icon} size={16} />
                  )
                }
                sx={{
                  py: 1,
                  borderRadius: 2,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                CSV
              </Button>
            </span>
          </Tooltip>

          <Tooltip
            title={
              <Box sx={{ py: 0.25 }}>
                <Typography variant="body2" fontWeight={700} sx={{ color: '#fff' }}>
                  {labels?.xlsx ?? 'Скачать XLSX'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Остановки и коэффициенты модели
                </Typography>
              </Box>
            }
            arrow
            placement="top"
          >
            <span style={{ flex: 1 }}>
              <Button
                variant="outlined"
                fullWidth
                size="small"
                disabled={exportMutation.isPending}
                onClick={() => runExport('xlsx')}
                startIcon={
                  exportMutation.isPending && activeFormat === 'xlsx' ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <Icon icon={Xls01Icon} size={16} />
                  )
                }
                sx={{
                  py: 1,
                  borderRadius: 2,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                XLSX
              </Button>
            </span>
          </Tooltip>
        </Stack>

        {errorMessage ? (
          <Typography variant="caption" color="error">
            {errorMessage}
            {requestId ? ` · request_id: ${requestId}` : ''}
          </Typography>
        ) : null}
      </Paper>
    )
  }

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
        <Tooltip title="Почасовой прогноз маршрута" arrow>
          <span style={{ flex: 1 }}>
            <Button
              size="small"
              variant="outlined"
              fullWidth
              startIcon={
                exportMutation.isPending && activeFormat === 'csv' ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <Icon icon={Csv02Icon} size={16} />
                )
              }
              disabled={exportMutation.isPending}
              onClick={() => runExport('csv')}
              sx={{ minWidth: 0 }}
            >
              {exportMutation.isPending && activeFormat === 'csv'
                ? 'CSV…'
                : (labels?.csv ?? 'CSV')}
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="Остановки и коэффициенты модели" arrow>
          <span style={{ flex: 1 }}>
            <Button
              size="small"
              variant="outlined"
              fullWidth
              startIcon={
                exportMutation.isPending && activeFormat === 'xlsx' ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <Icon icon={Xls01Icon} size={16} />
                )
              }
              disabled={exportMutation.isPending}
              onClick={() => runExport('xlsx')}
              sx={{ minWidth: 0 }}
            >
              {exportMutation.isPending && activeFormat === 'xlsx'
                ? 'XLSX…'
                : (labels?.xlsx ?? 'XLSX')}
            </Button>
          </span>
        </Tooltip>
      </Stack>
      {exportMutation.isPending ? (
        <Typography variant="caption" color="text.secondary">
          Формирование файла…
        </Typography>
      ) : null}
      {errorMessage ? (
        <Typography variant="caption" color="error">
          {errorMessage}
          {requestId ? ` · request_id: ${requestId}` : ''}
        </Typography>
      ) : null}
    </Stack>
  )
}
