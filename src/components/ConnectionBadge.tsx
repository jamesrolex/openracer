/**
 * Small pill-shaped indicator showing connectivity mode. Top-left of every
 * screen. See skills/design-system/SKILL.md "ConnectionBadge".
 *
 * Non-alarming: "offline" is the default racing state and must not feel broken.
 */

import { Text, View } from 'tamagui';

import { connectivityColour, getTheme } from '../theme/theme';
import type { ThemeVariant } from '../theme/theme';
import type { ConnectivityMode } from '../types/connectivity';

export interface ConnectionBadgeProps {
  mode: ConnectivityMode;
  variant?: ThemeVariant;
}

const LABEL: Record<ConnectivityMode, string> = {
  offline: 'Offline',
  patchy: 'Patchy',
  constant: 'Online',
};

export function ConnectionBadge({ mode, variant = 'day' }: ConnectionBadgeProps) {
  const theme = getTheme(variant);
  const dotColour = connectivityColour(mode);

  return (
    <View
      flexDirection="row"
      alignItems="center"
      paddingVertical={theme.space.xs}
      paddingHorizontal={theme.space.sm}
      borderRadius={theme.radius.full}
      backgroundColor={theme.surface}
      borderWidth={1}
      borderColor={theme.border}
      alignSelf="flex-start"
      accessibilityLabel={`Connectivity ${LABEL[mode]}`}
    >
      <View
        width={8}
        height={8}
        borderRadius={theme.radius.full}
        backgroundColor={dotColour}
        marginRight={theme.space.xs}
      />
      <Text
        color={theme.text.secondary}
        fontSize={theme.type.caption.size}
        fontWeight={theme.type.bodySemi.weight as '600'}
        lineHeight={theme.type.caption.lineHeight}
      >
        {LABEL[mode]}
      </Text>
    </View>
  );
}
