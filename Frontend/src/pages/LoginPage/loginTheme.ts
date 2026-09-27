import { createTheme } from '@mui/material/styles'
import { brand } from '@/shared/theme/brand'
import { brandControlOverrides } from '@/shared/theme/controls'

/**
 * Auth/login surface theme — same brand tokens as lightTheme,
 * tighter auth-specific text/bg + form control polish.
 */
export const loginTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: brand.primary,
      dark: brand.primaryHover,
      light: brand.primaryLight,
      contrastText: brand.contrast,
    },
    text: {
      primary: brand.text,
      secondary: brand.textSecondaryLogin,
    },
    background: {
      default: brand.bg,
      paper: brand.paper,
    },
    divider: brand.divider,
    action: {
      hover: brand.primarySoft,
    },
  },
  typography: {
    fontFamily: brand.font,
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: brand.radiusControl,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        ...brandControlOverrides.MuiButton.styleOverrides,
        outlined: {
          ...brandControlOverrides.MuiButton.styleOverrides.outlined,
          color: brand.textButton,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        ...brandControlOverrides.MuiOutlinedInput.styleOverrides,
        input: {
          padding: '16px 14px',
          fontSize: 15,
          '&::placeholder': {
            color: brand.textPlaceholder,
            opacity: 1,
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: brand.borderStrong,
          '&.Mui-checked': { color: brand.primary },
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: brand.primary,
          textDecoration: 'none',
          fontWeight: 500,
          '&:hover': { textDecoration: 'underline' },
        },
      },
    },
  },
})
