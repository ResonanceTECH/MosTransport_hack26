import type { SxProps, Theme } from '@mui/material'

/** Vertical density breakpoints — keep full composition in one viewport */
const h820 = '@media (max-height: 820px)'
const h740 = '@media (max-height: 740px)'
const h660 = '@media (max-height: 660px)'

const desktop = '@media (min-width: 768px)'
const tablet = '@media (max-width: 1199.98px) and (min-width: 768px)'
const wide = '@media (min-width: 1200px)'
const mobile = '@media (max-width: 767.98px)'

export const pageRootSx: SxProps<Theme> = {
  width: '100%',
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  bgcolor: '#FFFFFF',
  background: 'linear-gradient(180deg, #F8FAFE 0%, #FFFFFF 42%, #FFFFFF 100%)',
  fontFamily: '"Inter", "IBM Plex Sans", system-ui, -apple-system, sans-serif',
  color: '#0E203B',
  height: 'auto',
  overflow: 'auto',
  [desktop]: {
    height: '100dvh',
    maxHeight: '100dvh',
    overflow: 'hidden',
  },
}

export const headerLogoSx: SxProps<Theme> = {
  flexShrink: 0,
  boxSizing: 'border-box',
  pt: 'clamp(28px, 4vh, 56px)',
  pl: 'clamp(32px, 5vw, 80px)',
  pr: 'clamp(16px, 3vw, 40px)',
  [h740]: {
    pt: 'clamp(16px, 3vh, 28px)',
    pl: 'clamp(24px, 4vw, 48px)',
  },
  [h660]: {
    pt: 12,
    pl: 20,
  },
  '& img': {
    width: {
      xs: 'clamp(150px, 42vw, 190px)',
      md: 'clamp(150px, 18vw, 190px)',
      lg: 'clamp(180px, 15vw, 250px)',
    },
  },
}

export const mainSx: SxProps<Theme> = {
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  boxSizing: 'border-box',
  display: 'grid',
  alignItems: 'center',
  gap: 'clamp(16px, 2.5vh, 24px)',
  gridTemplateColumns: '1fr',
  gridTemplateRows: 'auto auto',
  gridTemplateAreas: `
    "content"
    "illustration"
  `,
  px: 'clamp(16px, 4vw, 24px)',
  pt: 'clamp(8px, 1.5vh, 16px)',
  pb: 'clamp(16px, 3vh, 28px)',
  [desktop]: {
    gap: 'clamp(24px, 3.5vw, 64px)',
    gridTemplateColumns: 'minmax(0, 0.92fr) minmax(0, 1.08fr)',
    gridTemplateRows: 'minmax(0, 1fr)',
    gridTemplateAreas: '"content illustration"',
    alignItems: 'center',
    px: 'clamp(28px, 5vw, 88px)',
    pt: 'clamp(4px, 1vh, 12px)',
    pb: 'clamp(12px, 2.5vh, 32px)',
  },
  [tablet]: {
    gridTemplateColumns: 'minmax(0, 0.95fr) minmax(0, 1.05fr)',
    gap: 'clamp(16px, 2.5vw, 36px)',
    px: 'clamp(20px, 3.5vw, 40px)',
  },
  [wide]: {
    gridTemplateColumns: 'minmax(400px, 0.88fr) minmax(480px, 1.12fr)',
  },
  [h820]: {
    gap: 'clamp(16px, 2vw, 36px)',
    pb: 10,
  },
  [h740]: {
    gap: 14,
    pt: 2,
    pb: 8,
  },
  [h660]: {
    gap: 10,
    pb: 6,
  },
}

export const contentSx: SxProps<Theme> = {
  gridArea: 'content',
  minWidth: 0,
  maxWidth: 580,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'flex-start',
  [desktop]: {
    justifySelf: 'start',
    width: '100%',
  },
}

export const labelSx: SxProps<Theme> = {
  m: 0,
  mb: 'clamp(6px, 1.2vh, 14px)',
  fontSize: 'clamp(11px, 0.85vw + 0.2vh, 13px)',
  fontWeight: 600,
  letterSpacing: '0.28em',
  color: '#9BB0C8',
  textTransform: 'uppercase',
  [h740]: {
    mb: 4,
    fontSize: 10,
  },
}

export const numberWrapSx: SxProps<Theme> = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  alignSelf: 'flex-start',
  lineHeight: 0,
}

export const numberRingSx: SxProps<Theme> = {
  position: 'absolute',
  left: '50%',
  top: '52%',
  width: '120%',
  height: '82%',
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
  fontSize: 'clamp(72px, 11vw + 4vh, 200px)',
  fontWeight: 800,
  lineHeight: 0.84,
  letterSpacing: '-0.045em',
  color: '#102440',
  [desktop]: {
    fontSize: 'clamp(96px, 8.5vw + 3vh, 210px)',
  },
  [h820]: {
    fontSize: 'clamp(88px, 7.5vw + 2.5vh, 160px)',
  },
  [h740]: {
    fontSize: 'clamp(76px, 6.5vw + 2vh, 128px)',
  },
  [h660]: {
    fontSize: 'clamp(64px, 6vw + 1.5vh, 104px)',
  },
}

export const titleSx: SxProps<Theme> = {
  m: 0,
  mt: 'clamp(10px, 1.8vh, 26px)',
  maxWidth: 540,
  fontSize: 'clamp(24px, 2.2vw + 1vh, 44px)',
  fontWeight: 700,
  lineHeight: 1.12,
  color: '#0E203B',
  letterSpacing: '-0.02em',
  [h820]: {
    mt: 10,
    fontSize: 'clamp(22px, 2vw + 0.8vh, 34px)',
  },
  [h740]: {
    mt: 8,
    fontSize: 'clamp(20px, 1.8vw + 0.6vh, 28px)',
  },
  [h660]: {
    mt: 6,
    fontSize: 20,
  },
}

export const descriptionSx: SxProps<Theme> = {
  m: 0,
  mt: 'clamp(8px, 1.4vh, 18px)',
  maxWidth: 500,
  fontSize: 'clamp(13px, 0.9vw + 0.4vh, 18px)',
  lineHeight: 1.48,
  color: '#6B819C',
  fontWeight: 400,
  [h820]: {
    mt: 8,
    fontSize: 'clamp(13px, 0.85vw + 0.3vh, 15px)',
  },
  [h740]: {
    mt: 6,
    fontSize: 13,
    '& br': { display: 'none' },
  },
  [h660]: {
    mt: 4,
    fontSize: 12,
  },
}

export const buttonsSx: SxProps<Theme> = {
  mt: 'clamp(14px, 2.2vh, 30px)',
  gap: 'clamp(10px, 1.2vw, 14px)',
  alignItems: 'center',
  flexWrap: 'wrap',
  [h820]: { mt: 12 },
  [h740]: { mt: 10, gap: 8 },
  [h660]: { mt: 8 },
  [mobile]: {
    width: '100%',
    '& > *': {
      flex: '1 1 auto',
      minWidth: 'min(100%, 160px)',
    },
  },
}

export const primaryButtonSx: SxProps<Theme> = {
  height: 'clamp(42px, 5.5vh, 52px)',
  px: 'clamp(16px, 2vw, 26px)',
  fontWeight: 600,
  fontSize: 'clamp(13px, 0.95vw, 15px)',
  boxShadow: 'none',
  textTransform: 'none',
  whiteSpace: 'nowrap',
  '&&': {
    borderRadius: '12px',
  },
  '&.MuiButton-containedPrimary': {
    backgroundColor: '#2867D8',
    color: '#FFFFFF',
    '&:hover': {
      backgroundColor: '#1F56B8',
      boxShadow: 'none',
    },
  },
  [h660]: {
    height: 40,
    fontSize: 12,
  },
}

export const backButtonSx: SxProps<Theme> = {
  height: 'clamp(42px, 5.5vh, 52px)',
  px: 'clamp(14px, 1.8vw, 22px)',
  fontWeight: 600,
  fontSize: 'clamp(13px, 0.95vw, 15px)',
  textTransform: 'none',
  whiteSpace: 'nowrap',
  borderWidth: 1.5,
  borderColor: '#C5D3E8',
  color: '#1A2B45',
  backgroundColor: 'transparent',
  '&&': {
    borderRadius: '12px',
  },
  '&:hover': {
    borderWidth: 1.5,
    borderColor: '#2867D8',
    backgroundColor: 'rgba(40, 103, 216, 0.04)',
    color: '#2867D8',
  },
  [h660]: {
    height: 40,
    fontSize: 12,
  },
}

export const illustrationSx: SxProps<Theme> = {
  gridArea: 'illustration',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: 'auto',
  minWidth: 0,
  minHeight: 0,
  overflow: 'hidden',
  [mobile]: {
    maxHeight: 'min(42dvh, 360px)',
  },
  [desktop]: {
    height: '100%',
    maxHeight: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
}

export const illustrationImgSx: SxProps<Theme> = {
  display: 'block',
  width: 'auto',
  height: 'auto',
  maxWidth: 'min(100%, 420px)',
  maxHeight: 'min(38dvh, 340px)',
  objectFit: 'contain',
  objectPosition: 'center',
  pointerEvents: 'none',
  userSelect: 'none',
  [desktop]: {
    /* Square asset: size by available cell height, clamp by width */
    height: 'min(100%, 78dvh)',
    width: 'auto',
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    objectPosition: 'center right',
  },
}
