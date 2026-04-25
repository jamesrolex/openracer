/**
 * MarkPickerSheet — the mark-selection overlay used from CourseEntryScreen.
 *
 * Not a true bottom-sheet in Phase 1; a full-screen modal that mimics the
 * sheet pattern. Real Tamagui <Sheet> can slot in later without changing
 * callers because the component is self-contained.
 *
 * Shows the mark library sorted nearest-first against current GPS, with
 * the same search + tier-tab filters as MarkLibraryScreen. Tapping a mark
 * confirms the selection; tapping "+ New" exits the sheet via `onAddNew`
 * so the caller can push MarkEdit without losing the in-progress course.
 */

import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, Text, View } from 'tamagui';

import { formatDistance } from '../utils/format';
import { sortMarksByDistance } from '../utils/nearestMarks';
import { swatchColour } from './MarkCard';
import { getTheme } from '../theme/theme';
import type { Mark, MarkTier } from '../types/mark';
import type { GeoPosition } from '../types/signalk';

type TierFilter = 'all' | MarkTier;

const TIER_TABS: { key: TierFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'club-seasonal', label: 'Seasonal' },
  { key: 'chart-permanent', label: 'Permanent' },
  { key: 'race-day-recent', label: 'Recent' },
];

export interface MarkPickerSheetProps {
  visible: boolean;
  title: string;
  marks: Mark[];
  fromPosition: GeoPosition | null;
  /** Marks already used elsewhere in the current course — shown disabled. */
  excludeIds?: string[];
  onPick: (mark: Mark) => void;
  onAddNew: () => void;
  /** Optional — drop a `single-race-temporary` mark at current GPS and
   *  pick it. Hidden if caller doesn't supply a handler or GPS is null. */
  onDropAtGps?: () => void | Promise<void>;
  /** Optional — bearing+distance from a reference mark. Hidden if caller
   *  doesn't supply a handler. */
  onBearingAndDistance?: () => void;
  /** Optional — point-at-mark triangulation. Hidden if no handler. */
  onPointAtMark?: () => void;
  onCancel: () => void;
  variant?: 'day' | 'night';
}

export function MarkPickerSheet({
  visible,
  title,
  marks,
  fromPosition,
  excludeIds = [],
  onPick,
  onAddNew,
  onDropAtGps,
  onBearingAndDistance,
  onPointAtMark,
  onCancel,
  variant = 'day',
}: MarkPickerSheetProps) {
  const theme = getTheme(variant);
  const [tier, setTier] = useState<TierFilter>('all');
  const [query, setQuery] = useState('');

  const sorted = useMemo(
    () => sortMarksByDistance(marks, fromPosition),
    [marks, fromPosition],
  );

  const filtered = useMemo(() => {
    return sorted.filter(({ mark }) => {
      if (tier !== 'all' && mark.tier !== tier) return false;
      if (query.trim().length > 0) {
        const q = query.trim().toLowerCase();
        const hay = `${mark.name} ${mark.notes ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sorted, tier, query]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
        <View flex={1} paddingHorizontal={theme.space.md} paddingTop={theme.space.sm}>
          <View
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            marginBottom={theme.space.md}
          >
            <Pressable onPress={onCancel} hitSlop={8}>
              <Text
                color={theme.accent}
                fontSize={theme.type.body.size}
                fontWeight={theme.type.bodySemi.weight as '600'}
              >
                Cancel
              </Text>
            </Pressable>
            <Text
              color={theme.text.primary}
              fontSize={theme.type.h3.size}
              fontWeight={theme.type.h3.weight as '600'}
            >
              {title}
            </Text>
            <Pressable onPress={onAddNew} hitSlop={8}>
              <Text
                color={theme.accent}
                fontSize={theme.type.body.size}
                fontWeight={theme.type.bodySemi.weight as '600'}
              >
                + New
              </Text>
            </Pressable>
          </View>

          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Search marks…"
            height={44}
            paddingHorizontal={theme.space.md}
            fontSize={theme.type.body.size}
            borderColor={theme.border}
            backgroundColor={theme.surface}
            color={theme.text.primary}
            placeholderTextColor={theme.text.muted}
            marginBottom={theme.space.sm}
          />

          {(onDropAtGps && fromPosition) || onBearingAndDistance || onPointAtMark ? (
            <View marginBottom={theme.space.sm}>
              <View flexDirection="row" marginBottom={theme.space.xs}>
                {onDropAtGps && fromPosition ? (
                  <Pressable
                    onPress={() => void onDropAtGps()}
                    hitSlop={8}
                    style={{ flex: 1, marginRight: theme.space.sm }}
                  >
                    <View
                      paddingVertical={theme.space.sm}
                      paddingHorizontal={theme.space.md}
                      borderRadius={theme.radius.lg}
                      backgroundColor={theme.status.success}
                      alignItems="center"
                    >
                      <Text
                        color={theme.bg}
                        fontSize={theme.type.body.size}
                        fontWeight={theme.type.bodySemi.weight as '600'}
                      >
                        📍 Drop at GPS
                      </Text>
                    </View>
                  </Pressable>
                ) : null}
                {onBearingAndDistance ? (
                  <Pressable onPress={onBearingAndDistance} hitSlop={8} style={{ flex: 1 }}>
                    <View
                      paddingVertical={theme.space.sm}
                      paddingHorizontal={theme.space.md}
                      borderRadius={theme.radius.lg}
                      borderColor={theme.accent}
                      borderWidth={1}
                      alignItems="center"
                    >
                      <Text
                        color={theme.accent}
                        fontSize={theme.type.body.size}
                        fontWeight={theme.type.bodySemi.weight as '600'}
                      >
                        📐 Bearing + dist
                      </Text>
                    </View>
                  </Pressable>
                ) : null}
              </View>
              {onPointAtMark ? (
                <Pressable onPress={onPointAtMark} hitSlop={8}>
                  <View
                    paddingVertical={theme.space.sm}
                    paddingHorizontal={theme.space.md}
                    borderRadius={theme.radius.lg}
                    borderColor={theme.accent}
                    borderWidth={1}
                    alignItems="center"
                  >
                    <Text
                      color={theme.accent}
                      fontSize={theme.type.body.size}
                      fontWeight={theme.type.bodySemi.weight as '600'}
                    >
                      🧭 Point at mark (compass)
                    </Text>
                  </View>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <View flexDirection="row" marginBottom={theme.space.md}>
            {TIER_TABS.map((t) => {
              const active = tier === t.key;
              return (
                <Pressable key={t.key} onPress={() => setTier(t.key)} hitSlop={8}>
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
                No marks match. Tap “+ New” to add one.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.mark.id}
              contentContainerStyle={{ paddingBottom: theme.space.xl }}
              renderItem={({ item }) => {
                const disabled = excludeIds.includes(item.mark.id);
                return (
                  <Pressable
                    onPress={() => {
                      if (disabled) return;
                      onPick(item.mark);
                    }}
                  >
                    <View
                      flexDirection="row"
                      alignItems="center"
                      justifyContent="space-between"
                      paddingVertical={theme.space.md}
                      paddingHorizontal={theme.space.md}
                      marginBottom={theme.space.sm}
                      backgroundColor={theme.surface}
                      borderColor={theme.border}
                      borderWidth={1}
                      borderRadius={theme.radius.lg}
                      opacity={disabled ? 0.4 : 1}
                    >
                      <View flex={1}>
                        <View flexDirection="row" alignItems="center">
                          <Text
                            color={theme.text.primary}
                            fontSize={theme.type.h3.size}
                            fontWeight={theme.type.h3.weight as '600'}
                            flex={1}
                          >
                            {item.mark.name}
                            {disabled ? '  · already in course' : ''}
                          </Text>
                          {item.mark.colourHint ? (
                            <View
                              flexDirection="row"
                              alignItems="center"
                              marginLeft={theme.space.xs}
                            >
                              <View
                                width={10}
                                height={10}
                                borderRadius={5}
                                backgroundColor={swatchColour(
                                  item.mark.colourHint,
                                  theme,
                                )}
                                marginRight={4}
                              />
                              <Text
                                color={theme.text.secondary}
                                fontSize={theme.type.caption.size}
                              >
                                {item.mark.colourHint}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        {item.mark.notes ? (
                          <Text
                            color={theme.text.muted}
                            fontSize={theme.type.caption.size}
                            marginTop={2}
                            numberOfLines={1}
                          >
                            {item.mark.notes}
                          </Text>
                        ) : null}
                        <Text
                          color={theme.text.muted}
                          fontSize={theme.type.caption.size}
                          marginTop={2}
                        >
                          {Math.round(item.mark.confidence * 100)}% confidence
                        </Text>
                      </View>
                      <View alignItems="flex-end">
                        <Text
                          color={theme.text.primary}
                          fontSize={theme.type.body.size}
                          fontWeight={theme.type.bodySemi.weight as '600'}
                        >
                          {fromPosition && Number.isFinite(item.distanceMetres)
                            ? formatDistance(item.distanceMetres, 'nm')
                            : '—'}
                        </Text>
                        <Text
                          color={theme.text.muted}
                          fontSize={theme.type.caption.size}
                        >
                          away
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
