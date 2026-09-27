import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import {
  ArrowRight01Icon,
  Calendar03Icon,
  Clock01Icon,
  Location01Icon,
  PlayIcon,
  Settings01Icon,
  TramIcon,
} from '@hugeicons/core-free-icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs, { type Dayjs } from 'dayjs'
import 'dayjs/locale/ru'
import { useMemo, useState } from 'react'
import { api, type Horizon } from '@/shared/api/endpoints'
import { useDashboardFilters } from '@/features/filters/useDashboardFilters'
import { trackAction } from '@/shared/telemetry/telemetry'
import { Icon } from '@/shared/ui/Icon'
import { QueryState } from '@/shared/ui/QueryState'
import { ExportButtons } from '@/widgets/export/ExportButtons'

const HORIZON_LABELS: Record<Horizon, string> = {
  day: 'День',
  month: 'Месяц',
  year: 'Год',
}

const TIME_PRESETS = [
  { label: '06:00 – 23:00', from: '06:00', to: '23:00' },
  { label: '06:00 – 12:00', from: '06:00', to: '12:00' },
  { label: '07:00 – 10:00', from: '07:00', to: '10:00' },
  { label: '17:00 – 21:00', from: '17:00', to: '21:00' },
] as const

type QuickKey = 'today' | 'tomorrow' | 'weekdays' | 'weekend' | 'morning' | 'evening'

const QUICK_CHIPS: { key: QuickKey; label: string }[] = [
  { key: 'today', label: 'Сегодня' },
  { key: 'tomorrow', label: 'Завтра' },
  { key: 'weekdays', label: 'Будни' },
  { key: 'weekend', label: 'Выходные' },
  { key: 'morning', label: 'Утро' },
  { key: 'evening', label: 'Вечер' },
]

function nextWeekday(from: Dayjs): Dayjs {
  let d = from
  while (d.day() === 0 || d.day() === 6) d = d.add(1, 'day')
  return d
}

function nextWeekend(from: Dayjs): Dayjs {
  let d = from
  while (d.day() !== 0 && d.day() !== 6) d = d.add(1, 'day')
  return d
}

export interface FiltersPanelProps {
  variant?: 'sidebar' | 'drawer'
  onApply?: () => void
}

export function FiltersPanel({ variant = 'sidebar', onApply }: FiltersPanelProps) {
  const { filters, patch } = useDashboardFilters()
  const queryClient = useQueryClient()
  const [extraOpen, setExtraOpen] = useState(false)
  const [activeQuick, setActiveQuick] = useState<QuickKey>('today')

  const routesQuery = useQuery({
    queryKey: ['routes'],
    queryFn: () => api.listRoutes(),
  })

  const routeDetailQuery = useQuery({
    queryKey: ['route', filters.route],
    queryFn: () => api.getRoute(filters.routes[0] ?? filters.route),
    enabled: Boolean(filters.route),
  })

  const routeOptions = routesQuery.data?.items ?? []
  const stops = routeDetailQuery.data?.stops ?? []

  const timePresetValue = useMemo(() => {
    const from = filters.from.slice(0, 5)
    const to = filters.to.slice(0, 5)
    const match = TIME_PRESETS.find((p) => p.from === from && p.to === to)
    return match?.label ?? TIME_PRESETS[0].label
  }, [filters.from, filters.to])

  const stopSelectValue = useMemo(() => {
    if (filters.segmentFrom && filters.segmentTo) {
      return `seg:${filters.segmentFrom}:${filters.segmentTo}`
    }
    if (filters.stop) return `stop:${filters.stop}`
    return 'all'
  }, [filters.stop, filters.segmentFrom, filters.segmentTo])

  const applyQuick = (key: QuickKey) => {
    setActiveQuick(key)
    const today = dayjs()
    switch (key) {
      case 'today':
        patch({ date: today.format('YYYY-MM-DD'), horizon: 'day' })
        break
      case 'tomorrow':
        patch({ date: today.add(1, 'day').format('YYYY-MM-DD'), horizon: 'day' })
        break
      case 'weekdays':
        patch({ date: nextWeekday(today).format('YYYY-MM-DD'), horizon: 'day' })
        break
      case 'weekend':
        patch({ date: nextWeekend(today).format('YYYY-MM-DD'), horizon: 'day' })
        break
      case 'morning':
        patch({ from: '06:00', to: '12:00' })
        break
      case 'evening':
        patch({ from: '17:00', to: '23:00' })
        break
    }
  }

  const buildForecast = () => {
    trackAction('forecast_build_clicked', { route: filters.route, horizon: filters.horizon })
    void queryClient.invalidateQueries({ queryKey: ['kpi'] })
    void queryClient.invalidateQueries({ queryKey: ['forecast-chart'] })
    void queryClient.invalidateQueries({ queryKey: ['forecast-map'] })
    void queryClient.invalidateQueries({ queryKey: ['heatmap'] })
    void queryClient.invalidateQueries({ queryKey: ['kpi-meta'] })
    void queryClient.invalidateQueries({ queryKey: ['kpi-effect'] })
    onApply?.()
  }

  const fieldSx = { width: '100%' }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ru">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          gap: 1.5,
        }}
      >
        {variant === 'sidebar' ? (
          <Typography variant="subtitle1" fontWeight={700} sx={{ px: 0.25 }}>
            Параметры прогноза
          </Typography>
        ) : null}

        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', pr: 0.5 }}>
          <Stack spacing={1.75}>
            {/* Route */}
            <QueryState
              isLoading={routesQuery.isLoading}
              isError={routesQuery.isError}
              error={routesQuery.error}
              loadingHeight={48}
            >
              <FormControl size="small" sx={fieldSx}>
                <InputLabel id="route-label">Маршрут</InputLabel>
                <Select
                  labelId="route-label"
                  label="Маршрут"
                  value={filters.route}
                  onChange={(e) =>
                    patch({
                      route: e.target.value,
                      stop: undefined,
                      segmentFrom: undefined,
                      segmentTo: undefined,
                    })
                  }
                  renderValue={(id) => {
                    const r = routeOptions.find((o) => o.id === id)
                    if (!r) return id
                    return `№ ${r.number}  ${r.name}`
                  }}
                  startAdornment={
                    <InputAdornment position="start" sx={{ ml: 0.5 }}>
                      <Icon icon={TramIcon} size={16} color="#64748B" />
                    </InputAdornment>
                  }
                >
                  {routeOptions.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          № {r.number}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {r.name}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </QueryState>

            {/* Horizon */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.75, display: 'block' }}>
                Горизонт
              </Typography>
              <Box sx={{ position: 'relative', pt: 1.25 }}>
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    px: 0.5,
                    pointerEvents: 'none',
                  }}
                >
                  <Box sx={{ flex: 1 }} />
                  <Chip
                    size="small"
                    label="Оценочный"
                    sx={{
                      height: 18,
                      fontSize: 10,
                      fontWeight: 600,
                      bgcolor: 'rgba(229, 160, 0, 0.12)',
                      color: '#B87A00',
                      flex: 1,
                      '& .MuiChip-label': { px: 0.5 },
                    }}
                  />
                  <Chip
                    size="small"
                    label="Оценочный"
                    sx={{
                      height: 18,
                      fontSize: 10,
                      fontWeight: 600,
                      bgcolor: 'rgba(229, 160, 0, 0.12)',
                      color: '#B87A00',
                      flex: 1,
                      '& .MuiChip-label': { px: 0.5 },
                    }}
                  />
                </Stack>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  size="small"
                  value={filters.horizon}
                  onChange={(_, v: Horizon | null) => v && patch({ horizon: v })}
                >
                  {(Object.keys(HORIZON_LABELS) as Horizon[]).map((h) => (
                    <ToggleButton key={h} value={h} sx={{ py: 0.75, fontSize: 13 }}>
                      {HORIZON_LABELS[h]}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>
            </Box>

            {/* Date */}
            <DatePicker
              label="Дата"
              value={dayjs(filters.date)}
              onChange={(d: Dayjs | null) => d && patch({ date: d.format('YYYY-MM-DD') })}
              format="DD.MM.YYYY"
              slotProps={{
                textField: {
                  size: 'small',
                  fullWidth: true,
                  InputProps: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Icon icon={Calendar03Icon} size={16} color="#64748B" />
                      </InputAdornment>
                    ),
                  },
                },
              }}
            />

            {/* Time interval */}
            <FormControl size="small" sx={fieldSx}>
              <InputLabel id="time-label">Интервал времени</InputLabel>
              <Select
                labelId="time-label"
                label="Интервал времени"
                value={timePresetValue}
                onChange={(e) => {
                  const preset = TIME_PRESETS.find((p) => p.label === e.target.value)
                  if (preset) patch({ from: preset.from, to: preset.to })
                }}
                startAdornment={
                  <InputAdornment position="start" sx={{ ml: 0.5 }}>
                    <Icon icon={Clock01Icon} size={16} color="#64748B" />
                  </InputAdornment>
                }
              >
                {TIME_PRESETS.map((p) => (
                  <MenuItem key={p.label} value={p.label}>
                    {p.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Stop / segment */}
            <FormControl size="small" sx={fieldSx}>
              <InputLabel id="scope-label">Остановка / участок</InputLabel>
              <Select
                labelId="scope-label"
                label="Остановка / участок"
                value={stopSelectValue}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === 'all') {
                    patch({ stop: undefined, segmentFrom: undefined, segmentTo: undefined })
                    return
                  }
                  if (v.startsWith('stop:')) {
                    patch({
                      stop: v.slice(5),
                      segmentFrom: undefined,
                      segmentTo: undefined,
                    })
                    return
                  }
                  if (v.startsWith('seg:')) {
                    const [, from, to] = v.split(':')
                    patch({ stop: undefined, segmentFrom: from, segmentTo: to })
                  }
                }}
                startAdornment={
                  <InputAdornment position="start" sx={{ ml: 0.5 }}>
                    <Icon icon={Location01Icon} size={16} color="#64748B" />
                  </InputAdornment>
                }
              >
                <MenuItem value="all">Все остановки</MenuItem>
                {stops.map((s) => (
                  <MenuItem key={s.id} value={`stop:${s.id}`}>
                    {s.name}
                  </MenuItem>
                ))}
                {stops.length >= 2
                  ? [
                      <MenuItem key="seg-header" disabled sx={{ opacity: 1, fontWeight: 600, fontSize: 12 }}>
                        Участки
                      </MenuItem>,
                      ...stops.slice(0, -1).flatMap((from, i) =>
                        stops.slice(i + 1, i + 3).map((to) => (
                          <MenuItem key={`seg:${from.id}:${to.id}`} value={`seg:${from.id}:${to.id}`}>
                            {from.name} → {to.name}
                          </MenuItem>
                        )),
                      ),
                    ]
                  : null}
              </Select>
            </FormControl>

            {/* Quick chips */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.75, display: 'block' }}>
                Быстрые настройки
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap>
                {QUICK_CHIPS.map((chip) => {
                  const selected = activeQuick === chip.key
                  return (
                    <Chip
                      key={chip.key}
                      label={chip.label}
                      size="small"
                      onClick={() => applyQuick(chip.key)}
                      sx={{
                        fontWeight: 600,
                        bgcolor: selected ? 'primary.main' : 'rgba(40, 103, 216, 0.06)',
                        color: selected ? '#fff' : 'text.primary',
                        '&:hover': {
                          bgcolor: selected ? 'primary.dark' : 'rgba(40, 103, 216, 0.12)',
                        },
                      }}
                    />
                  )
                })}
              </Stack>
            </Box>

            {/* Extra */}
            <Box>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                onClick={() => setExtraOpen((v) => !v)}
                sx={{
                  cursor: 'pointer',
                  py: 0.75,
                  px: 0.5,
                  borderRadius: 1.5,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Icon icon={Settings01Icon} size={16} color="#64748B" />
                <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                  Дополнительно
                </Typography>
                <IconButton size="small" tabIndex={-1}>
                  <Icon
                    icon={ArrowRight01Icon}
                    size={16}
                    style={{
                      transform: extraOpen ? 'rotate(90deg)' : undefined,
                      transition: 'transform 0.15s',
                    }}
                  />
                </IconButton>
              </Stack>
              <Collapse in={extraOpen}>
                <Typography variant="caption" color="text.secondary" sx={{ px: 0.5, display: 'block', pb: 1 }}>
                  Группировка и сегменты применяются к графику и выгрузкам. Карта всегда показывает
                  остановки выбранного маршрута.
                </Typography>
              </Collapse>
            </Box>

            {/* Export */}
            <Box
              sx={{
                pt: 0.5,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{ mb: 1, display: 'block', px: 0.25 }}
              >
                Скачать
              </Typography>
              <ExportButtons
                variant="inline"
                labels={{ csv: 'CSV', xlsx: 'XLSX' }}
              />
            </Box>
          </Stack>
        </Box>

        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={buildForecast}
          startIcon={<Icon icon={PlayIcon} size={18} color="#fff" />}
          sx={{
            py: 1.35,
            fontSize: 15,
            flexShrink: 0,
            borderRadius: 2.5,
          }}
        >
          Построить прогноз
        </Button>
      </Box>
    </LocalizationProvider>
  )
}

export const ForecastFilters = FiltersPanel
