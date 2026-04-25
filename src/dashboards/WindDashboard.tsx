/**
 * WindDashboard — fullscreen wind picture.
 *
 * Sailors without instruments enter manual TWD/TWS in Settings before a
 * start. This dashboard turns those numbers + the boat's COG into the
 * three things tacticians actually care about:
 *   - true wind direction relative to the boat (compass-rose-ish glyph)
 *   - true wind angle (TWA) — abs delta, big number
 *   - true wind speed (TWS) — knots, big number
 *   - rolling shift bar at the bottom
 *
 * Honest fallback when manualTrueWindDegrees / manualTrueWindKn are null
 * — a single line directing the sailor to set them.
 *
 * Pure render. Reads from useSettingsStore + useBoatStore. No controls.
 */

import { Text, View } from 'tamagui';

import { WindShiftBar } from '../components/WindShiftBar';
import { useWindShiftTracker } from '../hooks/useWindShiftTracker';
import { useBoatStore } from '../stores/useBoatStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';
import type { DashboardComponentProps, DashboardDefinition } from './types';

function WindDashboard({ variant }: DashboardComponentProps) {
  const theme = getTheme(variant);
  const trueWindDeg = useSettingsStore((s) => s.manualTrueWindDegrees);
  const trueWindKn = useSettingsStore((s) => s.manualTrueWindKn);
  const cog = useBoatStore((s) => s.cog);
  const shift = useWindShiftTracker();

  if (trueWindDeg === null || trueWindKn === null) {
    return (
      <View
        flex={1}
        backgroundColor={theme.bg}
        alignItems="center"
        justifyContent="center"
        paddingHorizontal={theme.space.lg}
      >
        <Text
          color={theme.text.muted}
          fontSize={theme.type.label.size * 1.2}
          fontWeight="700"
          letterSpacing={3}
          marginBottom={theme.space.md}
        >
          WIND
        </Text>
        <Text
          color={theme.text.primary}
          fontSize={theme.type.h1.size}
          fontWeight="700"
          textAlign="center"
          marginBottom={theme.space.sm}
        >
          No wind set
        </Text>
        <Text
          color={theme.text.muted}
          fontSize={theme.type.body.size}
          textAlign="center"
        >
          Settings → Me → Wind direction / speed
        </Text>
      </View>
    );
  }

  // TWA = wind direction relative to boat heading. We show abs(TWA) as the
  // big number with a P/S indicator so the helm can read it like an
  // analogue dial without doing trig in their head.
  const cogVal = cog ?? 0;
  const relative = ((trueWindDeg - cogVal + 540) % 360) - 180; // -180..180
  const twaAbs = Math.abs(relative);
  const tackSide = relative >= 0 ? 'STARBOARD' : 'PORT'; // wind from starboard = starboard tack
  const beatLabel = pointOfSailLabel(twaAbs);

  return (
    <View flex={1} backgroundColor={theme.bg} paddingHorizontal={theme.space.md}>
      <View alignItems="center" paddingTop={theme.space.lg}>
        <Text
          color={theme.text.muted}
          fontSize={theme.type.label.size * 1.2}
          fontWeight="700"
          letterSpacing={3}
        >
          WIND
        </Text>
      </View>

      <View
        flex={1}
        flexDirection="row"
        alignItems="center"
        justifyContent="space-around"
        paddingVertical={theme.space.md}
      >
        <View alignItems="center" flex={1}>
          <Text
            color={theme.text.muted}
            fontSize={theme.type.micro.size}
            fontWeight={theme.type.micro.weight as '600'}
            letterSpacing={theme.type.micro.letterSpacing}
            marginBottom={theme.space.xs}
          >
            TWA · {tackSide}
          </Text>
          <Text
            color={theme.text.primary}
            fontSize={120}
            fontWeight="700"
            lineHeight={120}
            letterSpacing={-4}
          >
            {Math.round(twaAbs)}°
          </Text>
          <Text
            color={theme.text.secondary}
            fontSize={theme.type.body.size}
            marginTop={theme.space.xs}
          >
            {beatLabel}
          </Text>
        </View>

        <View alignItems="center" flex={1}>
          <Text
            color={theme.text.muted}
            fontSize={theme.type.micro.size}
            fontWeight={theme.type.micro.weight as '600'}
            letterSpacing={theme.type.micro.letterSpacing}
            marginBottom={theme.space.xs}
          >
            TWS · TWD
          </Text>
          <Text
            color={theme.text.primary}
            fontSize={120}
            fontWeight="700"
            lineHeight={120}
            letterSpacing={-4}
          >
            {trueWindKn.toFixed(0)}
          </Text>
          <Text
            color={theme.text.secondary}
            fontSize={theme.type.body.size}
            marginTop={theme.space.xs}
          >
            kn · {Math.round(trueWindDeg)}°T
          </Text>
        </View>
      </View>

      <View paddingBottom={theme.space.md}>
        <WindShiftBar snapshot={shift} variant={variant} />
      </View>
    </View>
  );
}

function pointOfSailLabel(twaAbs: number): string {
  if (twaAbs < 30) return 'In irons';
  if (twaAbs < 55) return 'Close-hauled';
  if (twaAbs < 75) return 'Close reach';
  if (twaAbs < 105) return 'Beam reach';
  if (twaAbs < 135) return 'Broad reach';
  if (twaAbs < 165) return 'Run';
  return 'Dead run';
}

export const windDashboard: DashboardDefinition = {
  id: 'wind',
  name: 'Wind',
  category: 'tactical',
  raceOnly: false,
  cruiseOnly: false,
  Component: WindDashboard,
};
