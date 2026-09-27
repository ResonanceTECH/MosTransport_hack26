import { Box } from '@mui/material'
import type { SxProps, Theme } from '@mui/material'
import notFoundLogo from '@/assets/404_logo.png'
import { illustrationImgSx, illustrationSx } from '@/pages/NotFoundPage/NotFoundPage.styles'

type NotFoundIllustrationProps = {
  wrapSx?: SxProps<Theme>
  imgSx?: SxProps<Theme>
}

export function NotFoundIllustration({ wrapSx, imgSx }: NotFoundIllustrationProps) {
  return (
    <Box sx={wrapSx ?? illustrationSx} aria-hidden="true">
      <Box
        component="img"
        src={notFoundLogo}
        alt=""
        draggable={false}
        sx={imgSx ?? illustrationImgSx}
      />
    </Box>
  )
}
