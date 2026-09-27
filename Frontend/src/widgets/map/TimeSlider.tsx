import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { PauseIcon, PlayIcon } from '@hugeicons/core-free-icons'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDashboardFilters } from '@/features/filters/useDashboardFilters'
import { Icon } from '@/shared/ui/Icon'

function formatHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`
}

const MARKS = [6, 8, 10, 12, 14, 16, 18, 20, 22].map((h) => ({
  value: h,
  label: formatHour(h),
}))

export function TimeSlider() {
  const { filters, patch } = useDashboardFilters()
  const [playing, setPlaying] = useState(false)
  const hourRef = useRef(filters.hour)

  useEffect(() => {
    hourRef.current = filters.hour
  }, [filters.hour])

  const setHour = useCallback(
    (h: number) => {
      const clamped = Math.min(22, Math.max(6, h))
      patch({ hour: clamped })
    },
    [patch],
  )

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      const next = hourRef.current + 1
      if (next > 22) {
        setPlaying(false)
        setHour(6)
        return
      }
      setHour(next)
    }, 900)
    return () => window.clearInterval(id)
  }, [playing, setHour])

  return (
    <Box
      sx={{
        px: 1.5,
        py: 1,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <IconButton
          aria-label={playing ? 'Пауза' : 'Воспроизведение'}
          onClick={() => setPlaying((p) => !p)}
          sx={{
            width: 44,
            height: 44,
            bgcolor: 'primary.main',
            color: '#fff',
            '&:hover': { bgcolor: 'primary.dark' },
            flexShrink: 0,
          }}
        >
          <Icon icon={playing ? PauseIcon : PlayIcon} size={20} color="#fff" />
        </IconButton>

        <Typography
          variant="body2"
          fontWeight={600}
          sx={{ minWidth: { xs: 0, sm: 180 }, flexShrink: 0, display: { xs: 'none', sm: 'block' } }}
        >
          Показать загрузку на {formatHour(filters.hour)}
        </Typography>

        <Slider
          size="small"
          min={6}
          max={22}
          step={1}
          value={Math.min(22, Math.max(6, filters.hour))}
          onChange={(_, v) => setHour(v as number)}
          marks={MARKS}
          valueLabelDisplay="auto"
          valueLabelFormat={formatHour}
          sx={{
            flex: 1,
            mx: 1,
            '& .MuiSlider-markLabel': {
              fontSize: 11,
              color: 'text.secondary',
              top: 28,
            },
            '& .MuiSlider-thumb': {
              width: 16,
              height: 16,
            },
          }}
        />
      </Stack>
    </Box>
  )
}
