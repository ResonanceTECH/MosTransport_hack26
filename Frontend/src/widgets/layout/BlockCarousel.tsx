import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Icon } from '@/shared/ui/Icon'

export interface BlockCarouselPage {
  id: string
  label: string
  content: ReactNode
}

export interface BlockCarouselProps {
  pages: BlockCarouselPage[]
  /** Controlled page index */
  index?: number
  onIndexChange?: (index: number) => void
}

export function BlockCarousel({ pages, index: controlledIndex, onIndexChange }: BlockCarouselProps) {
  const [internalIndex, setInternalIndex] = useState(0)
  const index = controlledIndex ?? internalIndex
  const scrollerRef = useRef<HTMLDivElement>(null)
  const ignoreScrollRef = useRef(false)

  const setIndex = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(pages.length - 1, next))
      if (controlledIndex === undefined) setInternalIndex(clamped)
      onIndexChange?.(clamped)
    },
    [controlledIndex, onIndexChange, pages.length],
  )

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    ignoreScrollRef.current = true
    const pageWidth = el.clientWidth
    el.scrollTo({ left: pageWidth * index, behavior: 'smooth' })
    const t = window.setTimeout(() => {
      ignoreScrollRef.current = false
    }, 350)
    return () => window.clearTimeout(t)
  }, [index])

  const onScroll = () => {
    if (ignoreScrollRef.current) return
    const el = scrollerRef.current
    if (!el || el.clientWidth === 0) return
    const next = Math.round(el.scrollLeft / el.clientWidth)
    if (next !== index) setIndex(next)
  }

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        sx={{ flexShrink: 0, px: 0.25 }}
      >
        <IconButton
          size="small"
          aria-label="Предыдущий блок"
          disabled={index <= 0}
          onClick={() => setIndex(index - 1)}
        >
          <Icon icon={ArrowLeft01Icon} size={18} />
        </IconButton>

        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            flex: 1,
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 0.5,
          }}
        >
          {pages.map((page, i) => {
            const active = i === index
            return (
              <Box
                key={page.id}
                component="button"
                type="button"
                onClick={() => setIndex(i)}
                aria-current={active ? 'page' : undefined}
                sx={{
                  border: 'none',
                  cursor: 'pointer',
                  px: 1.5,
                  py: 0.6,
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  color: active ? 'primary.main' : 'text.secondary',
                  bgcolor: active ? 'rgba(40, 103, 216, 0.1)' : 'transparent',
                  transition: 'background-color 0.15s, color 0.15s',
                  '&:hover': {
                    bgcolor: active ? 'rgba(40, 103, 216, 0.14)' : 'action.hover',
                    color: 'primary.main',
                  },
                }}
              >
                {page.label}
              </Box>
            )
          })}
        </Stack>

        <IconButton
          size="small"
          aria-label="Следующий блок"
          disabled={index >= pages.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          <Icon icon={ArrowRight01Icon} size={18} />
        </IconButton>
      </Stack>

      <Box
        ref={scrollerRef}
        onScroll={onScroll}
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {pages.map((page) => (
          <Box
            key={page.id}
            sx={{
              flex: '0 0 100%',
              width: '100%',
              minWidth: '100%',
              maxWidth: '100%',
              height: '100%',
              minHeight: 0,
              scrollSnapAlign: 'start',
              scrollSnapStop: 'always',
              display: 'flex',
              flexDirection: 'column',
              px: 0.25,
              boxSizing: 'border-box',
            }}
          >
            {page.content}
          </Box>
        ))}
      </Box>

      <Stack direction="row" justifyContent="center" spacing={0.75} sx={{ flexShrink: 0 }}>
        {pages.map((page, i) => (
          <Box
            key={page.id}
            component="button"
            type="button"
            aria-label={page.label}
            onClick={() => setIndex(i)}
            sx={{
              width: i === index ? 18 : 8,
              height: 8,
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              p: 0,
              bgcolor: i === index ? 'primary.main' : 'divider',
              transition: 'width 0.15s, background-color 0.15s',
            }}
          />
        ))}
      </Stack>

      <Typography
        variant="caption"
        color="text.secondary"
        textAlign="center"
        sx={{ flexShrink: 0, fontSize: 11 }}
      >
        {index + 1} / {pages.length} · свайп или стрелки для переключения блоков
      </Typography>
    </Box>
  )
}
