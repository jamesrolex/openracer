/**
 * GunSyncButton — the dominant pre-start action. Tap when you hear
 * the horn; the sequence snaps to the next whole minute. After the
 * tap, an "Undo" pill appears for ~4 s in case the sailor mis-fired.
 *
 * Sized for a glove-on cockpit tap (full-width, 96 pt tall). Lives
 * directly above the secondary -1 / +1 controls.
 */

import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { Text, View } from 'tamagui';

import { UNDO_WINDOW_MS } from '../stores/useRaceStore';
import { getTheme } from '../theme/theme';

interface Props {
  /** Snap the sequence to the next whole minute. */
  onSync: () => void;
  /** Restore the gun to its previous value (within the undo window). */
  onUndo: () => void;
  /** ISO timestamp of the previous gun, or null if nothing to undo. */
  previousGunTime: string | null;
  /** ISO timestamp of when the previous gun was captured. */
  previousGunCapturedAt: string | null;
  variant: 'day' | 'night';
}

export function GunSyncButton({
  onSync,
  onUndo,
  previousGunTime,
  previousGunCapturedAt,
  variant,
}: Props) {
  const theme = getTheme(variant);

  // Show the undo pill while we're inside the undo window. Re-tick at
  // 250 ms so it disappears as soon as the window closes.
  const [showUndo, setShowUndo] = useState(false);
  useEffect(() => {
    if (!previousGunTime || !previousGunCapturedAt) {
      setShowUndo(false);
      return;
    }
    const capturedAt = new Date(previousGunCapturedAt).getTime();
    const tick = () => {
      const remaining = UNDO_WINDOW_MS - (Date.now() - capturedAt);
      setShowUndo(remaining > 0);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [previousGunTime, previousGunCapturedAt]);

  function handleTap() {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSync();
  }

  function handleUndo() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUndo();
  }

  return (
    <View marginBottom={theme.space.sm}>
      <Pressable onPress={handleTap} accessibilityLabel="Gun fired — sync timer">
        {({ pressed }) => (
          <View
            minHeight={96}
            paddingVertical={theme.space.md}
            paddingHorizontal={theme.space.lg}
            borderRadius={theme.radius.lg}
            backgroundColor={theme.accent}
            alignItems="center"
            justifyContent="center"
            opacity={pressed ? 0.85 : 1}
          >
            <Text
              color={theme.bg}
              fontSize={48}
              fontWeight="700"
              letterSpacing={2}
              lineHeight={56}
            >
              GUN!
            </Text>
            <Text
              color={theme.bg}
              fontSize={theme.type.caption.size}
              fontWeight={theme.type.bodySemi.weight as '600'}
              opacity={0.9}
              marginTop={theme.space.xxs}
            >
              Tap when you hear the horn
            </Text>
          </View>
        )}
      </Pressable>

      {showUndo ? (
        <Pressable onPress={handleUndo} accessibilityLabel="Undo last gun sync">
          <View
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            paddingVertical={theme.space.xs}
            marginTop={theme.space.xs}
            borderRadius={theme.radius.full}
            backgroundColor={theme.surface}
            borderColor={theme.border}
            borderWidth={1}
          >
            <Text
              color={theme.text.secondary}
              fontSize={theme.type.caption.size}
              fontWeight={theme.type.bodySemi.weight as '600'}
            >
              ↺ Undo last sync
            </Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}
