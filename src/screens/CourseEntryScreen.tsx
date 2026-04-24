/**
 * CourseEntryScreen — the hub.
 *
 * Phase 1 Week 3 scope:
 * - Pick a template (W-L, Olympic, Triangle, Trapezoid, Round-the-cans, Custom).
 * - Name the course.
 * - For each leg, tap a slot to open MarkPickerSheet and fill it from the
 *   library (Method 1: library pick). Tap a filled slot to clear it.
 * - Save as draft (persists via useCoursesStore).
 * - Arm timer CTA enabled once every required leg has its required marks.
 *
 * Custom template extends with "+ Add rounding leg" between start and
 * finish.
 */

import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, Text, View } from 'tamagui';

import { MarkPickerSheet } from '../components/MarkPickerSheet';
import { defaultValidityFor } from '../domain/markLifecycle';
import {
  COURSE_TEMPLATES,
  appendRoundingLeg,
  getTemplate,
  isCourseReadyToArm,
} from '../domain/courseTemplates';
import type { RootStackScreenProps } from '../navigation';
import { useBoatStore } from '../stores/useBoatStore';
import { useCoursesStore } from '../stores/useCoursesStore';
import { useMarksStore } from '../stores/useMarksStore';
import { useRaceStore } from '../stores/useRaceStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';
import type { CourseTemplateId, Leg } from '../types/course';
import type { Mark, MarkInput } from '../types/mark';

export function CourseEntryScreen({ navigation }: RootStackScreenProps<'CourseEntry'>) {
  const nightMode = useSettingsStore((state) => state.nightMode);
  const theme = getTheme(nightMode ? 'night' : 'day');
  const variant = nightMode ? 'night' : 'day';

  const position = useBoatStore((s) => s.position);
  const marks = useMarksStore((s) => s.marks);
  const refreshMarks = useMarksStore((s) => s.refresh);
  const createMark = useMarksStore((s) => s.create);

  const draft = useCoursesStore((s) => s.activeDraft);
  const startDraft = useCoursesStore((s) => s.startDraft);
  const updateDraft = useCoursesStore((s) => s.updateDraft);
  const setLegMarks = useCoursesStore((s) => s.setLegMarks);
  const setLegRounding = useCoursesStore((s) => s.setLegRounding);
  const clearDraft = useCoursesStore((s) => s.clearDraft);

  const [templateId, setTemplateId] = useState<CourseTemplateId>(draft?.templateId ?? 'windward-leeward');
  const [name, setName] = useState(draft?.name ?? 'Wednesday evening');
  const [legs, setLegs] = useState<Leg[]>(() => draft?.legs ?? getTemplate('windward-leeward').buildLegs());
  const [pickerForLeg, setPickerForLeg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void refreshMarks();
  }, [refreshMarks]);

  // Sync local state to persistence whenever it changes. Debounced via an
  // effect rather than on every keystroke — draft safety, not atomic saves.
  useEffect(() => {
    if (!draft) return;
    const timer = setTimeout(() => {
      void updateDraft({ name, legs });
    }, 600);
    return () => clearTimeout(timer);
  }, [draft, name, legs, updateDraft]);

  function pickTemplate(next: CourseTemplateId) {
    if (next === templateId) return;
    const fresh = getTemplate(next).buildLegs();
    setTemplateId(next);
    setLegs(fresh);
  }

  async function ensureDraft() {
    if (draft) {
      await updateDraft({ name, legs });
      return draft.id;
    }
    const created = await startDraft({
      name,
      templateId,
      legs,
    });
    return created.id;
  }

  function openPicker(legId: string) {
    void (async () => {
      await ensureDraft();
      setPickerForLeg(legId);
    })();
  }

  async function handleDropAtGps() {
    if (!pickerForLeg || !position) return;
    const now = new Date();
    const validity = defaultValidityFor('single-race-temporary', now);
    const stamp = `${now.getUTCHours().toString().padStart(2, '0')}:${now
      .getUTCMinutes()
      .toString()
      .padStart(2, '0')}`;
    const input: MarkInput = {
      name: `Dropped ${stamp}`,
      latitude: position.latitude,
      longitude: position.longitude,
      tier: 'single-race-temporary',
      source: 'gps-drop',
      icon: 'custom',
      shape: 'unknown',
      validFrom: validity.validFrom,
      validUntil: validity.validUntil,
      owner: 'Me',
    };
    const created = await createMark(input);
    await handlePickMark(created);
  }

  function handleBearingAndDistance() {
    if (!pickerForLeg) return;
    setPickerForLeg(null);
    navigation.navigate('MarkBearing', { legId: pickerForLeg });
  }

  function handlePointAtMark() {
    if (!pickerForLeg) return;
    setPickerForLeg(null);
    navigation.navigate('MarkPointAt', { legId: pickerForLeg });
  }

  async function handlePickMark(mark: Mark) {
    if (!pickerForLeg) return;
    const currentLeg = legs.find((l) => l.id === pickerForLeg);
    if (!currentLeg) return;

    // Append the chosen mark to the leg, capped at requiredMarks.
    const nextMarkIds = [...currentLeg.markIds, mark.id].slice(0, currentLeg.requiredMarks);
    const nextLegs = legs.map((l) =>
      l.id === pickerForLeg ? { ...l, markIds: nextMarkIds } : l,
    );
    setLegs(nextLegs);

    // Persist immediately so a kill-and-reopen mid-course-build doesn't lose
    // the mark we just picked.
    if (draft) {
      await setLegMarks(pickerForLeg, nextMarkIds);
    } else {
      await startDraft({ name, templateId, legs: nextLegs });
    }

    // Keep the sheet open if the leg still needs more marks (e.g. start
    // line wants 2); close when full.
    if (nextMarkIds.length >= currentLeg.requiredMarks) {
      setPickerForLeg(null);
    }
  }

  function clearLeg(legId: string) {
    const nextLegs = legs.map((l) => (l.id === legId ? { ...l, markIds: [] } : l));
    setLegs(nextLegs);
  }

  async function toggleRounding(legId: string) {
    const current = legs.find((l) => l.id === legId);
    if (!current || current.rounding === null) return;
    const next: Leg['rounding'] = current.rounding === 'port' ? 'starboard' : 'port';
    const nextLegs = legs.map((l) => (l.id === legId ? { ...l, rounding: next } : l));
    setLegs(nextLegs);
    if (draft) {
      await setLegRounding(legId, next);
    }
  }

  function addRoundingLeg() {
    const label = `Mark ${legs.filter((l) => l.type === 'windward' || l.type === 'leeward' || l.type === 'reach').length + 1}`;
    setLegs((prev) => appendRoundingLeg(prev, label));
  }

  async function handleSaveDraft() {
    setSaving(true);
    try {
      await ensureDraft();
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  async function handleArmTimer() {
    const id = await ensureDraft();
    // Arm for a T-5 countdown starting roughly now. syncToNextWholeMinute
    // inside the store will snap the exact gun time to the next whole
    // minute, the racer's classic move.
    const gun = new Date(Date.now() + 5 * 60_000);
    useRaceStore.getState().arm(gun, id);
    useBoatStore.getState().setMode('race');
    navigation.navigate('RaceTimer');
  }

  async function handleDiscard() {
    Alert.alert('Discard draft?', 'This will clear the in-progress course.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await clearDraft();
          navigation.goBack();
        },
      },
    ]);
  }

  const activeLeg = pickerForLeg ? legs.find((l) => l.id === pickerForLeg) : null;
  const usedMarkIds = useMemo(() => legs.flatMap((l) => l.markIds), [legs]);
  const ready = isCourseReadyToArm(legs);
  const selectedTemplate = COURSE_TEMPLATES.find((t) => t.id === templateId)!;

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
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} accessibilityLabel="Back">
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
            Build course
          </Text>
          {draft ? (
            <Pressable onPress={handleDiscard} hitSlop={8} accessibilityLabel="Discard">
              <Text
                color={theme.status.danger}
                fontSize={theme.type.body.size}
                fontWeight={theme.type.bodySemi.weight as '600'}
              >
                Discard
              </Text>
            </Pressable>
          ) : (
            <View width={64} />
          )}
        </View>

        <SectionLabel theme={theme}>Template</SectionLabel>
        <View flexDirection="row" flexWrap="wrap" marginBottom={theme.space.md}>
          {COURSE_TEMPLATES.map((t) => {
            const active = t.id === templateId;
            return (
              <Pressable key={t.id} onPress={() => pickTemplate(t.id)} hitSlop={4}>
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
                    {t.name}
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
          {selectedTemplate.description}
        </Text>

        <SectionLabel theme={theme}>Name</SectionLabel>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="Race name"
          height={44}
          paddingHorizontal={theme.space.md}
          fontSize={theme.type.body.size}
          borderColor={theme.border}
          backgroundColor={theme.surface}
          color={theme.text.primary}
          placeholderTextColor={theme.text.muted}
          marginBottom={theme.space.md}
        />

        <SectionLabel theme={theme}>Legs</SectionLabel>
        {legs.map((leg, idx) => (
          <LegRow
            key={leg.id}
            leg={leg}
            index={idx}
            marks={marks}
            theme={theme}
            onPress={() => openPicker(leg.id)}
            onClear={() => clearLeg(leg.id)}
            onToggleRounding={() => void toggleRounding(leg.id)}
          />
        ))}

        {templateId === 'custom' || templateId === 'round-the-cans' ? (
          <Pressable onPress={addRoundingLeg} hitSlop={8}>
            <View
              paddingVertical={theme.space.sm}
              paddingHorizontal={theme.space.md}
              borderRadius={theme.radius.lg}
              borderColor={theme.border}
              borderWidth={1}
              marginBottom={theme.space.md}
              alignItems="center"
            >
              <Text
                color={theme.accent}
                fontSize={theme.type.body.size}
                fontWeight={theme.type.bodySemi.weight as '600'}
              >
                + Add rounding leg
              </Text>
            </View>
          </Pressable>
        ) : null}

        <View flexDirection="row" marginTop={theme.space.md}>
          <Pressable
            onPress={handleSaveDraft}
            disabled={saving}
            style={{ flex: 1, marginRight: theme.space.sm }}
            hitSlop={4}
          >
            <View
              paddingVertical={theme.space.md}
              paddingHorizontal={theme.space.md}
              borderRadius={theme.radius.lg}
              backgroundColor="transparent"
              borderColor={theme.border}
              borderWidth={1}
              alignItems="center"
              opacity={saving ? 0.5 : 1}
            >
              <Text
                color={theme.text.primary}
                fontSize={theme.type.body.size}
                fontWeight={theme.type.bodySemi.weight as '600'}
              >
                Save draft
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => void handleArmTimer()}
            disabled={!ready}
            style={{ flex: 1 }}
            hitSlop={4}
            accessibilityLabel="Arm race timer"
          >
            <View
              paddingVertical={theme.space.md}
              paddingHorizontal={theme.space.md}
              borderRadius={theme.radius.lg}
              backgroundColor={ready ? theme.accent : theme.border}
              alignItems="center"
              opacity={ready ? 1 : 0.6}
            >
              <Text
                color={ready ? theme.bg : theme.text.muted}
                fontSize={theme.type.body.size}
                fontWeight={theme.type.bodySemi.weight as '700'}
              >
                Arm timer →
              </Text>
            </View>
          </Pressable>
        </View>

        <View flexDirection="row" marginTop={theme.space.sm}>
          <Pressable
            onPress={() => navigation.navigate('ScanCoursePush')}
            hitSlop={4}
            style={{ flex: 1, marginRight: theme.space.sm }}
          >
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
                Scan QR
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('ShareCourse')}
            hitSlop={4}
            disabled={!draft || !ready}
            style={{ flex: 1 }}
          >
            <View
              paddingVertical={theme.space.sm}
              paddingHorizontal={theme.space.md}
              borderRadius={theme.radius.lg}
              borderColor={theme.accent}
              borderWidth={1}
              alignItems="center"
              opacity={!draft || !ready ? 0.4 : 1}
            >
              <Text
                color={theme.accent}
                fontSize={theme.type.body.size}
                fontWeight={theme.type.bodySemi.weight as '600'}
              >
                Share as QR
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      <MarkPickerSheet
        visible={pickerForLeg !== null}
        title={activeLeg ? `Pick for ${activeLeg.label}` : 'Pick mark'}
        marks={marks}
        fromPosition={position}
        excludeIds={usedMarkIds}
        onPick={(m) => void handlePickMark(m)}
        onAddNew={() => {
          setPickerForLeg(null);
          navigation.navigate('MarkEdit', {});
        }}
        onDropAtGps={handleDropAtGps}
        onBearingAndDistance={handleBearingAndDistance}
        onPointAtMark={handlePointAtMark}
        onCancel={() => setPickerForLeg(null)}
        variant={variant}
      />
    </SafeAreaView>
  );
}

function SectionLabel({
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

interface LegRowProps {
  leg: Leg;
  index: number;
  marks: Mark[];
  theme: ReturnType<typeof getTheme>;
  onPress: () => void;
  onClear: () => void;
  onToggleRounding: () => void;
}

function LegRow({
  leg,
  index,
  marks,
  theme,
  onPress,
  onClear,
  onToggleRounding,
}: LegRowProps) {
  const resolved = leg.markIds
    .map((id) => marks.find((m) => m.id === id)?.name ?? '(missing)')
    .join(' + ');
  const filled = leg.markIds.length >= leg.requiredMarks;
  const slotLabel = filled ? resolved : needsLabel(leg);

  return (
    <Pressable onPress={onPress} hitSlop={4}>
      <View
        flexDirection="row"
        alignItems="center"
        paddingVertical={theme.space.md}
        paddingHorizontal={theme.space.md}
        marginBottom={theme.space.sm}
        backgroundColor={theme.surface}
        borderColor={filled ? theme.status.success : theme.border}
        borderWidth={1}
        borderRadius={theme.radius.lg}
      >
        <View
          width={32}
          height={32}
          borderRadius={theme.radius.full}
          backgroundColor={theme.bg}
          borderColor={theme.border}
          borderWidth={1}
          alignItems="center"
          justifyContent="center"
          marginRight={theme.space.md}
        >
          <Text
            color={theme.text.secondary}
            fontSize={theme.type.bodySemi.size}
            fontWeight={theme.type.bodySemi.weight as '600'}
          >
            {index + 1}
          </Text>
        </View>
        <View flex={1}>
          <View flexDirection="row" alignItems="center" marginBottom={2}>
            <Text
              color={theme.text.muted}
              fontSize={theme.type.micro.size}
              fontWeight={theme.type.micro.weight as '600'}
              letterSpacing={theme.type.micro.letterSpacing}
              marginRight={theme.space.xs}
            >
              {leg.label.toUpperCase()}
            </Text>
            {leg.rounding ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onToggleRounding();
                }}
                hitSlop={8}
                accessibilityLabel={`Toggle rounding — currently ${leg.rounding}`}
              >
                <View
                  paddingVertical={1}
                  paddingHorizontal={6}
                  borderRadius={theme.radius.sm}
                  backgroundColor={
                    leg.rounding === 'port' ? theme.status.danger : theme.status.success
                  }
                >
                  <Text
                    color={theme.bg}
                    fontSize={theme.type.micro.size}
                    fontWeight={theme.type.micro.weight as '600'}
                    letterSpacing={theme.type.micro.letterSpacing}
                  >
                    {leg.rounding === 'port' ? 'LEAVE TO PORT' : 'LEAVE TO STBD'}
                  </Text>
                </View>
              </Pressable>
            ) : null}
          </View>
          <Text
            color={filled ? theme.text.primary : theme.text.muted}
            fontSize={theme.type.body.size}
            fontWeight={filled ? (theme.type.bodySemi.weight as '600') : ('400' as const)}
          >
            {slotLabel}
          </Text>
        </View>
        {filled ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onClear();
            }}
            hitSlop={8}
          >
            <Text
              color={theme.text.muted}
              fontSize={theme.type.caption.size}
              fontWeight={theme.type.bodySemi.weight as '600'}
              paddingHorizontal={theme.space.sm}
            >
              Clear
            </Text>
          </Pressable>
        ) : (
          <Text
            color={theme.accent}
            fontSize={theme.type.body.size}
            fontWeight={theme.type.bodySemi.weight as '600'}
          >
            Tap to add
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function needsLabel(leg: Leg): string {
  const missing = leg.requiredMarks - leg.markIds.length;
  if (leg.markIds.length === 0) {
    return leg.requiredMarks === 2 ? 'Tap to set both marks' : 'Tap to set mark';
  }
  return `${missing} more mark${missing === 1 ? '' : 's'} to set`;
}
