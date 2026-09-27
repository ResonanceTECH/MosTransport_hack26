import Box from '@mui/material/Box'
import { AppLogo } from '@/components/branding/AppLogo'
import { headerLogoSx } from './NotFoundPage.styles'

export function NotFoundHeader() {
  return (
    <Box component="header" sx={headerLogoSx}>
      <AppLogo />
    </Box>
  )
}
