import { createTheme } from '@mui/material/styles'

/** Moscow Transport dispatcher UI — urban mono + tram red accent (Uber-inspired density, MT colors) */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#000000',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#E31E24',
      contrastText: '#ffffff',
    },
    background: {
      default: '#F3F3F3',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#000000',
      secondary: '#5E5E5E',
    },
    divider: '#E2E2E2',
    success: { main: '#1B8F4A' },
    warning: { main: '#E6A700' },
    error: { main: '#E31E24' },
    info: { main: '#276EF1' },
  },
  typography: {
    fontFamily: '"IBM Plex Sans", "Segoe UI", Helvetica, Arial, sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 999, paddingInline: 16 },
        contained: {
          '&.MuiButton-containedPrimary': {
            backgroundColor: '#000',
            '&:hover': { backgroundColor: '#282828' },
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: '1px solid #E2E2E2',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#000',
          color: '#fff',
          border: 'none',
        },
      },
    },
  },
})

export const LOAD_COLORS = {
  low: '#1B8F4A',
  medium: '#E6A700',
  high: '#E31E24',
} as const
