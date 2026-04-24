/**
 * HomeScreen. Reads boat state from useBoatStore. The actual GPS and
 * connectivity hooks are driven once by useLiveTelemetry (mounted in
 * App.tsx) — this screen is a pure reader.
 *
 * Layout (see skills/design-system "Primary data screen"):
 *   [ConnectionBadge]                          [ModeToggle]
 *
 *       SOG                 COG
 *        6.2                 284
 *        kn                  °
 *
 *       LAT                 LON
 *       52.8205             -4.5025
 *
 *   GPS ±3 m · updated 1 s ago                    [Marks →]
 */

import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';

import { BigNumber } from '../components/BigNumber';
import { ConnectionBadge } from '../components/ConnectionBadge';
import { ModeToggle } from '../components/ModeToggle';
import type { RootStackScreenProps } from '../navigation';
import { useBoatStore } from '../stores/useBoatStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';
import { formatBearing, formatDistance, formatLatLon, metresPerSecondToKnots } from '../utils/format';

const STALE_AFTER_MS = 3000;
const PLACEHOLDER = '—';

export function HomeScreen({ navigation }: RootStackScreenProps<'Home'>) {
  const nightMode = useSettingsStore((state) => state.nightMode);
  const theme = getTheme(nightMode ? 'night' : 'day');

  const position = useBoatStore((state) => state.position);
  const sog = useBoatStore((state) => state.sog);
  const cog = useBoatStore((state) => state.cog);
  const accuracy = useBoatStore((state) => state.accuracy);
  const lastUpdate = useBoatStore((state) => state.lastUpdate);
  const mode = useBoatStore((state) => state.mode);
  const connectivity = useBoatStore((state) => state.connectivity);
  const permissionStatus = useBoatStore((state) => state.permissionStatus);
  const setMode = useBoatStore((state) => state.setMode);

  const now = Date.now();
  const lastUpdateMs = lastUpdate ? new Date(lastUpdate).getTime() : null;
  const stale = lastUpdateMs === null ? true : now - lastUpdateMs > STALE_AFTER_MS;

  const sogDisplay = sog === null ? PLACEHOLDER : metresPerSecondToKnots(sog).toFixed(1);
  const cogDisplay = cog === null ? PLACEHOLDER : formatBearing(cog).replace('°', '');
  const { lat: latDisplay, lon: lonDisplay } = splitLatLonForDisplay(position);

  const accuracyDisplay = accuracy === null ? PLACEHOLDER : `GPS ${formatDistance(accuracy, 'm')}`;
  const freshnessDisplay =
    lastUpdateMs === null ? 'waiting for fix' : `updated ${describeAge(now - lastUpdateMs)}`;

  const sogEmphasis = sog === null ? 'muted' : 'primary';
  const cogEmphasis = cog === null ? 'muted' : 'primary';
  const latEmphasis = position === null ? 'muted' : 'secondary';
  const lonEmphasis = position === null ? 'muted' : 'secondary';

  const variant = nightMode ? 'night' : 'day';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <View
        flex={1}
        paddingHorizontal={theme.space.md}
        paddingTop={theme.space.sm}
        paddingBottom={theme.space.md}
      >
        <View
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          marginBottom={theme.space.lg}
        >
          <ConnectionBadge mode={connectivity} variant={variant} />
          <ModeToggle mode={mode} onChange={setMode} variant={variant} />
        </View>

        <View flex={1} justifyContent="space-evenly">
          <View flexDirection="row">
            <BigNumber label="SOG" value={sogDisplay} unit="kn" emphasis={sogEmphasis} stale={stale} variant={variant} />
            <BigNumber label="COG" value={cogDisplay} unit="°" emphasis={cogEmphasis} stale={stale} variant={variant} />
          </View>
          <View flexDirection="row">
            <BigNumber label="LAT" value={latDisplay} emphasis={latEmphasis} stale={stale} variant={variant} />
            <BigNumber label="LON" value={lonDisplay} emphasis={lonEmphasis} stale={stale} variant={variant} />
          </View>
        </View>

        <View
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          marginTop={theme.space.sm}
        >
          <Text
            color={theme.text.muted}
            fontSize={theme.type.caption.size}
            fontWeight={theme.type.caption.weight as '400'}
            lineHeight={theme.type.caption.lineHeight}
            flex={1}
          >
            {accuracyDisplay} · {freshnessDisplay}
          </Text>
          <Pressable
            onPress={() => navigation.navigate('MarkLibrary')}
            accessibilityLabel="Open mark library"
          >
            <Text
              color={theme.accent}
              fontSize={theme.type.caption.size}
              fontWeight={theme.type.bodySemi.weight as '600'}
            >
              Marks →
            </Text>
          </Pressable>
        </View>

        {permissionStatus === 'denied' ? (
          <Text
            color={theme.text.secondary}
            fontSize={theme.type.body.size}
            lineHeight={theme.type.body.lineHeight}
            textAlign="center"
            paddingHorizontal={theme.space.lg}
            marginTop={theme.space.md}
          >
            Location access is off. Open Settings to enable it for OpenRacer — the app needs GPS
            to show your boat&apos;s position.
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function splitLatLonForDisplay(
  position: { latitude: number; longitude: number } | null,
): { lat: string; lon: string } {
  if (position === null) return { lat: PLACEHOLDER, lon: PLACEHOLDER };
  const combined = formatLatLon(position.latitude, position.longitude, 'decimal');
  const [lat, lon] = combined.split(', ');
  return { lat: lat ?? PLACEHOLDER, lon: lon ?? PLACEHOLDER };
}

function describeAge(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds} s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} h ago`;
}
