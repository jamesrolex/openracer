/**
 * Dashboard catalogue — Phase 1.8.
 *
 * The ordered list of fullscreen dashboards available in the cockpit.
 * Order matters: it's the sequence the swipe gesture cycles through.
 *
 * Adding a new dashboard:
 *   1. Build it as a self-contained component reading from Zustand stores
 *   2. Export a `DashboardDefinition` from its file
 *   3. Append it to `dashboardCatalogue` below
 *
 * No registration code, no plugin loader. The whole list is visible here.
 */

import { bigNumbersDashboard } from './BigNumbersDashboard';
import { raceCountdownDashboard } from './RaceCountdownDashboard';
import type { DashboardDefinition } from './types';
import { vmgDashboard } from './VMGDashboard';
import { windDashboard } from './WindDashboard';
import { windTrendDashboard } from './WindTrendDashboard';

export const dashboardCatalogue: readonly DashboardDefinition[] = [
  raceCountdownDashboard, // race-only — first when the timer is armed
  windDashboard,          // tactical — works in race + cruise
  windTrendDashboard,     // tactical — 5-min shift history
  vmgDashboard,           // tactical — works in race + cruise
  bigNumbersDashboard,    // simplest fallback, always available
];

export type { DashboardDefinition, DashboardCategory, DashboardComponentProps } from './types';
export { dashboardsForMode } from './types';
