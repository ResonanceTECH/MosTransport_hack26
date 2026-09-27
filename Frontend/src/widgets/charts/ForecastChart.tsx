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

export interface ForecastChartProps {
  compact?: boolean
  title?: string
  height?: number | string
}

export function ForecastChart({
  compact = false,
  title = 'Прогноз пассажиропотока',
  height,
}: ForecastChartProps) {
  const { filters } = useDashboardFilters()
  const queryParams = useMemo(() => filtersToForecastQuery(filters), [filters])
  const chartHeight = height ?? (compact ? '100%' : 280)
  const [metric, setMetric] = useState('passengers')

  const forecastQuery = useQuery({
    queryKey: ['forecast-chart', queryParams],
    queryFn: () => api.getForecast(queryParams),
  })

  const option = useMemo(() => {
    const series = forecastQuery.data?.series ?? []
    const labels = series.map((p) => {
      if (p.ts.length >= 16) return p.ts.slice(11, 16)
      return p.ts
    })

    const peakIdx = series.reduce(
      (best, p, i) => (p.adjusted > (series[best]?.adjusted ?? 0) ? i : best),
      0,
    )

    return {
      color: ['#2867D8', '#4B82E3'],
      legend: {
        data: ['Базовый прогноз', 'С учётом коэффициентов'],
        bottom: 0,
        left: 'center',
        itemGap: 20,
        padding: [4, 0, 0, 0],
        textStyle: { color: '#6B819C', fontSize: 11 },
        itemWidth: 18,
        itemHeight: 8,
      },
      tooltip: {
        trigger: 'axis' as const,
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#D7E0EC',
        borderWidth: 1,
        textStyle: { color: '#0A1F44', fontSize: 12 },
        formatter: (params: Array<{ seriesName: string; value: number; axisValue: string; dataIndex: number }>) => {
          if (!params?.length) return ''
          const hour = params[0].axisValue
          const next = `${String((Number(hour.slice(0, 2)) + 1) % 24).padStart(2, '0')}:00`
          const rows = params
            .map(
              (p) =>
                `<div style="display:flex;justify-content:space-between;gap:16px;margin-top:4px">
                  <span style="color:#6B819C">${p.seriesName}</span>
                  <strong>${Math.round(p.value).toLocaleString('ru-RU')}</strong>
                </div>`,
            )
            .join('')
          return `<div style="font-weight:700;margin-bottom:4px">${hour} – ${next}</div>${rows}`
        },
      },
      // bottom: x-axis labels (~18px) + gap + legend (~22px)
      grid: { left: 44, right: 12, top: 12, bottom: compact ? 58 : 64 },
      xAxis: {
        type: 'category' as const,
        data: labels,
        boundaryGap: false,
        axisLabel: { hideOverlap: true, color: '#6B819C', fontSize: 10 },
        axisLine: { lineStyle: { color: '#D7E0EC' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value' as const,
        min: 0,
        axisLabel: { color: '#6B819C', fontSize: 10 },
        splitLine: { lineStyle: { color: '#E8EEF5', type: 'dashed' as const } },
      },
      series: [
        {
          name: 'Базовый прогноз',
          type: 'line' as const,
          smooth: true,
          data: series.map((p) => p.baseline),
          lineStyle: { width: 2.5, color: '#2867D8' },
          showSymbol: false,
          itemStyle: { color: '#2867D8' },
        },
        {
          name: 'С учётом коэффициентов',
          type: 'line' as const,
          smooth: true,
          data: series.map((p) => p.adjusted),
          lineStyle: { type: 'dashed' as const, width: 2, color: '#4B82E3' },
          showSymbol: false,
          itemStyle: { color: '#4B82E3' },
          markPoint:
            series.length > 0
              ? {
                  symbol: 'circle',
                  symbolSize: 8,
                  data: [{ coord: [labels[peakIdx], series[peakIdx]?.adjusted] }],
                  itemStyle: { color: '#2867D8', borderColor: '#fff', borderWidth: 2 },
                  label: { show: false },
                }
              : undefined,
        },
      ],
    }
  }, [forecastQuery.data?.series, compact])

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
          {title}
        </Typography>
        <Tooltip title="Базовый прогноз и прогноз с учётом корректирующих коэффициентов">
          <IconButton size="small" aria-label="Информация">
            <Icon icon={InformationCircleIcon} size={16} color="#6B819C" />
          </IconButton>
        </Tooltip>
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <Select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            sx={{ fontSize: 12, height: 30, '.MuiSelect-select': { py: 0.5 } }}
          >
            <MenuItem value="passengers">Пассажиров</MenuItem>
            <MenuItem value="load">Загрузка, %</MenuItem>
          </Select>
        </FormControl>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <QueryState
          isLoading={forecastQuery.isLoading}
          isError={forecastQuery.isError}
          error={forecastQuery.error}
          isEmpty={!forecastQuery.isLoading && !forecastQuery.data?.series.length}
          onRetry={() => void forecastQuery.refetch()}
          loadingHeight={160}
        >
          <ReactECharts
            option={option}
            style={{ height: typeof chartHeight === 'number' ? chartHeight : '100%', width: '100%', minHeight: 140 }}
            opts={{ renderer: 'canvas' }}
            notMerge
          />
        </QueryState>
      </Box>
    </Paper>
  )
}
