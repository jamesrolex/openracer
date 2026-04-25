/**
 * LeaderboardScreen — list of races for which we've collected finish
 * records, drilling down to a single race's leaderboard.
 *
 * The data model is per-device: each phone collects scans of finish
 * records into its own SQLite table. Sorting is by elapsed seconds
 * ascending (fastest first). For Phase 1.15 there's no handicap
 * correction — this is line-honours only.
 *
 * Empty state explains how to populate the list (scan a competitor's
 * "Share finish" QR).
 */

import { useEffect, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';

import { formatLegDuration } from '../domain/legTiming';
import type { RootStackScreenProps } from '../navigation';
import {
  deleteFinishersForRace,
  listFinishersForRace,
  listLeaderboardRaces,
  type LeaderboardEntry,
} from '../stores/leaderboardRepo';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';

interface RaceSummary {
  raceName: string;
  gunAt: string;
  entryCount: number;
  fastestElapsedSeconds: number;
}

export function LeaderboardScreen({
  navigation,
}: RootStackScreenProps<'Leaderboard'>) {
  const themeVariant = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeVariant);
  const [races, setRaces] = useState<RaceSummary[]>([]);
  const [activeRace, setActiveRace] = useState<RaceSummary | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function refreshRaces() {
    setLoading(true);
    setRaces(await listLeaderboardRaces());
    setLoading(false);
  }

  useEffect(() => {
    void refreshRaces();
  }, []);

  async function openRace(r: RaceSummary) {
    setActiveRace(r);
    setEntries(await listFinishersForRace(r.raceName, r.gunAt));
  }

  function backToList() {
    setActiveRace(null);
    setEntries([]);
  }

  async function clearActiveRace() {
    if (!activeRace) return;
    await deleteFinishersForRace(activeRace.raceName, activeRace.gunAt);
    backToList();
    await refreshRaces();
  }

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
          <Pressable
            onPress={() => (activeRace ? backToList() : navigation.goBack())}
            hitSlop={8}
          >
            <Text
              color={theme.accent}
              fontSize={theme.type.body.size}
              fontWeight={theme.type.bodySemi.weight as '600'}
            >
              ← {activeRace ? 'Races' : 'Back'}
            </Text>
          </Pressable>
          <Text
            color={theme.text.primary}
            fontSize={theme.type.h2.size}
            fontWeight={theme.type.h2.weight as '600'}
          >
            Leaderboard
          </Text>
          <View width={44} />
        </View>

        {loading ? (
          <Text color={theme.text.muted}>Loading…</Text>
        ) : activeRace ? (
          <RaceLeaderboard
            theme={theme}
            race={activeRace}
            entries={entries}
            onClear={() => void clearActiveRace()}
          />
        ) : races.length === 0 ? (
          <View alignItems="center" paddingVertical={theme.space.xl}>
            <Text
              color={theme.text.primary}
              fontSize={theme.type.h2.size}
              fontWeight="700"
              textAlign="center"
              marginBottom={theme.space.sm}
            >
              No finishes yet
            </Text>
            <Text
              color={theme.text.muted}
              fontSize={theme.type.body.size}
              textAlign="center"
              paddingHorizontal={theme.space.lg}
            >
              Scan a competitor&apos;s &ldquo;Share finish&rdquo; QR or share your
              own from the race summary screen.
            </Text>
          </View>
        ) : (
          races.map((r) => (
            <Pressable key={`${r.raceName}-${r.gunAt}`} onPress={() => void openRace(r)}>
              <View
                padding={theme.space.md}
                marginBottom={theme.space.sm}
                borderRadius={theme.radius.lg}
                borderColor={theme.border}
                borderWidth={1}
              >
                <Text
                  color={theme.text.primary}
                  fontSize={theme.type.body.size}
                  fontWeight={theme.type.bodySemi.weight as '600'}
                >
                  {r.raceName}
                </Text>
                <Text
                  color={theme.text.muted}
                  fontSize={theme.type.caption.size}
                  marginTop={2}
                >
                  {new Date(r.gunAt).toLocaleString('en-GB', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                <View
                  flexDirection="row"
                  justifyContent="space-between"
                  marginTop={theme.space.xs}
                >
                  <Text color={theme.text.muted} fontSize={theme.type.caption.size}>
                    {r.entryCount} {r.entryCount === 1 ? 'boat' : 'boats'}
                  </Text>
                  <Text
                    color={theme.text.primary}
                    fontSize={theme.type.caption.size}
                    style={{ fontFamily: 'Menlo' }}
                  >
                    fastest {formatLegDuration(r.fastestElapsedSeconds)}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RaceLeaderboard({
  theme,
  race,
  entries,
  onClear,
}: {
  theme: ReturnType<typeof getTheme>;
  race: RaceSummary;
  entries: LeaderboardEntry[];
  onClear: () => void;
}) {
  return (
    <>
      <Text
        color={theme.text.primary}
        fontSize={theme.type.h2.size}
        fontWeight="700"
      >
        {race.raceName}
      </Text>
      <Text
        color={theme.text.muted}
        fontSize={theme.type.caption.size}
        marginBottom={theme.space.md}
      >
        Gun {new Date(race.gunAt).toLocaleString('en-GB')}
      </Text>

      <View
        borderRadius={theme.radius.lg}
        borderColor={theme.border}
        borderWidth={1}
        marginBottom={theme.space.md}
      >
        {entries.map((e, idx) => (
          <View
            key={e.id}
            flexDirection="row"
            alignItems="baseline"
            justifyContent="space-between"
            padding={theme.space.md}
            borderBottomWidth={idx < entries.length - 1 ? 1 : 0}
            borderBottomColor={theme.border}
          >
            <View flexDirection="row" alignItems="baseline">
              <Text
                color={theme.text.muted}
                fontSize={theme.type.bodySemi.size}
                fontWeight="700"
                style={{ fontFamily: 'Menlo', minWidth: 28 }}
              >
                {idx + 1}.
              </Text>
              <View>
                <Text
                  color={theme.text.primary}
                  fontSize={theme.type.body.size}
                  fontWeight={theme.type.bodySemi.weight as '600'}
                >
                  {e.boatName}
                </Text>
                <Text
                  color={theme.text.muted}
                  fontSize={theme.type.caption.size}
                  marginTop={2}
                >
                  Helmed by {e.senderName}
                </Text>
              </View>
            </View>
            <Text
              color={theme.text.primary}
              fontSize={theme.type.bodySemi.size}
              fontWeight="700"
              style={{ fontFamily: 'Menlo' }}
            >
              {formatLegDuration(e.elapsedSeconds)}
            </Text>
          </View>
        ))}
      </View>

      <Pressable onPress={onClear} hitSlop={8}>
        <Text
          color={theme.status.danger}
          fontSize={theme.type.caption.size}
          textAlign="center"
        >
          Clear this race&apos;s entries
        </Text>
      </Pressable>
    </>
  );
}
