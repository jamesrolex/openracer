/**
 * Dashboard catalogue contract — Phase 1.8.
 *
 * The project owner sails Pantera with multiple kinds of information he
 * wants to glance at: race countdown for the start, true wind for tactics,
 * polar vs actual for upwind tuning, and a dirt-simple SOG/COG view when
 * he just wants to know how fast and which way. Each of those wants the
 * whole screen — sharing space costs us legibility on a wet, jouncy
 * cockpit phone.
 *
 * A dashboard is a fullscreen, read-only view of stored state. It reads
 * from Zustand stores directly (no prop drilling) so it can plug into the
 * catalogue, and into Phase 7's e-ink renderer, without rewiring its data
 * dependencies each time.
 *
 * Conventions every dashboard must obey:
 *   - Render identically in day / night / kindle (no colour-only signals)
 *   - No controls, no edit affordances; long-press is reserved for "exit"
 *     in the container (DashboardSelector), not the dashboard itself
 *   - Honest empty-state when required data is missing — never a blank
 *     panel with no explanation
 *   - Cheap to render at ~250ms cadence (dashboards live behind the
 *     timer's setInterval)
 */

import type { ThemeVariant } from '../theme/theme';

export type DashboardCategory = 'race' | 'cruise' | 'tactical';

export interface DashboardComponentProps {
  variant: ThemeVariant;
}

export interface DashboardDefinition {
  /** Stable identifier, persisted as the user's last-shown dashboard. */
  id: string;
  /** Long-form name shown in the selector + breadcrumb. */
  name: string;
  /** Short label for the swipe header chip; defaults to `name`. */
  shortName?: string;
  /** Loose grouping for the selector UI. */
  category: DashboardCategory;
  /** When true, only available while a race timer is armed. Shown in the
   *  race-mode catalogue. Hidden in cruise. */
  raceOnly: boolean;
  /** When true, only available while no race timer is armed. */
  cruiseOnly: boolean;
  /** Renders the dashboard. Reads its own state from Zustand selectors. */
  Component: React.FC<DashboardComponentProps>;
}

/**
 * Filter the catalogue for the active mode. Race mode shows everything
 * except cruise-only; cruise shows everything except race-only.
 */
export function dashboardsForMode(
  catalogue: readonly DashboardDefinition[],
  mode: 'race' | 'cruise',
): DashboardDefinition[] {
  return catalogue.filter((d) =>
    mode === 'race' ? !d.cruiseOnly : !d.raceOnly,
  );
}
