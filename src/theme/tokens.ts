/**
 * Design tokens. These are the only raw values allowed in the app — every
 * component composes from here. See skills/design-system/SKILL.md for the
 * rationale behind each value.
 */

export const colours = {
  brand: {
    primary: '#1F4E79',
    primaryDim: '#2B5F8B',
  },
  status: {
    offline: '#595959',
    patchy: '#854F0B',
    constant: '#534AB7',
    success: '#3B6D11',
    warning: '#A8450B',
    danger: '#B91C1C',
  },
  neutral: {
    bg: '#FFFFFF',
    bgNight: '#0B0D10',
    surface: '#F8F9FB',
    surfaceNight: '#15181D',
    border: '#E4E7EC',
    borderNight: '#2A2E34',
    textPrimary: '#0F172A',
    textPrimaryNight: '#F1F5F9',
    textSecondary: '#475569',
    textSecondaryNight: '#94A3B8',
    textMuted: '#94A3B8',
    textMutedNight: '#64748B',
  },
  night: {
    accent: '#DC2626',
    accentDim: '#991B1B',
  },
} as const;

/**
 * Inter is the target face. Until we ship the font asset, React Native falls
 * back to the system sans-serif (San Francisco on iOS, Roboto on Android),
 * both of which are acceptable Inter substitutes for Phase 0.
 */
export const fontFamily = {
  sans: 'Inter',
} as const;

/** Line height values are stored in px (not ratio) for direct use in RN. */
export const type = {
  monster: { size: 96, weight: '700', lineHeight: 96, letterSpacing: -2 },
  huge: { size: 64, weight: '700', lineHeight: 64, letterSpacing: -1 },
  xlarge: { size: 42, weight: '600', lineHeight: 46, letterSpacing: -0.5 },
  large: { size: 32, weight: '600', lineHeight: 38, letterSpacing: 0 },
  h1: { size: 28, weight: '700', lineHeight: 34, letterSpacing: 0 },
  h2: { size: 22, weight: '600', lineHeight: 29, letterSpacing: 0 },
  h3: { size: 18, weight: '600', lineHeight: 23, letterSpacing: 0 },
  body: { size: 16, weight: '400', lineHeight: 24, letterSpacing: 0 },
  bodySemi: { size: 16, weight: '600', lineHeight: 24, letterSpacing: 0 },
  label: { size: 13, weight: '600', lineHeight: 17, letterSpacing: 0.5 },
  caption: { size: 12, weight: '400', lineHeight: 17, letterSpacing: 0 },
  micro: { size: 10, weight: '600', lineHeight: 12, letterSpacing: 0.5 },
} as const;

/** 8-point grid. Use only these values for padding, margin, and gaps. */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  huge: 64,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

/**
 * RN-native elevation recipes. iOS uses the shadow* family, Android uses
 * `elevation`. Apply the whole object to a View.
 */
export const elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  modal: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

/**
 * Transition durations, ms. Never animate primary data values — see
 * design-system skill "Rules" for the prohibited list.
 */
export const motion = {
  modeSwitch: 300,
  screen: 250,
  enter: 200,
} as const;
