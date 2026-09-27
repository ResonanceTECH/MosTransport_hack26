import { Box, Typography } from '@mui/material'
import { LoginForm, type LoginFormValues } from '@/components/auth/LoginForm'
import { loginCardSx, loginTitleSx } from '@/pages/LoginPage/LoginPage.styles'

type LoginCardProps = {
  onSubmit: (values: LoginFormValues) => Promise<void> | void
  onSsoLogin: () => Promise<void> | void
  error?: string | null
  ssoOnly?: boolean
}

export function LoginCard({ onSubmit, onSsoLogin, error, ssoOnly }: LoginCardProps) {
  return (
    <Box sx={loginCardSx}>
      <Typography component="h1" sx={loginTitleSx}>
        Вход в систему
      </Typography>

      <LoginForm onSubmit={onSubmit} onSsoLogin={onSsoLogin} error={error} ssoOnly={ssoOnly} />
    </Box>
  )
}
