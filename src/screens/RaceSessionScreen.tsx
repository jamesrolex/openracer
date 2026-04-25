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
import { computeLegTimings, formatLegDuration } from '../domain/legTiming';
import { computeTrackStats, formatDuration } from '../domain/trackStats';
import type { RootStackScreenProps } from '../navigation';
import { getCourse } from '../stores/coursesRepo';
import { listMarks } from '../stores/marksRepo';
import {
  getRaceSession,
  listTrackPoints,
  type TrackPoint,
} from '../stores/raceSessionsRepo';
import { useSettingsStore } from '../stores/useSettingsStore';
import type { Course } from '../types/course';
import type { Mark } from '../types/mark';
import { getTheme } from '../theme/theme';
import type { RaceSession } from '../types/race';
import { formatLatLon } from '../utils/format';

export function RaceSessionScreen({
  navigation,
  route,
}: RootStackScreenProps<'RaceSession'>) {
  const themeVariant = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeVariant);

  const [session, setSession] = useState<RaceSession | null>(null);
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
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
      if (s?.courseId) {
        const c = await getCourse(s.courseId);
        setCourse(c);
        // Listing every mark is fine — repo caps at a few hundred and
        // legTiming only iterates the ids referenced by the legs.
        if (c) setMarks(await listMarks());
      }
      setLoading(false);
    })();
  }, [route.params.sessionId]);

  const stats = useMemo(() => computeTrackStats(points), [points]);
  const legTimings = useMemo(
    () =>
      course
        ? computeLegTimings(course.legs, points, marks)
        : { legs: [], totalDurationSeconds: 0, totalDistanceMetres: 0 },
    [course, points, marks],
  );

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

            {legTimings.legs.length > 0 ? (
              <>
                <Label theme={theme}>Leg breakdown</Label>
                <View
                  padding={theme.space.md}
                  borderRadius={theme.radius.lg}
                  borderColor={theme.border}
                  borderWidth={1}
                  marginBottom={theme.space.md}
                >
                  {legTimings.legs.map((leg, idx) => (
                    <View
                      key={leg.legId}
                      flexDirection="row"
                      justifyContent="space-between"
                      alignItems="baseline"
                      paddingVertical={theme.space.xs}
                      borderBottomWidth={idx < legTimings.legs.length - 1 ? 1 : 0}
                      borderBottomColor={theme.border}
                    >
                      <View flex={1} paddingRight={theme.space.sm}>
                        <Text
                          color={theme.text.primary}
                          fontSize={theme.type.body.size}
                          fontWeight={theme.type.bodySemi.weight as '600'}
                        >
                          {leg.index + 1}. {leg.legLabel}
                        </Text>
                        {leg.status === 'incomplete' ? (
                          <Text
                            color={theme.text.muted}
                            fontSize={theme.type.caption.size}
                          >
                            Mark not rounded
                          </Text>
                        ) : null}
                      </View>
                      <Text
                        color={theme.text.primary}
                        fontSize={theme.type.bodySemi.size}
                        fontWeight="700"
                        style={{ fontFamily: 'Menlo' }}
                      >
                        {formatLegDuration(leg.durationSeconds)}
                      </Text>
                      {leg.distanceMetres !== null ? (
                        <Text
                          color={theme.text.muted}
                          fontSize={theme.type.caption.size}
                          marginLeft={theme.space.sm}
                          style={{ fontFamily: 'Menlo', minWidth: 56, textAlign: 'right' }}
                        >
                          {(leg.distanceMetres / 1852).toFixed(2)} nm
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {session.finishedAt ? (
              <Pressable
                onPress={() =>
                  navigation.navigate('ShareFinish', { sessionId: session.id })
                }
                hitSlop={8}
              >
                <View
                  padding={theme.space.md}
                  marginBottom={theme.space.md}
                  borderRadius={theme.radius.lg}
                  borderColor={theme.accent}
                  borderWidth={1}
                  alignItems="center"
                >
                  <Text
                    color={theme.accent}
                    fontSize={theme.type.bodySemi.size}
                    fontWeight="700"
                  >
                    ⇪ Share finish
                  </Text>
                  <Text
                    color={theme.text.muted}
                    fontSize={theme.type.caption.size}
                    marginTop={2}
                  >
                    QR for competitors&apos; leaderboards.
                  </Text>
                </View>
              </Pressable>
            ) : null}

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
