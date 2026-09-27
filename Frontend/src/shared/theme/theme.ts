import { createTheme, type ThemeOptions } from '@mui/material/styles'

/** Dispatcher dashboard — urban transport analytics (MUI + GIS density) */
const base: ThemeOptions = {
  typography: {
    fontFamily: '"Inter", "IBM Plex Sans", system-ui, -apple-system, sans-serif',
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
  shape: { borderRadius: 14 },
}

export const lightTheme = createTheme({
  ...base,
  palette: {
    mode: 'light',
    primary: {
      main: '#2867D8',
      dark: '#1F56B8',
      light: '#4B82E3',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#1A4FA0',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F6F9FD',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0A1F44',
      secondary: '#6B819C',
    },
    divider: '#D7E0EC',
    success: { main: '#2E9E6B' },
    warning: { main: '#E5A000' },
    error: { main: '#D64545' },
    info: { main: '#2867D8' },
    action: {
      hover: 'rgba(40, 103, 216, 0.04)',
      selected: 'rgba(40, 103, 216, 0.08)',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#F6F9FD',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        containedPrimary: {
          backgroundColor: '#2867D8',
          '&:hover': { backgroundColor: '#1F56B8' },
        },
        outlined: {
          borderColor: '#B9C5D8',
          color: '#0A1F44',
          '&:hover': {
            borderColor: '#2867D8',
            backgroundColor: 'rgba(40, 103, 216, 0.04)',
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(215, 224, 236, 0.7)',
          boxShadow: '0 4px 18px rgba(31, 70, 120, 0.05)',
          borderRadius: 14,
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: '1px solid rgba(215, 224, 236, 0.7)',
          boxShadow: '0 4px 18px rgba(31, 70, 120, 0.05)',
          borderRadius: 14,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#0A1F44',
          borderBottom: '1px solid #D7E0EC',
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
            backgroundColor: '#2867D8',
            color: '#fff',
            '&:hover': { backgroundColor: '#1F56B8' },
          },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          backgroundColor: '#EEF3FA',
          borderRadius: 12,
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
        root: { color: '#2867D8' },
        rail: { opacity: 0.25 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#FFFFFF',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#D6DEEA' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2867D8' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#2867D8',
            borderWidth: 1.5,
          },
        },
      },
    },
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
      main: '#4B82E3',
      dark: '#2867D8',
      light: '#7BA4EC',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#0B1526',
      paper: '#132038',
    },
    text: {
      primary: '#E8EEF7',
      secondary: '#9BB0C8',
    },
    divider: '#243552',
    success: { main: '#3CB87A' },
    warning: { main: '#E5A000' },
    error: { main: '#E05A5A' },
    info: { main: '#4B82E3' },
  },
  components: {
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #243552',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.25)',
          borderRadius: 14,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#132038',
          color: '#E8EEF7',
          borderBottom: '1px solid #243552',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 12, boxShadow: 'none' },
      },
    },
  },
})

/** @deprecated use lightTheme via ColorModeProvider */
export const theme = lightTheme

export const LOAD_COLORS = {
  low: '#2E9E6B',
  medium: '#E5A000',
  high: '#D64545',
} as const

export const CARD_SHADOW = '0 4px 18px rgba(31, 70, 120, 0.05)'
