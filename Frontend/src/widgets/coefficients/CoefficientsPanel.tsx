import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import {
  ArrowDown01Icon,
  CloudIcon,
  Delete02Icon,
  InformationCircleIcon,
  Leaf01Icon,
  Ticket01Icon,
  TrafficJam01Icon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, type Coefficients } from '@/shared/api/endpoints'
import { useDashboardFilters } from '@/features/filters/useDashboardFilters'
import { Icon } from '@/shared/ui/Icon'
import { QueryState } from '@/shared/ui/QueryState'

const COEFF_META: {
  key: keyof Coefficients
  label: string
  icon: IconSvgElement
}[] = [
  { key: 'k_weather', label: 'Погода', icon: CloudIcon },
  { key: 'k_event', label: 'Мероприятия', icon: Ticket01Icon },
  { key: 'k_season', label: 'Сезонность', icon: Leaf01Icon },
  { key: 'k_traffic', label: 'Транспортная ситуация', icon: TrafficJam01Icon },
]

function formatEffect(percent?: number, passengers?: number): string | null {
  if (percent == null && passengers == null) return null
  const chunks: string[] = []
  if (percent != null) chunks.push(`${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`)
  if (passengers != null) chunks.push(`${passengers > 0 ? '+' : ''}${Math.round(passengers)} пасс.`)
  return chunks.join(', ')
}

export interface CoefficientsPanelProps {
  compact?: boolean
  enableScenarios?: boolean
}

export function CoefficientsPanel({
  compact = false,
  enableScenarios = false,
}: CoefficientsPanelProps) {
  const { filters, patch, resetCoefficients } = useDashboardFilters()
  const queryClient = useQueryClient()
  const [local, setLocal] = useState<Coefficients>(filters.coefficients)
  const debounceRef = useRef<number | null>(null)
  const [scenarioName, setScenarioName] = useState('')
  const [scenariosOpen, setScenariosOpen] = useState(false)

  useEffect(() => {
    setLocal(filters.coefficients)
  }, [filters.coefficients])

  const factorsQuery = useQuery({
    queryKey: ['factors'],
    queryFn: () => api.getFactors(),
  })

  const kpiQuery = useQuery({
    queryKey: ['kpi-effect', filters.route, filters.date, filters.horizon, filters.hour, filters.coefficients],
    queryFn: () =>
      api.getForecastKpi({
        route: filters.route,
        horizon: filters.horizon,
        date: filters.date,
        hour: filters.hour,
        k_weather: filters.coefficients.k_weather,
        k_event: filters.coefficients.k_event,
        k_season: filters.coefficients.k_season,
        k_traffic: filters.coefficients.k_traffic,
      }),
    staleTime: 30_000,
  })

  const scenariosQuery = useQuery({
    queryKey: ['scenarios'],
    queryFn: () => api.listScenarios(),
    enabled: enableScenarios,
  })

  const schedulePatch = useCallback(
    (next: Coefficients) => {
      setLocal(next)
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      debounceRef.current = window.setTimeout(() => {
        patch({ coefficients: next })
      }, 250)
    },
    [patch],
  )

  useEffect(
    () => () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    },
    [],
  )

  const createMutation = useMutation({
    mutationFn: (body: { name: string; coefficients: Coefficients }) => api.createScenario(body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['scenarios'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteScenario(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['scenarios'] }),
  })

  const effectText = useMemo(
    () => formatEffect(kpiQuery.data?.effect?.delta_percent, kpiQuery.data?.effect?.delta_passengers),
    [kpiQuery.data?.effect],
  )

  return (
    <Paper sx={{ p: compact ? 1.25 : 2, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Stack spacing={compact ? 0.75 : 1.5} sx={{ minHeight: 0, flex: 1 }}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }} noWrap>
            Коэффициенты модели
          </Typography>
          <Tooltip title="Изменение коэффициента пересчитывает прогноз на карте и графиках">
            <IconButton size="small" aria-label="Информация">
              <Icon icon={InformationCircleIcon} size={16} color="#6B819C" />
            </IconButton>
          </Tooltip>
          <Button
            size="small"
            onClick={resetCoefficients}
            sx={{ fontSize: 11, whiteSpace: 'nowrap', minWidth: 0, px: 1 }}
          >
            Сбросить к значениям по умолчанию
          </Button>
        </Stack>

        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex' }}>
          <Stack
            spacing={compact ? 0.25 : 1}
            sx={{
              flex: 1,
              minHeight: 0,
              justifyContent: compact ? 'space-evenly' : 'flex-start',
              py: compact ? 0.5 : 0,
            }}
          >
            {COEFF_META.map(({ key, label, icon }) => (
              <Box key={key} sx={{ flexShrink: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={-0.25}>
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: 1.25,
                      bgcolor: 'rgba(40, 103, 216, 0.08)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'primary.main',
                      flexShrink: 0,
                    }}
                  >
                    <Icon icon={icon} size={14} />
                  </Box>
                  <Box minWidth={0} flex={1}>
                    <Typography variant="caption" fontFamily="monospace" color="text.secondary" display="block" lineHeight={1.1}>
                      {key}
                    </Typography>
                    <Typography variant="body2" fontWeight={600} noWrap lineHeight={1.2}>
                      {label}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontFamily="monospace" fontWeight={700} color="primary.main">
                    {local[key].toFixed(2)}
                  </Typography>
                </Stack>
                <Slider
                  size="small"
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  value={local[key]}
                  onChange={(_, v) => schedulePatch({ ...local, [key]: v as number })}
                  aria-label={key}
                  sx={{ mt: 0.25, mb: 0 }}
                />
              </Box>
            ))}
          </Stack>
        </Box>

        {effectText ? (
          <Typography variant="caption" color="primary.main" fontWeight={600}>
            Эффект: {effectText}
          </Typography>
        ) : null}

        {!compact ? (
          <QueryState
            isLoading={factorsQuery.isLoading}
            isError={factorsQuery.isError}
            error={factorsQuery.error}
            loadingHeight={48}
          >
            {factorsQuery.data?.presets.length ? (
              <>
                <Divider />
                <Typography variant="subtitle2">Пресеты</Typography>
                <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
                  {factorsQuery.data.presets.map((preset) => (
                    <Button
                      key={preset.id}
                      size="small"
                      variant="outlined"
                      onClick={() => schedulePatch(preset.coefficients)}
                    >
                      {preset.name}
                    </Button>
                  ))}
                </Stack>
              </>
            ) : null}
          </QueryState>
        ) : null}

        {enableScenarios ? (
          <>
            <Divider />
            <Button
              size="small"
              color="inherit"
              endIcon={
                <Icon
                  icon={ArrowDown01Icon}
                  size={16}
                  style={{
                    transform: scenariosOpen ? 'rotate(180deg)' : undefined,
                    transition: 'transform 0.2s',
                  }}
                />
              }
              onClick={() => setScenariosOpen((v) => !v)}
              sx={{ justifyContent: 'space-between' }}
            >
              Мои сценарии
            </Button>
            <Collapse in={scenariosOpen}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1}>
                  <TextField
                    size="small"
                    placeholder="Название"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    fullWidth
                  />
                  <Button
                    size="small"
                    variant="contained"
                    disabled={!scenarioName.trim() || createMutation.isPending}
                    onClick={() => {
                      createMutation.mutate({ name: scenarioName.trim(), coefficients: local })
                      setScenarioName('')
                    }}
                  >
                    Сохранить
                  </Button>
                </Stack>
                <List dense disablePadding>
                  {(scenariosQuery.data?.items ?? []).map((item) => (
                    <ListItem
                      key={item.id}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          size="small"
                          aria-label="Удалить"
                          onClick={() => deleteMutation.mutate(item.id)}
                        >
                          <Icon icon={Delete02Icon} size={16} />
                        </IconButton>
                      }
                      onClick={() => schedulePatch(item.coefficients)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <ListItemText
                        primary={item.name}
                        secondary={`${item.coefficients.k_weather.toFixed(2)} / ${item.coefficients.k_event.toFixed(2)} / ${item.coefficients.k_season.toFixed(2)} / ${item.coefficients.k_traffic.toFixed(2)}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Stack>
            </Collapse>
          </>
        ) : null}
      </Stack>
    </Paper>
  )
}

export const CoefficientPanel = CoefficientsPanel
