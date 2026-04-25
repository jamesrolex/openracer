import type { DashboardDefinition } from './types';
import { dashboardsForMode } from './types';

const noop: DashboardDefinition['Component'] = () => null;

const fixture: DashboardDefinition[] = [
  { id: 'a', name: 'A', category: 'race', raceOnly: true, cruiseOnly: false, Component: noop },
  { id: 'b', name: 'B', category: 'cruise', raceOnly: false, cruiseOnly: true, Component: noop },
  { id: 'c', name: 'C', category: 'tactical', raceOnly: false, cruiseOnly: false, Component: noop },
];

describe('dashboardsForMode', () => {
  it('hides cruise-only dashboards in race mode', () => {
    expect(dashboardsForMode(fixture, 'race').map((d) => d.id)).toEqual(['a', 'c']);
  });

  it('hides race-only dashboards in cruise mode', () => {
    expect(dashboardsForMode(fixture, 'cruise').map((d) => d.id)).toEqual(['b', 'c']);
  });

  it('preserves catalogue order', () => {
    const [a, b, c] = fixture as [DashboardDefinition, DashboardDefinition, DashboardDefinition];
    const reordered: DashboardDefinition[] = [c, a, b];
    expect(dashboardsForMode(reordered, 'race').map((d) => d.id)).toEqual(['c', 'a']);
  });

  it('returns empty list when nothing matches', () => {
    const [, b] = fixture as [DashboardDefinition, DashboardDefinition, DashboardDefinition];
    const onlyCruise: DashboardDefinition[] = [b];
    expect(dashboardsForMode(onlyCruise, 'race')).toEqual([]);
  });
});
