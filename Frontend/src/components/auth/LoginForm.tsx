import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  Building03Icon,
  LockIcon,
  UserIcon,
  ViewIcon,
  ViewOffIcon,
} from '@hugeicons/core-free-icons'
import { Icon } from '@/shared/ui/Icon'
import {
  dividerSx,
  fieldSx,
  formStackSx,
  optionsRowSx,
  passwordFieldSx,
  primaryButtonSx,
  ssoButtonSx,
} from '@/pages/LoginPage/LoginPage.styles'

export type LoginFormValues = {
  username: string
  password: string
  rememberMe: boolean
}

type LoginFormProps = {
  onSubmit: (values: LoginFormValues) => Promise<void> | void
  onSsoLogin: () => Promise<void> | void
  error?: string | null
  ssoOnly?: boolean
}

export function LoginForm({ onSubmit, onSsoLogin, error, ssoOnly = false }: LoginFormProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  const validate = () => {
    const next: { username?: string; password?: string } = {}
    if (!username.trim()) next.username = 'Введите логин или email'
    if (!password) next.password = 'Введите пароль'
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (ssoOnly) {
      setSubmitting(true)
      try {
        await onSsoLogin()
      } finally {
        setSubmitting(false)
      }
      return
    }
    if (!validate()) return
    setSubmitting(true)
    try {
      await onSubmit({ username: username.trim(), password, rememberMe })
    } finally {
      setSubmitting(false)
    }
  }

  if (ssoOnly) {
    return (
      <Box component="form" onSubmit={(e) => void handleSubmit(e)} noValidate>
        <Stack spacing={0} sx={formStackSx}>
          {error && <Alert severity="error">{error}</Alert>}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={submitting}
            sx={primaryButtonSx}
          >
            Войти через SSO
          </Button>
        </Stack>
      </Box>
    )
  }

  return (
    <Box component="form" onSubmit={(e) => void handleSubmit(e)} noValidate>
      <Stack spacing={0} sx={formStackSx}>
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          placeholder="Электронная почта"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value)
            if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: undefined }))
          }}
          error={Boolean(fieldErrors.username)}
          helperText={fieldErrors.username}
          autoComplete="username"
          sx={fieldSx}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Icon icon={UserIcon} size={20} color="#64748B" strokeWidth={1.75} />
                </InputAdornment>
              ),
            },
          }}
        />

        <TextField
          fullWidth
          placeholder="Пароль"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }))
          }}
          error={Boolean(fieldErrors.password)}
          helperText={fieldErrors.password}
          autoComplete="current-password"
          sx={passwordFieldSx}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Icon icon={LockIcon} size={20} color="#64748B" strokeWidth={1.75} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                    onClick={() => setShowPassword((v) => !v)}
                    edge="end"
                    size="small"
                  >
                    <Icon
                      icon={showPassword ? ViewOffIcon : ViewIcon}
                      size={20}
                      color="#64748B"
                      strokeWidth={1.75}
                    />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={optionsRowSx}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                size="small"
              />
            }
            label={
              <Typography sx={{ fontSize: 14, color: '#07162F' }}>Запомнить меня</Typography>
            }
            sx={{ ml: -0.5, mr: 0 }}
          />
          <Link
            href="#"
            onClick={(e) => e.preventDefault()}
            underline="hover"
            sx={{ fontSize: 14 }}
          >
            Забыли пароль?
          </Link>
        </Stack>

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={submitting}
          sx={primaryButtonSx}
        >
          Войти
        </Button>

        <Divider sx={dividerSx}>или</Divider>

        <Button
          type="button"
          variant="outlined"
          fullWidth
          disabled={submitting}
          onClick={() => void onSsoLogin()}
          startIcon={<Icon icon={Building03Icon} size={20} color="#101A30" strokeWidth={1.75} />}
          sx={ssoButtonSx}
        >
          Войти через SSO
        </Button>
      </Stack>
    </Box>
  )
}
