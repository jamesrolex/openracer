/**
 * MarkPointAtScreen — Method 7: point the phone at a mark to capture a
 * compass bearing from current GPS, move, capture again, triangulate.
 *
 * UX rebuild (Apr 2026): front and centre is a live compass dial with a
 * red crosshair — aim the top edge of the phone at the mark; the number
 * under the crosshair is the bearing. After the first capture a green
 * wedge locks onto the dial at the captured bearing so you can see what
 * you pointed at. The step banner flips to amber "STEP 2 OF 2" and the
 * copy explicitly says "walk ≥ 20 m across" (not "move 20 m" — across is
 * the useful direction). The capture button label changes accordingly.
 */

import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, Text, View } from 'tamagui';

import { CompassDial } from '../components/CompassDial';
import { defaultValidityFor } from '../domain/markLifecycle';
import { describeTriangulateError, triangulate, type Sighting } from '../domain/triangulate';
import { useCompass } from '../hooks/useCompass';
import type { RootStackScreenProps } from '../navigation';
import { useBoatStore } from '../stores/useBoatStore';
import { useCoursesStore } from '../stores/useCoursesStore';
import { useMarksStore } from '../stores/useMarksStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';
import type { MarkInput } from '../types/mark';
import type { GeoPosition } from '../types/signalk';
import { formatDistance, formatLatLon } from '../utils/format';
import { distanceBetween } from '../utils/geo';

interface CapturedSighting {
  position: GeoPosition;
  bearing: number;
  fixAccuracyMetres: number | null;
}

const MIN_BASELINE_METRES = 20;

export function MarkPointAtScreen({ navigation, route }: RootStackScreenProps<'MarkPointAt'>) {
  const legId = route.params.legId;
  const nightMode = useSettingsStore((s) => s.nightMode);
  const theme = getTheme(nightMode ? 'night' : 'day');
  const variant = nightMode ? 'night' : 'day';

  const compass = useCompass(true);
  const position = useBoatStore((s) => s.position);
  const accuracy = useBoatStore((s) => s.accuracy);

  const createMark = useMarksStore((s) => s.create);
  const draft = useCoursesStore((s) => s.activeDraft);
  const setLegMarks = useCoursesStore((s) => s.setLegMarks);

  const [sightingA, setSightingA] = useState<CapturedSighting | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step: 1 | 2 = sightingA ? 2 : 1;

  const movedSinceA = sightingA && position
    ? distanceBetween(sightingA.position, position)
    : 0;
  const movedEnough = movedSinceA >= MIN_BASELINE_METRES;

  function capture() {
    if (!position || compass.trueHeading === null) {
      setError('Waiting for GPS and compass — hold still for a second and try again.');
      return;
    }
    const sighting: CapturedSighting = {
      position,
      bearing: compass.trueHeading,
      fixAccuracyMetres: accuracy,
    };
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!sightingA) {
      setSightingA(sighting);
      setError(null);
      return;
    }

    // Second sighting — must be far enough away from the first.
    const moved = distanceBetween(sightingA.position, sighting.position);
    if (moved < MIN_BASELINE_METRES) {
      setError(
        `You’ve only moved ${Math.round(moved)} m. Walk at least ${MIN_BASELINE_METRES} m across from the first sighting, then try again.`,
      );
      return;
    }

    const compassAcc = compass.needsCalibration ? 15 : 5;
    const a: Sighting = {
      position: sightingA.position,
      bearing: sightingA.bearing,
      fixAccuracyMetres: sightingA.fixAccuracyMetres ?? undefined,
      compassAccuracyDegrees: compassAcc,
    };
    const b: Sighting = {
      position: sighting.position,
      bearing: sighting.bearing,
      fixAccuracyMetres: sighting.fixAccuracyMetres ?? undefined,
      compassAccuracyDegrees: compassAcc,
    };
    const result = triangulate(a, b);
    if (!result.ok) {
      setError(describeTriangulateError(result.error));
      return;
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void confirmAndSave(result.target, result.accuracyMetres);
  }

  async function confirmAndSave(target: GeoPosition, accuracyMetres: number) {
    const label =
      name.trim() || `Point-at ${new Date().toISOString().slice(11, 16)}`;
    Alert.alert(
      'Save mark?',
      `${label}\n${formatLatLon(target.latitude, target.longitude, 'dmm')}\n±${Math.round(accuracyMetres)} m accuracy`,
      [
        {
          text: 'Redo',
          style: 'cancel',
          onPress: () => setSightingA(null),
        },
        {
          text: 'Save',
          onPress: () => void persist(target, accuracyMetres, label),
        },
      ],
    );
  }

  async function persist(target: GeoPosition, accuracyMetres: number, label: string) {
    setBusy(true);
    try {
      const now = new Date();
      const validity = defaultValidityFor('single-race-temporary', now);
      const input: MarkInput = {
        name: label,
        latitude: target.latitude,
        longitude: target.longitude,
        tier: 'single-race-temporary',
        source: 'point-and-triangulate',
        icon: 'custom',
        shape: 'unknown',
        validFrom: validity.validFrom,
        validUntil: validity.validUntil,
        owner: 'Me',
        notes: `Triangulated from two compass sightings (±${Math.round(accuracyMetres)} m)`,
      };
      const created = await createMark(input);
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
      setBusy(false);
    }
  }

  const stepChipColor =
    step === 1 ? theme.accent : movedEnough ? theme.status.success : theme.status.warning;

  const captureDisabled =
    busy ||
    !position ||
    compass.trueHeading === null ||
    (step === 2 && !movedEnough);

  const captureLabel =
    step === 1
      ? 'Capture bearing 1'
      : movedEnough
        ? 'Capture bearing 2 + triangulate'
        : `Walk ${Math.max(1, MIN_BASELINE_METRES - Math.round(movedSinceA))} m more`;

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
            Point at mark
          </Text>
          <View width={44} />
        </View>

        {/* Big step banner — colour-coded so the sailor knows exactly where they are. */}
        <View
          paddingVertical={theme.space.sm}
          paddingHorizontal={theme.space.md}
          borderRadius={theme.radius.full}
          backgroundColor={stepChipColor}
          alignItems="center"
          marginBottom={theme.space.md}
        >
          <Text
            color={theme.bg}
            fontSize={theme.type.label.size}
            fontWeight="700"
            letterSpacing={theme.type.label.letterSpacing}
          >
            {step === 1 ? 'STEP 1 OF 2 — AIM + CAPTURE' : 'STEP 2 OF 2 — WALK ACROSS, AIM AGAIN'}
          </Text>
        </View>

        <Text
          color={theme.text.secondary}
          fontSize={theme.type.body.size}
          lineHeight={theme.type.body.lineHeight}
          textAlign="center"
          marginBottom={theme.space.md}
        >
          {step === 1
            ? 'Hold your phone level, top edge at the mark. Keep the number under the red crosshair steady, then tap Capture.'
            : movedEnough
              ? `Good — ${Math.round(movedSinceA)} m across. Aim at the same mark (the green tick shows where you pointed last) and capture.`
              : `Walk at least ${MIN_BASELINE_METRES} m perpendicular to your first sighting, then aim at the same mark. ${Math.round(movedSinceA)} m so far.`}
        </Text>

        {/* The main visual — a hand-bearing compass dial. */}
        <View alignItems="center" marginBottom={theme.space.md}>
          <CompassDial
            heading={compass.trueHeading}
            firstBearing={sightingA?.bearing ?? null}
            needsCalibration={compass.needsCalibration}
            variant={variant}
          />
        </View>

        {/* Legend row — so first-timers know what each colour means. */}
        <View
          flexDirection="row"
          justifyContent="space-around"
          marginBottom={theme.space.md}
        >
          <LegendChip
            theme={theme}
            colour={
              compass.needsCalibration ? theme.status.warning : theme.status.danger
            }
            label="Where you're aiming"
          />
          {sightingA ? (
            <LegendChip
              theme={theme}
              colour={theme.status.success}
              label={`First bearing locked: ${Math.round(sightingA.bearing)}°T`}
            />
          ) : null}
        </View>

        {/* GPS status — compact, non-distracting. */}
        <View
          flexDirection="row"
          justifyContent="space-between"
          padding={theme.space.sm}
          borderRadius={theme.radius.md}
          borderColor={theme.border}
          borderWidth={1}
          marginBottom={theme.space.md}
        >
          <Text color={theme.text.muted} fontSize={theme.type.caption.size}>
            GPS {accuracy === null ? 'waiting…' : `±${formatDistance(accuracy, 'm').replace(' m', '')} m`}
          </Text>
          {step === 2 ? (
            <Text
              color={movedEnough ? theme.status.success : theme.status.warning}
              fontSize={theme.type.caption.size}
              fontWeight={theme.type.bodySemi.weight as '600'}
            >
              Moved {Math.round(movedSinceA)} m / need {MIN_BASELINE_METRES} m
            </Text>
          ) : (
            <Text color={theme.text.muted} fontSize={theme.type.caption.size}>
              {position
                ? formatLatLon(position.latitude, position.longitude, 'dmm')
                : 'Waiting for fix…'}
            </Text>
          )}
        </View>

        {compass.needsCalibration ? (
          <Text
            color={theme.status.warning}
            fontSize={theme.type.caption.size}
            lineHeight={theme.type.caption.lineHeight}
            marginBottom={theme.space.md}
            textAlign="center"
          >
            Compass needs calibration — trace a figure-8 with your phone, then
            try again. Readings may be off by a few degrees until you do.
          </Text>
        ) : null}

        <Label theme={theme}>Name (optional)</Label>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="e.g. Offset Yellow"
          height={44}
          paddingHorizontal={theme.space.md}
          fontSize={theme.type.body.size}
          borderColor={theme.border}
          backgroundColor={theme.surface}
          color={theme.text.primary}
          placeholderTextColor={theme.text.muted}
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

        {compass.error ? (
          <Text
            color={theme.status.danger}
            fontSize={theme.type.caption.size}
            marginBottom={theme.space.sm}
          >
            Compass: {compass.error}
          </Text>
        ) : null}

        <Pressable onPress={capture} disabled={captureDisabled} hitSlop={8}>
          <View
            paddingVertical={theme.space.md}
            paddingHorizontal={theme.space.md}
            borderRadius={theme.radius.lg}
            backgroundColor={theme.accent}
            alignItems="center"
            opacity={captureDisabled ? 0.4 : 1}
          >
            <Text
              color={theme.bg}
              fontSize={theme.type.bodySemi.size}
              fontWeight="700"
            >
              {busy ? 'Saving…' : captureLabel}
            </Text>
          </View>
        </Pressable>

        {sightingA ? (
          <Pressable
            onPress={() => {
              setSightingA(null);
              setError(null);
            }}
            hitSlop={8}
          >
            <Text
              color={theme.text.muted}
              fontSize={theme.type.caption.size}
              fontWeight={theme.type.bodySemi.weight as '600'}
              textAlign="center"
              marginTop={theme.space.sm}
            >
              Redo first bearing
            </Text>
          </Pressable>
        ) : null}
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

function LegendChip({
  theme,
  colour,
  label,
}: {
  theme: ReturnType<typeof getTheme>;
  colour: string;
  label: string;
}) {
  return (
    <View flexDirection="row" alignItems="center">
      <View
        width={10}
        height={10}
        borderRadius={5}
        backgroundColor={colour}
        marginRight={theme.space.xs}
      />
      <Text color={theme.text.secondary} fontSize={theme.type.caption.size}>
        {label}
      </Text>
    </View>
  );
}
