/**
 * CompassDial — a hand-bearing-compass style dial. The whole dial rotates
 * so that the current true heading sits under the fixed red crosshair at
 * the top. Aim the phone's top edge at a mark and the number under the
 * crosshair IS the bearing to that mark.
 *
 * If `firstBearing` is provided, a green radial tick is drawn at that
 * bearing — a persistent "you captured here" marker for point-at-mark.
 */

import { View, Text } from 'tamagui';
import Svg, { Circle, Line, Polygon, Text as SvgText, G } from 'react-native-svg';

import { getTheme } from '../theme/theme';

interface Props {
  /** Degrees true, 0-360. null while waiting for first reading. */
  heading: number | null;
  /** Optional: render a green tick at this bearing (prior sighting). */
  firstBearing?: number | null;
  /** Mark calibration state — tints the crosshair amber. */
  needsCalibration?: boolean;
  /** Pixel size of the dial (square). Default 240. */
  size?: number;
  variant: 'day' | 'night';
}

export function CompassDial({
  heading,
  firstBearing,
  needsCalibration = false,
  size = 240,
  variant,
}: Props) {
  const theme = getTheme(variant);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8;
  const rInner = r - 14;
  const rLabel = r - 28;

  // Rotate the whole dial so that `heading` sits at the top (under the crosshair).
  // SVG rotate is clockwise; we want to rotate the dial -heading so that the
  // tick at angle = heading ends up at 12 o'clock.
  const dialRotation = heading === null ? 0 : -heading;

  const ticks: number[] = [];
  for (let i = 0; i < 360; i += 10) ticks.push(i);

  const cardinals = [
    { angle: 0, label: 'N' },
    { angle: 90, label: 'E' },
    { angle: 180, label: 'S' },
    { angle: 270, label: 'W' },
  ];

  const crosshairColor = needsCalibration
    ? theme.status.warning
    : theme.status.danger;

  const headingDisplay =
    heading === null ? '—' : `${String(Math.round(heading)).padStart(3, '0')}°`;

  return (
    <View alignItems="center" justifyContent="center">
      <Svg width={size} height={size}>
        {/* Outer bezel */}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={theme.border}
          strokeWidth={1.5}
          fill={theme.surface}
        />

        <G rotation={dialRotation} origin={`${cx}, ${cy}`}>
          {/* Tick marks */}
          {ticks.map((deg) => {
            const isMajor = deg % 30 === 0;
            const len = isMajor ? 14 : 6;
            const rad = ((deg - 90) * Math.PI) / 180;
            const x1 = cx + (r - 2) * Math.cos(rad);
            const y1 = cy + (r - 2) * Math.sin(rad);
            const x2 = cx + (r - len) * Math.cos(rad);
            const y2 = cy + (r - len) * Math.sin(rad);
            return (
              <Line
                key={deg}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isMajor ? theme.text.secondary : theme.text.muted}
                strokeWidth={isMajor ? 2 : 1}
              />
            );
          })}

          {/* Cardinal labels */}
          {cardinals.map(({ angle, label }) => {
            const rad = ((angle - 90) * Math.PI) / 180;
            const x = cx + rLabel * Math.cos(rad);
            const y = cy + rLabel * Math.sin(rad);
            return (
              <SvgText
                key={label}
                x={x}
                y={y}
                fill={label === 'N' ? theme.accent : theme.text.primary}
                fontSize={18}
                fontWeight="700"
                textAnchor="middle"
                alignmentBaseline="central"
              >
                {label}
              </SvgText>
            );
          })}

          {/* First-sighting marker (green wedge into the dial) */}
          {typeof firstBearing === 'number' ? (
            <G rotation={firstBearing} origin={`${cx}, ${cy}`}>
              <Polygon
                points={`${cx - 8},${cy - rInner} ${cx + 8},${cy - rInner} ${cx},${cy - rInner + 18}`}
                fill={theme.status.success}
              />
            </G>
          ) : null}
        </G>

        {/* Fixed crosshair at the top — where the phone is aimed. */}
        <Polygon
          points={`${cx - 10},4 ${cx + 10},4 ${cx},24`}
          fill={crosshairColor}
        />
      </Svg>

      <Text
        color={theme.text.primary}
        fontSize={42}
        fontWeight="700"
        marginTop={theme.space.sm}
        style={{ fontFamily: 'Menlo' }}
      >
        {headingDisplay}T
      </Text>
    </View>
  );
}
