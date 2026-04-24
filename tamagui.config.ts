/**
 * Tamagui configuration. Tokens mirror src/theme/tokens.ts one-for-one so
 * visual output with the Tamagui-backed components matches the Phase 0
 * build byte-for-byte.
 *
 * We register day + night themes but only wire day in App.tsx for now;
 * night-mode wiring lands alongside the real cruising screens in Phase 3.
 */

import { createFont, createTamagui, createTokens } from 'tamagui';

import {
  colours,
  fontFamily,
  radius,
  space,
  type as typeScale,
} from './src/theme/tokens';

const spaceTokens = {
  xxs: space.xxs,
  xs: space.xs,
  sm: space.sm,
  md: space.md,
  lg: space.lg,
  xl: space.xl,
  xxl: space.xxl,
  huge: space.huge,
  true: space.md,
} as const;

const sizeTokens = { ...spaceTokens } as const;

const radiusTokens = {
  sm: radius.sm,
  md: radius.md,
  lg: radius.lg,
  xl: radius.xl,
  full: radius.full,
  true: radius.md,
} as const;

const colourTokens = {
  brandPrimary: colours.brand.primary,
  brandPrimaryDim: colours.brand.primaryDim,
  statusOffline: colours.status.offline,
  statusPatchy: colours.status.patchy,
  statusConstant: colours.status.constant,
  statusSuccess: colours.status.success,
  statusWarning: colours.status.warning,
  statusDanger: colours.status.danger,
  neutralBg: colours.neutral.bg,
  neutralBgNight: colours.neutral.bgNight,
  neutralSurface: colours.neutral.surface,
  neutralSurfaceNight: colours.neutral.surfaceNight,
  neutralBorder: colours.neutral.border,
  neutralBorderNight: colours.neutral.borderNight,
  neutralTextPrimary: colours.neutral.textPrimary,
  neutralTextPrimaryNight: colours.neutral.textPrimaryNight,
  neutralTextSecondary: colours.neutral.textSecondary,
  neutralTextSecondaryNight: colours.neutral.textSecondaryNight,
  neutralTextMuted: colours.neutral.textMuted,
  neutralTextMutedNight: colours.neutral.textMutedNight,
  nightAccent: colours.night.accent,
  nightAccentDim: colours.night.accentDim,
} as const;

// zIndex keys must mirror the space/size/radius scale (Tamagui enforces
// symmetric key sets at runtime). We reuse the same names even though only
// a few values make semantic sense for stacking.
const zIndexTokens = {
  xxs: 1,
  xs: 10,
  sm: 100,
  md: 200,
  lg: 300,
  xl: 500,
  xxl: 1000,
  huge: 9999,
  true: 100,
} as const;

export const tokens = createTokens({
  color: colourTokens,
  space: spaceTokens,
  size: sizeTokens,
  radius: radiusTokens,
  zIndex: zIndexTokens,
});

const interFont = createFont({
  family: fontFamily.sans,
  size: {
    micro: typeScale.micro.size,
    caption: typeScale.caption.size,
    label: typeScale.label.size,
    body: typeScale.body.size,
    h3: typeScale.h3.size,
    h2: typeScale.h2.size,
    h1: typeScale.h1.size,
    large: typeScale.large.size,
    xlarge: typeScale.xlarge.size,
    huge: typeScale.huge.size,
    monster: typeScale.monster.size,
    true: typeScale.body.size,
  },
  weight: {
    regular: '400',
    semibold: '600',
    bold: '700',
    true: '400',
  },
  lineHeight: {
    micro: typeScale.micro.lineHeight,
    caption: typeScale.caption.lineHeight,
    label: typeScale.label.lineHeight,
    body: typeScale.body.lineHeight,
    h3: typeScale.h3.lineHeight,
    h2: typeScale.h2.lineHeight,
    h1: typeScale.h1.lineHeight,
    large: typeScale.large.lineHeight,
    xlarge: typeScale.xlarge.lineHeight,
    huge: typeScale.huge.lineHeight,
    monster: typeScale.monster.lineHeight,
    true: typeScale.body.lineHeight,
  },
  letterSpacing: {
    micro: typeScale.micro.letterSpacing,
    label: typeScale.label.letterSpacing,
    huge: typeScale.huge.letterSpacing,
    monster: typeScale.monster.letterSpacing,
    xlarge: typeScale.xlarge.letterSpacing,
    true: 0,
  },
});

const dayTheme = {
  bg: colourTokens.neutralBg,
  surface: colourTokens.neutralSurface,
  border: colourTokens.neutralBorder,
  textPrimary: colourTokens.neutralTextPrimary,
  textSecondary: colourTokens.neutralTextSecondary,
  textMuted: colourTokens.neutralTextMuted,
  accent: colourTokens.brandPrimary,
};

const nightTheme = {
  bg: colourTokens.neutralBgNight,
  surface: colourTokens.neutralSurfaceNight,
  border: colourTokens.neutralBorderNight,
  textPrimary: colourTokens.neutralTextPrimaryNight,
  textSecondary: colourTokens.neutralTextSecondaryNight,
  textMuted: colourTokens.neutralTextMutedNight,
  accent: colourTokens.nightAccent,
};

export const tamaguiConfig = createTamagui({
  tokens,
  fonts: {
    body: interFont,
    heading: interFont,
  },
  themes: {
    day: dayTheme,
    night: nightTheme,
  },
  defaultTheme: 'day',
});

export type AppTamaguiConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppTamaguiConfig {}
}

export default tamaguiConfig;
