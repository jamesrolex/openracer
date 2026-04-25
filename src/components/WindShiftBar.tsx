/**
 * WindShiftBar — horizontal strip showing the current wind shift relative
 * to the leg baseline.
 *
 * "+6° lift" / "-3° header" / "EVEN" with a position indicator on a
 * ±20° track. Hidden when the snapshot is 'unavailable'; shows a
 * "compass unreliable" message when 'low'.
 */

import { Text, View } from 'tamagui';

import type { WindShiftSnapshot } from '../domain/windShift';
import { getTheme, type ThemeVariant } from '../theme/theme';

interface Props {
  snapshot: WindShiftSnapshot;
  variant: ThemeVariant;
}

const TRACK_DEG = 20; // ±20° visible

export function WindShiftBar({ snapshot, variant }: Props) {
  const theme = getTheme(variant);

  if (snapshot.quality === 'unavailable') return null;

  if (snapshot.quality === 'low') {
    return (
      <View
        paddingVertical={theme.space.xs}
        paddingHorizontal={theme.space.md}
        borderRadius={theme.radius.md}
        borderWidth={1}
        borderColor={theme.border}
        backgroundColor={theme.surface}
        marginBottom={theme.space.sm}
        alignItems="center"
      >
        <Text color={theme.text.muted} fontSize={theme.type.caption.size}>
          Wind shift — compass noisy, hold steady on a tack
        </Text>
      </View>
    );
  }

  const magnitude = Math.abs(Math.round(snapshot.shiftDegrees));
  const isLift = snapshot.shiftDegrees > 1;
  const isHeader = snapshot.shiftDegrees < -1;
  const label = isLift
    ? `+${magnitude}° LIFT`
    : isHeader
      ? `-${magnitude}° HEADER`
      : 'EVEN';

  // Position the indicator on a centred track. Clamp to the visible range.
  const clamped = Math.max(-TRACK_DEG, Math.min(TRACK_DEG, snapshot.shiftDegrees));
  const positionPct = 50 + (clamped / TRACK_DEG) * 50;

  return (
    <View
      paddingVertical={theme.space.sm}
      paddingHorizontal={theme.space.md}
      borderRadius={theme.radius.md}
      borderWidth={1}
      borderColor={theme.border}
      backgroundColor={theme.surface}
      marginBottom={theme.space.sm}
    >
      <View flexDirection="row" justifyContent="space-between" alignItems="baseline">
        <Text
          color={theme.text.muted}
          fontSize={theme.type.micro.size}
          fontWeight={theme.type.micro.weight as '600'}
          letterSpacing={theme.type.micro.letterSpacing}
        >
          WIND SHIFT
        </Text>
        <Text
          color={
            isLift
              ? theme.status.success
              : isHeader
                ? theme.status.warning
                : theme.text.muted
          }
          fontSize={theme.type.bodySemi.size}
          fontWeight="700"
        >
          {label}
        </Text>
      </View>

      {/* Track + indicator. Pure black/white-friendly: a solid centre tick
          plus a moving filled-circle marker. */}
      <View
        height={8}
        borderRadius={4}
        backgroundColor={theme.border}
        marginTop={theme.space.xs}
        position="relative"
      >
        {/* Centre tick — the baseline. */}
        <View
          position="absolute"
          left="49.5%"
          top={-2}
          width={1}
          height={12}
          backgroundColor={theme.text.muted}
        />
        {/* Indicator. */}
        <View
          position="absolute"
          top={-3}
          width={14}
          height={14}
          borderRadius={7}
          backgroundColor={theme.text.primary}
          left={`${positionPct}%`}
          marginLeft={-7}
        />
      </View>

      <View flexDirection="row" justifyContent="space-between" marginTop={2}>
        <Text color={theme.text.muted} fontSize={theme.type.micro.size}>
          ←{TRACK_DEG}°
        </Text>
        <Text color={theme.text.muted} fontSize={theme.type.micro.size}>
          baseline
        </Text>
        <Text color={theme.text.muted} fontSize={theme.type.micro.size}>
          {TRACK_DEG}°→
        </Text>
      </View>
    </View>
  );
}
