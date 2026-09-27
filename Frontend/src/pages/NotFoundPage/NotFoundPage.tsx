import { useLayoutEffect, useState } from 'react'
import { Box, useMediaQuery } from '@mui/material'
import { AppLogo } from '@/components/branding/AppLogo'
import { NotFoundContent } from '@/components/errors/NotFoundContent'
import { NotFoundIllustration } from '@/components/errors/NotFoundIllustration'
import {
  DESIGN_H,
  DESIGN_W,
  contentSx,
  desktopCanvasSx,
  desktopShellSx,
  headerLogoSx,
  mobileButtonsSx,
  mobileContentSx,
  mobileDescriptionSx,
  mobileIllustrationImgSx,
  mobileIllustrationSx,
  mobileLogoSx,
  mobileNumberSx,
  mobileRootSx,
  mobileTitleSx,
  pageRootSx,
} from './NotFoundPage.styles'

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

export function NotFoundPage() {
  const isDesktop = useMediaQuery('(min-width: 768px)', { noSsr: true })
  const scale = useFitScale(DESIGN_W, DESIGN_H, isDesktop)

  if (!isDesktop) {
    return (
      <Box component="main" sx={mobileRootSx}>
        <Box sx={mobileLogoSx}>
          <AppLogo />
        </Box>
        <NotFoundContent
          contentSxOverride={mobileContentSx}
          numberSxOverride={mobileNumberSx}
          titleSxOverride={mobileTitleSx}
          descriptionSxOverride={mobileDescriptionSx}
          buttonsSxOverride={mobileButtonsSx}
        />
        <NotFoundIllustration wrapSx={mobileIllustrationSx} imgSx={mobileIllustrationImgSx} />
      </Box>
    )
  }

  const frameW = DESIGN_W * scale
  const frameH = DESIGN_H * scale

  return (
    <Box component="main" sx={{ ...pageRootSx, height: '100dvh', overflow: 'hidden' }}>
      <Box sx={desktopShellSx}>
        {/*
          Outer frame = visual size after scale.
          Inner canvas keeps design coords; transformOrigin top-left.
          Without the frame, scale>1 (zoom-out) gets clipped by overflow:hidden.
        */}
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

            <NotFoundContent contentSxOverride={contentSx} />
            <NotFoundIllustration />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
