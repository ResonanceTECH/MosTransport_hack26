import { Box, Button, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import type { SxProps, Theme } from '@mui/material'
import {
  backButtonSx,
  buttonsSx,
  contentSx,
  descriptionSx,
  labelSx,
  numberRingSx,
  numberSx,
  numberWrapSx,
  primaryButtonSx,
  titleSx,
} from '@/pages/NotFoundPage/NotFoundPage.styles'

type NotFoundContentProps = {
  contentSxOverride?: SxProps<Theme>
  numberSxOverride?: SxProps<Theme>
  titleSxOverride?: SxProps<Theme>
  descriptionSxOverride?: SxProps<Theme>
  buttonsSxOverride?: SxProps<Theme>
}

export function NotFoundContent({
  contentSxOverride,
  numberSxOverride,
  titleSxOverride,
  descriptionSxOverride,
  buttonsSxOverride,
}: NotFoundContentProps) {
  const navigate = useNavigate()

  return (
    <Box sx={contentSxOverride ?? contentSx}>
      <Typography component="p" sx={labelSx}>
        Страница не найдена
      </Typography>

      <Box sx={numberWrapSx}>
        <Box aria-hidden="true" sx={numberRingSx} />
        <Typography component="h1" sx={numberSxOverride ?? numberSx}>
          404
        </Typography>
      </Box>

      <Typography component="h2" sx={titleSxOverride ?? titleSx}>
        Кажется, этот маршрут
        <br />
        не существует
      </Typography>

      <Typography component="p" sx={descriptionSxOverride ?? descriptionSx}>
        Маршрут перестроен — этой страницы здесь больше нет. Возможно, она была перемещена или
        удалена.
      </Typography>

      <Stack direction="row" sx={buttonsSxOverride ?? buttonsSx}>
        <Button variant="contained" onClick={() => navigate('/dashboard')} sx={primaryButtonSx}>
          Вернуться на главную
        </Button>
        <Button variant="outlined" onClick={() => navigate(-1)} sx={backButtonSx}>
          Назад
        </Button>
      </Stack>
    </Box>
  )
}
