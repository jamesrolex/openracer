/**
 * Top-level app mode. Toggled top-right; auto-switches to 'race' when the
 * race timer arms.
 *
 * - **race** — course entry, start sequence, timer, race-share QR
 * - **cruise** — odometer + dashboards (wind / VMG / big numbers); the
 *   relaxed everyday view for a sail with no destination
 * - **nav** — waypoint navigation + cruise-track logging. Distinct from
 *   `cruise` because the mental model is different: nav is "I'm going TO
 *   somewhere, log my track, let me drop waypoints along the way".
 *   Racing **marks** are buoys you round; nav **waypoints** are points
 *   you sail towards. Same data shape (lat/lon + name) but different
 *   intent and lifecycle.
 */
export type AppMode = 'race' | 'cruise' | 'nav';
