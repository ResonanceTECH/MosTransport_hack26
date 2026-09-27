import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { InformationCircleIcon } from '@hugeicons/core-free-icons'
import ReactECharts from 'echarts-for-react'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/endpoints'
import {
  filtersToForecastQuery,
  useDashboardFilters,
} from '@/features/filters/useDashboardFilters'
import { Icon } from '@/shared/ui/Icon'
import { QueryState } from '@/shared/ui/QueryState'

export interface HeatmapChartProps {
  height?: number | string
  compact?: boolean
}

export function HeatmapChart({ height = '100%', compact = false }: HeatmapChartProps) {
  const { filters } = useDashboardFilters()
  const queryParams = useMemo(() => filtersToForecastQuery(filters), [filters])
  const [metric, setMetric] = useState('pct')

  const heatmapQuery = useQuery({
    queryKey: ['heatmap', queryParams],
    queryFn: () => api.getForecastHeatmap(queryParams),
  })

  const option = useMemo(() => {
    const data = heatmapQuery.data
    if (!data) return {}

    // Prefer even hours 06–22 for dense dashboard view
    const hours = [6, 8, 10, 12, 14, 16, 18, 20, 22]
    const hourIndex = new Map(hours.map((h, i) => [h, i]))
    const stopLabels = data.stops.map((s) =>
      s.name.replace('Метро ', '').replace(' улица', '').replace('Улица ', 'Ул. '),
    )
    const stopIndex = new Map(data.stops.map((s, i) => [s.id, i]))

    const raw = data.cells.filter((c) => stopIndex.has(c.stop_id) && hourIndex.has(c.hour))
    const maxVal = raw.reduce((m, c) => Math.max(m, c.value), 1)

    const cells = raw.map((c) => {
      const pct = Math.round((c.value / maxVal) * 100)
      return [hourIndex.get(c.hour)!, stopIndex.get(c.stop_id)!, pct] as [number, number, number]
    })

    return {
      tooltip: {
        position: 'top' as const,
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#D7E0EC',
        textStyle: { color: '#0A1F44', fontSize: 12 },
        formatter: (p: { value: [number, number, number] }) => {
          const [hi, si, val] = p.value
          return `${stopLabels[si]}<br/>${String(hours[hi]).padStart(2, '0')}:00 — ${val}%`
        },
      },
      grid: {
        left: compact ? 88 : 100,
        right: 48,
        top: 8,
        bottom: 28,
      },
      xAxis: {
        type: 'category' as const,
        data: hours.map((h) => `${String(h).padStart(2, '0')}:00`),
        splitArea: { show: false },
        axisLabel: { color: '#6B819C', fontSize: 10 },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      yAxis: {
        type: 'category' as const,
        data: stopLabels,
        inverse: true,
        axisLabel: { width: compact ? 72 : 88, overflow: 'truncate' as const, color: '#6B819C', fontSize: 10 },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      visualMap: {
        min: 0,
        max: 100,
        calculable: false,
        orient: 'vertical' as const,
        right: 0,
        top: 'center',
        itemHeight: compact ? 80 : 100,
        itemWidth: 8,
        text: ['100', '0'],
        textStyle: { color: '#6B819C', fontSize: 10 },
        inRange: {
          color: ['#2E9E6B', '#A8D08D', '#F5D76E', '#F0A202', '#E67E22', '#D64545'],
        },
        formatter: (v: number) => `${Math.round(v)}`,
      },
      series: [
        {
          name: 'Загрузка',
          type: 'heatmap' as const,
          data: cells,
          emphasis: { itemStyle: { shadowBlur: 4, borderColor: '#0A1F44', borderWidth: 1 } },
        },
      ],
      graphic: [
        {
          type: 'text',
          right: 0,
          top: 0,
          style: {
            text: 'Загрузка, %',
            fill: '#6B819C',
            fontSize: 10,
            fontWeight: 600,
          },
        },
      ],
    }
  }, [heatmapQuery.data, compact])

  return (
    <Paper
      sx={{
        p: 1.25,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5} mb={0.5}>
        <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ flex: 1 }}>
          Загрузка по остановкам и часам
        </Typography>
        <Tooltip title="Процент заполнения по остановкам в разрезе часа">
          <IconButton size="small" aria-label="Информация">
            <Icon icon={InformationCircleIcon} size={16} color="#6B819C" />
          </IconButton>
        </Tooltip>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <Select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            sx={{ fontSize: 12, height: 30, '.MuiSelect-select': { py: 0.5 } }}
          >
            <MenuItem value="pct">Процент заполнения</MenuItem>
            <MenuItem value="pax">Пассажиры</MenuItem>
          </Select>
        </FormControl>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <QueryState
          isLoading={heatmapQuery.isLoading}
          isError={heatmapQuery.isError}
          error={heatmapQuery.error}
          isEmpty={!heatmapQuery.isLoading && !heatmapQuery.data?.cells.length}
          onRetry={() => void heatmapQuery.refetch()}
          loadingHeight={160}
        >
          <ReactECharts
            option={option}
            style={{ height: typeof height === 'number' ? height : '100%', width: '100%', minHeight: 140 }}
            opts={{ renderer: 'canvas' }}
            notMerge
          />
        </QueryState>
      </Box>
    </Paper>
  )
}

export const ForecastHeatmap = HeatmapChart
