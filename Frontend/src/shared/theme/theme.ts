import { createTheme, type ThemeOptions } from '@mui/material/styles'
import { brand, CARD_SHADOW, LOAD_COLORS } from '@/shared/theme/brand'
import { brandControlOverrides } from '@/shared/theme/controls'

export { brand, CARD_SHADOW, LOAD_COLORS }

/** Dispatcher dashboard — urban transport analytics (MUI + GIS density) */
const base: ThemeOptions = {
  typography: {
    fontFamily: brand.fontApp,
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: brand.radiusPaper },
}

export const lightTheme = createTheme({
  ...base,
  palette: {
    mode: 'light',
    primary: {
      main: brand.primary,
      dark: brand.primaryHover,
      light: brand.primaryLight,
      contrastText: brand.contrast,
    },
    secondary: {
      main: brand.secondary,
      contrastText: brand.contrast,
    },
    background: {
      default: brand.bgApp,
      paper: brand.paper,
    },
    text: {
      primary: brand.textApp,
      secondary: brand.textMuted,
    },
    divider: brand.divider,
    success: { main: brand.load.low },
    warning: { main: brand.load.medium },
    error: { main: brand.load.high },
    info: { main: brand.primary },
    action: {
      hover: brand.primarySoft,
      selected: brand.primarySelected,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: brand.bgApp,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        ...brandControlOverrides.MuiButton.styleOverrides,
        outlined: {
          ...brandControlOverrides.MuiButton.styleOverrides.outlined,
          color: brand.textApp,
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${brand.borderPaper}`,
          boxShadow: CARD_SHADOW,
          borderRadius: brand.radiusPaper,
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${brand.borderPaper}`,
          boxShadow: CARD_SHADOW,
          borderRadius: brand.radiusPaper,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: brand.paper,
          color: brand.textApp,
          borderBottom: `1px solid ${brand.divider}`,
          boxShadow: '0 1px 0 rgba(31, 70, 120, 0.04)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 500 },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          px: 1.5,
          '&.Mui-selected': {
            backgroundColor: brand.primary,
            color: brand.contrast,
            '&:hover': { backgroundColor: brand.primaryHover },
          },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          backgroundColor: brand.segment,
          borderRadius: brand.radiusControl,
          padding: 3,
          gap: 2,
          '& .MuiToggleButton-root': {
            border: 'none',
            margin: 0,
          },
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { color: brand.primary },
        rail: { opacity: 0.25 },
      },
    },
    MuiOutlinedInput: brandControlOverrides.MuiOutlinedInput,
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 40,
        },
      },
    },
  },
})

export const darkTheme = createTheme({
  ...base,
  palette: {
    mode: 'dark',
    primary: {
      main: brand.dark.primary,
      dark: brand.primary,
      light: brand.dark.primaryLight,
      contrastText: brand.contrast,
    },
    background: {
      default: brand.dark.bg,
      paper: brand.dark.paper,
    },
    text: {
      primary: brand.dark.text,
      secondary: brand.dark.textSecondary,
    },
    divider: brand.dark.divider,
    success: { main: brand.dark.success },
    warning: { main: brand.load.medium },
    error: { main: brand.dark.error },
    info: { main: brand.dark.primary },
  },
  components: {
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${brand.dark.divider}`,
          boxShadow: brand.dark.shadowPaper,
          borderRadius: brand.radiusPaper,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: brand.dark.paper,
          color: brand.dark.text,
          borderBottom: `1px solid ${brand.dark.divider}`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: brand.radiusButton, boxShadow: 'none' },
      },
    },
  },
})

/** @deprecated use lightTheme via ColorModeProvider */
export const theme = lightTheme
