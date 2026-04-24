/**
 * Race / Cruise toggle. Top-right of the main screen.
 *
 * Both modes are first-class — never style one as "default" and the other
 * as "other". See skills/design-system/SKILL.md "ModeToggle".
 *
 * Phase 0 is a placeholder: the onChange fires but nothing yet listens to
 * the mode switch. Real behaviour lands with the race timer in Phase 1.
 */

import { Pressable } from 'react-native';
import { Text, View } from 'tamagui';

import { getTheme } from '../theme/theme';
import type { ThemeVariant } from '../theme/theme';
import type { AppMode } from '../types/mode';

export interface ModeToggleProps {
  mode: AppMode;
  onChange: (next: AppMode) => void;
  variant?: ThemeVariant;
}

export function ModeToggle({ mode, onChange, variant = 'day' }: ModeToggleProps) {
  const theme = getTheme(variant);

  return (
    <View
      flexDirection="row"
      alignItems="center"
      backgroundColor={theme.surface}
      borderWidth={1}
      borderColor={theme.border}
      borderRadius={theme.radius.full}
      padding={theme.space.xxs}
      accessibilityRole="tablist"
      accessibilityLabel="App mode"
    >
      {(['race', 'cruise'] as const).map((candidate) => {
        const active = candidate === mode;
        return (
          <Pressable
            key={candidate}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={candidate === 'race' ? 'Race mode' : 'Cruise mode'}
            onPress={() => {
              if (!active) onChange(candidate);
            }}
          >
            <View
              paddingVertical={theme.space.xs}
              paddingHorizontal={theme.space.md}
              borderRadius={theme.radius.full}
              backgroundColor={active ? theme.accent : 'transparent'}
            >
              <Text
                color={active ? theme.bg : theme.text.secondary}
                fontSize={theme.type.bodySemi.size}
                fontWeight={theme.type.bodySemi.weight as '600'}
                lineHeight={theme.type.bodySemi.lineHeight}
              >
                {candidate === 'race' ? 'Race' : 'Cruise'}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
