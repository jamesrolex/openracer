/**
 * Race / Cruise / Nav toggle. Top-right of the main screen.
 *
 * Every mode is first-class — never style one as "default" and the others
 * as "other". See skills/design-system/SKILL.md "ModeToggle".
 *
 * - Race: course entry, race timer, start-line readouts (Phase 1)
 * - Cruise: odometer + dashboards (Phase 1.7-1.8)
 * - Nav: waypoint navigation + cruise-track logging (Phase 1.16)
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
      {(['race', 'cruise', 'nav'] as const).map((candidate) => {
        const active = candidate === mode;
        const label =
          candidate === 'race' ? 'Race' : candidate === 'cruise' ? 'Cruise' : 'Nav';
        return (
          <Pressable
            key={candidate}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${label} mode`}
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
                {label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
