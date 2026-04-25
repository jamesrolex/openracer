/**
 * CourseStrip — compact one-line display of a course, used on HomeScreen.
 *
 * Shows the sequence of legs as coloured chips ("Start · Windward · Leeward ·
 * Finish") with a tiny meta line: template name + fill state (e.g. "W-L ·
 * 2 of 4 legs set"). Tapping opens CourseEntry.
 */

import { Pressable } from 'react-native';
import { Text, View } from 'tamagui';

import { remainingLegsToFill } from '../domain/courseTemplates';
import { getTheme } from '../theme/theme';
import type { Course, Leg } from '../types/course';

const LEG_SHORT: Record<Leg['type'], string> = {
  start: 'Start',
  windward: 'Wind',
  leeward: 'Lee',
  reach: 'Reach',
  gate: 'Gate',
  finish: 'Finish',
};

export interface CourseStripProps {
  course: Course;
  onPress?: () => void;
  variant?: 'day' | 'night' | 'kindle';
}

export function CourseStrip({ course, onPress, variant = 'day' }: CourseStripProps) {
  const theme = getTheme(variant);
  const missing = remainingLegsToFill(course.legs);
  const ready = missing === 0;

  const meta = ready
    ? 'Ready to arm'
    : `${missing} mark${missing === 1 ? '' : 's'} to set`;

  return (
    <Pressable onPress={onPress} accessibilityLabel={`Course: ${course.name}`}>
      <View
        paddingVertical={theme.space.sm}
        paddingHorizontal={theme.space.md}
        borderRadius={theme.radius.lg}
        borderWidth={1}
        borderColor={ready ? theme.status.success : theme.border}
        backgroundColor={theme.surface}
      >
        <View
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          marginBottom={theme.space.xs}
        >
          <Text
            color={theme.text.primary}
            fontSize={theme.type.bodySemi.size}
            fontWeight={theme.type.bodySemi.weight as '600'}
            numberOfLines={1}
          >
            {course.name}
          </Text>
          <Text
            color={ready ? theme.status.success : theme.text.muted}
            fontSize={theme.type.caption.size}
            fontWeight={theme.type.bodySemi.weight as '600'}
          >
            {meta}
          </Text>
        </View>
        <View flexDirection="row" flexWrap="wrap">
          {course.legs.map((leg, idx) => {
            const filled = leg.markIds.length >= leg.requiredMarks;
            const roundingTag = leg.rounding === 'port' ? ' · P' : leg.rounding === 'starboard' ? ' · S' : '';
            return (
              <View key={leg.id} flexDirection="row" alignItems="center">
                <View
                  paddingVertical={2}
                  paddingHorizontal={theme.space.xs}
                  borderRadius={theme.radius.sm}
                  backgroundColor={filled ? theme.accent : 'transparent'}
                  borderColor={filled ? theme.accent : theme.border}
                  borderWidth={1}
                >
                  <Text
                    color={filled ? theme.bg : theme.text.secondary}
                    fontSize={theme.type.micro.size}
                    fontWeight={theme.type.micro.weight as '600'}
                    letterSpacing={theme.type.micro.letterSpacing}
                  >
                    {`${LEG_SHORT[leg.type].toUpperCase()}${roundingTag}`}
                  </Text>
                </View>
                {idx < course.legs.length - 1 ? (
                  <Text
                    color={theme.text.muted}
                    fontSize={theme.type.caption.size}
                    marginHorizontal={theme.space.xs}
                  >
                    ›
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
}
