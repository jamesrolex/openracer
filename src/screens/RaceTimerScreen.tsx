/**
 * RaceTimerScreen — the countdown. Monster-size countdown number,
 * band-coloured, with sync / shift / recall / abandon actions.
 *
 * The display drives itself via a `setInterval(250ms)` tick that pulls
 * a fresh snapshot from `makeSnapshot(now)`. No state ticking in the
 * store — only the gun time persists.
 */

import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';

import { CourseProgressReadout } from '../components/CourseProgressReadout';
import { GunSyncButton } from '../components/GunSyncButton';
import { HelmDisplayLayout } from '../components/HelmDisplayLayout';
import { RabbitStartPanel } from '../components/RabbitStartPanel';
import { WindShiftBar } from '../components/WindShiftBar';
import { useBoatStore } from '../stores/useBoatStore';
import { computeCourseDistance } from '../domain/courseDistance';
import { evaluatePolar, parsePolarTable } from '../domain/polars';
import { computeBoatStartState } from '../domain/startLine';
import { useWindShiftTracker } from '../hooks/useWindShiftTracker';
import { metresPerSecondToKnots } from '../utils/format';
import {
  cancelAllRaceNotifications,
  requestNotificationPermissions,
  scheduleForStart,
} from '../domain/raceNotifications';
import { formatCountdown, makeSnapshot } from '../domain/raceTimer';
import type { RootStackScreenProps } from '../navigation';
import { useCoursesStore } from '../stores/useCoursesStore';
import { useMarksStore } from '../stores/useMarksStore';
import { useRaceStore } from '../stores/useRaceStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';
import type { RaceState } from '../types/race';

export function RaceTimerScreen({ navigation }: RootStackScreenProps<'RaceTimer'>) {
  const themeVariant = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeVariant);
  const variant = themeVariant;

  const sequenceStartTime = useRaceStore((s) => s.sequenceStartTime);
  const sequence = useRaceStore((s) => s.sequence);
  const recallCount = useRaceStore((s) => s.recallCount);
  const syncToMinute = useRaceStore((s) => s.syncToMinute);
  const shiftMinutes = useRaceStore((s) => s.shiftMinutes);
  const generalRecall = useRaceStore((s) => s.generalRecall);
  const undoLastGunChange = useRaceStore((s) => s.undoLastGunChange);
  const previousGunTime = useRaceStore((s) => s.previousGunTime);
  const previousGunCapturedAt = useRaceStore((s) => s.previousGunCapturedAt);
  const postponedAt = useRaceStore((s) => s.postponedAt);
  const individualRecallAt = useRaceStore((s) => s.individualRecallAt);
  const rabbitLaunchAt = useRaceStore((s) => s.rabbitLaunchAt);
  const raiseAp = useRaceStore((s) => s.raiseAp);
  const dropAp = useRaceStore((s) => s.dropAp);
  const raiseIndividualRecall = useRaceStore((s) => s.raiseIndividualRecall);
  const clearIndividualRecall = useRaceStore((s) => s.clearIndividualRecall);
  const setRabbitLaunchAt = useRaceStore((s) => s.setRabbitLaunchAt);
  const abandon = useRaceStore((s) => s.abandon);
  const finish = useRaceStore((s) => s.finish);
  const setActiveSessionState = useRaceStore((s) => s.setActiveSessionState);
  const sailedMetres = useRaceStore((s) => s.sailedMetres);

  const draft = useCoursesStore((s) => s.activeDraft);
  const marks = useMarksStore((s) => s.marks);
  const totalMetres =
    draft !== null ? computeCourseDistance(draft.legs, marks).totalMetres : 0;

  const helmMode = useSettingsStore((s) => s.helmDisplayMode);
  const setHelmMode = useSettingsStore((s) => s.setHelmDisplayMode);
  const polarRaw = useSettingsStore((s) => s.polarRaw);
  const trueWindKn = useSettingsStore((s) => s.manualTrueWindKn);
  const trueWindDeg = useSettingsStore((s) => s.manualTrueWindDegrees);

  const windShift = useWindShiftTracker();

  // Compute target boatspeed when we have polar + wind + COG.
  const polar = polarRaw ? parsePolarTable(polarRaw).table : null;
  const targetSpeedKn = (() => {
    if (!polar || trueWindKn === null || trueWindDeg === null) return null;
    const cogVal = useBoatStore.getState().cog;
    if (cogVal === null) return null;
    // TWA = |TWD - COG| normalised to 0-180.
    const raw = Math.abs(((trueWindDeg - cogVal + 540) % 360) - 180);
    return evaluatePolar(polar, trueWindKn, raw);
  })();

  // Helm display needs the live start-line geometry. Recomputed cheaply
  // each render since this screen is the only consumer.
  const position = useBoatStore((s) => s.position);
  const cog = useBoatStore((s) => s.cog);
  const sog = useBoatStore((s) => s.sog);
  const startLeg = draft?.legs.find((l) => l.type === 'start');
  const cb = marks.find((m) => m.id === startLeg?.markIds[0]);
  const pin = marks.find((m) => m.id === startLeg?.markIds[1]);
  const startLineState =
    cb && pin && position && draft?.startType === 'standard-line'
      ? computeBoatStartState(
          position,
          cog,
          sog,
          { latitude: cb.latitude, longitude: cb.longitude },
          { latitude: pin.latitude, longitude: pin.longitude },
        )
      : null;

  const [snapshot, setSnapshot] = useState(() =>
    makeSnapshot(sequenceStartTime, new Date(), sequence, {
      postponedAt,
      individualRecallAt,
    }),
  );
  const lastMinuteFiredRef = useRef<number | null>(null);
  const startGunFiredRef = useRef(false);

  // Tick.
  useEffect(() => {
    const id = setInterval(() => {
      setSnapshot(
        makeSnapshot(sequenceStartTime, new Date(), sequence, {
          postponedAt,
          individualRecallAt,
        }),
      );
    }, 250);
    return () => clearInterval(id);
  }, [sequenceStartTime, sequence, postponedAt, individualRecallAt]);

  // Haptic on each whole minute transition during countdown, and a heavy
  // haptic at the gun (T=0).
  useEffect(() => {
    if (snapshot.state === 'counting-down' || snapshot.state === 'armed') {
      const whole = Math.floor(snapshot.millisecondsToStart / 60_000);
      if (lastMinuteFiredRef.current !== whole && whole >= 0) {
        lastMinuteFiredRef.current = whole;
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
    if (snapshot.state === 'starting' && !startGunFiredRef.current) {
      startGunFiredRef.current = true;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void setActiveSessionState('running');
    }
    if (snapshot.state === 'idle' || snapshot.state === 'postponed') {
      // Reset both refs so a fresh post-AP countdown re-fires the minute
      // haptics + the gun haptic exactly once.
      lastMinuteFiredRef.current = null;
      startGunFiredRef.current = false;
    }
  }, [snapshot, setActiveSessionState]);

  // Schedule / cancel notifications in response to timer state.
  // Postponement cancels them; dropping AP (which changes sequenceStartTime)
  // re-runs this effect and re-schedules cleanly.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!sequenceStartTime || postponedAt) {
        await cancelAllRaceNotifications();
        return;
      }
      const granted = await requestNotificationPermissions();
      if (cancelled || !granted) return;
      await scheduleForStart(new Date(sequenceStartTime), sequence);
    })();
    return () => {
      cancelled = true;
    };
  }, [sequenceStartTime, sequence, postponedAt]);

  function handleAbandon() {
    Alert.alert('Abandon race?', 'Timer will stop and scheduled notifications cancelled.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Abandon',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await abandon();
            await cancelAllRaceNotifications();
            navigation.goBack();
          })();
        },
      },
    ]);
  }

  function handleRecall() {
    Alert.alert(
      'General recall?',
      'Sequence restarts at T-5 with a new gun in five minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Recall',
          style: 'destructive',
          onPress: () => generalRecall(),
        },
      ],
    );
  }

  function handleFinish() {
    Alert.alert('Finish race?', 'Marks the session complete.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finish',
        onPress: () => {
          void (async () => {
            await finish();
            await cancelAllRaceNotifications();
            navigation.goBack();
          })();
        },
      },
    ]);
  }

  function handleRaiseAp() {
    Alert.alert(
      'Postpone (AP)?',
      'Countdown freezes. Notifications cancelled. Tap "Drop AP" when you\u2019re ready to restart.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Raise AP',
          onPress: () => {
            raiseAp();
            void cancelAllRaceNotifications();
          },
        },
      ],
    );
  }

  function handleDropAp() {
    Alert.alert(
      'Drop AP — restart in?',
      'New gun rounded to the next whole minute from your choice.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '5 min', onPress: () => dropAp(new Date(Date.now() + 5 * 60_000)) },
        { text: '10 min', onPress: () => dropAp(new Date(Date.now() + 10 * 60_000)) },
        { text: '15 min', onPress: () => dropAp(new Date(Date.now() + 15 * 60_000)) },
      ],
    );
  }

  function handleRaiseX() {
    raiseIndividualRecall();
  }

  function handleClearX() {
    clearIndividualRecall();
  }

  const bandColour = bandToColour(snapshot.band, theme);
  const primaryLabel = formatCountdown(snapshot.secondsToStart);
  const stateLabel = labelForState(snapshot.state);

  // Helm Display Mode — strip everything but the countdown + a single
  // secondary readout. Long-press inside the layout exits.
  if (helmMode) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top', 'bottom']}>
        <HelmDisplayLayout
          snapshot={snapshot}
          distanceToLineMetres={
            startLineState?.side === 'behind'
              ? -Math.abs(startLineState.distanceMetres)
              : startLineState?.distanceMetres ?? null
          }
          secondsToLine={startLineState?.secondsToLine ?? null}
          totalCourseMetres={totalMetres}
          sailedMetres={sailedMetres}
          onExit={() => setHelmMode(false)}
          variant={variant}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.space.md,
          paddingTop: theme.space.sm,
          paddingBottom: theme.space.xl,
          flexGrow: 1,
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
              ← Back
            </Text>
          </Pressable>
          <Text
            color={theme.text.primary}
            fontSize={theme.type.h2.size}
            fontWeight={theme.type.h2.weight as '600'}
          >
            Race timer
          </Text>
          <View width={64} />
        </View>

        <View alignItems="center" justifyContent="center" flex={1} paddingVertical={theme.space.xl}>
          <Text
            color={theme.text.muted}
            fontSize={theme.type.label.size}
            fontWeight={theme.type.label.weight as '600'}
            letterSpacing={theme.type.label.letterSpacing}
            marginBottom={theme.space.sm}
          >
            {stateLabel.toUpperCase()}
          </Text>
          <Text
            color={bandColour}
            fontSize={sequenceStartTime ? 128 : 64}
            fontWeight="700"
            lineHeight={sequenceStartTime ? 128 : 64}
            letterSpacing={-4}
          >
            {sequenceStartTime ? primaryLabel : 'T−:--:--'}
          </Text>
          {snapshot.nextSignal ? (
            <Text
              color={theme.text.muted}
              fontSize={theme.type.body.size}
              marginTop={theme.space.sm}
            >
              Next: {signalLabel(snapshot.nextSignal)} in{' '}
              {Math.max(0, Math.round((snapshot.millisecondsToNextSignal ?? 0) / 1000))}s
            </Text>
          ) : null}
          {recallCount > 0 ? (
            <Text
              color={theme.status.warning}
              fontSize={theme.type.caption.size}
              marginTop={theme.space.xs}
            >
              General recall ×{recallCount}
            </Text>
          ) : null}
        </View>

        {sequenceStartTime ? (
          <>
            {snapshot.state === 'starting' || snapshot.state === 'running' ? (
              <CourseProgressReadout
                sailedMetres={sailedMetres}
                totalMetres={totalMetres}
                variant={variant}
              />
            ) : null}

            {snapshot.state === 'starting' ||
            snapshot.state === 'running' ||
            snapshot.state === 'individual-recall' ? (
              <WindShiftBar snapshot={windShift} variant={variant} />
            ) : null}

            {targetSpeedKn !== null &&
            (snapshot.state === 'starting' || snapshot.state === 'running') ? (
              <TargetSpeedStrip
                targetKn={targetSpeedKn}
                actualKn={metresPerSecondToKnots(useBoatStore.getState().sog ?? 0)}
                theme={theme}
              />
            ) : null}

            {snapshot.state === 'postponed' ? (
              <View
                paddingVertical={theme.space.md}
                paddingHorizontal={theme.space.md}
                borderRadius={theme.radius.lg}
                backgroundColor={theme.status.warning}
                alignItems="center"
                marginBottom={theme.space.sm}
              >
                <Text color={theme.bg} fontSize={theme.type.h2.size} fontWeight="700">
                  AP — RACE POSTPONED
                </Text>
                <Text
                  color={theme.bg}
                  fontSize={theme.type.caption.size}
                  marginTop={theme.space.xxs}
                  opacity={0.9}
                >
                  Countdown frozen. Tap &ldquo;Drop AP&rdquo; when ready to restart.
                </Text>
              </View>
            ) : null}

            {snapshot.state === 'individual-recall' ? (
              <View
                paddingVertical={theme.space.sm}
                paddingHorizontal={theme.space.md}
                borderRadius={theme.radius.lg}
                backgroundColor={theme.status.danger}
                alignItems="center"
                marginBottom={theme.space.sm}
              >
                <Text color={theme.bg} fontSize={theme.type.bodySemi.size} fontWeight="700">
                  X — INDIVIDUAL RECALL
                </Text>
                <Text
                  color={theme.bg}
                  fontSize={theme.type.caption.size}
                  marginTop={theme.space.xxs}
                  opacity={0.9}
                >
                  4-min OCS-clear window. Auto-clears.
                </Text>
              </View>
            ) : null}

            {draft &&
            draft.startType !== 'standard-line' &&
            snapshot.state !== 'postponed' ? (
              <RabbitStartPanel
                startType={draft.startType}
                sequenceStartTime={sequenceStartTime}
                rabbitLaunchAt={rabbitLaunchAt}
                onLaunch={() => setRabbitLaunchAt(new Date())}
                variant={variant}
              />
            ) : null}

            {snapshot.state !== 'postponed' ? (
              <GunSyncButton
                onSync={syncToMinute}
                onUndo={undoLastGunChange}
                previousGunTime={previousGunTime}
                previousGunCapturedAt={previousGunCapturedAt}
                variant={variant}
              />
            ) : null}

            <View flexDirection="row" marginBottom={theme.space.sm}>
              <TimerButton
                label="−1 min"
                onPress={() => shiftMinutes(-1)}
                theme={theme}
                variant="outline"
              />
              <TimerButton
                label="+1 min"
                onPress={() => shiftMinutes(1)}
                theme={theme}
                variant="outline"
              />
            </View>

            <View flexDirection="row" marginBottom={theme.space.sm}>
              {snapshot.state === 'postponed' ? (
                <TimerButton
                  label="Drop AP"
                  onPress={handleDropAp}
                  theme={theme}
                  variant="primary"
                />
              ) : snapshot.state === 'counting-down' || snapshot.state === 'armed' ? (
                <TimerButton
                  label="AP (postpone)"
                  onPress={handleRaiseAp}
                  theme={theme}
                  variant="warning"
                />
              ) : null}

              {snapshot.state === 'individual-recall' ? (
                <TimerButton
                  label="Clear X"
                  onPress={handleClearX}
                  theme={theme}
                  variant="outline"
                />
              ) : snapshot.state === 'starting' || snapshot.state === 'running' ? (
                <TimerButton
                  label="X (indiv. recall)"
                  onPress={handleRaiseX}
                  theme={theme}
                  variant="danger"
                />
              ) : null}
            </View>

            <View flexDirection="row">
              <TimerButton
                label="General recall"
                onPress={handleRecall}
                theme={theme}
                variant="warning"
              />
              {snapshot.state === 'running' ||
              snapshot.state === 'starting' ||
              snapshot.state === 'individual-recall' ? (
                <TimerButton
                  label="Finish"
                  onPress={handleFinish}
                  theme={theme}
                  variant="primary"
                />
              ) : (
                <TimerButton
                  label="Abandon"
                  onPress={handleAbandon}
                  theme={theme}
                  variant="danger"
                />
              )}
            </View>

            <Pressable
              onPress={() => setHelmMode(true)}
              accessibilityLabel="Helm display"
              hitSlop={8}
            >
              <Text
                color={theme.text.muted}
                fontSize={theme.type.caption.size}
                fontWeight={theme.type.bodySemi.weight as '600'}
                textAlign="center"
                marginTop={theme.space.sm}
              >
                ◐ Helm display (kiosk)
              </Text>
            </Pressable>
          </>
        ) : (
          <View alignItems="center" paddingVertical={theme.space.lg}>
            <Text
              color={theme.text.muted}
              fontSize={theme.type.body.size}
              textAlign="center"
              marginBottom={theme.space.md}
            >
              Timer isn&apos;t armed. Build a course and tap Arm Timer, or arm the timer directly.
            </Text>
            <Pressable
              onPress={() => {
                void useRaceStore
                  .getState()
                  .arm(new Date(Date.now() + 5 * 60_000), null);
              }}
              hitSlop={8}
            >
              <View
                paddingVertical={theme.space.md}
                paddingHorizontal={theme.space.lg}
                backgroundColor={theme.accent}
                borderRadius={theme.radius.full}
              >
                <Text
                  color={theme.bg}
                  fontSize={theme.type.body.size}
                  fontWeight={theme.type.bodySemi.weight as '700'}
                >
                  Arm T-5 without a course
                </Text>
              </View>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TimerButton({
  label,
  onPress,
  theme,
  variant,
}: {
  label: string;
  onPress: () => void;
  theme: ReturnType<typeof getTheme>;
  variant: 'primary' | 'outline' | 'warning' | 'danger';
}) {
  const bg =
    variant === 'primary'
      ? theme.accent
      : variant === 'warning'
        ? theme.status.warning
        : variant === 'danger'
          ? theme.status.danger
          : 'transparent';
  const border =
    variant === 'outline' ? theme.border : bg === 'transparent' ? theme.border : bg;
  const fg =
    variant === 'outline' ? theme.text.primary : theme.bg;

  return (
    <Pressable onPress={onPress} hitSlop={4} style={{ flex: 1, marginHorizontal: 4 }}>
      <View
        minHeight={48}
        paddingVertical={theme.space.sm}
        paddingHorizontal={theme.space.sm}
        borderRadius={theme.radius.lg}
        backgroundColor={bg}
        borderColor={border}
        borderWidth={1}
        alignItems="center"
        justifyContent="center"
      >
        <Text color={fg} fontSize={theme.type.body.size} fontWeight={theme.type.bodySemi.weight as '600'}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function bandToColour(
  band: ReturnType<typeof makeSnapshot>['band'],
  theme: ReturnType<typeof getTheme>,
): string {
  switch (band) {
    case 'dormant':
      return theme.text.secondary;
    case 'preparing':
      return theme.text.primary;
    case 'urgent':
      return theme.status.warning;
    case 'live':
      return theme.status.success;
    case 'after':
      return theme.text.primary;
  }
}

function labelForState(state: RaceState): string {
  switch (state) {
    case 'idle':
      return 'Idle';
    case 'armed':
      return 'Armed — warning at T-5';
    case 'counting-down':
      return 'Counting down';
    case 'postponed':
      return 'Postponed (AP)';
    case 'starting':
      return 'Start!';
    case 'running':
      return 'Running';
    case 'individual-recall':
      return 'Individual recall (X)';
    case 'finished':
      return 'Finished';
    case 'abandoned':
      return 'Abandoned';
  }
}

function signalLabel(signal: 'warning' | 'preparatory' | 'one-minute' | 'start'): string {
  switch (signal) {
    case 'warning':
      return 'warning';
    case 'preparatory':
      return 'preparatory';
    case 'one-minute':
      return 'one-minute';
    case 'start':
      return 'start';
  }
}

function TargetSpeedStrip({
  targetKn,
  actualKn,
  theme,
}: {
  targetKn: number;
  actualKn: number;
  theme: ReturnType<typeof getTheme>;
}) {
  const ratio = targetKn > 0 ? actualKn / targetKn : 0;
  const pct = Math.round(ratio * 100);
  const colour =
    ratio >= 0.97
      ? theme.status.success
      : ratio >= 0.9
        ? theme.text.primary
        : theme.status.warning;
  return (
    <View
      paddingVertical={theme.space.sm}
      paddingHorizontal={theme.space.md}
      borderRadius={theme.radius.md}
      borderColor={theme.border}
      borderWidth={1}
      backgroundColor={theme.surface}
      marginBottom={theme.space.sm}
      flexDirection="row"
      alignItems="baseline"
      justifyContent="space-between"
    >
      <View>
        <Text
          color={theme.text.muted}
          fontSize={theme.type.micro.size}
          fontWeight={theme.type.micro.weight as '600'}
          letterSpacing={theme.type.micro.letterSpacing}
        >
          TARGET (POLAR)
        </Text>
        <Text
          color={theme.text.primary}
          fontSize={theme.type.h2.size}
          fontWeight="700"
          style={{ fontFamily: 'Menlo' }}
        >
          {targetKn.toFixed(1)} kn
        </Text>
      </View>
      <View alignItems="flex-end">
        <Text
          color={theme.text.muted}
          fontSize={theme.type.micro.size}
          fontWeight={theme.type.micro.weight as '600'}
          letterSpacing={theme.type.micro.letterSpacing}
        >
          ACTUAL · % OF TARGET
        </Text>
        <Text
          color={colour}
          fontSize={theme.type.h2.size}
          fontWeight="700"
          style={{ fontFamily: 'Menlo' }}
        >
          {actualKn.toFixed(1)} kn · {pct}%
        </Text>
      </View>
    </View>
  );
}
