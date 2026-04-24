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

export interface Mark {
  id: string;
  name: string;
  latitude: Latitude;
  longitude: Longitude;
  tier: MarkTier;
  source: MarkSource;
  /** ISO 8601 UTC. When the mark becomes usable. Null means always valid. */
  validFrom: string | null;
  /** ISO 8601 UTC. When the mark expires. Null means indefinite. */
  validUntil: string | null;
  /** Who set this mark — club name, sailor id, or "OpenSeaMap". */
  owner: string;
  /** 0-1. Higher = more trustworthy. Derives from tier + source + age. */
  confidence: number;
  /** Optional free-text note the sailor attached. */
  notes?: string;
}
