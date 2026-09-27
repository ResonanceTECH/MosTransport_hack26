import { useEffect, useState } from 'react'
import { Box, ThemeProvider } from '@mui/material'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/shared/auth/AuthProvider'
import { LoginCard } from '@/components/auth/LoginCard'
import type { LoginFormValues } from '@/components/auth/LoginForm'
import { AppLogo } from '@/components/branding/AppLogo'
import { HeroSection } from '@/pages/LoginPage/HeroSection'
import { loginSectionSx, pageRootSx } from '@/pages/LoginPage/LoginPage.styles'
import { loginTheme } from '@/pages/LoginPage/loginTheme'

const REMEMBER_KEY = 'mt.login.remember'

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)')
    const apply = () => {
      if (mq.matches) {
        document.documentElement.style.overflow = 'hidden'
        document.body.style.overflow = 'hidden'
      } else {
        document.documentElement.style.overflow = ''
        document.body.style.overflow = ''
      }
    }
    apply()
    mq.addEventListener('change', apply)
    return () => {
      mq.removeEventListener('change', apply)
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [])

  if (auth.ready && auth.isAuthenticated) {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
    return <Navigate to={from || '/dashboard'} replace />
  }

  const handleLogin = async (values: LoginFormValues) => {
    setError(null)
    try {
      if (values.rememberMe) {
        localStorage.setItem(REMEMBER_KEY, values.username)
      } else {
        localStorage.removeItem(REMEMBER_KEY)
      }

      if (auth.mode === 'oidc') {
        await auth.loginOidc()
        return
      }

      auth.loginDemo(values.username, values.password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа')
    }
  }

  const handleSsoLogin = async () => {
    setError(null)
    try {
      if (auth.mode === 'oidc') {
        await auth.loginOidc()
        return
      }
      console.info('[login] SSO requested in demo mode — configure Keycloak to enable')
      setError('SSO доступен при подключении Keycloak')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка SSO')
    }
  }

  return (
    <ThemeProvider theme={loginTheme}>
      <Box sx={pageRootSx}>
        <HeroSection />
        <Box component="section" sx={loginSectionSx} aria-label="Авторизация">
          <Box
            sx={{
              display: { xs: 'block', md: 'none' },
              mb: 2.5,
              width: '100%',
              maxWidth: 480,
            }}
          >
            <AppLogo compact />
          </Box>
          <LoginCard
            onSubmit={handleLogin}
            onSsoLogin={handleSsoLogin}
            error={error}
            ssoOnly={auth.mode === 'oidc'}
          />
        </Box>
      </Box>
    </ThemeProvider>
  )
}
