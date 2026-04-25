/**
 * BigNumbersDashboard — the dirt-simple cockpit speedometer.
 *
 * SOG (huge) and COG (big) filling the screen. No timer, no course, no
 * trim cues. The view a sailor wants when they don't care about anything
 * but "how fast and which way?" — perfect for a passage delivery, or a
 * crew member who's not tactically engaged.
 *
 * Available in both race and cruise modes.
 */

import { Text, View } from 'tamagui';

import { useBoatStore } from '../stores/useBoatStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';
import { metresPerSecondToKnots } from '../utils/format';
import type { DashboardComponentProps, DashboardDefinition } from './types';

function BigNumbersDashboard({ variant }: DashboardComponentProps) {
  const theme = getTheme(variant);
  const sog = useBoatStore((s) => s.sog);
  const cog = useBoatStore((s) => s.cog);
  const speedUnit = useSettingsStore((s) => s.speedUnit);

  const sogKn = sog !== null ? metresPerSecondToKnots(sog) : null;
  const sogDisplay = (() => {
    if (sogKn === null) return '—';
    if (speedUnit === 'kn') return sogKn.toFixed(1);
    if (speedUnit === 'kmh') return (sogKn * 1.852).toFixed(1);
    return (sogKn * 1.15078).toFixed(1); // mph
  })();
  const speedUnitLabel = speedUnit === 'kn' ? 'kn' : speedUnit === 'kmh' ? 'km/h' : 'mph';

  const cogDisplay = cog === null ? '—' : `${Math.round(cog).toString().padStart(3, '0')}°`;

  return (
    <View
      flex={1}
      backgroundColor={theme.bg}
      paddingHorizontal={theme.space.md}
    >
      <View flex={1} alignItems="center" justifyContent="center">
        <Text
          color={theme.text.muted}
          fontSize={theme.type.label.size * 1.2}
          fontWeight="700"
          letterSpacing={3}
          marginBottom={theme.space.xs}
        >
          SOG
        </Text>
        <Text
          color={theme.text.primary}
          fontSize={220}
          fontWeight="700"
          lineHeight={220}
          letterSpacing={-8}
          textAlign="center"
        >
          {sogDisplay}
        </Text>
        <Text
          color={theme.text.secondary}
          fontSize={theme.type.h1.size}
          fontWeight="700"
          marginTop={-theme.space.sm}
        >
          {speedUnitLabel}
        </Text>
      </View>

      <View
        alignItems="center"
        justifyContent="center"
        paddingVertical={theme.space.lg}
        borderTopWidth={1}
        borderTopColor={theme.border}
      >
        <Text
          color={theme.text.muted}
          fontSize={theme.type.label.size * 1.2}
          fontWeight="700"
          letterSpacing={3}
          marginBottom={theme.space.xs}
        >
          COG
        </Text>
        <Text
          color={theme.text.primary}
          fontSize={120}
          fontWeight="700"
          lineHeight={120}
          letterSpacing={-4}
        >
          {cogDisplay}
        </Text>
      </View>
    </View>
  );
}

export const bigNumbersDashboard: DashboardDefinition = {
  id: 'big-numbers',
  name: 'Big numbers',
  shortName: 'Numbers',
  category: 'cruise',
  raceOnly: false,
  cruiseOnly: false,
  Component: BigNumbersDashboard,
};
