import type { Latitude, Longitude } from './signalk';

/**
 * Mark lifespan tier. Governs how long a mark stays in the library and how
 * confidently it's offered during course entry.
 *
 * See docs/spec-summary.md — "Mark lifespan tiers".
 */
export type MarkTier =
  | 'club-seasonal'
  | 'chart-permanent'
  | 'race-day-recent'
  | 'single-race-temporary';

/**
 * How a mark entered the library. Informs confidence and UI affordance
 * (e.g. committee-boat pushes get a badge, GPS drops show the source sailor).
 */
export type MarkSource =
  | 'committee-push'
  | 'club-library'
  | 'chart-seamark'
  | 'gps-drop'
  | 'point-and-triangulate'
  | 'bearing-and-distance'
  | 'chart-tap';

/**
 * Visual glyph used to render the mark in lists and on the chart. Covers the
 * common racing and navigation types. `custom` falls back to a generic dot
 * with the mark's name.
 */
export type MarkIcon =
  | 'cardinal-n'
  | 'cardinal-s'
  | 'cardinal-e'
  | 'cardinal-w'
  | 'lateral-port'
  | 'lateral-starboard'
  | 'racing-yellow'
  | 'racing-red'
  | 'racing-orange'
  | 'committee-boat'
  | 'pin-end'
  | 'custom';

/**
 * Physical shape — mostly informational, a second axis of identification for
 * the sailor looking at the mark through binoculars. Matches the common
 * IALA shape categories we actually encounter.
 */
export type MarkShape =
  | 'spherical'
  | 'pillar'
  | 'can'
  | 'conical'
  | 'spar'
  | 'unknown';

export interface Mark {
  id: string;
  name: string;
  latitude: Latitude;
  longitude: Longitude;
  tier: MarkTier;
  source: MarkSource;
  icon: MarkIcon;
  shape: MarkShape;
  /** ISO 8601 UTC. When the mark becomes usable. Null means always valid. */
  validFrom: string | null;
  /** ISO 8601 UTC. When the mark expires. Null means indefinite. */
  validUntil: string | null;
  /** Who set this mark — club name, sailor id, or "OpenSeaMap". */
  owner: string;
  /**
   * 0-1. Higher = more trustworthy. Derived from tier + source + age at the
   * time the mark is read from the repo. Not persisted — populated by the
   * repo on read via `deriveConfidence` so it always reflects "now".
   */
  confidence: number;
  /** Optional free-text note the sailor attached. */
  notes?: string;
}

/** Fields supplied when creating a mark. Id, confidence, timestamps derive. */
export type MarkInput = Omit<Mark, 'id' | 'confidence'>;
