import { brand } from '@/shared/theme/brand'

/** Shared MUI control overrides for loginTheme + lightTheme. */
export const brandControlOverrides = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: brand.radiusButton,
        boxShadow: 'none',
        '&:hover': { boxShadow: 'none' },
      },
      containedPrimary: {
        backgroundColor: brand.primary,
        '&:hover': { backgroundColor: brand.primaryHover },
      },
      outlined: {
        borderColor: brand.borderStrong,
        '&:hover': {
          borderColor: brand.primary,
          backgroundColor: brand.primarySoft,
        },
      },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: brand.radiusControl,
        backgroundColor: brand.paper,
        '& .MuiOutlinedInput-notchedOutline': { borderColor: brand.border },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: brand.primary },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: brand.primary,
          borderWidth: 1.5,
        },
      },
    },
  },
} as const
