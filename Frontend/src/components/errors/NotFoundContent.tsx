import { Box, Button, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
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

export function NotFoundContent() {
  const navigate = useNavigate()

  return (
    <Box sx={contentSx}>
      <Typography component="p" sx={labelSx}>
        Страница не найдена
      </Typography>

      <Box sx={numberWrapSx}>
        <Box aria-hidden="true" sx={numberRingSx} />
        <Typography component="h1" sx={numberSx}>
          404
        </Typography>
      </Box>

      <Typography component="h2" sx={titleSx}>
        Кажется, этот маршрут
        <br />
        не существует
      </Typography>

      <Typography component="p" sx={descriptionSx}>
        Маршрут перестроен — этой страницы здесь больше нет.
        Возможно, она была перемещена или удалена.
      </Typography>

      <Stack direction="row" flexWrap="wrap" sx={buttonsSx}>
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
