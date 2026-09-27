import type { ReactNode } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import type { SxProps, Theme } from '@mui/material'
import {
  buttonsSx,
  descriptionSx,
  errorCodeSx,
  primaryButtonSx,
  stackSx,
  titleSx,
} from '@/pages/ForbiddenPage/ForbiddenPage.styles'

type ForbiddenContentProps = {
  stackSxOverride?: SxProps<Theme>
  titleSxOverride?: SxProps<Theme>
  descriptionSxOverride?: SxProps<Theme>
  buttonsSxOverride?: SxProps<Theme>
  illustration?: ReactNode
}

export function ForbiddenContent({
  stackSxOverride,
  titleSxOverride,
  descriptionSxOverride,
  buttonsSxOverride,
  illustration,
}: ForbiddenContentProps) {
  const navigate = useNavigate()

  return (
    <Box sx={stackSxOverride ?? stackSx}>
      {illustration}

      <Typography component="h1" sx={titleSxOverride ?? titleSx}>
        Нет доступа
      </Typography>

      <Typography component="p" sx={descriptionSxOverride ?? descriptionSx}>
        У вашей учетной записи нет доступа к этому разделу. Для просмотра этого раздела необходимы
        расширенные права доступа.
      </Typography>

      <Stack direction="row" sx={buttonsSxOverride ?? buttonsSx}>
        <Button variant="contained" onClick={() => navigate('/dashboard')} sx={primaryButtonSx}>
          Вернуться на главную
        </Button>
      </Stack>

      <Typography component="p" sx={errorCodeSx}>
        Код ошибки: 403
      </Typography>
    </Box>
  )
}
