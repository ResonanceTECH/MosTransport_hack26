/** Shared MosTransport brand tokens — source for loginTheme + lightTheme. */

export const brand = {
  primary: '#2867D8',
  primaryHover: '#1F56B8',
  primaryLight: '#4B82E3',
  primarySoft: 'rgba(40, 103, 216, 0.04)',
  primarySelected: 'rgba(40, 103, 216, 0.08)',
  secondary: '#1A4FA0',
  contrast: '#FFFFFF',

  text: '#07162F',
  textApp: '#0A1F44',
  textInk: '#0E203B',
  textBody: '#4A5568',
  textMuted: '#6B819C',
  textSecondaryLogin: '#7B879D',
  textPlaceholder: '#8B96AA',
  textLabel: '#9BB0C8',
  textIcon: '#64748B',
  textButton: '#101A30',

  bg: '#F5F9FE',
  bgApp: '#F6F9FD',
  paper: '#FFFFFF',
  segment: '#EEF3FA',

  border: '#D6DEEA',
  borderStrong: '#B9C5D8',
  borderButton: '#C5D3E8',
  borderDivider: '#D8DFE9',
  borderCard: 'rgba(210, 220, 235, 0.45)',
  borderPaper: 'rgba(215, 224, 236, 0.7)',
  divider: '#D7E0EC',
  ring: 'rgba(185, 216, 255, 0.85)',

  shadowCard: '0 12px 40px rgba(31, 70, 120, 0.08)',
  shadowPaper: '0 4px 18px rgba(31, 70, 120, 0.05)',

  radiusCard: 24,
  radiusPaper: 14,
  radiusControl: 12,
  radiusButton: 12,

  font: '"Inter", system-ui, -apple-system, sans-serif',
  fontApp: '"Inter", "IBM Plex Sans", system-ui, -apple-system, sans-serif',

  load: {
    low: '#2E9E6B',
    medium: '#E5A000',
    high: '#D64545',
  },

  dark: {
    bg: '#0B1526',
    paper: '#132038',
    text: '#E8EEF7',
    textSecondary: '#9BB0C8',
    divider: '#243552',
    primary: '#4B82E3',
    primaryLight: '#7BA4EC',
    success: '#3CB87A',
    error: '#E05A5A',
    shadowPaper: '0 4px 18px rgba(0, 0, 0, 0.25)',
  },
} as const

export const LOAD_COLORS = brand.load

export const CARD_SHADOW = brand.shadowPaper
