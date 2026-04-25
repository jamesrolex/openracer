/**
 * PreRaceChecklist — sanity-check sheet shown before arming the timer.
 *
 * Catches the common Wednesday-night mistakes:
 *   - Wind direction never set → favoured-end chip silently absent
 *   - Course not fully filled → arming would fail anyway
 *   - GPS fix stale or denied → start-line readouts are wrong
 *   - Notifications denied → T-5/T-1 alerts won't fire with the
 *     screen off
 *
 * Each item is green when satisfied, amber when missing. The "Arm
 * timer" CTA at the bottom is full-strength only when every item is
 * green; there's an "Arm anyway" override for the RC who knows what
 * they're doing.
 */

import { Pressable } from 'react-native';
import { Text, View } from 'tamagui';

import { isCourseReadyToArm } from '../domain/courseTemplates';
import type { Course } from '../types/course';
import { getTheme } from '../theme/theme';

export type ChecklistVerdict = 'pass' | 'warn';

export interface ChecklistItem {
  id: string;
  label: string;
  detail: string;
  verdict: ChecklistVerdict;
  /** Optional callback when the user taps a warn row to fix it. */
  onFix?: () => void;
}

export interface PreRaceChecklistInputs {
  course: Course | null;
  windDirectionSet: boolean;
  gpsFresh: boolean;
  notificationsGranted: boolean;
  rabbitLaunchSet: boolean;
}

/** Build the list of items from the inputs. Pure — no React. */
export function buildChecklist(inputs: PreRaceChecklistInputs): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  // Course completeness.
  const ready = inputs.course ? isCourseReadyToArm(inputs.course.legs) : false;
  items.push({
    id: 'course',
    label: 'Course filled',
    detail: ready
      ? 'Every leg has its required marks.'
      : 'Some legs are missing marks. Pick them before arming.',
    verdict: ready ? 'pass' : 'warn',
  });

  // Standard-line: wind direction. Rabbit/gate: rabbit launch time.
  const isRabbit =
    inputs.course && inputs.course.startType !== 'standard-line';
  if (isRabbit) {
    items.push({
      id: 'rabbit-launch',
      label: 'Rabbit briefed',
      detail: inputs.rabbitLaunchSet
        ? 'Rabbit launch time captured.'
        : 'Tap "Rabbit launched!" on the timer when the rabbit crosses.',
      verdict: 'pass', // information only — no blocker
    });
  } else {
    items.push({
      id: 'wind',
      label: 'Wind direction',
      detail: inputs.windDirectionSet
        ? 'Set in Settings → Racing. Favoured-end chip will work.'
        : 'Not set. Favoured-end chip will be hidden.',
      verdict: inputs.windDirectionSet ? 'pass' : 'warn',
    });
  }

  // GPS freshness.
  items.push({
    id: 'gps',
    label: 'GPS fix',
    detail: inputs.gpsFresh
      ? 'Live within the last few seconds.'
      : 'Stale or unavailable. Step outside and wait 30 s.',
    verdict: inputs.gpsFresh ? 'pass' : 'warn',
  });

  // Notifications.
  items.push({
    id: 'notifications',
    label: 'Lock-screen alerts',
    detail: inputs.notificationsGranted
      ? 'Notifications granted. T-5/T-4/T-1/T-0 will fire with the screen off.'
      : 'Notifications denied. Phone must be unlocked to hear alerts.',
    verdict: inputs.notificationsGranted ? 'pass' : 'warn',
  });

  return items;
}

interface Props {
  items: ChecklistItem[];
  onArm: () => void;
  onCancel: () => void;
  variant: 'day' | 'night' | 'kindle';
}

export function PreRaceChecklist({ items, onArm, onCancel, variant }: Props) {
  const theme = getTheme(variant);
  const allPass = items.every((i) => i.verdict === 'pass');

  return (
    <View
      backgroundColor={theme.bg}
      padding={theme.space.lg}
      borderRadius={theme.radius.lg}
      borderColor={theme.border}
      borderWidth={1}
    >
      <Text
        color={theme.text.primary}
        fontSize={theme.type.h2.size}
        fontWeight={theme.type.h2.weight as '600'}
        marginBottom={theme.space.xs}
      >
        Pre-race checklist
      </Text>
      <Text
        color={theme.text.muted}
        fontSize={theme.type.caption.size}
        marginBottom={theme.space.md}
      >
        A 5-second sanity check before the gun.
      </Text>

      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={item.onFix}
          disabled={!item.onFix}
          accessibilityLabel={item.label}
        >
          <View
            flexDirection="row"
            alignItems="flex-start"
            paddingVertical={theme.space.sm}
            borderBottomWidth={1}
            borderBottomColor={theme.border}
          >
            <View
              width={28}
              height={28}
              borderRadius={14}
              backgroundColor={
                item.verdict === 'pass' ? theme.status.success : theme.status.warning
              }
              alignItems="center"
              justifyContent="center"
              marginRight={theme.space.sm}
            >
              <Text color={theme.bg} fontWeight="700" fontSize={16}>
                {item.verdict === 'pass' ? '✓' : '!'}
              </Text>
            </View>
            <View flex={1}>
              <Text
                color={theme.text.primary}
                fontSize={theme.type.bodySemi.size}
                fontWeight={theme.type.bodySemi.weight as '600'}
              >
                {item.label}
              </Text>
              <Text
                color={theme.text.muted}
                fontSize={theme.type.caption.size}
                lineHeight={theme.type.caption.lineHeight}
                marginTop={2}
              >
                {item.detail}
              </Text>
            </View>
          </View>
        </Pressable>
      ))}

      <View flexDirection="row" marginTop={theme.space.md}>
        <Pressable onPress={onCancel} accessibilityLabel="Back" style={{ flex: 1 }}>
          <View
            paddingVertical={theme.space.sm}
            paddingHorizontal={theme.space.md}
            marginRight={theme.space.sm}
            borderRadius={theme.radius.full}
            borderColor={theme.border}
            borderWidth={1}
            alignItems="center"
          >
            <Text
              color={theme.text.secondary}
              fontSize={theme.type.bodySemi.size}
              fontWeight={theme.type.bodySemi.weight as '600'}
            >
              Back
            </Text>
          </View>
        </Pressable>
        <Pressable onPress={onArm} accessibilityLabel="Arm timer" style={{ flex: 2 }}>
          <View
            paddingVertical={theme.space.sm}
            paddingHorizontal={theme.space.md}
            borderRadius={theme.radius.full}
            backgroundColor={allPass ? theme.accent : theme.status.warning}
            alignItems="center"
          >
            <Text
              color={theme.bg}
              fontSize={theme.type.bodySemi.size}
              fontWeight="700"
            >
              {allPass ? 'Arm timer →' : 'Arm anyway →'}
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}
