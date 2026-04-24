/**
 * MarkEditScreen — add a new mark, or edit an existing one.
 *
 * Separate lat / lon fields so a sailor can paste from whatever source
 * they have (committee notes, chart plotter readout, VHF call). The field
 * parser accepts decimal / DMM / DMS on either axis.
 */

import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, Text, View } from 'tamagui';

import { defaultValidityFor } from '../domain/markLifecycle';
import type { RootStackScreenProps } from '../navigation';
import { useBoatStore } from '../stores/useBoatStore';
import { useMarksStore } from '../stores/useMarksStore';
import { marksRepo } from '../stores';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';
import type { MarkIcon, MarkInput, MarkShape, MarkTier } from '../types/mark';
import { formatLatLon } from '../utils/format';
import { parseCoordinate } from '../utils/parseLatLon';

type TierMeta = { key: MarkTier; label: string; explainer: string };
const TIERS: TierMeta[] = [
  {
    key: 'club-seasonal',
    label: 'Club seasonal',
    explainer: 'Laid April, removed October. Returns next season automatically.',
  },
  {
    key: 'chart-permanent',
    label: 'Chart permanent',
    explainer: 'A fixed navigation mark. Never expires.',
  },
  {
    key: 'race-day-recent',
    label: 'Race-day recent',
    explainer: 'Valid for 14 days from now. Fades out after a fortnight.',
  },
  {
    key: 'single-race-temporary',
    label: 'Single race',
    explainer: 'Auto-removed after the current race session.',
  },
];

const ICONS: MarkIcon[] = [
  'racing-yellow',
  'racing-red',
  'racing-orange',
  'committee-boat',
  'pin-end',
  'cardinal-n',
  'cardinal-s',
  'cardinal-e',
  'cardinal-w',
  'lateral-port',
  'lateral-starboard',
  'custom',
];

const SHAPES: MarkShape[] = ['spherical', 'pillar', 'can', 'conical', 'spar', 'unknown'];

export function MarkEditScreen({ navigation, route }: RootStackScreenProps<'MarkEdit'>) {
  const markId = route.params?.markId;
  const editing = Boolean(markId);

  const nightMode = useSettingsStore((state) => state.nightMode);
  const theme = getTheme(nightMode ? 'night' : 'day');

  const create = useMarksStore((s) => s.create);
  const update = useMarksStore((s) => s.update);
  const position = useBoatStore((s) => s.position);

  const [name, setName] = useState('');
  const [latInput, setLatInput] = useState('');
  const [lonInput, setLonInput] = useState('');
  const [tier, setTier] = useState<MarkTier>('club-seasonal');
  const [icon, setIcon] = useState<MarkIcon>('racing-yellow');
  const [shape, setShape] = useState<MarkShape>('spherical');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load existing mark if editing.
  useEffect(() => {
    if (!markId) return;
    void (async () => {
      const existing = await marksRepo.getMark(markId);
      if (!existing) {
        Alert.alert('Mark not found', 'This mark no longer exists.');
        navigation.goBack();
        return;
      }
      setName(existing.name);
      setLatInput(formatLatLon(existing.latitude, 0, 'dmm').split(',')[0]!.trim());
      setLonInput(formatLatLon(0, existing.longitude, 'dmm').split(',')[1]!.trim());
      setTier(existing.tier);
      setIcon(existing.icon);
      setShape(existing.shape);
      setNotes(existing.notes ?? '');
    })();
  }, [markId, navigation]);

  function useCurrentGps() {
    if (!position) {
      Alert.alert('No GPS fix', 'Wait for a position fix and try again.');
      return;
    }
    setLatInput(formatLatLon(position.latitude, 0, 'dmm').split(',')[0]!.trim());
    setLonInput(formatLatLon(0, position.longitude, 'dmm').split(',')[1]!.trim());
  }

  async function handleSave() {
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    let latitude: number;
    let longitude: number;
    try {
      latitude = parseCoordinate(latInput, 'lat');
      longitude = parseCoordinate(lonInput, 'lon');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot read coordinates');
      return;
    }

    setSaving(true);
    try {
      const now = new Date();
      const validity = defaultValidityFor(tier, now);
      const input: MarkInput = {
        name: name.trim(),
        latitude,
        longitude,
        tier,
        source: 'club-library',
        icon,
        shape,
        validFrom: validity.validFrom,
        validUntil: validity.validUntil,
        owner: 'Me',
        notes: notes.trim() || undefined,
      };
      if (editing && markId) {
        await update(markId, input);
      } else {
        await create(input);
      }
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const selectedTierMeta = TIERS.find((t) => t.key === tier)!;

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
          <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Cancel">
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
            {editing ? 'Edit mark' : 'New mark'}
          </Text>
          <Pressable onPress={handleSave} disabled={saving} accessibilityLabel="Save">
            <Text
              color={theme.accent}
              fontSize={theme.type.body.size}
              fontWeight={theme.type.bodySemi.weight as '600'}
              opacity={saving ? 0.5 : 1}
            >
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </Pressable>
        </View>

        <Label theme={theme}>Name</Label>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="e.g. Yellow, Committee Boat"
          height={44}
          paddingHorizontal={theme.space.md}
          fontSize={theme.type.body.size}
          borderColor={theme.border}
          backgroundColor={theme.surface}
          color={theme.text.primary}
          placeholderTextColor={theme.text.muted}
          marginBottom={theme.space.md}
        />

        <View flexDirection="row" alignItems="center" justifyContent="space-between">
          <Label theme={theme}>Coordinates</Label>
          <Pressable onPress={useCurrentGps} accessibilityLabel="Use current GPS">
            <Text
              color={theme.accent}
              fontSize={theme.type.caption.size}
              fontWeight={theme.type.bodySemi.weight as '600'}
            >
              📍 Use current GPS
            </Text>
          </Pressable>
        </View>

        <Input
          value={latInput}
          onChangeText={setLatInput}
          placeholder="Lat e.g. 52° 49.230' N"
          height={44}
          paddingHorizontal={theme.space.md}
          fontSize={theme.type.body.size}
          borderColor={theme.border}
          backgroundColor={theme.surface}
          color={theme.text.primary}
          placeholderTextColor={theme.text.muted}
          marginBottom={theme.space.xs}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Input
          value={lonInput}
          onChangeText={setLonInput}
          placeholder="Lon e.g. 4° 30.150' W"
          height={44}
          paddingHorizontal={theme.space.md}
          fontSize={theme.type.body.size}
          borderColor={theme.border}
          backgroundColor={theme.surface}
          color={theme.text.primary}
          placeholderTextColor={theme.text.muted}
          marginBottom={theme.space.md}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <Label theme={theme}>Lifespan</Label>
        <View flexDirection="row" flexWrap="wrap" marginBottom={theme.space.xs}>
          {TIERS.map((t) => {
            const active = t.key === tier;
            return (
              <Pressable key={t.key} onPress={() => setTier(t.key)} accessibilityRole="radio">
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
          lineHeight={theme.type.caption.lineHeight}
          marginBottom={theme.space.md}
        >
          {selectedTierMeta.explainer}
        </Text>

        <Label theme={theme}>Icon</Label>
        <View flexDirection="row" flexWrap="wrap" marginBottom={theme.space.md}>
          {ICONS.map((i) => {
            const active = i === icon;
            return (
              <Pressable key={i} onPress={() => setIcon(i)}>
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
                    {i}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Label theme={theme}>Shape</Label>
        <View flexDirection="row" flexWrap="wrap" marginBottom={theme.space.md}>
          {SHAPES.map((s) => {
            const active = s === shape;
            return (
              <Pressable key={s} onPress={() => setShape(s)}>
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
                    {s}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Label theme={theme}>Notes (optional)</Label>
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. “windward mark for Wed night starts”"
          minHeight={88}
          paddingHorizontal={theme.space.md}
          paddingVertical={theme.space.sm}
          fontSize={theme.type.body.size}
          borderColor={theme.border}
          backgroundColor={theme.surface}
          color={theme.text.primary}
          placeholderTextColor={theme.text.muted}
          multiline
          textAlignVertical="top"
          marginBottom={theme.space.md}
        />

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
      </ScrollView>
    </SafeAreaView>
  );
}

function Label({ children, theme }: { children: string; theme: ReturnType<typeof getTheme> }) {
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
