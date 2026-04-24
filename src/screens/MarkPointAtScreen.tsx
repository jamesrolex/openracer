/**
 * MarkPointAtScreen — Method 7: point the phone at a mark to capture a
 * compass bearing from current GPS, move, capture again, triangulate.
 *
 * Two-step wizard:
 *  1) "Stand still, point at the mark, tap Capture" — records (GPS, bearing A).
 *  2) "Move at least 20m and do it again" — records (GPS, bearing B), runs
 *     triangulate, saves a single-race-temporary mark at the computed
 *     position.
 *
 * Method 7 is inherently approximate: phone compass is ±5° under good
 * conditions, worse near metal. We surface the computed accuracy so
 * sailors can sanity-check before saving.
 */

import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, Text, View } from 'tamagui';

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

export function MarkPointAtScreen({ navigation, route }: RootStackScreenProps<'MarkPointAt'>) {
  const legId = route.params.legId;
  const nightMode = useSettingsStore((s) => s.nightMode);
  const theme = getTheme(nightMode ? 'night' : 'day');

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

  const headingDisplay =
    compass.trueHeading !== null ? `${Math.round(compass.trueHeading)}°` : '—';

  function capture() {
    if (!position || compass.trueHeading === null) {
      setError('Waiting for GPS and compass — try again in a second.');
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
    if (moved < 20) {
      setError(`Move at least 20 m from the first sighting (you've moved ${Math.round(moved)} m).`);
      return;
    }

    const a: Sighting = {
      position: sightingA.position,
      bearing: sightingA.bearing,
      fixAccuracyMetres: sightingA.fixAccuracyMetres ?? undefined,
      compassAccuracyDegrees: compass.needsCalibration ? 15 : 5,
    };
    const b: Sighting = {
      position: sighting.position,
      bearing: sighting.bearing,
      fixAccuracyMetres: sighting.fixAccuracyMetres ?? undefined,
      compassAccuracyDegrees: compass.needsCalibration ? 15 : 5,
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

  const step = sightingA ? 2 : 1;

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

        <Text
          color={theme.text.muted}
          fontSize={theme.type.body.size}
          lineHeight={theme.type.body.lineHeight}
          marginBottom={theme.space.md}
        >
          {step === 1
            ? 'Hold your phone level, top edge pointing at the mark, and tap Capture. You\u2019ll then move at least 20 m and capture a second bearing.'
            : 'Move at least 20 m from where you took the first bearing, point at the same mark, and tap Capture.'}
        </Text>

        <Label theme={theme}>{`Step ${step} of 2 — live readings`}</Label>
        <View
          padding={theme.space.md}
          borderRadius={theme.radius.lg}
          borderColor={theme.border}
          borderWidth={1}
          marginBottom={theme.space.md}
        >
          <Row
            theme={theme}
            label="Compass (true)"
            value={headingDisplay}
            warn={compass.needsCalibration}
          />
          <Row
            theme={theme}
            label="Compass accuracy"
            value={
              compass.accuracy === null
                ? '—'
                : compass.accuracy >= 2
                  ? 'Low — calibrate'
                  : compass.accuracy >= 1
                    ? 'Medium'
                    : 'Good'
            }
          />
          <Row
            theme={theme}
            label="GPS fix"
            value={
              accuracy === null
                ? 'Waiting…'
                : `±${formatDistance(accuracy, 'm').replace(' m', '')} m`
            }
          />
          <Row
            theme={theme}
            label="Position"
            value={
              position
                ? formatLatLon(position.latitude, position.longitude, 'dmm')
                : 'Waiting…'
            }
          />
        </View>

        {sightingA ? (
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
              FIRST SIGHTING LOCKED
            </Text>
            <Text color={theme.text.primary} fontSize={theme.type.caption.size}>
              {Math.round(sightingA.bearing)}°T from{' '}
              {formatLatLon(sightingA.position.latitude, sightingA.position.longitude, 'dmm')}
            </Text>
          </View>
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
          <Text color={theme.status.danger} fontSize={theme.type.caption.size}>
            Compass: {compass.error}
          </Text>
        ) : null}

        {compass.needsCalibration ? (
          <Text color={theme.status.warning} fontSize={theme.type.caption.size} marginBottom={theme.space.md}>
            iOS needs calibration — trace a figure-8 with your phone, then
            try again. Until then we&apos;re using the magnetic heading which
            may be off by a few degrees.
          </Text>
        ) : null}

        <Pressable
          onPress={capture}
          disabled={busy || !position || compass.trueHeading === null}
          hitSlop={8}
        >
          <View
            paddingVertical={theme.space.md}
            paddingHorizontal={theme.space.md}
            borderRadius={theme.radius.lg}
            backgroundColor={theme.accent}
            alignItems="center"
            opacity={busy || !position || compass.trueHeading === null ? 0.4 : 1}
          >
            <Text
              color={theme.bg}
              fontSize={theme.type.body.size}
              fontWeight={theme.type.bodySemi.weight as '700'}
            >
              {step === 1 ? 'Capture first bearing' : 'Capture + triangulate'}
            </Text>
          </View>
        </Pressable>

        {sightingA ? (
          <Pressable onPress={() => { setSightingA(null); setError(null); }} hitSlop={8}>
            <Text
              color={theme.text.muted}
              fontSize={theme.type.caption.size}
              fontWeight={theme.type.bodySemi.weight as '600'}
              textAlign="center"
              marginTop={theme.space.sm}
            >
              Reset and redo first bearing
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

function Row({
  theme,
  label,
  value,
  warn = false,
}: {
  theme: ReturnType<typeof getTheme>;
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <View flexDirection="row" justifyContent="space-between" paddingVertical={2}>
      <Text color={theme.text.muted} fontSize={theme.type.caption.size}>
        {label}
      </Text>
      <Text
        color={warn ? theme.status.warning : theme.text.primary}
        fontSize={theme.type.caption.size}
        style={{ fontFamily: 'Menlo' }}
      >
        {value}
      </Text>
    </View>
  );
}
