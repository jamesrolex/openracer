/**
 * StartLineReadout — shown on HomeScreen when the race timer is armed.
 *
 * Given the armed course's start leg and current GPS + SOG + COG,
 * displays distance-to-line and time-to-line in the glanceable big-
 * number style. Red flash + haptic fires on OCS (distance < 0) when
 * the timer is inside the last minute (done by the parent screen via
 * makeSnapshot.band === 'urgent').
 */

import { useMemo } from 'react';
import { Text, View } from 'tamagui';

import { computeBoatStartState, computeLineBias } from '../domain/startLine';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';
import type { Course } from '../types/course';
import type { Mark } from '../types/mark';
import type { GeoPosition } from '../types/signalk';
import { formatDistance } from '../utils/format';
import { FavouredEndChip } from './FavouredEndChip';

export interface StartLineReadoutProps {
  course: Course | null;
  marks: Mark[];
  position: GeoPosition | null;
  cog: number | null;
  sog: number | null;
  urgent?: boolean;
  variant?: 'day' | 'night';
}

export function StartLineReadout({
  course,
  marks,
  position,
  cog,
  sog,
  urgent = false,
  variant = 'day',
}: StartLineReadoutProps) {
  const theme = getTheme(variant);

  const manualTrueWindDegrees = useSettingsStore((s) => s.manualTrueWindDegrees);

  const startLeg = course?.legs.find((l) => l.type === 'start');
  const [cbId, pinId] = startLeg?.markIds ?? [];
  const cb = useMemo(() => marks.find((m) => m.id === cbId), [marks, cbId]);
  const pin = useMemo(() => marks.find((m) => m.id === pinId), [marks, pinId]);

  const bias = useMemo(() => {
    if (!cb || !pin || manualTrueWindDegrees === null) return null;
    return computeLineBias(
      { latitude: cb.latitude, longitude: cb.longitude },
      { latitude: pin.latitude, longitude: pin.longitude },
      manualTrueWindDegrees,
    );
  }, [cb, pin, manualTrueWindDegrees]);

  if (!cb || !pin || !position) return null;

  const state = computeBoatStartState(
    position,
    cog,
    sog,
    { latitude: cb.latitude, longitude: cb.longitude },
    { latitude: pin.latitude, longitude: pin.longitude },
  );

  const isOcs = state.side === 'behind';
  const dangerFlash = isOcs && urgent;
  const displayDistance =
    state.side === 'on-line' ? '0' : formatDistance(Math.abs(state.distanceMetres), 'm').replace(' m', '');
  const timeToLine =
    state.secondsToLine === null ? '—' : `${Math.round(state.secondsToLine)}s`;

  return (
    <View>
      {!dangerFlash ? <FavouredEndChip bias={bias} variant={variant} /> : null}
      <View
        paddingVertical={theme.space.sm}
        paddingHorizontal={theme.space.md}
        borderRadius={theme.radius.lg}
        borderWidth={1}
        borderColor={dangerFlash ? theme.status.danger : theme.border}
        backgroundColor={dangerFlash ? theme.status.danger : theme.surface}
      >
      <View flexDirection="row" alignItems="center" justifyContent="space-between">
        <View alignItems="flex-start">
          <Text
            color={dangerFlash ? theme.bg : theme.text.muted}
            fontSize={theme.type.micro.size}
            fontWeight={theme.type.micro.weight as '600'}
            letterSpacing={theme.type.micro.letterSpacing}
          >
            TO LINE
          </Text>
          <Text
            color={dangerFlash ? theme.bg : isOcs ? theme.status.danger : theme.text.primary}
            fontSize={36}
            fontWeight="700"
            lineHeight={36}
          >
            {isOcs ? 'OCS' : displayDistance}
          </Text>
          <Text color={dangerFlash ? theme.bg : theme.text.muted} fontSize={theme.type.caption.size}>
            {isOcs ? `${Math.round(Math.abs(state.distanceMetres))} m over` : 'm'}
          </Text>
        </View>

        <View alignItems="flex-end">
          <Text
            color={dangerFlash ? theme.bg : theme.text.muted}
            fontSize={theme.type.micro.size}
            fontWeight={theme.type.micro.weight as '600'}
            letterSpacing={theme.type.micro.letterSpacing}
          >
            TIME TO LINE
          </Text>
          <Text
            color={dangerFlash ? theme.bg : theme.text.primary}
            fontSize={36}
            fontWeight="700"
            lineHeight={36}
          >
            {timeToLine}
          </Text>
          <Text color={dangerFlash ? theme.bg : theme.text.muted} fontSize={theme.type.caption.size}>
            at current SOG
          </Text>
        </View>
      </View>
      </View>
    </View>
  );
}
