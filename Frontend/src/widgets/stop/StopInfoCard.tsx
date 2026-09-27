import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Location01Icon } from '@hugeicons/core-free-icons'
import { useMemo } from 'react'
import type { MapStopLoad } from '@/shared/api/endpoints'
import { LOAD_LEVEL_LABELS, loadColor } from '@/shared/lib/loadLevel'
import { Icon } from '@/shared/ui/Icon'

export interface StopInfoCardProps {
  stop: MapStopLoad | null
  fallbackName?: string
}

function MetricTile({
  value,
  label,
  color,
}: {
  value: string
  label: string
  color?: string
}) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        px: 1.25,
        py: 1.5,
        borderRadius: 2,
        bgcolor: 'rgba(40, 103, 216, 0.04)',
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 0.5,
        minHeight: 88,
      }}
    >
      <Typography
        fontWeight={700}
        noWrap
        sx={{
          fontSize: { xs: 22, md: 26 },
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          color: color ?? 'text.primary',
        }}
      >
        {value}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ lineHeight: 1.3, fontSize: 12, fontWeight: 500 }}
      >
        {label}
      </Typography>
    </Box>
  )
}

export function StopInfoCard({ stop, fallbackName = 'ВДНХ' }: StopInfoCardProps) {
  const name = stop?.name ?? fallbackName
  const load = stop ? Math.round(stop.load) : 3480
  const level = stop?.level ?? 'high'
  const occupancy = useMemo(() => {
    if (!stop) return 87
    return Math.min(99, Math.max(8, Math.round((stop.load / 320) * 100)))
  }, [stop])

  const weekDelta = 18
  const isTransfer =
    name.includes('ВДНХ') ||
    name.includes('Медведково') ||
    name.includes('Ботанический') ||
    name.includes('Киевская')

  const loadLabel =
    level === 'high'
      ? 'Высокая загрузка'
      : level === 'medium'
        ? 'Средняя загрузка'
        : `${LOAD_LEVEL_LABELS[level]} загрузка`

  const occupancyColor =
    occupancy >= 70 ? '#D64545' : occupancy >= 30 ? '#E5A000' : '#2E9E6B'

  return (
    <Paper
      sx={{
        p: { xs: 1.5, md: 2 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} noWrap>
        Информация об остановке
      </Typography>

      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: 2,
            flexShrink: 0,
            bgcolor: 'rgba(40, 103, 216, 0.08)',
            color: 'primary.main',
            display: 'grid',
            placeItems: 'center',
          }}
          aria-hidden
        >
          <Icon icon={Location01Icon} size={26} />
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            fontWeight={700}
            noWrap
            title={name}
            sx={{ fontSize: { xs: 18, md: 22 }, lineHeight: 1.15, letterSpacing: '-0.02em' }}
          >
            {name}
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap mt={0.75}>
            <Chip
              size="small"
              label={loadLabel}
              sx={{
                height: 24,
                fontWeight: 600,
                fontSize: 11,
                bgcolor: loadColor(level),
                color: '#fff',
              }}
            />
            {isTransfer ? (
              <Chip
                size="small"
                label="Пересадочный узел"
                variant="outlined"
                sx={{ height: 24, fontWeight: 600, fontSize: 11 }}
              />
            ) : null}
          </Stack>
        </Box>
      </Stack>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 1.25,
          py: 1,
          px: 0.25,
        }}
      >
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1}>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            Текущая загрузка
          </Typography>
          <Typography
            fontWeight={800}
            sx={{
              fontSize: { xs: 36, md: 44 },
              lineHeight: 1,
              letterSpacing: '-0.04em',
              color: occupancyColor,
            }}
          >
            {occupancy}%
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={occupancy}
          sx={{
            height: 10,
            borderRadius: 999,
            bgcolor: 'rgba(40, 103, 216, 0.08)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 999,
              bgcolor: occupancyColor,
            },
          }}
        />
        <Typography variant="caption" color="text.secondary">
          Прогноз пассажиропотока на выбранный час · {load.toLocaleString('ru-RU')} пасс.
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexShrink: 0 }}>
        <MetricTile value={load.toLocaleString('ru-RU')} label="прогноз, пасс." />
        <MetricTile value={`${occupancy}%`} label="загрузка салона" color={occupancyColor} />
        <MetricTile value={`+${weekDelta}%`} label="к прошлой неделе" color="#2E9E6B" />
      </Stack>
    </Paper>
  )
}
