/**
 * MarkBearingScreen — create a mark by bearing + distance from a
 * reference mark. Used when the committee announces "280° at 0.4nm
 * from CB" — sailor picks CB, punches in 280° + 0.4, gets a mark.
 *
 * Live preview shows the computed coords so the user can spot-check
 * against the committee's announcement.
 *
 * Target coords snap into the originating leg slot on save.
 */

import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, Text, View } from 'tamagui';

import { defaultValidityFor } from '../domain/markLifecycle';
import type { RootStackScreenProps } from '../navigation';
import { useCoursesStore } from '../stores/useCoursesStore';
import { useMarksStore } from '../stores/useMarksStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';
import type { Mark, MarkInput } from '../types/mark';
import type { DistanceUnit } from '../utils/format';
import { METRES_PER_NAUTICAL_MILE, formatLatLon } from '../utils/format';
import { destinationPoint } from '../utils/geo';

const UNITS: { key: DistanceUnit; label: string; toMetres: (v: number) => number }[] = [
  { key: 'nm', label: 'nm', toMetres: (v) => v * METRES_PER_NAUTICAL_MILE },
  { key: 'km', label: 'km', toMetres: (v) => v * 1000 },
  { key: 'm', label: 'm', toMetres: (v) => v },
];

export function MarkBearingScreen({ navigation, route }: RootStackScreenProps<'MarkBearing'>) {
  const legId = route.params.legId;
  const nightMode = useSettingsStore((s) => s.nightMode);
  const theme = getTheme(nightMode ? 'night' : 'day');

  const marks = useMarksStore((s) => s.marks);
  const createMark = useMarksStore((s) => s.create);
  const draft = useCoursesStore((s) => s.activeDraft);
  const setLegMarks = useCoursesStore((s) => s.setLegMarks);

  const [refMark, setRefMark] = useState<Mark | null>(null);
  const [bearing, setBearing] = useState('');
  const [distance, setDistance] = useState('');
  const [unit, setUnit] = useState<DistanceUnit>('nm');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    if (!refMark) return null;
    const b = Number(bearing);
    const d = Number(distance);
    if (!Number.isFinite(b) || !Number.isFinite(d) || d <= 0) return null;
    if (b < 0 || b >= 360) return null;
    const unitDef = UNITS.find((u) => u.key === unit)!;
    const metres = unitDef.toMetres(d);
    if (metres > 100 * METRES_PER_NAUTICAL_MILE) return null; // 100nm sanity
    const target = destinationPoint(
      { latitude: refMark.latitude, longitude: refMark.longitude },
      b,
      metres,
    );
    return { target, metres };
  }, [refMark, bearing, distance, unit]);

  async function handleSave() {
    setError(null);
    if (!refMark) {
      setError('Pick a reference mark first.');
      return;
    }
    if (!preview) {
      setError('Bearing must be 0-360°, distance must be positive, target must be within 100 nm.');
      return;
    }
    const markName = name.trim() || `${refMark.name}+${bearing}°/${distance}${unit}`;

    setSaving(true);
    try {
      const now = new Date();
      const validity = defaultValidityFor('single-race-temporary', now);
      const input: MarkInput = {
        name: markName,
        latitude: preview.target.latitude,
        longitude: preview.target.longitude,
        tier: 'single-race-temporary',
        source: 'bearing-and-distance',
        icon: 'custom',
        shape: 'unknown',
        validFrom: validity.validFrom,
        validUntil: validity.validUntil,
        owner: 'Me',
        notes: `From ${refMark.name} at ${bearing}°T, ${distance}${unit}`,
      };
      const created = await createMark(input);

      // Push into the originating leg slot.
      if (draft && legId) {
        const leg = draft.legs.find((l) => l.id === legId);
        if (leg) {
          const nextMarkIds = [...leg.markIds, created.id].slice(0, leg.requiredMarks);
          await setLegMarks(legId, nextMarkIds);
        }
      }

      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
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
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Text
              color={theme.accent}
              fontSize={theme.type.body.size}
              fontWeight={theme.type.bodySemi.weight as '600'}
            >
              ← Cancel
            </Text>
          </Pressable>
          <Text
            color={theme.text.primary}
            fontSize={theme.type.h2.size}
            fontWeight={theme.type.h2.weight as '600'}
          >
            Bearing + distance
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={saving || !preview}
            hitSlop={8}
          >
            <Text
              color={theme.accent}
              fontSize={theme.type.body.size}
              fontWeight={theme.type.bodySemi.weight as '600'}
              opacity={saving || !preview ? 0.4 : 1}
            >
              Save
            </Text>
          </Pressable>
        </View>

        <Label theme={theme}>From mark</Label>
        {refMark ? (
          <Pressable onPress={() => setRefMark(null)}>
            <View
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              paddingVertical={theme.space.md}
              paddingHorizontal={theme.space.md}
              marginBottom={theme.space.md}
              backgroundColor={theme.surface}
              borderColor={theme.accent}
              borderWidth={1}
              borderRadius={theme.radius.lg}
            >
              <View flex={1}>
                <Text
                  color={theme.text.primary}
                  fontSize={theme.type.h3.size}
                  fontWeight={theme.type.h3.weight as '600'}
                >
                  {refMark.name}
                </Text>
                <Text color={theme.text.muted} fontSize={theme.type.caption.size} marginTop={2}>
                  {formatLatLon(refMark.latitude, refMark.longitude, 'dmm')}
                </Text>
              </View>
              <Text color={theme.accent} fontSize={theme.type.caption.size} fontWeight="600">
                Change
              </Text>
            </View>
          </Pressable>
        ) : (
          <View marginBottom={theme.space.md}>
            <FlatList
              data={marks}
              keyExtractor={(m) => m.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable onPress={() => setRefMark(item)}>
                  <View
                    paddingVertical={theme.space.md}
                    paddingHorizontal={theme.space.md}
                    marginBottom={theme.space.sm}
                    backgroundColor={theme.surface}
                    borderColor={theme.border}
                    borderWidth={1}
                    borderRadius={theme.radius.lg}
                  >
                    <Text
                      color={theme.text.primary}
                      fontSize={theme.type.body.size}
                      fontWeight={theme.type.bodySemi.weight as '600'}
                    >
                      {item.name}
                    </Text>
                    <Text
                      color={theme.text.muted}
                      fontSize={theme.type.caption.size}
                      marginTop={2}
                    >
                      {formatLatLon(item.latitude, item.longitude, 'dmm')}
                    </Text>
                  </View>
                </Pressable>
              )}
              ListEmptyComponent={
                <View padding={theme.space.lg} alignItems="center">
                  <Text color={theme.text.muted} fontSize={theme.type.body.size}>
                    No marks to pick from. Add one in Mark Library first.
                  </Text>
                </View>
              }
            />
          </View>
        )}

        <Label theme={theme}>Bearing (°T)</Label>
        <Input
          value={bearing}
          onChangeText={setBearing}
          placeholder="280"
          keyboardType="numeric"
          height={44}
          paddingHorizontal={theme.space.md}
          fontSize={theme.type.body.size}
          borderColor={theme.border}
          backgroundColor={theme.surface}
          color={theme.text.primary}
          placeholderTextColor={theme.text.muted}
          marginBottom={theme.space.md}
        />

        <Label theme={theme}>Distance</Label>
        <View flexDirection="row" marginBottom={theme.space.md}>
          <Input
            value={distance}
            onChangeText={setDistance}
            placeholder="0.4"
            keyboardType="decimal-pad"
            height={44}
            paddingHorizontal={theme.space.md}
            fontSize={theme.type.body.size}
            borderColor={theme.border}
            backgroundColor={theme.surface}
            color={theme.text.primary}
            placeholderTextColor={theme.text.muted}
            flex={1}
            marginRight={theme.space.sm}
          />
          <View flexDirection="row" alignItems="center">
            {UNITS.map((u) => {
              const active = u.key === unit;
              return (
                <Pressable key={u.key} onPress={() => setUnit(u.key)}>
                  <View
                    paddingVertical={theme.space.xs}
                    paddingHorizontal={theme.space.sm}
                    borderRadius={theme.radius.full}
                    backgroundColor={active ? theme.accent : 'transparent'}
                    borderColor={active ? theme.accent : theme.border}
                    borderWidth={1}
                    marginLeft={theme.space.xxs}
                  >
                    <Text
                      color={active ? theme.bg : theme.text.secondary}
                      fontSize={theme.type.caption.size}
                      fontWeight={theme.type.bodySemi.weight as '600'}
                    >
                      {u.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Label theme={theme}>Name (optional)</Label>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="e.g. Offset"
          height={44}
          paddingHorizontal={theme.space.md}
          fontSize={theme.type.body.size}
          borderColor={theme.border}
          backgroundColor={theme.surface}
          color={theme.text.primary}
          placeholderTextColor={theme.text.muted}
          marginBottom={theme.space.md}
        />

        {preview ? (
          <View
            padding={theme.space.md}
            borderRadius={theme.radius.md}
            borderColor={theme.status.success}
            borderWidth={1}
            marginBottom={theme.space.md}
          >
            <Text
              color={theme.text.muted}
              fontSize={theme.type.micro.size}
              fontWeight={theme.type.micro.weight as '600'}
              letterSpacing={theme.type.micro.letterSpacing}
              marginBottom={theme.space.xs}
            >
              COMPUTED TARGET
            </Text>
            <Text color={theme.text.primary} fontSize={theme.type.body.size}>
              {formatLatLon(preview.target.latitude, preview.target.longitude, 'dmm')}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View
            padding={theme.space.sm}
            borderRadius={theme.radius.md}
            backgroundColor={theme.status.danger}
            marginBottom={theme.space.md}
          >
            <Text color={theme.bg} fontSize={theme.type.body.size}>
              {error}
            </Text>
          </View>
        ) : null}

        <Text
          color={theme.text.muted}
          fontSize={theme.type.caption.size}
          lineHeight={theme.type.caption.lineHeight}
        >
          Target is created as a single-race temporary mark. Promote it to
          race-day-recent via Mark Library if you&apos;ll need it across the
          next fortnight.
        </Text>
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
