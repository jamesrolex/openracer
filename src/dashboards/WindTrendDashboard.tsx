/**
 * WindTrendDashboard — fullscreen rolling history of wind-shift values.
 *
 * The wind shift bar in WindDashboard tells you the current shift. This
 * dashboard tells you the *story* of the leg: are shifts oscillating
 * around the baseline (consider tacking on lifts), or is the wind
 * progressively veering / backing (the next leg matters more than this
 * one)?
 *
 * Records a snapshot of `shiftDegrees` every 2 seconds into a 150-entry
 * ring buffer (~5 minutes of history). Renders as a polyline against a
 * ±20° y-axis with a centre baseline tick.
 *
 * Honest empty-state until enough samples accumulate. Doesn't depend on
 * polar / wind being set — purely a function of GPS COG + the windShift
 * tracker.
 */

import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'tamagui';
import Svg, { Line, Polyline, Text as SvgText } from 'react-native-svg';

import { useWindShiftTracker } from '../hooks/useWindShiftTracker';
import { getTheme } from '../theme/theme';
import type { DashboardComponentProps, DashboardDefinition } from './types';

const BUFFER_SIZE = 150;       // 150 samples × 2s = 5 min
const SAMPLE_INTERVAL_MS = 2000;
const Y_RANGE_DEG = 20;         // ±20° visible
const MIN_SAMPLES_TO_RENDER = 8;

interface SamplePoint {
  at: number;       // ms timestamp
  shift: number;    // degrees
}

function WindTrendDashboard({ variant }: DashboardComponentProps) {
  const theme = getTheme(variant);
  const shift = useWindShiftTracker();

  // Ring buffer of samples lives in a ref so re-renders don't reset it.
  const samplesRef = useRef<SamplePoint[]>([]);
  const [, forceRender] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      if (shift.quality === 'unavailable') return;
      const now = Date.now();
      const next = [...samplesRef.current, { at: now, shift: shift.shiftDegrees }];
      if (next.length > BUFFER_SIZE) next.shift();
      samplesRef.current = next;
      forceRender((n) => n + 1);
    }, SAMPLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [shift]);

  const samples = samplesRef.current;
  const samplesAvailable = samples.length >= MIN_SAMPLES_TO_RENDER;

  // Layout — let SVG fill ~80% of the screen below the header strip.
  const width = 360;
  const height = 320;
  const padX = 24;
  const padY = 16;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const points = samplesAvailable
    ? samples
        .map((s, i) => {
          const x = padX + (i / (BUFFER_SIZE - 1)) * innerW;
          const clamped = Math.max(-Y_RANGE_DEG, Math.min(Y_RANGE_DEG, s.shift));
          const y = padY + ((Y_RANGE_DEG - clamped) / (Y_RANGE_DEG * 2)) * innerH;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ')
    : '';

  // Pick min/max to surface in the header — useful for "the shifts are
  // oscillating ±5°" vs "we've been progressively headed by 8°".
  const minShift = samplesAvailable
    ? samples.reduce((m, s) => Math.min(m, s.shift), Infinity)
    : 0;
  const maxShift = samplesAvailable
    ? samples.reduce((m, s) => Math.max(m, s.shift), -Infinity)
    : 0;
  const lastShift = samplesAvailable ? samples[samples.length - 1]?.shift ?? 0 : 0;

  return (
    <View flex={1} backgroundColor={theme.bg} paddingHorizontal={theme.space.md}>
      <View alignItems="center" paddingTop={theme.space.lg}>
        <Text
          color={theme.text.muted}
          fontSize={theme.type.label.size * 1.2}
          fontWeight="700"
          letterSpacing={3}
        >
          WIND SHIFT TREND · 5 MIN
        </Text>
      </View>

      {!samplesAvailable ? (
        <View flex={1} alignItems="center" justifyContent="center">
          <Text
            color={theme.text.primary}
            fontSize={theme.type.h1.size}
            fontWeight="700"
            textAlign="center"
            marginBottom={theme.space.sm}
          >
            Building history…
          </Text>
          <Text
            color={theme.text.muted}
            fontSize={theme.type.body.size}
            textAlign="center"
          >
            Hold a tack for ~30 seconds; the chart fills as samples land.
          </Text>
        </View>
      ) : (
        <>
          <View
            flexDirection="row"
            justifyContent="space-between"
            paddingHorizontal={theme.space.sm}
            paddingVertical={theme.space.sm}
          >
            <BigStat label="NOW" value={formatShift(lastShift)} variant={variant} />
            <BigStat label="MIN" value={formatShift(minShift)} variant={variant} />
            <BigStat label="MAX" value={formatShift(maxShift)} variant={variant} />
          </View>

          <View flex={1} alignItems="center" justifyContent="center">
            <Svg width={width} height={height}>
              {/* Frame */}
              <Line
                x1={padX}
                y1={padY}
                x2={padX}
                y2={padY + innerH}
                stroke={theme.border}
                strokeWidth={1}
              />
              <Line
                x1={padX}
                y1={padY + innerH}
                x2={padX + innerW}
                y2={padY + innerH}
                stroke={theme.border}
                strokeWidth={1}
              />
              {/* Baseline (zero shift) */}
              <Line
                x1={padX}
                y1={padY + innerH / 2}
                x2={padX + innerW}
                y2={padY + innerH / 2}
                stroke={theme.text.muted}
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              {/* ±10° guides */}
              <Line
                x1={padX}
                y1={padY + innerH * 0.25}
                x2={padX + innerW}
                y2={padY + innerH * 0.25}
                stroke={theme.border}
                strokeWidth={1}
              />
              <Line
                x1={padX}
                y1={padY + innerH * 0.75}
                x2={padX + innerW}
                y2={padY + innerH * 0.75}
                stroke={theme.border}
                strokeWidth={1}
              />
              {/* Axis labels */}
              <SvgText
                x={padX - 4}
                y={padY + 8}
                fontSize={10}
                fill={theme.text.muted}
                textAnchor="end"
              >
                +20°
              </SvgText>
              <SvgText
                x={padX - 4}
                y={padY + innerH / 2 + 3}
                fontSize={10}
                fill={theme.text.muted}
                textAnchor="end"
              >
                0°
              </SvgText>
              <SvgText
                x={padX - 4}
                y={padY + innerH - 4}
                fontSize={10}
                fill={theme.text.muted}
                textAnchor="end"
              >
                -20°
              </SvgText>
              {/* Trend line */}
              <Polyline
                points={points}
                fill="none"
                stroke={theme.text.primary}
                strokeWidth={2}
              />
            </Svg>
          </View>
        </>
      )}
    </View>
  );
}

function formatShift(deg: number): string {
  if (deg >= 0.5) return `+${Math.round(deg)}°`;
  if (deg <= -0.5) return `${Math.round(deg)}°`;
  return '0°';
}

function BigStat({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: 'day' | 'night' | 'kindle';
}) {
  const theme = getTheme(variant);
  return (
    <View alignItems="center" flex={1}>
      <Text
        color={theme.text.muted}
        fontSize={theme.type.micro.size}
        fontWeight={theme.type.micro.weight as '600'}
        letterSpacing={theme.type.micro.letterSpacing}
      >
        {label}
      </Text>
      <Text
        color={theme.text.primary}
        fontSize={theme.type.h1.size}
        fontWeight="700"
        style={{ fontFamily: 'Menlo' }}
      >
        {value}
      </Text>
    </View>
  );
}

export const windTrendDashboard: DashboardDefinition = {
  id: 'wind-trend',
  name: 'Wind shift trend',
  shortName: 'Trend',
  category: 'tactical',
  raceOnly: false,
  cruiseOnly: false,
  Component: WindTrendDashboard,
};
