import type { SxProps, Theme } from '@mui/material'

/** Fixed design canvas — scaled to viewport (zoom-safe), same approach as 404 */
export const DESIGN_W = 1440
export const DESIGN_H = 900

export const pageRootSx: SxProps<Theme> = {
  width: '100%',
  minHeight: '100dvh',
  bgcolor: '#FFFFFF',
  background: 'linear-gradient(180deg, #F8FAFE 0%, #FFFFFF 45%, #FFFFFF 100%)',
  fontFamily: '"Inter", "IBM Plex Sans", system-ui, -apple-system, sans-serif',
  color: '#0E203B',
  boxSizing: 'border-box',
}

export const desktopShellSx: SxProps<Theme> = {
  width: '100%',
  height: '100dvh',
  overflow: 'hidden',
  display: 'grid',
  placeItems: 'center',
  boxSizing: 'border-box',
}

export const desktopCanvasSx: SxProps<Theme> = {
  width: DESIGN_W,
  height: DESIGN_H,
  position: 'relative',
  flexShrink: 0,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  px: '56px',
  py: '36px',
}

export const headerLogoSx: SxProps<Theme> = {
  position: 'absolute',
  top: 36,
  left: 56,
  flexShrink: 0,
  '& img': {
    width: 210,
    height: 'auto',
    display: 'block',
  },
}

export const stackSx: SxProps<Theme> = {
  width: '100%',
  maxWidth: 760,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
}

export const illustrationSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  mb: '12px',
  flexShrink: 0,
}

export const illustrationImgSx: SxProps<Theme> = {
  display: 'block',
  width: 'min(100%, 680px)',
  height: 'auto',
  maxHeight: 360,
  objectFit: 'contain',
  objectPosition: 'center',
  pointerEvents: 'none',
  userSelect: 'none',
}

export const titleSx: SxProps<Theme> = {
  m: 0,
  mt: '10px',
  fontSize: 48,
  fontWeight: 700,
  lineHeight: 1.12,
  color: '#0E203B',
  letterSpacing: '-0.02em',
}

export const descriptionSx: SxProps<Theme> = {
  m: 0,
  mt: '16px',
  maxWidth: 600,
  fontSize: 19,
  lineHeight: 1.5,
  color: '#6B819C',
  fontWeight: 400,
}

export const buttonsSx: SxProps<Theme> = {
  mt: '32px',
  gap: '12px',
  alignItems: 'center',
  justifyContent: 'center',
  flexWrap: 'nowrap',
}

export const primaryButtonSx: SxProps<Theme> = {
  height: 56,
  px: 4,
  fontWeight: 600,
  fontSize: 16,
  boxShadow: 'none',
  textTransform: 'none',
  whiteSpace: 'nowrap',
  '&&': { borderRadius: '12px' },
  '&.MuiButton-containedPrimary': {
    backgroundColor: '#2867D8',
    color: '#FFFFFF',
    '&:hover': {
      backgroundColor: '#1F56B8',
      boxShadow: 'none',
    },
  },
}

export const errorCodeSx: SxProps<Theme> = {
  m: 0,
  mt: '28px',
  fontSize: 14,
  fontWeight: 500,
  color: '#9BB0C8',
}

/* ——— Mobile (<768) ——— */

export const mobileRootSx: SxProps<Theme> = {
  ...pageRootSx,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  px: '20px',
  pt: '24px',
  pb: '32px',
  gap: '16px',
  overflow: 'auto',
  textAlign: 'center',
}

export const mobileLogoSx: SxProps<Theme> = {
  alignSelf: 'flex-start',
  flexShrink: 0,
  '& img': {
    width: 'min(180px, 55vw)',
    height: 'auto',
  },
}

export const mobileIllustrationWrapSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  mb: 0,
  flexShrink: 0,
}

export const mobileIllustrationImgSx: SxProps<Theme> = {
  ...illustrationImgSx,
  width: 'min(100%, 480px)',
  maxHeight: 260,
}

export const mobileTitleSx: SxProps<Theme> = {
  ...titleSx,
  fontSize: 'clamp(30px, 8vw, 40px)',
  mt: '4px',
}

export const mobileDescriptionSx: SxProps<Theme> = {
  ...descriptionSx,
  fontSize: 16,
  mt: '12px',
}

export const mobileButtonsSx: SxProps<Theme> = {
  ...buttonsSx,
  mt: '20px',
  flexWrap: 'wrap',
  width: '100%',
  '& > *': {
    flex: '1 1 auto',
    minWidth: 'min(100%, 160px)',
  },
}
