import { Box } from '@mui/material'
import Logo from '@/assets/tim_logo.png'

type AppLogoProps = {
  compact?: boolean
}

export function AppLogo({ compact = false }: AppLogoProps) {
  return (
    <Box
      component="img"
      src={Logo}
      alt="Транспортные инновации Москвы"
      draggable={false}
      sx={{
        display: 'block',
        width: compact
          ? { xs: 'min(180px, 60vw)', md: 'clamp(150px, 18vw, 190px)' }
          : 'clamp(180px, 15vw, 250px)',
        height: 'auto',
        maxWidth: '100%',
        objectFit: 'contain',
        objectPosition: 'left center',
        // Asset is white-on-transparent; darken for light overlay
        filter: 'brightness(0)',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    />
  )
}
