/**
 * RaceSessionsScreen — list of past race sessions. Each row is tappable
 * to open the detail view. Swipe-to-delete removes the session and
 * cascades its track points.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, Text, View } from 'tamagui';

import type { RootStackScreenProps } from '../navigation';
import {
  countTrackPoints,
  deleteRaceSession,
  listRaceSessions,
} from '../stores/raceSessionsRepo';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';
import type { RaceSession } from '../types/race';

interface Row {
  session: RaceSession;
  points: number;
}

type RaceHistoryFilter =
  | 'all'
  | 'finished'
  | 'abandoned'
  | 'has-track'
  | 'this-week'
  | 'last-30-days';

const FILTER_TABS: { key: RaceHistoryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'finished', label: 'Finished' },
  { key: 'abandoned', label: 'Abandoned' },
  { key: 'has-track', label: 'Has track' },
  { key: 'this-week', label: 'This week' },
  { key: 'last-30-days', label: '30 days' },
];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function applyHistoryFilter(
  rows: Row[],
  query: string,
  filter: RaceHistoryFilter,
  now: number = Date.now(),
): Row[] {
  const q = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (q.length > 0) {
      const startedAt = row.session.startedAt.toLowerCase();
      const id = row.session.id.toLowerCase();
      if (!startedAt.includes(q) && !id.includes(q)) return false;
    }
    switch (filter) {
      case 'all':
        return true;
      case 'finished':
        return row.session.state === 'finished';
      case 'abandoned':
        return row.session.state === 'abandoned';
      case 'has-track':
        return row.points > 0;
      case 'this-week':
        return now - new Date(row.session.startedAt).getTime() < WEEK_MS;
      case 'last-30-days':
        return now - new Date(row.session.startedAt).getTime() < THIRTY_DAYS_MS;
    }
  });
}

export function RaceSessionsScreen({
  navigation,
}: RootStackScreenProps<'RaceSessions'>) {
  const nightMode = useSettingsStore((s) => s.nightMode);
  const theme = getTheme(nightMode ? 'night' : 'day');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RaceHistoryFilter>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const sessions = await listRaceSessions();
    const enriched: Row[] = await Promise.all(
      sessions.map(async (s) => ({ session: s, points: await countTrackPoints(s.id) })),
    );
    setRows(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const unsubscribe = navigation.addListener('focus', () => void load());
    return unsubscribe;
  }, [load, navigation]);

  const filteredRows = useMemo(
    () => applyHistoryFilter(rows, query, filter),
    [rows, query, filter],
  );

  function confirmDelete(row: Row) {
    Alert.alert(
      'Delete session?',
      `"${formatWhen(row.session.startedAt)}" will be removed along with ${row.points} track points.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteRaceSession(row.session.id);
            await load();
          },
        },
      ],
    );
  }

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
            Race history
          </Text>
          <View width={44} />
        </View>

        {!loading && rows.length > 0 ? (
          <>
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Search by date or id…"
              height={44}
              paddingHorizontal={theme.space.md}
              fontSize={theme.type.body.size}
              borderColor={theme.border}
              backgroundColor={theme.surface}
              color={theme.text.primary}
              placeholderTextColor={theme.text.muted}
              marginBottom={theme.space.sm}
            />
            <View flexDirection="row" flexWrap="wrap" marginBottom={theme.space.sm}>
              {FILTER_TABS.map((t) => {
                const active = filter === t.key;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => setFilter(t.key)}
                    accessibilityRole="tab"
                  >
                    <View
                      paddingVertical={theme.space.xs}
                      paddingHorizontal={theme.space.sm}
                      borderRadius={theme.radius.full}
                      backgroundColor={active ? theme.accent : 'transparent'}
                      borderColor={active ? theme.accent : theme.border}
                      borderWidth={1}
                      marginRight={theme.space.xs}
                      marginBottom={theme.space.xs}
                    >
                      <Text
                        color={active ? theme.bg : theme.text.secondary}
                        fontSize={theme.type.caption.size}
                        fontWeight={theme.type.bodySemi.weight as '600'}
                      >
                        {t.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Text
              color={theme.text.muted}
              fontSize={theme.type.caption.size}
              marginBottom={theme.space.xs}
            >
              {filteredRows.length} of {rows.length} {rows.length === 1 ? 'race' : 'races'}
            </Text>
          </>
        ) : null}

        {loading ? (
          <View flex={1} alignItems="center" justifyContent="center">
            <ActivityIndicator color={theme.text.muted} />
            <Text color={theme.text.muted} marginTop={theme.space.sm}>
              Loading…
            </Text>
          </View>
        ) : rows.length === 0 ? (
          <View flex={1} alignItems="center" justifyContent="center" padding={theme.space.lg}>
            <Text
              color={theme.text.muted}
              fontSize={theme.type.body.size}
              lineHeight={theme.type.body.lineHeight}
              textAlign="center"
            >
              No races recorded yet. Arm the timer and tracked points will
              appear here after the gun fires.
            </Text>
          </View>
        ) : filteredRows.length === 0 ? (
          <View flex={1} alignItems="center" justifyContent="center" padding={theme.space.lg}>
            <Text
              color={theme.text.muted}
              fontSize={theme.type.body.size}
              lineHeight={theme.type.body.lineHeight}
              textAlign="center"
            >
              No races match this filter. Tap a different chip or clear the search.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredRows}
            keyExtractor={(r) => r.session.id}
            contentContainerStyle={{ paddingBottom: theme.space.xl }}
            renderItem={({ item }) => (
              <Swipeable
                renderRightActions={() => (
                  <Pressable onPress={() => confirmDelete(item)}>
                    <View
                      justifyContent="center"
                      alignItems="center"
                      backgroundColor={theme.status.danger}
                      paddingHorizontal={theme.space.lg}
                      marginBottom={theme.space.sm}
                      borderRadius={theme.radius.lg}
                    >
                      <Text
                        color={theme.bg}
                        fontWeight="700"
                        fontSize={theme.type.body.size}
                      >
                        Delete
                      </Text>
                    </View>
                  </Pressable>
                )}
                overshootRight={false}
              >
                <Pressable
                  onPress={() =>
                    navigation.navigate('RaceSession', { sessionId: item.session.id })
                  }
                >
                  <View
                    paddingVertical={theme.space.md}
                    paddingHorizontal={theme.space.md}
                    marginBottom={theme.space.sm}
                    backgroundColor={theme.surface}
                    borderColor={theme.border}
                    borderWidth={1}
                    borderRadius={theme.radius.lg}
                  >
                    <View
                      flexDirection="row"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Text
                        color={theme.text.primary}
                        fontSize={theme.type.h3.size}
                        fontWeight={theme.type.h3.weight as '600'}
                      >
                        {formatWhen(item.session.startedAt)}
                      </Text>
                      <StateChip state={item.session.state} theme={theme} />
                    </View>
                    <Text
                      color={theme.text.muted}
                      fontSize={theme.type.caption.size}
                      marginTop={2}
                    >
                      {item.points} point{item.points === 1 ? '' : 's'}
                      {item.session.finishedAt
                        ? ` · ${describeElapsed(item.session.startedAt, item.session.finishedAt)}`
                        : ''}
                    </Text>
                  </View>
                </Pressable>
              </Swipeable>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function StateChip({
  state,
  theme,
}: {
  state: RaceSession['state'];
  theme: ReturnType<typeof getTheme>;
}) {
  const labelMap: Record<RaceSession['state'], { label: string; bg: string }> = {
    idle: { label: 'IDLE', bg: theme.text.muted },
    armed: { label: 'ARMED', bg: theme.text.muted },
    'counting-down': { label: 'COUNTING', bg: theme.status.warning },
    postponed: { label: 'AP', bg: theme.status.warning },
    starting: { label: 'STARTING', bg: theme.status.success },
    running: { label: 'RUNNING', bg: theme.status.success },
    'individual-recall': { label: 'X', bg: theme.status.danger },
    finished: { label: 'FINISHED', bg: theme.accent },
    abandoned: { label: 'ABANDONED', bg: theme.status.danger },
  };
  const info = labelMap[state];
  return (
    <View
      paddingVertical={2}
      paddingHorizontal={theme.space.xs}
      borderRadius={theme.radius.sm}
      backgroundColor={info.bg}
    >
      <Text
        color={theme.bg}
        fontSize={theme.type.micro.size}
        fontWeight={theme.type.micro.weight as '600'}
        letterSpacing={theme.type.micro.letterSpacing}
      >
        {info.label}
      </Text>
    </View>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const hh = d.getHours().toString().padStart(2, '0');
  const mi = d.getMinutes().toString().padStart(2, '0');
  return `${dd}/${mm} ${hh}:${mi}`;
}

function describeElapsed(startedAt: string, finishedAt: string): string {
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${h}h ${rem}m`;
}
