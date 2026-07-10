// Light (default) palette — the original warm saffron/maroon temple theme.
export const lightColors = {
  primary: {
    // Official brand red — RGB(157, 31, 28). Used for primary actions, icons and accents.
    brand: '#9D1F1C',
    // `saffron` is kept as an alias so existing references resolve to the brand red
    // (the app previously used an orange #FF6B00 accent which has been retired).
    saffron: '#9D1F1C',
    maroon: '#800020',
    deepRed: '#6E0000',
    vermillion: '#E34234',
  },
  gold: {
    main: '#D4A017',
    light: '#FFD54F',
    dark: '#B8860B',
  },
  background: {
    parchment: '#FFF8E7',
    sandstone: '#F5E6CC',
    warmWhite: '#FFFDF5',
    cream: '#FFF8E1',
  },
  accent: {
    peacock: '#006D6F',
    lotus: '#E8A0BF',
    sage: '#B8C4A8',
  },
  text: {
    primary: '#4A0010',
    secondary: '#8B7E74',
    gold: '#D4A017',
    white: '#FFFFFF',
  },
  status: {
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
  },
  border: {
    gold: 'rgba(212, 160, 23, 0.3)',
    maroon: 'rgba(128, 0, 32, 0.2)',
  },
};

// Dark palette — deep warm "temple night" tones. Same token shape as light, with
// brand colours brightened so they stay readable both as text and as fills on
// the dark surfaces. `text.white` stays white (used on coloured buttons).
export const darkColors: typeof lightColors = {
  primary: {
    brand: '#E0552E',
    saffron: '#E0552E',
    maroon: '#E0607A',
    deepRed: '#C03A50',
    vermillion: '#FF6F5E',
  },
  gold: {
    main: '#E8B84B',
    light: '#FFD970',
    dark: '#E0A93B',
  },
  background: {
    parchment: '#15100A',
    sandstone: '#33261A',
    warmWhite: '#221811',
    cream: '#2A1E12',
  },
  accent: {
    peacock: '#3AA9AB',
    lotus: '#E8A0BF',
    sage: '#B8C4A8',
  },
  text: {
    primary: '#F3E8D6',
    secondary: '#B5A693',
    gold: '#E8B84B',
    white: '#FFFFFF',
  },
  status: {
    success: '#5DBB63',
    warning: '#FFB74D',
    error: '#FF6B5E',
    info: '#5AA9F0',
  },
  border: {
    gold: 'rgba(232, 184, 75, 0.22)',
    maroon: 'rgba(224, 96, 122, 0.30)',
  },
};

export type ColorPalette = typeof lightColors;

// Backward-compatible default export: any module that imports `colors` directly
// (not yet theme-aware) keeps the light palette. Theme-aware screens use
// `useTheme().colors` instead.
export const colors = lightColors;

export const fonts = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  // Will be replaced with custom spiritual fonts
};

export const typography = {
  display: {
    fontFamily: fonts.bold,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800' as const,
    letterSpacing: -0.8,
  },
  h1: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800' as const,
    letterSpacing: -0.4,
  },
  h2: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  h3: {
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700' as const,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700' as const,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  bodySm: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.7,
    textTransform: 'uppercase' as const,
  },
  button: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700' as const,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500' as const,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const shadows = {
  warm: {
    shadowColor: '#D4A017',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  temple: {
    shadowColor: '#800020',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 12,
  },
};
