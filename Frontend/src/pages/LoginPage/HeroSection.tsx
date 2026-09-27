import { Box, Typography } from '@mui/material'
import { AppLogo } from '@/components/branding/AppLogo'
import tramIllustration from '@/assets/login_screen.png'
import {
  heroContentSx,
  heroDescriptionSx,
  heroInnerSx,
  heroLogoSx,
  heroOverlaySx,
  heroSectionSx,
  heroTitleSx,
  tramImageSx,
} from '@/pages/LoginPage/LoginPage.styles'

export function HeroSection() {
  return (
    <Box component="section" sx={heroSectionSx} aria-label="О продукте">
      <Box
        component="img"
        src={tramIllustration}
        alt=""
        aria-hidden
        sx={tramImageSx}
        draggable={false}
      />
      <Box sx={heroOverlaySx} aria-hidden />

      <Box sx={heroInnerSx}>
        <Box sx={heroLogoSx}>
          <AppLogo />
        </Box>

        <Box sx={heroContentSx}>
          <Typography component="h1" sx={heroTitleSx}>
            <Box component="span" className="hero-line">
              Данные сегодня
            </Box>
            <Box component="span" className="hero-line">
              для более удобного
            </Box>
            <Box component="span" className="hero-line">
              завтра
            </Box>
          </Typography>
          <Typography component="p" sx={heroDescriptionSx}>
            {
              'Анализируем пассажиропотоки, прогнозируем\nзагрузку и помогаем принимать эффективные\nрешения для развития трамвайной сети\nМосквы.'
            }
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
