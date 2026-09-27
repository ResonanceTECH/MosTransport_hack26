import { createTheme } from '@mui/material/styles'

export const loginTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2867D8',
      dark: '#1F56B8',
      light: '#4B82E3',
      contrastText: '#FFFFFF',
    },
    text: {
      primary: '#07162F',
      secondary: '#7B879D',
    },
    background: {
      default: '#F5F9FE',
      paper: '#FFFFFF',
    },
    divider: '#D7E0EC',
    action: {
      hover: 'rgba(40, 103, 216, 0.04)',
    },
  },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        containedPrimary: {
          backgroundColor: '#2867D8',
          '&:hover': { backgroundColor: '#1F56B8' },
        },
        outlined: {
          borderColor: '#B9C5D8',
          color: '#101A30',
          '&:hover': {
            borderColor: '#2867D8',
            backgroundColor: 'rgba(40, 103, 216, 0.04)',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#FFFFFF',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#D6DEEA',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#2867D8',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#2867D8',
            borderWidth: 1.5,
          },
        },
        input: {
          padding: '16px 14px',
          fontSize: 15,
          '&::placeholder': {
            color: '#8B96AA',
            opacity: 1,
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: '#B9C5D8',
          '&.Mui-checked': { color: '#2867D8' },
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: '#2867D8',
          textDecoration: 'none',
          fontWeight: 500,
          '&:hover': { textDecoration: 'underline' },
        },
      },
    },
  },
})
