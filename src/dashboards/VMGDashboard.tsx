/**
 * VMGDashboard — fullscreen polar performance picture.
 *
 * The boatspeed conversation: "are we hitting target?". Reads the polar
 * table + manual TWS/TWD from settings, the live SOG/COG from the boat
 * store, and shows three numbers stacked vertically:
 *   - TARGET (polar lookup at current TWS + TWA)
 *   - ACTUAL (SOG)
 *   - VMG (component of SOG along the wind axis)
 * plus a percentage-of-target bar at the bottom.
 *
 * Falls back to honest empty-state when polar or wind isn't set.
 */

import { Text, View } from 'tamagui';

import { evaluatePolar, parsePolarTable } from '../domain/polars';
import { useBoatStore } from '../stores/useBoatStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';
import { metresPerSecondToKnots } from '../utils/format';
import type { DashboardComponentProps, DashboardDefinition } from './types';

function VMGDashboard({ variant }: DashboardComponentProps) {
  const theme = getTheme(variant);
  const polarRaw = useSettingsStore((s) => s.polarRaw);
  const trueWindDeg = useSettingsStore((s) => s.manualTrueWindDegrees);
  const trueWindKn = useSettingsStore((s) => s.manualTrueWindKn);
  const cog = useBoatStore((s) => s.cog);
  const sog = useBoatStore((s) => s.sog);

  if (!polarRaw) {
    return <EmptyState variant={variant} headline="No polar set" subline="Settings → My boat → Polar table" />;
  }
  if (trueWindDeg === null || trueWindKn === null) {
    return <EmptyState variant={variant} headline="No wind set" subline="Settings → Me → Wind direction / speed" />;
  }

  const polar = parsePolarTable(polarRaw).table;
  const cogVal = cog ?? 0;
  const twa = Math.abs(((trueWindDeg - cogVal + 540) % 360) - 180); // 0..180

  const targetKn = polar ? evaluatePolar(polar, trueWindKn, twa) : null;
  const actualKn = sog !== null ? metresPerSecondToKnots(sog) : 0;
  // VMG = SOG · cos(TWA) — positive upwind, negative downwind in absolute
  // terms. We display |VMG| since the user knows whether they're beating.
  const vmgKn = actualKn * Math.cos((twa * Math.PI) / 180);
  const vmgAbs = Math.abs(vmgKn);

  const ratio = targetKn && targetKn > 0 ? actualKn / targetKn : 0;
  const pct = Math.round(ratio * 100);
  const pctClamped = Math.max(0, Math.min(120, pct)); // bar caps at 120%
  const pctColour =
    ratio >= 0.97
      ? theme.status.success
      : ratio >= 0.9
        ? theme.text.primary
        : theme.status.warning;

  return (
    <View flex={1} backgroundColor={theme.bg} paddingHorizontal={theme.space.md}>
      <View alignItems="center" paddingTop={theme.space.lg}>
        <Text
          color={theme.text.muted}
          fontSize={theme.type.label.size * 1.2}
          fontWeight="700"
          letterSpacing={3}
        >
          VMG · TWA {Math.round(twa)}°
        </Text>
      </View>

      <View flex={1} justifyContent="space-around" paddingVertical={theme.space.md}>
        <BigStat
          label="TARGET (POLAR)"
          value={targetKn !== null ? targetKn.toFixed(1) : '—'}
          unit="kn"
          variant={variant}
        />
        <BigStat
          label="ACTUAL (SOG)"
          value={actualKn.toFixed(1)}
          unit="kn"
          variant={variant}
          colour={pctColour}
        />
        <BigStat
          label="VMG"
          value={vmgAbs.toFixed(1)}
          unit="kn"
          variant={variant}
        />
      </View>

      <View paddingBottom={theme.space.lg}>
        <View flexDirection="row" justifyContent="space-between" marginBottom={theme.space.xs}>
          <Text
            color={theme.text.muted}
            fontSize={theme.type.micro.size}
            fontWeight={theme.type.micro.weight as '600'}
            letterSpacing={theme.type.micro.letterSpacing}
          >
            % OF TARGET
          </Text>
          <Text color={pctColour} fontSize={theme.type.h2.size} fontWeight="700">
            {pct}%
          </Text>
        </View>
        <View
          height={12}
          borderRadius={6}
          backgroundColor={theme.border}
          position="relative"
          overflow="hidden"
        >
          {/* 100% reference tick. */}
          <View
            position="absolute"
            top={0}
            bottom={0}
            left={`${(100 / 120) * 100}%`}
            width={1}
            backgroundColor={theme.text.muted}
          />
          <View
            position="absolute"
            top={0}
            bottom={0}
            left={0}
            width={`${(pctClamped / 120) * 100}%`}
            backgroundColor={pctColour}
          />
        </View>
      </View>
    </View>
  );
}

function BigStat({
  label,
  value,
  unit,
  variant,
  colour,
}: {
  label: string;
  value: string;
  unit: string;
  variant: 'day' | 'night' | 'kindle';
  colour?: string;
}) {
  const theme = getTheme(variant);
  return (
    <View
      flexDirection="row"
      alignItems="baseline"
      justifyContent="space-between"
      paddingHorizontal={theme.space.sm}
    >
      <Text
        color={theme.text.muted}
        fontSize={theme.type.label.size}
        fontWeight={theme.type.label.weight as '600'}
        letterSpacing={theme.type.label.letterSpacing}
      >
        {label}
      </Text>
      <View flexDirection="row" alignItems="baseline">
        <Text
          color={colour ?? theme.text.primary}
          fontSize={88}
          fontWeight="700"
          lineHeight={88}
          letterSpacing={-3}
          style={{ fontFamily: 'Menlo' }}
        >
          {value}
        </Text>
        <Text
          color={theme.text.muted}
          fontSize={theme.type.h2.size}
          fontWeight="700"
          marginLeft={theme.space.xs}
        >
          {unit}
        </Text>
      </View>
    </View>
  );
}

function EmptyState({
  variant,
  headline,
  subline,
}: {
  variant: 'day' | 'night' | 'kindle';
  headline: string;
  subline: string;
}) {
  const theme = getTheme(variant);
  return (
    <View
      flex={1}
      backgroundColor={theme.bg}
      alignItems="center"
      justifyContent="center"
      paddingHorizontal={theme.space.lg}
    >
      <Text
        color={theme.text.muted}
        fontSize={theme.type.label.size * 1.2}
        fontWeight="700"
        letterSpacing={3}
        marginBottom={theme.space.md}
      >
        VMG
      </Text>
      <Text
        color={theme.text.primary}
        fontSize={theme.type.h1.size}
        fontWeight="700"
        textAlign="center"
        marginBottom={theme.space.sm}
      >
        {headline}
      </Text>
      <Text
        color={theme.text.muted}
        fontSize={theme.type.body.size}
        textAlign="center"
      >
        {subline}
      </Text>
    </View>
  );
}

export const vmgDashboard: DashboardDefinition = {
  id: 'vmg',
  name: 'VMG · polar',
  shortName: 'VMG',
  category: 'tactical',
  raceOnly: false,
  cruiseOnly: false,
  Component: VMGDashboard,
};
