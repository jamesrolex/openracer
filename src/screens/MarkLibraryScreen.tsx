/**
 * MarkLibraryScreen — browse, search, and curate the mark library.
 *
 * Flow: tap a card → MarkEdit with `markId`. Tap `+ Add` → MarkEdit with
 * no id. Swipe-to-delete is only offered on dated tiers (race-day-recent,
 * single-race-temporary) so you can't silently remove a club or chart
 * mark without going into edit mode.
 */

import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, Text, View } from 'tamagui';

import { MarkCard } from '../components/MarkCard';
import type { RootStackScreenProps } from '../navigation';
import { useMarksStore } from '../stores/useMarksStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';
import type { Mark, MarkTier } from '../types/mark';

type TierFilter = 'all' | MarkTier;

const TIER_TABS: { key: TierFilter; label: string }[] = [
  { key: 'club-seasonal', label: 'Seasonal' },
  { key: 'chart-permanent', label: 'Permanent' },
  { key: 'race-day-recent', label: 'Recent' },
  { key: 'all', label: 'All' },
];

const EMPTY_COPY: Record<TierFilter, string> = {
  'club-seasonal': 'No seasonal marks yet — tap + Add to create one.',
  'chart-permanent': 'No chart-permanent marks yet — tap a seamark on the chart (coming Phase 2) or tap + Add.',
  'race-day-recent': 'Nothing from the last 14 days. Drops from committee pushes and GPS drops show up here.',
  'single-race-temporary': 'No single-race marks.',
  all: 'Your library is empty — tap + Add to set up your first mark.',
};

export function MarkLibraryScreen({ navigation }: RootStackScreenProps<'MarkLibrary'>) {
  const nightMode = useSettingsStore((state) => state.nightMode);
  const theme = getTheme(nightMode ? 'night' : 'day');
  const variant = nightMode ? 'night' : 'day';

  const marks = useMarksStore((s) => s.marks);
  const refresh = useMarksStore((s) => s.refresh);
  const remove = useMarksStore((s) => s.remove);

  const [tier, setTier] = useState<TierFilter>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return marks.filter((m) => {
      if (tier !== 'all' && m.tier !== tier) return false;
      if (tier === 'race-day-recent' && m.validUntil && new Date(m.validUntil).getTime() < now) {
        return false;
      }
      if (query.trim().length > 0) {
        const q = query.trim().toLowerCase();
        const hay = `${m.name} ${m.notes ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [marks, tier, query]);

  function confirmDelete(mark: Mark) {
    Alert.alert('Delete mark?', `"${mark.name}" will be removed from your library.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void remove(mark.id) },
    ]);
  }

  function renderItem({ item }: { item: Mark }) {
    const swipeable = item.tier === 'race-day-recent' || item.tier === 'single-race-temporary';

    const card = (
      <MarkCard
        mark={item}
        variant={variant}
        onPress={(m) => navigation.navigate('MarkEdit', { markId: m.id })}
      />
    );

    if (!swipeable) return card;

    return (
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
              <Text color={theme.bg} fontWeight="700" fontSize={theme.type.body.size}>
                Delete
              </Text>
            </View>
          </Pressable>
        )}
        overshootRight={false}
      >
        {card}
      </Swipeable>
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
          <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Back">
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
            Mark Library
          </Text>
          <Pressable
            onPress={() => navigation.navigate('MarkEdit', {})}
            accessibilityLabel="Add mark"
          >
            <Text
              color={theme.accent}
              fontSize={theme.type.body.size}
              fontWeight={theme.type.bodySemi.weight as '600'}
            >
              + Add
            </Text>
          </Pressable>
        </View>

        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search marks…"
          size="$md"
          borderColor={theme.border}
          backgroundColor={theme.surface}
          color={theme.text.primary}
          placeholderTextColor={theme.text.muted}
          marginBottom={theme.space.sm}
        />

        <View flexDirection="row" marginBottom={theme.space.md}>
          {TIER_TABS.map((t) => {
            const active = tier === t.key;
            return (
              <Pressable key={t.key} onPress={() => setTier(t.key)} accessibilityRole="tab">
                <View
                  paddingVertical={theme.space.xs}
                  paddingHorizontal={theme.space.sm}
                  borderRadius={theme.radius.full}
                  backgroundColor={active ? theme.accent : 'transparent'}
                  borderColor={active ? theme.accent : theme.border}
                  borderWidth={1}
                  marginRight={theme.space.xs}
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

        {filtered.length === 0 ? (
          <View flex={1} alignItems="center" justifyContent="center" padding={theme.space.lg}>
            <Text
              color={theme.text.muted}
              fontSize={theme.type.body.size}
              lineHeight={theme.type.body.lineHeight}
              textAlign="center"
            >
              {EMPTY_COPY[tier]}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: theme.space.xl }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
