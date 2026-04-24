/**
 * The fundamental data primitive — a monster-size value with a label above
 * and optional unit below. See skills/design-system/SKILL.md "BigNumber".
 *
 * Rule: two per row max on a HomeScreen grid.
 */

import { Text, View } from 'tamagui';

import type { Theme, ThemeVariant } from '../theme/theme';
import { getTheme } from '../theme/theme';

export type BigNumberEmphasis = 'primary' | 'secondary' | 'muted';

export interface BigNumberProps {
  /** The number to display. Caller formats to the right precision. */
  value: string | number;
  /** Label rendered in uppercase above the value. */
  label: string;
  /** Small unit shown below the value (e.g. "kn", "°", "m"). */
  unit?: string;
  /** Visual weight. Primary for SOG/COG; secondary for lat/lon; muted for auxiliary. */
  emphasis?: BigNumberEmphasis;
  /** When true the value is dimmed to 40% to signal stale/pending data. */
  stale?: boolean;
  /** Day or night. Caller threads through from settings. */
  variant?: ThemeVariant;
}

export function BigNumber({
  value,
  label,
  unit,
  emphasis = 'primary',
  stale = false,
  variant = 'day',
}: BigNumberProps) {
  const theme = getTheme(variant);
  const { valueColour, valueSize } = resolveEmphasis(theme, emphasis);

  return (
    <View
      alignItems="center"
      justifyContent="center"
      paddingVertical={theme.space.sm}
      paddingHorizontal={theme.space.sm}
      flex={1}
      minWidth={0}
      opacity={stale ? 0.4 : 1}
      accessibilityRole="text"
      accessibilityLabel={`${label} ${value}${unit ? ` ${unit}` : ''}`}
    >
      <Text
        color={theme.text.muted}
        fontSize={theme.type.label.size}
        fontWeight={theme.type.label.weight as '600'}
        lineHeight={theme.type.label.lineHeight}
        letterSpacing={theme.type.label.letterSpacing}
        marginBottom={theme.space.xs}
      >
        {label.toUpperCase()}
      </Text>
      <Text
        color={valueColour}
        fontSize={valueSize.size}
        fontWeight={valueSize.weight as '700' | '600'}
        lineHeight={valueSize.size}
        letterSpacing={'letterSpacing' in valueSize ? valueSize.letterSpacing : 0}
        textAlign="center"
        allowFontScaling={false}
      >
        {String(value)}
      </Text>
      {unit ? (
        <Text
          color={theme.text.muted}
          fontSize={theme.type.caption.size}
          fontWeight={theme.type.caption.weight as '400'}
          lineHeight={theme.type.caption.lineHeight}
          marginTop={theme.space.xs}
        >
          {unit}
        </Text>
      ) : null}
    </View>
  );
}

function resolveEmphasis(theme: Theme, emphasis: BigNumberEmphasis) {
  const valueColour =
    emphasis === 'primary'
      ? theme.text.primary
      : emphasis === 'secondary'
        ? theme.text.secondary
        : theme.text.muted;

  const valueSize =
    emphasis === 'primary'
      ? theme.type.monster
      : emphasis === 'secondary'
        ? theme.type.large
        : theme.type.h2;

  return { valueColour, valueSize };
}
