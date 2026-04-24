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

import {
  cancelAllRaceNotifications,
  requestNotificationPermissions,
  scheduleForStart,
} from '../domain/raceNotifications';
import { formatCountdown, makeSnapshot } from '../domain/raceTimer';
import type { RootStackScreenProps } from '../navigation';
import { useRaceStore } from '../stores/useRaceStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';
import type { RaceState } from '../types/race';

export function RaceTimerScreen({ navigation }: RootStackScreenProps<'RaceTimer'>) {
  const nightMode = useSettingsStore((s) => s.nightMode);
  const theme = getTheme(nightMode ? 'night' : 'day');

  const sequenceStartTime = useRaceStore((s) => s.sequenceStartTime);
  const sequence = useRaceStore((s) => s.sequence);
  const recallCount = useRaceStore((s) => s.recallCount);
  const syncToMinute = useRaceStore((s) => s.syncToMinute);
  const shiftMinutes = useRaceStore((s) => s.shiftMinutes);
  const generalRecall = useRaceStore((s) => s.generalRecall);
  const abandon = useRaceStore((s) => s.abandon);
  const finish = useRaceStore((s) => s.finish);
  const setActiveSessionState = useRaceStore((s) => s.setActiveSessionState);

  const [snapshot, setSnapshot] = useState(() =>
    makeSnapshot(sequenceStartTime, new Date(), sequence),
  );
  const lastMinuteFiredRef = useRef<number | null>(null);
  const startGunFiredRef = useRef(false);

  // Tick.
  useEffect(() => {
    const id = setInterval(() => {
      setSnapshot(makeSnapshot(sequenceStartTime, new Date(), sequence));
    }, 250);
    return () => clearInterval(id);
  }, [sequenceStartTime, sequence]);

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
    if (snapshot.state === 'idle') {
      lastMinuteFiredRef.current = null;
      startGunFiredRef.current = false;
    }
  }, [snapshot, setActiveSessionState]);

  // Schedule / cancel notifications in response to timer state.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!sequenceStartTime) {
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
  }, [sequenceStartTime, sequence]);

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

  const bandColour = bandToColour(snapshot.band, theme);
  const primaryLabel = formatCountdown(snapshot.secondsToStart);
  const stateLabel = labelForState(snapshot.state);

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
            <View flexDirection="row" marginBottom={theme.space.sm}>
              <TimerButton label="Sync" onPress={syncToMinute} theme={theme} variant="primary" />
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
            <View flexDirection="row">
              <TimerButton
                label="General recall"
                onPress={handleRecall}
                theme={theme}
                variant="warning"
              />
              {snapshot.state === 'running' || snapshot.state === 'starting' ? (
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
    case 'starting':
      return 'Start!';
    case 'running':
      return 'Running';
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
