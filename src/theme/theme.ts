/**
 * Composes raw tokens into day and night theme objects. Components read
 * from these, not from tokens.ts directly, so the same code renders both.
 */

import type { ConnectivityMode } from '../types/connectivity';
import { colours, elevation, fontFamily, motion, radius, space, type } from './tokens';

export type ThemeVariant = 'day' | 'night';

export interface Theme {
  variant: ThemeVariant;
  bg: string;
  surface: string;
  border: string;
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  accent: string;
  accentDim: string;
  status: typeof colours.status;
  type: typeof type;
  fontFamily: typeof fontFamily;
  space: typeof space;
  radius: typeof radius;
  elevation: typeof elevation;
  motion: typeof motion;
}

export const dayTheme: Theme = {
  variant: 'day',
  bg: colours.neutral.bg,
  surface: colours.neutral.surface,
  border: colours.neutral.border,
  text: {
    primary: colours.neutral.textPrimary,
    secondary: colours.neutral.textSecondary,
    muted: colours.neutral.textMuted,
  },
  accent: colours.brand.primary,
  accentDim: colours.brand.primaryDim,
  status: colours.status,
  type,
  fontFamily,
  space,
  radius,
  elevation,
  motion,
};

export const nightTheme: Theme = {
  variant: 'night',
  bg: colours.neutral.bgNight,
  surface: colours.neutral.surfaceNight,
  border: colours.neutral.borderNight,
  text: {
    primary: colours.neutral.textPrimaryNight,
    secondary: colours.neutral.textSecondaryNight,
    muted: colours.neutral.textMutedNight,
  },
  accent: colours.night.accent,
  accentDim: colours.night.accentDim,
  status: colours.status,
  type,
  fontFamily,
  space,
  radius,
  elevation,
  motion,
};

export const getTheme = (variant: ThemeVariant): Theme =>
  variant === 'night' ? nightTheme : dayTheme;

/** Status colour for each connectivity mode — used by ConnectionBadge. */
export const connectivityColour = (mode: ConnectivityMode): string => {
  if (mode === 'offline') return colours.status.offline;
  if (mode === 'patchy') return colours.status.patchy;
  return colours.status.constant;
};
