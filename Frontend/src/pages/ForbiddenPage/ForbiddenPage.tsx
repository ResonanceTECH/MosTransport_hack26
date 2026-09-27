import { useLayoutEffect, useState } from 'react'
import { Box, useMediaQuery } from '@mui/material'
import { AppLogo } from '@/components/branding/AppLogo'
import { ForbiddenContent } from '@/components/errors/ForbiddenContent'
import { ForbiddenIllustration } from '@/components/errors/ForbiddenIllustration'
import {
  DESIGN_H,
  DESIGN_W,
  desktopCanvasSx,
  desktopShellSx,
  headerLogoSx,
  mobileButtonsSx,
  mobileDescriptionSx,
  mobileIllustrationImgSx,
  mobileIllustrationWrapSx,
  mobileLogoSx,
  mobileRootSx,
  mobileTitleSx,
  pageRootSx,
} from './ForbiddenPage.styles'

function useFitScale(designW: number, designH: number, enabled: boolean) {
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    if (!enabled) {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      return
    }

    const update = () => {
      const w = window.visualViewport?.width ?? window.innerWidth
      const h = window.visualViewport?.height ?? window.innerHeight
      const next = Math.min(w / designW, h / designH)
      setScale(Number.isFinite(next) && next > 0 ? next : 1)
    }

    update()
    window.addEventListener('resize', update)
    const vv = window.visualViewport
    vv?.addEventListener('resize', update)

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('resize', update)
      vv?.removeEventListener('resize', update)
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [designW, designH, enabled])

  return scale
}

export function ForbiddenPage() {
  const isDesktop = useMediaQuery('(min-width: 768px)', { noSsr: true })
  const scale = useFitScale(DESIGN_W, DESIGN_H, isDesktop)

  if (!isDesktop) {
    return (
      <Box component="main" sx={mobileRootSx}>
        <Box sx={mobileLogoSx}>
          <AppLogo />
        </Box>
        <ForbiddenContent
          titleSxOverride={mobileTitleSx}
          descriptionSxOverride={mobileDescriptionSx}
          buttonsSxOverride={mobileButtonsSx}
          illustration={
            <ForbiddenIllustration wrapSx={mobileIllustrationWrapSx} imgSx={mobileIllustrationImgSx} />
          }
        />
      </Box>
    )
  }

  const frameW = DESIGN_W * scale
  const frameH = DESIGN_H * scale

  return (
    <Box component="main" sx={{ ...pageRootSx, height: '100dvh', overflow: 'hidden' }}>
      <Box sx={desktopShellSx}>
        <Box
          sx={{
            width: frameW,
            height: frameH,
            position: 'relative',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              ...desktopCanvasSx,
              position: 'absolute',
              top: 0,
              left: 0,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            <Box sx={headerLogoSx}>
              <AppLogo />
            </Box>

            <ForbiddenContent illustration={<ForbiddenIllustration />} />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
