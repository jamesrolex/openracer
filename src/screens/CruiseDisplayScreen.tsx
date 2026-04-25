/**
 * CruiseDisplayScreen — opens the dashboard catalogue in cruise mode.
 *
 * Reachable from Home (cruise mode only) — gives a sailor the same
 * fullscreen wind / VMG / big-numbers dashboards without arming a race
 * timer. The race-countdown dashboard is filtered out automatically by
 * `dashboardsForMode('cruise')`.
 *
 * Long-press anywhere reveals "Show controls" — taps return to Home.
 */

import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardSelector } from '../components/DashboardSelector';
import type { RootStackScreenProps } from '../navigation';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';

export function CruiseDisplayScreen({
  navigation,
}: RootStackScreenProps<'CruiseDisplay'>) {
  const variant = useSettingsStore((s) => s.theme);
  const theme = getTheme(variant);
  const initial = useSettingsStore((s) => s.lastCruiseDashboardId);
  const setLast = useSettingsStore((s) => s.setLastCruiseDashboardId);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={['top', 'bottom']}
    >
      <DashboardSelector
        variant={variant}
        mode="cruise"
        initialDashboardId={initial}
        onDashboardChange={setLast}
        onExit={() => navigation.goBack()}
      />
    </SafeAreaView>
  );
}
