/**
 * RabbitStartPanel — race-timer overlay for rabbit / gate starts.
 *
 * Two states:
 *   1. Pre-launch — shows "Rabbit launches in M:SS" using the gun time
 *      as the default expected launch (rabbit boats traditionally launch
 *      at the gun on port tack).
 *   2. Post-launch — once the RC taps "Rabbit launched!", we capture
 *      `rabbitLaunchAt` and the readout flips to "Rabbit launched M:SS
 *      ago" with a different colour so it's clearly past tense.
 *
 * The panel exposes a single tap target (the launch button) sized for a
 * gloved hand on deck. Haptic on tap so the RC feels the capture even
 * when looking elsewhere.
 */

import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { Text, View } from 'tamagui';

import type { StartType } from '../types/course';
import { getTheme } from '../theme/theme';

interface Props {
  startType: Exclude<StartType, 'standard-line'>;
  /** ISO — the scheduled gun. The expected rabbit launch when not yet captured. */
  sequenceStartTime: string;
  /** ISO — when the RC tapped "Rabbit launched!" Null until captured. */
  rabbitLaunchAt: string | null;
  /** Called when the RC taps "Rabbit launched!". */
  onLaunch: () => void;
  variant: 'day' | 'night' | 'kindle';
}

export function RabbitStartPanel({
  startType,
  sequenceStartTime,
  rabbitLaunchAt,
  onLaunch,
  variant,
}: Props) {
  const theme = getTheme(variant);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const expectedMs = new Date(sequenceStartTime).getTime();
  const launchedMs = rabbitLaunchAt ? new Date(rabbitLaunchAt).getTime() : null;

  function format(ms: number): string {
    const total = Math.max(0, Math.round(ms / 1000));
    const mm = Math.floor(total / 60).toString().padStart(2, '0');
    const ss = (total % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

  const handleTap = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onLaunch();
  };

  const label = startType === 'rabbit' ? 'RABBIT START' : 'GATE START';

  // Pre-launch state.
  if (!launchedMs) {
    const diff = expectedMs - now;
    const overdue = diff < -1000; // grace before we nag
    return (
      <View marginBottom={theme.space.sm}>
        <View
          paddingVertical={theme.space.sm}
          paddingHorizontal={theme.space.md}
          borderRadius={theme.radius.lg}
          backgroundColor={overdue ? theme.status.warning : theme.surface}
          borderColor={overdue ? theme.status.warning : theme.border}
          borderWidth={1}
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          marginBottom={theme.space.xs}
        >
          <View>
            <Text
              color={overdue ? theme.bg : theme.text.muted}
              fontSize={theme.type.micro.size}
              fontWeight={theme.type.micro.weight as '600'}
              letterSpacing={theme.type.micro.letterSpacing}
            >
              {label}
            </Text>
            <Text
              color={overdue ? theme.bg : theme.text.primary}
              fontSize={theme.type.h2.size}
              fontWeight="700"
              style={{ fontFamily: 'Menlo' }}
            >
              {diff >= 0 ? `Launches in ${format(diff)}` : `Overdue ${format(-diff)}`}
            </Text>
          </View>
        </View>

        <Pressable onPress={handleTap} accessibilityLabel="Rabbit launched">
          {({ pressed }) => (
            <View
              minHeight={64}
              paddingVertical={theme.space.sm}
              paddingHorizontal={theme.space.lg}
              borderRadius={theme.radius.lg}
              backgroundColor={theme.accent}
              alignItems="center"
              justifyContent="center"
              opacity={pressed ? 0.85 : 1}
            >
              <Text
                color={theme.bg}
                fontSize={theme.type.h2.size}
                fontWeight="700"
                letterSpacing={1}
              >
                RABBIT LAUNCHED!
              </Text>
              <Text
                color={theme.bg}
                fontSize={theme.type.caption.size}
                opacity={0.9}
                marginTop={2}
              >
                Tap when the rabbit crosses
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    );
  }

  // Post-launch state.
  const sinceMs = now - launchedMs;
  return (
    <View
      paddingVertical={theme.space.sm}
      paddingHorizontal={theme.space.md}
      borderRadius={theme.radius.lg}
      backgroundColor={theme.status.success}
      marginBottom={theme.space.sm}
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
    >
      <View>
        <Text
          color={theme.bg}
          fontSize={theme.type.micro.size}
          fontWeight={theme.type.micro.weight as '600'}
          letterSpacing={theme.type.micro.letterSpacing}
        >
          {label}
        </Text>
        <Text
          color={theme.bg}
          fontSize={theme.type.h2.size}
          fontWeight="700"
          style={{ fontFamily: 'Menlo' }}
        >
          Launched {format(sinceMs)} ago
        </Text>
      </View>
    </View>
  );
}
