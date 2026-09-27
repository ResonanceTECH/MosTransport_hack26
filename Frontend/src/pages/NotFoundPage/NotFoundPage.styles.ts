import type { SxProps, Theme } from '@mui/material'

/** Fixed design canvas — scaled to viewport (zoom-safe) */
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
  display: 'grid',
  gridTemplateColumns: '460px minmax(0, 1fr)',
  gridTemplateRows: 'auto 1fr',
  gridTemplateAreas: `
    "logo logo"
    "content illustration"
  `,
  columnGap: 16,
  pl: '56px',
  pr: '28px',
  pt: '36px',
  pb: '24px',
}

export const headerLogoSx: SxProps<Theme> = {
  gridArea: 'logo',
  flexShrink: 0,
  mb: 0,
  '& img': {
    width: 210,
    height: 'auto',
    display: 'block',
  },
}

export const contentSx: SxProps<Theme> = {
  gridArea: 'content',
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'flex-start',
  alignSelf: 'stretch',
  pr: 2,
}

export const labelSx: SxProps<Theme> = {
  m: 0,
  mb: '14px',
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: '0.28em',
  color: '#9BB0C8',
  textTransform: 'uppercase',
}

export const numberWrapSx: SxProps<Theme> = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  alignSelf: 'flex-start',
  /* IMPORTANT: do not use line-height: 0 — glyphs overflow and cover the logo */
  lineHeight: 1,
}

export const numberRingSx: SxProps<Theme> = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  width: '118%',
  height: '78%',
  transform: 'translate(-50%, -50%) rotate(-16deg)',
  borderRadius: '50%',
  border: '1.5px solid rgba(185, 216, 255, 0.85)',
  opacity: 0.75,
  pointerEvents: 'none',
  zIndex: 0,
}

export const numberSx: SxProps<Theme> = {
  position: 'relative',
  zIndex: 1,
  m: 0,
  fontSize: 168,
  fontWeight: 800,
  lineHeight: 0.88,
  letterSpacing: '-0.045em',
  color: '#102440',
}

export const titleSx: SxProps<Theme> = {
  m: 0,
  mt: '22px',
  maxWidth: 520,
  fontSize: 40,
  fontWeight: 700,
  lineHeight: 1.12,
  color: '#0E203B',
  letterSpacing: '-0.02em',
}

export const descriptionSx: SxProps<Theme> = {
  m: 0,
  mt: '16px',
  maxWidth: 460,
  fontSize: 17,
  lineHeight: 1.45,
  color: '#6B819C',
  fontWeight: 400,
}

export const buttonsSx: SxProps<Theme> = {
  mt: '28px',
  gap: '12px',
  alignItems: 'center',
  flexWrap: 'nowrap',
}

export const primaryButtonSx: SxProps<Theme> = {
  height: 52,
  px: 3.25,
  fontWeight: 600,
  fontSize: 15,
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

export const backButtonSx: SxProps<Theme> = {
  height: 52,
  px: 2.75,
  fontWeight: 600,
  fontSize: 15,
  textTransform: 'none',
  whiteSpace: 'nowrap',
  borderWidth: 1.5,
  borderColor: '#C5D3E8',
  color: '#1A2B45',
  backgroundColor: 'transparent',
  '&&': { borderRadius: '12px' },
  '&:hover': {
    borderWidth: 1.5,
    borderColor: '#2867D8',
    backgroundColor: 'rgba(40, 103, 216, 0.04)',
    color: '#2867D8',
  },
}

export const illustrationSx: SxProps<Theme> = {
  gridArea: 'illustration',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  minWidth: 0,
  minHeight: 0,
  height: '100%',
  width: '100%',
  overflow: 'hidden',
}

export const illustrationImgSx: SxProps<Theme> = {
  display: 'block',
  /* Fill the right column — square asset grows to cell height */
  height: '100%',
  width: 'auto',
  maxWidth: '100%',
  objectFit: 'contain',
  objectPosition: 'center right',
  pointerEvents: 'none',
  userSelect: 'none',
}

/* ——— Mobile (<768): normal flow, scroll allowed ——— */

export const mobileRootSx: SxProps<Theme> = {
  ...pageRootSx,
  display: 'flex',
  flexDirection: 'column',
  px: '20px',
  pt: '24px',
  pb: '32px',
  gap: '20px',
  overflow: 'auto',
}

export const mobileLogoSx: SxProps<Theme> = {
  flexShrink: 0,
  '& img': {
    width: 'min(180px, 55vw)',
    height: 'auto',
  },
}

export const mobileContentSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
}

export const mobileNumberSx: SxProps<Theme> = {
  ...numberSx,
  fontSize: 'clamp(80px, 22vw, 120px)',
}

export const mobileTitleSx: SxProps<Theme> = {
  ...titleSx,
  fontSize: 'clamp(26px, 7vw, 34px)',
  mt: '16px',
}

export const mobileDescriptionSx: SxProps<Theme> = {
  ...descriptionSx,
  fontSize: 15,
  mt: '12px',
}

export const mobileButtonsSx: SxProps<Theme> = {
  ...buttonsSx,
  mt: '20px',
  flexWrap: 'wrap',
  width: '100%',
  '& > *': {
    flex: '1 1 auto',
    minWidth: 'min(100%, 140px)',
  },
}

export const mobileIllustrationSx: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'center',
  width: '100%',
  mt: 1,
}

export const mobileIllustrationImgSx: SxProps<Theme> = {
  display: 'block',
  width: 'min(100%, 520px)',
  height: 'auto',
  maxHeight: 440,
  objectFit: 'contain',
  pointerEvents: 'none',
  userSelect: 'none',
}
