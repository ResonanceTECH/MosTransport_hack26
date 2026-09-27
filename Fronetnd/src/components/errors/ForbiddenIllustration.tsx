import { Box } from '@mui/material'
import type { SxProps, Theme } from '@mui/material'
import notFoundScreen from '@/assets/notfound_screen.png'
import { illustrationImgSx, illustrationSx } from '@/pages/ForbiddenPage/ForbiddenPage.styles'

type ForbiddenIllustrationProps = {
  wrapSx?: SxProps<Theme>
  imgSx?: SxProps<Theme>
}

export function ForbiddenIllustration({ wrapSx, imgSx }: ForbiddenIllustrationProps) {
  return (
    <Box sx={wrapSx ?? illustrationSx} aria-hidden="true">
      <Box
        component="img"
        src={notFoundScreen}
        alt=""
        draggable={false}
        sx={imgSx ?? illustrationImgSx}
      />
    </Box>
  )
}
