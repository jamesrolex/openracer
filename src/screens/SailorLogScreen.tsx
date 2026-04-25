/**
 * SailorLogScreen — your personal lifetime sailing log.
 *
 * Sections:
 *   - Lifetime banner: total nm + race count + days at sea + max SOG
 *   - Recent boats: list of joined boats with join date + marks added
 *   - Recent races: top 5 by date with distance + state
 *   - Cruise log: current trip + lifetime cruise + max SOG
 *
 * Read-only. Trip reset still lives on Home so this screen never
 * mutates persisted data.
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';

import { computeTrackDistance } from '../domain/courseDistance';
import { computeAggregates } from '../domain/sailorLog';
import type { RootStackScreenProps } from '../navigation';
import {
  listJoinedBoats,
  type JoinedBoat,
} from '../stores/joinedBoatsRepo';
import {
  listRaceSessions,
  listTrackPoints,
} from '../stores/raceSessionsRepo';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useTripStore } from '../stores/useTripStore';
import { getTheme } from '../theme/theme';
import type { RaceSession } from '../types/race';

interface RaceRow {
  session: RaceSession;
  distanceMetres: number;
}

export function SailorLogScreen({
  navigation,
}: RootStackScreenProps<'SailorLog'>) {
  const themeVariant = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeVariant);

  const lifetimeCruiseMetres = useTripStore((s) => s.lifetimeCruiseMetres);
  const lifetimeMaxSogMps = useTripStore((s) => s.lifetimeMaxSogMps);
  const tripDistanceMetres = useTripStore((s) => s.distanceMetres);
  const tripStartedAt = useTripStore((s) => s.startedAt);

  const [loading, setLoading] = useState(true);
  const [aggregates, setAggregates] = useState<ReturnType<
    typeof computeAggregates
  > | null>(null);
  const [boats, setBoats] = useState<JoinedBoat[]>([]);
  const [races, setRaces] = useState<RaceRow[]>([]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const [sessions, joinedBoats] = await Promise.all([
        listRaceSessions(),
        listJoinedBoats(),
      ]);
      const pointsBySession = new Map(
        await Promise.all(
          sessions.map(async (s) => {
            const pts = await listTrackPoints(s.id);
            return [s.id, pts] as const;
          }),
        ),
      );
      const aggs = computeAggregates({
        sessions,
        pointsBySession,
        lifetimeCruiseMetres,
        lifetimeCruiseMaxSogMps: lifetimeMaxSogMps,
      });
      const top5 = sessions.slice(0, 5).map((s) => {
        const pts = pointsBySession.get(s.id) ?? [];
        return {
          session: s,
          distanceMetres: computeTrackDistance(
            pts.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
          ),
        };
      });
      setAggregates(aggs);
      setBoats(joinedBoats);
      setRaces(top5);
      setLoading(false);
    })();
  }, [lifetimeCruiseMetres, lifetimeMaxSogMps]);

  const tripNm = tripDistanceMetres / 1852;
  const lifetimeCruiseNm = lifetimeCruiseMetres / 1852;
  const totalLifetimeNm = aggregates ? aggregates.totalLifetimeMetres / 1852 : 0;
  const totalRaceNm = aggregates ? aggregates.totalRaceMetres / 1852 : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <View paddingHorizontal={theme.space.md} paddingTop={theme.space.sm} flex={1}>
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
            My sailing log
          </Text>
          <View width={44} />
        </View>

        {loading || !aggregates ? (
          <View flex={1} alignItems="center" justifyContent="center">
            <ActivityIndicator color={theme.text.muted} />
            <Text color={theme.text.muted} marginTop={theme.space.sm}>
              Loading…
            </Text>
          </View>
        ) : (
          <FlatList
            ListHeaderComponent={
              <>
                {/* Lifetime banner */}
                <View
                  padding={theme.space.lg}
                  borderRadius={theme.radius.lg}
                  borderWidth={1}
                  borderColor={theme.border}
                  backgroundColor={theme.surface}
                  marginBottom={theme.space.md}
                >
                  <Text
                    color={theme.text.muted}
                    fontSize={theme.type.micro.size}
                    fontWeight={theme.type.micro.weight as '600'}
                    letterSpacing={theme.type.micro.letterSpacing}
                  >
                    LIFETIME
                  </Text>
                  <Text
                    color={theme.text.primary}
                    fontSize={48}
                    fontWeight="700"
                    lineHeight={48}
                    marginTop={theme.space.xs}
                    style={{ fontFamily: 'Menlo' }}
                  >
                    {totalLifetimeNm.toFixed(1)} nm
                  </Text>
                  <Text
                    color={theme.text.muted}
                    fontSize={theme.type.caption.size}
                    marginTop={theme.space.xs}
                  >
                    {totalRaceNm.toFixed(1)} nm raced ·{' '}
                    {lifetimeCruiseNm.toFixed(1)} nm cruised
                  </Text>

                  <View
                    flexDirection="row"
                    justifyContent="space-between"
                    marginTop={theme.space.md}
                  >
                    <Stat
                      theme={theme}
                      label="Races"
                      value={`${aggregates.finishedRaceCount}`}
                      sub={`${aggregates.abandonedRaceCount} abandoned`}
                    />
                    <Stat
                      theme={theme}
                      label="Days at sea"
                      value={`${aggregates.daysAtSea}`}
                    />
                    <Stat
                      theme={theme}
                      label="Max SOG"
                      value={`${(aggregates.maxSogMps * 1.9438).toFixed(1)}`}
                      sub="kn"
                    />
                  </View>
                </View>

                {/* Boats */}
                <View
                  padding={theme.space.md}
                  borderRadius={theme.radius.lg}
                  borderWidth={1}
                  borderColor={theme.border}
                  marginBottom={theme.space.md}
                >
                  <Text
                    color={theme.text.muted}
                    fontSize={theme.type.micro.size}
                    fontWeight={theme.type.micro.weight as '600'}
                    letterSpacing={theme.type.micro.letterSpacing}
                    marginBottom={theme.space.xs}
                  >
                    BOATS JOINED
                  </Text>
                  {boats.length === 0 ? (
                    <Text
                      color={theme.text.muted}
                      fontSize={theme.type.caption.size}
                      lineHeight={theme.type.caption.lineHeight}
                    >
                      No boats joined yet. When a captain shows you their boat-
                      profile QR and you scan it, the boat appears here.
                    </Text>
                  ) : (
                    boats.map((b) => (
                      <View
                        key={b.id}
                        flexDirection="row"
                        justifyContent="space-between"
                        paddingVertical={theme.space.xs}
                        borderBottomWidth={1}
                        borderBottomColor={theme.border}
                      >
                        <View flex={1}>
                          <Text
                            color={theme.text.primary}
                            fontSize={theme.type.bodySemi.size}
                            fontWeight={theme.type.bodySemi.weight as '600'}
                          >
                            {b.boatName}
                          </Text>
                          <Text
                            color={theme.text.muted}
                            fontSize={theme.type.caption.size}
                            marginTop={2}
                          >
                            {b.senderName} ·{' '}
                            {new Date(b.joinedAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </Text>
                        </View>
                        <View alignItems="flex-end">
                          <Text
                            color={theme.text.secondary}
                            fontSize={theme.type.caption.size}
                          >
                            {b.marksAdded} marks added
                          </Text>
                          {b.polarReceived ? (
                            <Text
                              color={theme.status.success}
                              fontSize={theme.type.micro.size}
                              fontWeight={theme.type.micro.weight as '600'}
                            >
                              + polar
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ))
                  )}
                </View>

                {/* Recent races */}
                <View
                  padding={theme.space.md}
                  borderRadius={theme.radius.lg}
                  borderWidth={1}
                  borderColor={theme.border}
                  marginBottom={theme.space.md}
                >
                  <Text
                    color={theme.text.muted}
                    fontSize={theme.type.micro.size}
                    fontWeight={theme.type.micro.weight as '600'}
                    letterSpacing={theme.type.micro.letterSpacing}
                    marginBottom={theme.space.xs}
                  >
                    RECENT RACES
                  </Text>
                  {races.length === 0 ? (
                    <Text color={theme.text.muted} fontSize={theme.type.caption.size}>
                      No races recorded yet.
                    </Text>
                  ) : (
                    races.map((r) => (
                      <Pressable
                        key={r.session.id}
                        onPress={() =>
                          navigation.navigate('RaceSession', {
                            sessionId: r.session.id,
                          })
                        }
                      >
                        <View
                          flexDirection="row"
                          justifyContent="space-between"
                          paddingVertical={theme.space.xs}
                          borderBottomWidth={1}
                          borderBottomColor={theme.border}
                        >
                          <View flex={1}>
                            <Text
                              color={theme.text.primary}
                              fontSize={theme.type.bodySemi.size}
                              fontWeight={theme.type.bodySemi.weight as '600'}
                            >
                              {new Date(r.session.startedAt).toLocaleDateString(
                                'en-GB',
                                {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                },
                              )}
                            </Text>
                            <Text
                              color={theme.text.muted}
                              fontSize={theme.type.caption.size}
                              marginTop={2}
                            >
                              {r.session.state.toUpperCase()}
                            </Text>
                          </View>
                          <Text
                            color={theme.text.secondary}
                            fontSize={theme.type.caption.size}
                          >
                            {(r.distanceMetres / 1852).toFixed(2)} nm
                          </Text>
                        </View>
                      </Pressable>
                    ))
                  )}
                  <Pressable
                    onPress={() => navigation.navigate('RaceSessions')}
                    hitSlop={8}
                  >
                    <Text
                      color={theme.accent}
                      fontSize={theme.type.caption.size}
                      fontWeight={theme.type.bodySemi.weight as '600'}
                      marginTop={theme.space.sm}
                    >
                      All races →
                    </Text>
                  </Pressable>
                </View>

                {/* Cruise card */}
                <View
                  padding={theme.space.md}
                  borderRadius={theme.radius.lg}
                  borderWidth={1}
                  borderColor={theme.border}
                  marginBottom={theme.space.md}
                >
                  <Text
                    color={theme.text.muted}
                    fontSize={theme.type.micro.size}
                    fontWeight={theme.type.micro.weight as '600'}
                    letterSpacing={theme.type.micro.letterSpacing}
                    marginBottom={theme.space.xs}
                  >
                    CRUISE LOG
                  </Text>
                  <View flexDirection="row" justifyContent="space-between">
                    <Stat
                      theme={theme}
                      label="Current trip"
                      value={`${tripNm.toFixed(2)}`}
                      sub={
                        tripStartedAt
                          ? `since ${new Date(tripStartedAt).toLocaleDateString(
                              'en-GB',
                              { day: '2-digit', month: 'short' },
                            )}`
                          : 'not started'
                      }
                    />
                    <Stat
                      theme={theme}
                      label="Lifetime cruise"
                      value={`${lifetimeCruiseNm.toFixed(1)} nm`}
                    />
                    <Stat
                      theme={theme}
                      label="Lifetime max SOG"
                      value={`${(lifetimeMaxSogMps * 1.9438).toFixed(1)} kn`}
                    />
                  </View>
                </View>
              </>
            }
            data={[]}
            renderItem={() => null}
            keyExtractor={() => 'unused'}
            contentContainerStyle={{ paddingBottom: theme.space.xl }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function Stat({
  theme,
  label,
  value,
  sub,
}: {
  theme: ReturnType<typeof getTheme>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View flex={1}>
      <Text
        color={theme.text.muted}
        fontSize={theme.type.micro.size}
        fontWeight={theme.type.micro.weight as '600'}
        letterSpacing={theme.type.micro.letterSpacing}
      >
        {label.toUpperCase()}
      </Text>
      <Text
        color={theme.text.primary}
        fontSize={theme.type.bodySemi.size}
        fontWeight="700"
        marginTop={2}
      >
        {value}
      </Text>
      {sub ? (
        <Text color={theme.text.muted} fontSize={theme.type.caption.size}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}
