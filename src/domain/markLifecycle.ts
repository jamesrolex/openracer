/**
 * Mark lifecycle: expiry windows, active-state, default validity, and
 * confidence derivation. Pure functions so repo code, UI, and tests can
 * share one definition.
 *
 * See docs/spec-summary.md for the tier definitions and the Phase 1 plan
 * for the expiry rules.
 */

import type { Mark, MarkSource, MarkTier } from '../types/mark';

/** UK sailing season — April 1 to October 31 inclusive, UTC. */
export const SEASONAL_START_MONTH = 3; // April (0-indexed)
export const SEASONAL_START_DAY = 1;
export const SEASONAL_END_MONTH = 9; // October (0-indexed)
export const SEASONAL_END_DAY = 31;

/** `race-day-recent` lifetime in days. */
export const RACE_DAY_RECENT_DAYS = 14;

/** Fallback window for `single-race-temporary` when no race session exists. */
const SINGLE_RACE_FALLBACK_HOURS = 6;

export interface SeasonalWindow {
  from: Date;
  until: Date;
}

/** The Apr 1 – Oct 31 window for the calendar year of `now`, in UTC. */
export function seasonalWindowFor(now: Date): SeasonalWindow {
  const year = now.getUTCFullYear();
  return {
    from: new Date(Date.UTC(year, SEASONAL_START_MONTH, SEASONAL_START_DAY, 0, 0, 0, 0)),
    until: new Date(Date.UTC(year, SEASONAL_END_MONTH, SEASONAL_END_DAY, 23, 59, 59, 999)),
  };
}

/**
 * Is the mark currently usable? `chart-permanent` always is; `club-seasonal`
 * depends only on the calendar window; the two dated tiers rely on
 * `validUntil`.
 */
export function isMarkActive(
  mark: Pick<Mark, 'tier' | 'validUntil'>,
  now: Date,
): boolean {
  switch (mark.tier) {
    case 'chart-permanent':
      return true;
    case 'club-seasonal': {
      const { from, until } = seasonalWindowFor(now);
      return now >= from && now <= until;
    }
    case 'race-day-recent':
    case 'single-race-temporary':
      if (mark.validUntil === null) return true;
      return now <= new Date(mark.validUntil);
  }
}

/** Default validFrom/validUntil for a new mark of the given tier. */
export function defaultValidityFor(
  tier: MarkTier,
  now: Date,
  raceSessionEndsAt: Date | null = null,
): { validFrom: string | null; validUntil: string | null } {
  const iso = (d: Date): string => d.toISOString();

  switch (tier) {
    case 'chart-permanent':
      return { validFrom: null, validUntil: null };
    case 'club-seasonal': {
      const { from, until } = seasonalWindowFor(now);
      return { validFrom: iso(from), validUntil: iso(until) };
    }
    case 'race-day-recent': {
      const until = new Date(now.getTime() + RACE_DAY_RECENT_DAYS * 86_400_000);
      return { validFrom: iso(now), validUntil: iso(until) };
    }
    case 'single-race-temporary': {
      const until =
        raceSessionEndsAt ??
        new Date(now.getTime() + SINGLE_RACE_FALLBACK_HOURS * 3_600_000);
      return { validFrom: iso(now), validUntil: iso(until) };
    }
  }
}

const TIER_BASE: Record<MarkTier, number> = {
  'chart-permanent': 0.95,
  'club-seasonal': 0.85,
  'race-day-recent': 0.7,
  'single-race-temporary': 0.5,
};

const SOURCE_ADJUST: Record<MarkSource, number> = {
  'committee-push': 0.05,
  'club-library': 0.0,
  'chart-seamark': 0.0,
  'gps-drop': 0.0,
  'point-and-triangulate': -0.1,
  'bearing-and-distance': -0.05,
  'chart-tap': -0.05,
};

function ageDaysSince(isoStart: string | null, now: Date): number {
  if (!isoStart) return 0;
  const diffMs = now.getTime() - new Date(isoStart).getTime();
  return Math.max(0, diffMs / 86_400_000);
}

/**
 * Confidence 0-1 derived from tier + source + age. Pure, no I/O. Called on
 * read so the value is always "now-fresh".
 */
export function deriveConfidence(
  mark: Pick<Mark, 'tier' | 'source' | 'validFrom'>,
  now: Date,
): number {
  const base = TIER_BASE[mark.tier];
  const srcAdj = SOURCE_ADJUST[mark.source];

  let agePenalty = 0;
  if (mark.tier === 'race-day-recent') {
    const days = ageDaysSince(mark.validFrom, now);
    agePenalty = -0.2 * Math.min(1, days / RACE_DAY_RECENT_DAYS);
  } else if (mark.tier === 'single-race-temporary') {
    agePenalty = -0.1;
  }

  const raw = base + srcAdj + agePenalty;
  return clamp01(Number(raw.toFixed(3)));
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
