// Garix brand tokens (Brand Guidelines v1.0) — mirrors tailwind.config.ts on the web.
export const colors = {
  navy: '#0B1F4D',
  navySoft: '#14357A',
  gold: '#D4AF37',
  goldText: '#8A6D1B', // gold fails contrast as text on white; use this instead
  charcoal: '#1F2937',
  muted: '#5E656F', // charcoal at 70% on white — the web's body-muted level (AA)
  surface: '#F8FAFC',
  white: '#FFFFFF',
  line: '#E5E7EB',
  success: '#16A34A',
  warning: '#B45309', // amber darkened for text contrast
  danger: '#DC2626',
  info: '#2563EB',
} as const;

export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

export const radius = { sm: 8, md: 12, lg: 16 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
