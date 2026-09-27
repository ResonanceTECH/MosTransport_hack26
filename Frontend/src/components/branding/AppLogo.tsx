import { Box } from '@mui/material'
import Logo from '@/assets/tim_logo.png'

type AppLogoProps = {
  compact?: boolean
  /** Header bar logo — smaller fixed width */
  variant?: 'default' | 'header'
}

export function AppLogo({ compact = false, variant = 'default' }: AppLogoProps) {
  const width =
    variant === 'header'
      ? 108
      : compact
        ? { xs: 'min(180px, 60vw)', md: 'clamp(150px, 18vw, 190px)' }
        : 'clamp(180px, 15vw, 250px)'

  return (
    <Box
      component="img"
      src={Logo}
      alt="Транспортные инновации Москвы"
      draggable={false}
      sx={{
        display: 'block',
        width,
        height: variant === 'header' ? 36 : 'auto',
        maxWidth: '100%',
        objectFit: 'contain',
        objectPosition: 'left center',
        filter: 'brightness(0)',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    />
  )
}
