import { Box } from '@mui/material'
import notFoundLogo from '@/assets/404_logo.png'
import { illustrationImgSx, illustrationSx } from '@/pages/NotFoundPage/NotFoundPage.styles'

export function NotFoundIllustration() {
  return (
    <Box sx={illustrationSx} aria-hidden="true">
      <Box
        component="img"
        src={notFoundLogo}
        alt=""
        draggable={false}
        sx={illustrationImgSx}
      />
    </Box>
  )
}
