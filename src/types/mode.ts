/**
 * Top-level app mode. Toggled top-right; auto-switches to 'race' when the
 * race timer arms.
 *
 * - **race** — course entry, start sequence, timer, race-share QR
 * - **cruise** — everything else: trip odometer, dashboards (wind / VMG /
 *   wind trend / big numbers), waypoints, cruise-track recording. The
 *   "I'm not racing" mode. Phase 1.16 originally split this into
 *   cruise + nav but the distinction was muddy — nav features (waypoints,
 *   start-track) are reachable as a sub-screen inside cruise mode.
 */
export type AppMode = 'race' | 'cruise';
