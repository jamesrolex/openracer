/**
 * Phase 0 HomeScreen. Reads boat state from useBoatStore. The actual GPS
 * and connectivity hooks are driven once by useLiveTelemetry (mounted in
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
 *   GPS ±3 m · updated 1 s ago
 */

import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { BigNumber } from '../components/BigNumber';
import { ConnectionBadge } from '../components/ConnectionBadge';
import { ModeToggle } from '../components/ModeToggle';
import { useBoatStore } from '../stores/useBoatStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';
import { formatBearing, formatDistance, metresPerSecondToKnots } from '../utils/format';

const STALE_AFTER_MS = 3000;
const PLACEHOLDER = '—';

export function HomeScreen() {
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
  // Phase 0 plan calls for decimal coords on HomeScreen. User's coord-format
  // preference governs other screens (Mark library, course entry, etc.).
  const latDisplay = position === null ? PLACEHOLDER : position.latitude.toFixed(4);
  const lonDisplay = position === null ? PLACEHOLDER : position.longitude.toFixed(4);

  const accuracyDisplay = accuracy === null ? PLACEHOLDER : `GPS ${formatDistance(accuracy, 'm')}`;
  const freshnessDisplay =
    lastUpdateMs === null ? 'waiting for fix' : `updated ${describeAge(now - lastUpdateMs)}`;

  const sogEmphasis = sog === null ? 'muted' : 'primary';
  const cogEmphasis = cog === null ? 'muted' : 'primary';
  const latEmphasis = position === null ? 'muted' : 'secondary';
  const lonEmphasis = position === null ? 'muted' : 'secondary';

  const styles = StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    root: {
      flex: 1,
      paddingHorizontal: theme.space.md,
      paddingTop: theme.space.sm,
      paddingBottom: theme.space.md,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.space.lg,
    },
    grid: {
      flex: 1,
      justifyContent: 'space-evenly',
    },
    row: {
      flexDirection: 'row',
    },
    meta: {
      color: theme.text.muted,
      fontSize: theme.type.caption.size,
      fontWeight: theme.type.caption.weight as '400',
      lineHeight: theme.type.caption.lineHeight,
      textAlign: 'center',
      marginTop: theme.space.sm,
    },
    permissionNote: {
      color: theme.text.secondary,
      fontSize: theme.type.body.size,
      lineHeight: theme.type.body.lineHeight,
      textAlign: 'center',
      paddingHorizontal: theme.space.lg,
      marginTop: theme.space.md,
    },
  });

  const variant = nightMode ? 'night' : 'day';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.root}>
        <View style={styles.topBar}>
          <ConnectionBadge mode={connectivity} variant={variant} />
          <ModeToggle mode={mode} onChange={setMode} variant={variant} />
        </View>

        <View style={styles.grid}>
          <View style={styles.row}>
            <BigNumber label="SOG" value={sogDisplay} unit="kn" emphasis={sogEmphasis} stale={stale} variant={variant} />
            <BigNumber label="COG" value={cogDisplay} unit="°" emphasis={cogEmphasis} stale={stale} variant={variant} />
          </View>
          <View style={styles.row}>
            <BigNumber label="LAT" value={latDisplay} unit="°" emphasis={latEmphasis} stale={stale} variant={variant} />
            <BigNumber label="LON" value={lonDisplay} unit="°" emphasis={lonEmphasis} stale={stale} variant={variant} />
          </View>
        </View>

        <Text style={styles.meta}>
          {accuracyDisplay} · {freshnessDisplay}
        </Text>

        {permissionStatus === 'denied' ? (
          <Text style={styles.permissionNote}>
            Location access is off. Open Settings to enable it for OpenRacer — the app needs GPS
            to show your boat&apos;s position.
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function describeAge(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds} s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} h ago`;
}
