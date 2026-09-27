import type { SxProps, Theme } from '@mui/material'

const shortHeight = '@media (max-height: 760px)'
const shortHeightMd = '@media (max-height: 800px)'

export const pageRootSx: SxProps<Theme> = {
  width: '100%',
  height: { xs: 'auto', md: '100dvh' },
  minHeight: '100dvh',
  overflow: { xs: 'auto', md: 'hidden' },
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    md: 'minmax(0, 1fr) minmax(380px, 1fr)',
    lg: 'minmax(0, 3fr) minmax(430px, 2fr)',
  },
  bgcolor: '#F5F9FE',
  fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
}

export const heroSectionSx: SxProps<Theme> = {
  position: 'relative',
  display: { xs: 'none', md: 'block' },
  height: '100dvh',
  minWidth: 0,
  overflow: 'hidden',
}

export const tramImageSx: SxProps<Theme> = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  objectPosition: {
    md: 'center center',
    lg: 'left center',
  },
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 0,
}

export const heroOverlaySx: SxProps<Theme> = {
  position: 'absolute',
  inset: 0,
  zIndex: 1,
  pointerEvents: 'none',
  // Soft left-side wash only for text contrast — no vertical white fade over the image
  background:
    'linear-gradient(90deg, rgba(245,249,255,0.72) 0%, rgba(245,249,255,0.35) 28%, rgba(245,249,255,0) 55%)',
}

export const heroInnerSx: SxProps<Theme> = {
  position: 'relative',
  zIndex: 2,
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  boxSizing: 'border-box',
  pt: 'clamp(28px, 4vh, 56px)',
  pl: 'clamp(32px, 5vw, 80px)',
  pr: { md: '24px', lg: '40px' },
  pb: 'clamp(24px, 4vh, 48px)',
}

export const heroLogoSx: SxProps<Theme> = {
  flexShrink: 0,
  mb: 0,
  '& img': {
    width: {
      md: 'clamp(150px, 18vw, 190px)',
      lg: 'clamp(180px, 15vw, 250px)',
    },
  },
}

export const heroContentSx: SxProps<Theme> = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  minHeight: 0,
  maxWidth: 650,
  [shortHeight]: {
    justifyContent: 'flex-start',
    pt: 'clamp(16px, 4vh, 40px)',
  },
}

export const heroTitleSx: SxProps<Theme> = {
  m: 0,
  fontSize: {
    md: 'clamp(34px, 4vw, 48px)',
    lg: 'clamp(42px, 4vw, 68px)',
  },
  fontWeight: 700,
  lineHeight: 1.05,
  letterSpacing: '-0.025em',
  color: '#07162F',
  maxWidth: 650,
  '& .hero-line': {
    display: 'block',
  },
  [shortHeight]: {
    fontSize: 'clamp(32px, 3.8vw, 44px)',
  },
}

export const heroDescriptionSx: SxProps<Theme> = {
  mt: 'clamp(18px, 3vh, 32px)',
  mb: 0,
  maxWidth: 620,
  fontSize: {
    md: 'clamp(15px, 1.5vw, 19px)',
    lg: 'clamp(17px, 1.4vw, 22px)',
  },
  fontWeight: 400,
  lineHeight: 1.4,
  color: '#4A5568',
  whiteSpace: 'pre-line',
  [shortHeight]: {
    mt: '12px',
    fontSize: 'clamp(14px, 1.4vw, 17px)',
  },
}

export const loginSectionSx: SxProps<Theme> = {
  position: 'relative',
  zIndex: 2,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: { xs: 'flex-start', md: 'center' },
  height: { xs: 'auto', md: '100dvh' },
  minHeight: { xs: '100dvh', md: '100dvh' },
  boxSizing: 'border-box',
  overflow: { xs: 'visible', md: 'hidden' },
  px: {
    xs: '16px',
    md: 'clamp(20px, 2vw, 36px)',
    lg: undefined,
  },
  py: {
    xs: '16px',
    md: 'clamp(20px, 3vh, 40px)',
  },
  pr: {
    md: 'clamp(24px, 3vw, 56px)',
  },
  pl: {
    md: 'clamp(20px, 2vw, 36px)',
  },
  background: {
    xs: [
      'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(120, 170, 240, 0.16) 0%, transparent 70%)',
      'linear-gradient(180deg, #F7FAFE 0%, #F3F7FC 100%)',
    ].join(', '),
    md: '#F5F9FE',
  },
}

export const loginCardSx: SxProps<Theme> = {
  width: '100%',
  maxWidth: {
    xs: 480,
    md: 460,
    lg: 520,
  },
  height: 'auto',
  maxHeight: {
    md: 'calc(100dvh - clamp(40px, 6vh, 80px))',
  },
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  overflow: 'hidden',
  bgcolor: 'rgba(255, 255, 255, 0.96)',
  borderRadius: '24px',
  boxShadow: '0 12px 40px rgba(31, 70, 120, 0.08)',
  border: '1px solid rgba(210, 220, 235, 0.45)',
  p: {
    xs: '24px',
    md: 'clamp(24px, 3vh, 40px) clamp(26px, 2.5vw, 42px)',
  },
  backdropFilter: 'blur(8px)',
  mx: 'auto',
  [shortHeight]: {
    p: '20px 24px',
    borderRadius: '20px',
  },
}

export const loginTitleSx: SxProps<Theme> = {
  m: 0,
  fontSize: 'clamp(34px, 3vw, 52px)',
  fontWeight: 700,
  lineHeight: 1.12,
  color: '#07162F',
  letterSpacing: '-0.02em',
  [shortHeightMd]: {
    fontSize: 'clamp(30px, 2.8vw, 40px)',
  },
}

export const formStackSx: SxProps<Theme> = {
  mt: 'clamp(20px, 3vh, 32px)',
  [shortHeight]: {
    mt: '16px',
  },
}

export const fieldSx: SxProps<Theme> = {
  width: '100%',
  minWidth: 0,
  '& .MuiOutlinedInput-root': {
    height: { xs: 56, md: 60, lg: 62 },
    [shortHeightMd]: {
      height: 54,
    },
    [shortHeight]: {
      height: 52,
    },
  },
  '& .MuiOutlinedInput-input': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    py: 0,
  },
}

export const passwordFieldSx: SxProps<Theme> = {
  width: '100%',
  minWidth: 0,
  mt: 'clamp(12px, 2vh, 18px)',
  '& .MuiOutlinedInput-root': {
    height: { xs: 56, md: 60, lg: 62 },
    [shortHeightMd]: {
      height: 54,
    },
    [shortHeight]: {
      height: 52,
    },
  },
  '& .MuiOutlinedInput-input': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    py: 0,
  },
  [shortHeight]: {
    mt: '10px',
  },
}

export const optionsRowSx: SxProps<Theme> = {
  mt: 'clamp(8px, 1.5vh, 12px)',
  minHeight: { xs: 36, md: 40 },
  [shortHeight]: {
    mt: '4px',
    minHeight: 32,
  },
}

export const primaryButtonSx: SxProps<Theme> = {
  mt: 'clamp(16px, 2vh, 24px)',
  height: 'clamp(52px, 6vh, 62px)',
  maxHeight: 64,
  fontSize: 16,
  [shortHeight]: {
    mt: '12px',
    height: 52,
    fontSize: 15,
  },
}

export const dividerSx: SxProps<Theme> = {
  mt: 'clamp(18px, 2.5vh, 28px)',
  mb: 'clamp(18px, 2vh, 24px)',
  color: '#8B96AA',
  fontSize: 14,
  '&::before, &::after': { borderColor: '#D8DFE9' },
  [shortHeight]: {
    mt: '14px',
    mb: '14px',
  },
}

export const ssoButtonSx: SxProps<Theme> = {
  height: 'clamp(52px, 6vh, 62px)',
  maxHeight: 64,
  fontSize: 15,
  fontWeight: 600,
  [shortHeight]: {
    height: 52,
  },
}
