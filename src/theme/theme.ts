/**
 * Composes raw tokens into theme objects. Components read from these, not
 * from tokens.ts directly, so the same code renders all variants.
 *
 * Three variants:
 *  - 'day'    standard daylight UI (light bg, brand accent)
 *  - 'night'  cockpit at night (dark bg, dim accent)
 *  - 'kindle' high-contrast B/W for sunlight + e-ink portability
 *
 * The Kindle variant is colour-stripped so the same render shape ports
 * cleanly to a Pi-driven e-ink display in Phase 6/7. Status signals must
 * not rely on colour alone: every component using `theme.status.*` also
 * provides a shape/border/glyph fallback.
 */

import type { ConnectivityMode } from '../types/connectivity';
import { colours, elevation, fontFamily, motion, radius, space, type } from './tokens';

export type ThemeVariant = 'day' | 'night' | 'kindle';

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

/**
 * High-contrast monochrome palette. Pure black on pure white; greys
 * for muted text and borders. Status signals collapse to two greys
 * (mid + dark) — components must back them up with shape/border/glyph
 * cues, never colour alone.
 */
const kindleStatus = {
  success: '#1A1A1A', // dark grey — shape distinguishes
  warning: '#1A1A1A',
  danger: '#000000',
  offline: '#666666',
  patchy: '#999999',
  constant: '#1A1A1A',
};

export const kindleTheme: Theme = {
  variant: 'kindle',
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#000000',
  text: {
    primary: '#000000',
    secondary: '#1A1A1A',
    muted: '#555555',
  },
  accent: '#000000',
  accentDim: '#333333',
  status: kindleStatus as typeof colours.status,
  type,
  fontFamily,
  space,
  radius,
  elevation,
  motion,
};

export const getTheme = (variant: ThemeVariant): Theme => {
  if (variant === 'night') return nightTheme;
  if (variant === 'kindle') return kindleTheme;
  return dayTheme;
};

/** Status colour for each connectivity mode — used by ConnectionBadge. */
export const connectivityColour = (mode: ConnectivityMode): string => {
  if (mode === 'offline') return colours.status.offline;
  if (mode === 'patchy') return colours.status.patchy;
  return colours.status.constant;
};
