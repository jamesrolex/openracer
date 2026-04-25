/**
 * FavouredEndChip — promotes the line-bias readout from buried text to
 * a dominant chip with a left/right arrow + magnitude. Colour-coded:
 *
 *   |bias| < 3°    → muted "EVEN"
 *   3-8°           → white  "PIN +6°" / "BOAT +6°"
 *   8-15°          → amber  "PIN +12°" / "BOAT +12°"
 *   > 15°          → red    "PIN +18°" / "BOAT +18°"
 *
 * Renders nothing if true wind direction is unavailable.
 */

import { Text, View } from 'tamagui';

import type { LineBias } from '../domain/startLine';
import { getTheme } from '../theme/theme';

interface Props {
  bias: LineBias | null;
  variant: 'day' | 'night' | 'kindle';
}

export function FavouredEndChip({ bias, variant }: Props) {
  const theme = getTheme(variant);

  if (!bias) return null;

  const magnitude = Math.abs(Math.round(bias.degrees));
  const isNeutral = bias.favoured === 'neutral';

  // Colour bands. Muted, white, amber, red.
  let chipColour: string;
  let textColour: string;
  if (isNeutral) {
    chipColour = theme.surface;
    textColour = theme.text.muted;
  } else if (magnitude < 8) {
    chipColour = theme.surface;
    textColour = theme.text.primary;
  } else if (magnitude < 15) {
    chipColour = theme.status.warning;
    textColour = theme.bg;
  } else {
    chipColour = theme.status.danger;
    textColour = theme.bg;
  }

  const arrow = isNeutral ? '↔' : bias.favoured === 'pin' ? '←' : '→';
  const label = isNeutral
    ? 'EVEN'
    : `${bias.favoured === 'pin' ? 'PIN' : 'BOAT'} +${magnitude}°`;

  return (
    <View
      flexDirection="row"
      alignItems="center"
      justifyContent="center"
      paddingVertical={theme.space.xs}
      paddingHorizontal={theme.space.md}
      borderRadius={theme.radius.full}
      backgroundColor={chipColour}
      borderColor={isNeutral ? theme.border : 'transparent'}
      borderWidth={isNeutral ? 1 : 0}
      marginBottom={theme.space.sm}
    >
      <Text color={textColour} fontSize={20} fontWeight="700" marginRight={theme.space.xs}>
        {arrow}
      </Text>
      <Text
        color={textColour}
        fontSize={theme.type.bodySemi.size}
        fontWeight="700"
        letterSpacing={0.5}
      >
        {label}
      </Text>
      <Text
        color={textColour}
        fontSize={theme.type.caption.size}
        marginLeft={theme.space.xs}
        opacity={0.8}
      >
        FAVOURED
      </Text>
    </View>
  );
}
