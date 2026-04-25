/**
 * MarkCard — a single mark rendered as a tappable list row.
 *
 * Shape mirrors skills/design-system/SKILL.md "MarkCard": icon + name on
 * the top, coordinates in the marine DMM format underneath, tier badge at
 * the bottom-left with colour matching the tier.
 */

import { Pressable } from 'react-native';
import { Text, View } from 'tamagui';

import { getTheme } from '../theme/theme';
import type { ThemeVariant } from '../theme/theme';
import type { Mark, MarkIcon, MarkTier } from '../types/mark';
import { formatLatLon } from '../utils/format';

export interface MarkCardProps {
  mark: Mark;
  onPress?: (mark: Mark) => void;
  variant?: ThemeVariant;
}

const TIER_LABEL: Record<MarkTier, string> = {
  'club-seasonal': 'CLUB SEASONAL',
  'chart-permanent': 'CHART PERMANENT',
  'race-day-recent': 'RACE-DAY RECENT',
  'single-race-temporary': 'SINGLE RACE',
};

const ICON_GLYPH: Record<MarkIcon, string> = {
  'cardinal-n': 'N',
  'cardinal-s': 'S',
  'cardinal-e': 'E',
  'cardinal-w': 'W',
  'lateral-port': '◀',
  'lateral-starboard': '▶',
  'racing-yellow': '●',
  'racing-red': '●',
  'racing-orange': '●',
  'committee-boat': '⚓',
  'pin-end': '◆',
  custom: '○',
};

function iconColour(icon: MarkIcon): string | undefined {
  switch (icon) {
    case 'racing-yellow':
      return '#F5C518';
    case 'racing-red':
      return '#C13A3A';
    case 'racing-orange':
      return '#E08A1E';
    case 'lateral-port':
      return '#C13A3A';
    case 'lateral-starboard':
      return '#3B6D11';
    default:
      return undefined;
  }
}

export function MarkCard({ mark, onPress, variant = 'day' }: MarkCardProps) {
  const theme = getTheme(variant);
  const tierColour = tierAccent(mark.tier, theme);
  const glyph = ICON_GLYPH[mark.icon];
  const glyphColour = iconColour(mark.icon) ?? theme.text.primary;
  const coords = formatLatLon(mark.latitude, mark.longitude, 'dmm');

  return (
    <Pressable onPress={onPress ? () => onPress(mark) : undefined}>
      <View
        flexDirection="row"
        alignItems="center"
        paddingVertical={theme.space.md}
        paddingHorizontal={theme.space.md}
        marginBottom={theme.space.sm}
        backgroundColor={theme.surface}
        borderColor={theme.border}
        borderWidth={1}
        borderRadius={theme.radius.lg}
      >
        <View
          width={44}
          height={44}
          borderRadius={theme.radius.full}
          backgroundColor={theme.bg}
          borderColor={theme.border}
          borderWidth={1}
          alignItems="center"
          justifyContent="center"
          marginRight={theme.space.md}
        >
          <Text color={glyphColour} fontSize={20} fontWeight="700">
            {glyph}
          </Text>
        </View>

        <View flex={1}>
          <View flexDirection="row" alignItems="center" marginBottom={2}>
            <Text
              color={theme.text.primary}
              fontSize={theme.type.h3.size}
              fontWeight={theme.type.h3.weight as '600'}
              lineHeight={theme.type.h3.lineHeight}
              flex={1}
            >
              {mark.name}
            </Text>
            {mark.colourHint ? (
              <View
                flexDirection="row"
                alignItems="center"
                marginLeft={theme.space.xs}
              >
                <View
                  width={10}
                  height={10}
                  borderRadius={5}
                  backgroundColor={swatchColour(mark.colourHint, theme)}
                  marginRight={4}
                />
                <Text
                  color={theme.text.secondary}
                  fontSize={theme.type.caption.size}
                >
                  {mark.colourHint}
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            color={theme.text.secondary}
            fontSize={theme.type.caption.size}
            lineHeight={theme.type.caption.lineHeight}
            marginBottom={theme.space.xs}
          >
            {coords}
          </Text>
          {mark.notes ? (
            <Text
              color={theme.text.muted}
              fontSize={theme.type.caption.size}
              lineHeight={theme.type.caption.lineHeight}
              marginBottom={theme.space.xs}
              numberOfLines={1}
            >
              {mark.notes}
            </Text>
          ) : null}
          <View flexDirection="row" alignItems="center">
            <View
              paddingVertical={2}
              paddingHorizontal={theme.space.xs}
              borderRadius={theme.radius.sm}
              backgroundColor={tierColour}
              marginRight={theme.space.sm}
            >
              <Text
                color={theme.bg}
                fontSize={theme.type.micro.size}
                fontWeight={theme.type.micro.weight as '600'}
                letterSpacing={theme.type.micro.letterSpacing}
              >
                {TIER_LABEL[mark.tier]}
              </Text>
            </View>
            <Text
              color={theme.text.muted}
              fontSize={theme.type.caption.size}
              lineHeight={theme.type.caption.lineHeight}
            >
              {Math.round(mark.confidence * 100)}% confidence
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function tierAccent(tier: MarkTier, theme: ReturnType<typeof getTheme>): string {
  switch (tier) {
    case 'club-seasonal':
      return theme.accent;
    case 'chart-permanent':
      return theme.status.success;
    case 'race-day-recent':
      return theme.status.warning;
    case 'single-race-temporary':
      return theme.status.offline;
  }
}

/**
 * Map a free-text colour-hint to a CSS-recognisable swatch colour.
 * Falls back to a neutral grey when the text isn't a recognised
 * colour name (e.g. "yellow w/ white top" → still picks "yellow").
 */
export function swatchColour(
  hint: string,
  theme: ReturnType<typeof getTheme>,
): string {
  const lc = hint.toLowerCase();
  if (lc.includes('yellow')) return '#F2C744';
  if (lc.includes('orange')) return '#E67E22';
  if (lc.includes('red')) return '#D14B3F';
  if (lc.includes('green')) return '#3FA76A';
  if (lc.includes('blue')) return '#3F7BD1';
  if (lc.includes('white')) return '#F2F2F2';
  if (lc.includes('black')) return '#1A1A1A';
  if (lc.includes('pink')) return '#E66BB1';
  if (lc.includes('purple')) return '#9B59B6';
  return theme.text.muted;
}
