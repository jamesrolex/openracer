/**
 * Phase 0 HomeScreen. Shows live GPS data plus connectivity and mode.
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

import { useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { BigNumber } from '../components/BigNumber';
import { ConnectionBadge } from '../components/ConnectionBadge';
import { ModeToggle } from '../components/ModeToggle';
import { useConnectivity } from '../hooks/useConnectivity';
import { useGPS } from '../hooks/useGPS';
import { useBoatStore } from '../stores/useBoatStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';
import { formatBearing, formatDistance, formatLatLon, metresPerSecondToKnots } from '../utils/format';

const STALE_AFTER_MS = 3000;

export function HomeScreen() {
  const nightMode = useSettingsStore((state) => state.nightMode);
  const coordFormat = useSettingsStore((state) => state.coordFormat);
  const theme = getTheme(nightMode ? 'night' : 'day');

  const gps = useGPS();
  const connectivity = useConnectivity();

  const mode = useBoatStore((state) => state.mode);
  const setNavigation = useBoatStore((state) => state.setNavigation);
  const setConnectivity = useBoatStore((state) => state.setConnectivity);
  const setMode = useBoatStore((state) => state.setMode);

  useEffect(() => {
    setNavigation({
      position: gps.position,
      sog: gps.sog,
      cog: gps.cog,
      heading: gps.heading,
      accuracy: gps.accuracy,
      lastUpdate: gps.lastUpdate,
    });
  }, [gps.position, gps.sog, gps.cog, gps.heading, gps.accuracy, gps.lastUpdate, setNavigation]);

  useEffect(() => {
    setConnectivity(connectivity);
  }, [connectivity, setConnectivity]);

  const now = Date.now();
  const lastUpdateMs = gps.lastUpdate ? new Date(gps.lastUpdate).getTime() : null;
  const stale = lastUpdateMs === null ? true : now - lastUpdateMs > STALE_AFTER_MS;

  const sogDisplay =
    gps.sog === null ? '—' : metresPerSecondToKnots(gps.sog).toFixed(1);
  const cogDisplay = gps.cog === null ? '—' : formatBearing(gps.cog).replace('°', '');
  const coordDisplay =
    gps.position === null
      ? { lat: '—', lon: '—' }
      : splitFormattedLatLon(
          formatLatLon(gps.position.latitude, gps.position.longitude, coordFormat),
        );

  const accuracyDisplay =
    gps.accuracy === null ? '—' : `GPS ${formatDistance(gps.accuracy, 'm')}`;
  const freshnessDisplay =
    lastUpdateMs === null ? 'waiting for fix' : `updated ${describeAge(now - lastUpdateMs)}`;

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
            <BigNumber label="SOG" value={sogDisplay} unit="kn" emphasis="primary" stale={stale} variant={variant} />
            <BigNumber label="COG" value={cogDisplay} unit="°" emphasis="primary" stale={stale} variant={variant} />
          </View>
          <View style={styles.row}>
            <BigNumber label="LAT" value={coordDisplay.lat} emphasis="secondary" stale={stale} variant={variant} />
            <BigNumber label="LON" value={coordDisplay.lon} emphasis="secondary" stale={stale} variant={variant} />
          </View>
        </View>

        <Text style={styles.meta}>
          {accuracyDisplay} · {freshnessDisplay}
        </Text>

        {gps.permissionStatus === 'denied' ? (
          <Text style={styles.permissionNote}>
            Location access is off. Open Settings to enable it for OpenRacer — the app needs GPS
            to show your boat&apos;s position.
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function splitFormattedLatLon(combined: string): { lat: string; lon: string } {
  const [lat, lon] = combined.split(', ');
  return { lat: lat ?? '—', lon: lon ?? '—' };
}

function describeAge(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds} s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} h ago`;
}
