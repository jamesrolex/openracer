/**
 * RaceSessionScreen — single session detail. Shows summary stats + a
 * simple list of recent track points. When MapLibre lands in Phase 2
 * this screen grows a chart view with the track plotted.
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';

import { buildGpx, gpxFilename } from '../domain/gpxExport';
import { computeTrackStats, formatDuration } from '../domain/trackStats';
import type { RootStackScreenProps } from '../navigation';
import {
  getRaceSession,
  listTrackPoints,
  type TrackPoint,
} from '../stores/raceSessionsRepo';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';
import type { RaceSession } from '../types/race';
import { formatLatLon } from '../utils/format';

export function RaceSessionScreen({
  navigation,
  route,
}: RootStackScreenProps<'RaceSession'>) {
  const nightMode = useSettingsStore((s) => s.nightMode);
  const theme = getTheme(nightMode ? 'night' : 'day');

  const [session, setSession] = useState<RaceSession | null>(null);
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  async function exportGpx() {
    if (!session) return;
    setExporting(true);
    try {
      const xml = buildGpx({ session, points });
      const filename = gpxFilename(session);
      const uri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(uri, xml, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert(
          'Sharing not available',
          'This device can’t open the share sheet. The file was saved at:\n' + uri,
        );
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/gpx+xml',
        dialogTitle: 'Share race track',
        UTI: 'com.topografix.gpx',
      });
    } catch (err) {
      Alert.alert(
        'Export failed',
        err instanceof Error ? err.message : 'Could not write the GPX file.',
      );
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const s = await getRaceSession(route.params.sessionId);
      const p = await listTrackPoints(route.params.sessionId);
      setSession(s);
      setPoints(p);
      setLoading(false);
    })();
  }, [route.params.sessionId]);

  const stats = useMemo(() => computeTrackStats(points), [points]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.space.md,
          paddingTop: theme.space.sm,
          paddingBottom: theme.space.xl,
        }}
      >
        <View
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          marginBottom={theme.space.md}
        >
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Text
              color={theme.accent}
              fontSize={theme.type.body.size}
              fontWeight={theme.type.bodySemi.weight as '600'}
            >
              ← Back
            </Text>
          </Pressable>
          <Text
            color={theme.text.primary}
            fontSize={theme.type.h2.size}
            fontWeight={theme.type.h2.weight as '600'}
          >
            Race
          </Text>
          {session && points.length > 0 ? (
            <Pressable
              onPress={() => void exportGpx()}
              disabled={exporting}
              hitSlop={8}
              accessibilityLabel="Export GPX"
            >
              <Text
                color={theme.accent}
                fontSize={theme.type.body.size}
                fontWeight={theme.type.bodySemi.weight as '600'}
                opacity={exporting ? 0.5 : 1}
              >
                {exporting ? 'Exporting…' : 'Export GPX'}
              </Text>
            </Pressable>
          ) : (
            <View width={44} />
          )}
        </View>

        {loading ? (
          <View alignItems="center" paddingVertical={theme.space.xl}>
            <ActivityIndicator color={theme.text.muted} />
            <Text color={theme.text.muted} marginTop={theme.space.sm}>
              Loading…
            </Text>
          </View>
        ) : !session ? (
          <View alignItems="center" paddingVertical={theme.space.xl}>
            <Text color={theme.text.muted}>Session not found.</Text>
          </View>
        ) : (
          <>
            <Label theme={theme}>Summary</Label>
            <View
              padding={theme.space.md}
              borderRadius={theme.radius.lg}
              borderColor={theme.border}
              borderWidth={1}
              marginBottom={theme.space.md}
            >
              <StatRow theme={theme} label="State" value={session.state.toUpperCase()} />
              <StatRow theme={theme} label="Started" value={session.startedAt.replace('T', ' ').slice(0, 19)} />
              <StatRow
                theme={theme}
                label="Finished"
                value={
                  session.finishedAt
                    ? session.finishedAt.replace('T', ' ').slice(0, 19)
                    : '—'
                }
              />
              <StatRow
                theme={theme}
                label="Duration"
                value={
                  stats.durationSeconds > 0
                    ? formatDuration(stats.durationSeconds)
                    : '—'
                }
              />
              <StatRow
                theme={theme}
                label="Distance"
                value={
                  stats.distanceMetres > 0
                    ? `${stats.distanceNm.toFixed(2)} nm`
                    : '—'
                }
              />
              <StatRow
                theme={theme}
                label="Max SOG"
                value={
                  stats.maxSogKnots === null
                    ? '—'
                    : `${stats.maxSogKnots.toFixed(1)} kn`
                }
              />
              <StatRow
                theme={theme}
                label="Avg SOG"
                value={
                  stats.averageSogKnots === null
                    ? '—'
                    : `${stats.averageSogKnots.toFixed(1)} kn`
                }
              />
              <StatRow theme={theme} label="Track points" value={`${stats.pointCount}`} />
            </View>

            {stats.boundingBox ? (
              <>
                <Label theme={theme}>Area sailed</Label>
                <View
                  padding={theme.space.md}
                  borderRadius={theme.radius.lg}
                  borderColor={theme.border}
                  borderWidth={1}
                  marginBottom={theme.space.md}
                >
                  <StatRow
                    theme={theme}
                    label="NE corner"
                    value={formatLatLon(
                      stats.boundingBox.maxLat,
                      stats.boundingBox.maxLon,
                      'dmm',
                    )}
                  />
                  <StatRow
                    theme={theme}
                    label="SW corner"
                    value={formatLatLon(
                      stats.boundingBox.minLat,
                      stats.boundingBox.minLon,
                      'dmm',
                    )}
                  />
                </View>
              </>
            ) : null}

            <Label theme={theme}>Recent points</Label>
            {points.slice(-20).reverse().map((p) => (
              <View
                key={p.id}
                flexDirection="row"
                justifyContent="space-between"
                paddingVertical={theme.space.xs}
                paddingHorizontal={theme.space.sm}
                borderBottomColor={theme.border}
                borderBottomWidth={1}
              >
                <Text
                  color={theme.text.muted}
                  fontSize={theme.type.caption.size}
                  style={{ fontFamily: 'Menlo' }}
                >
                  {p.recordedAt.slice(11, 19)}
                </Text>
                <Text
                  color={theme.text.primary}
                  fontSize={theme.type.caption.size}
                  style={{ fontFamily: 'Menlo' }}
                >
                  {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
                </Text>
                <Text
                  color={theme.text.muted}
                  fontSize={theme.type.caption.size}
                  style={{ fontFamily: 'Menlo' }}
                >
                  {p.sog === null ? '—' : `${(p.sog / 0.5144).toFixed(1)}kn`}
                </Text>
              </View>
            ))}

            <Text
              color={theme.text.muted}
              fontSize={theme.type.caption.size}
              lineHeight={theme.type.caption.lineHeight}
              marginTop={theme.space.md}
              textAlign="center"
            >
              A chart view lands with MapLibre in Phase 2.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Label({
  children,
  theme,
}: {
  children: string;
  theme: ReturnType<typeof getTheme>;
}) {
  return (
    <Text
      color={theme.text.muted}
      fontSize={theme.type.label.size}
      fontWeight={theme.type.label.weight as '600'}
      letterSpacing={theme.type.label.letterSpacing}
      marginBottom={theme.space.xs}
    >
      {children.toUpperCase()}
    </Text>
  );
}

function StatRow({
  theme,
  label,
  value,
}: {
  theme: ReturnType<typeof getTheme>;
  label: string;
  value: string;
}) {
  return (
    <View flexDirection="row" justifyContent="space-between" paddingVertical={2}>
      <Text color={theme.text.muted} fontSize={theme.type.caption.size}>
        {label}
      </Text>
      <Text
        color={theme.text.primary}
        fontSize={theme.type.caption.size}
        style={{ fontFamily: 'Menlo' }}
      >
        {value}
      </Text>
    </View>
  );
}
