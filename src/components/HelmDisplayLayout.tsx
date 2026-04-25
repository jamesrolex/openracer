/**
 * HelmDisplayLayout — kiosk-style read-only race-timer layout for the
 * cockpit phone (or, in Phase 6/7, a Pi-driven e-ink display).
 *
 * Strips controls. Renders three things only:
 *   1. The countdown — monster-sized, fills the screen
 *   2. State label above the countdown (small caps)
 *   3. One secondary readout below: distance-to-line + time-to-line
 *      pre-start, or course-progress mid-race
 *
 * Designed to render identically in day / night / kindle. Avoids
 * gradients, drop-shadows, animations — every visual cue collapses
 * to shape + contrast so the layout ports cleanly to a 16-grey
 * e-ink driver.
 *
 * Tap-and-hold (long-press) on the countdown reveals the exit
 * affordance — a minimal "Edit" button — so the helm can drop back
 * to the controls view without thinking. Single tap does nothing on
 * purpose (no accidental dismissal at a frantic moment).
 */

import { useState } from 'react';
import { Pressable } from 'react-native';
import { Text, View } from 'tamagui';

import { metresToNm, progressPercent } from '../domain/courseDistance';
import { formatCountdown, type TimerSnapshot } from '../domain/raceTimer';
import { getTheme, type ThemeVariant } from '../theme/theme';
import { formatDistance } from '../utils/format';

interface SecondaryReadout {
  label: string;
  value: string;
}

interface Props {
  snapshot: TimerSnapshot;
  /** Distance to the start line in metres, with sign convention preserved
   *  by computeBoatStartState. Null hides the pre-start readout. */
  distanceToLineMetres: number | null;
  /** Seconds until the boat reaches the line at current SOG. Null when
   *  not computable. */
  secondsToLine: number | null;
  /** Total course distance — drives the running-state secondary readout. */
  totalCourseMetres: number;
  sailedMetres: number;
  /** Called when the helm long-presses to exit the kiosk mode. */
  onExit: () => void;
  variant: ThemeVariant;
}

export function HelmDisplayLayout({
  snapshot,
  distanceToLineMetres,
  secondsToLine,
  totalCourseMetres,
  sailedMetres,
  onExit,
  variant,
}: Props) {
  const theme = getTheme(variant);
  const [showExit, setShowExit] = useState(false);

  const stateLabel = stateLabelFor(snapshot.state);
  const countdownText = formatCountdown(snapshot.secondsToStart);

  // Choose the secondary readout. Pre-start: distance + time-to-line.
  // Mid-race: course progress.
  const secondary: SecondaryReadout = chooseSecondary({
    snapshot,
    distanceToLineMetres,
    secondsToLine,
    totalCourseMetres,
    sailedMetres,
  });

  return (
    <Pressable
      onLongPress={() => setShowExit(true)}
      delayLongPress={600}
      style={{ flex: 1 }}
      accessibilityLabel="Helm display — long-press to exit"
    >
      <View
        flex={1}
        backgroundColor={theme.bg}
        alignItems="center"
        justifyContent="center"
        paddingHorizontal={theme.space.md}
      >
        <Text
          color={theme.text.muted}
          fontSize={theme.type.label.size * 1.2}
          fontWeight="700"
          letterSpacing={3}
          marginBottom={theme.space.sm}
        >
          {stateLabel.toUpperCase()}
        </Text>

        <Text
          color={theme.text.primary}
          fontSize={180}
          fontWeight="700"
          lineHeight={180}
          letterSpacing={-6}
          textAlign="center"
        >
          {countdownText}
        </Text>

        <View
          marginTop={theme.space.lg}
          paddingVertical={theme.space.md}
          paddingHorizontal={theme.space.lg}
          borderWidth={2}
          borderColor={theme.border}
          minWidth={260}
          alignItems="center"
        >
          <Text
            color={theme.text.muted}
            fontSize={theme.type.label.size}
            fontWeight={theme.type.label.weight as '600'}
            letterSpacing={theme.type.label.letterSpacing}
          >
            {secondary.label}
          </Text>
          <Text
            color={theme.text.primary}
            fontSize={48}
            fontWeight="700"
            marginTop={theme.space.xxs}
          >
            {secondary.value}
          </Text>
        </View>

        {showExit ? (
          <Pressable
            onPress={() => {
              setShowExit(false);
              onExit();
            }}
            accessibilityLabel="Exit helm display"
          >
            <View
              marginTop={theme.space.lg}
              paddingVertical={theme.space.sm}
              paddingHorizontal={theme.space.lg}
              borderRadius={theme.radius.full}
              borderColor={theme.border}
              borderWidth={1}
            >
              <Text
                color={theme.text.secondary}
                fontSize={theme.type.bodySemi.size}
                fontWeight={theme.type.bodySemi.weight as '600'}
              >
                Show controls
              </Text>
            </View>
          </Pressable>
        ) : (
          <Text
            color={theme.text.muted}
            fontSize={theme.type.caption.size}
            marginTop={theme.space.lg}
          >
            Long-press to show controls
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function stateLabelFor(state: TimerSnapshot['state']): string {
  switch (state) {
    case 'idle':
      return 'Idle';
    case 'armed':
      return 'Armed — warning at T-5';
    case 'counting-down':
      return 'Counting down';
    case 'postponed':
      return 'Postponed (AP)';
    case 'starting':
      return 'Start!';
    case 'running':
      return 'Running';
    case 'individual-recall':
      return 'Individual recall (X)';
    case 'finished':
      return 'Finished';
    case 'abandoned':
      return 'Abandoned';
  }
}

function chooseSecondary(args: {
  snapshot: TimerSnapshot;
  distanceToLineMetres: number | null;
  secondsToLine: number | null;
  totalCourseMetres: number;
  sailedMetres: number;
}): SecondaryReadout {
  const { snapshot, distanceToLineMetres, secondsToLine, totalCourseMetres, sailedMetres } = args;

  // Mid-race: course progress.
  if (
    snapshot.state === 'running' ||
    snapshot.state === 'starting' ||
    snapshot.state === 'individual-recall'
  ) {
    if (totalCourseMetres > 0) {
      const pct = Math.round(progressPercent(sailedMetres, totalCourseMetres));
      const sailedNm = metresToNm(sailedMetres);
      const totalNm = metresToNm(totalCourseMetres);
      return {
        label: 'COURSE PROGRESS',
        value: `${sailedNm.toFixed(2)} / ${totalNm.toFixed(2)} nm  ${pct}%`,
      };
    }
    return {
      label: 'SAILED',
      value: `${metresToNm(sailedMetres).toFixed(2)} nm`,
    };
  }

  // Postponed: explicit no-secondary state.
  if (snapshot.state === 'postponed') {
    return {
      label: 'AP',
      value: 'Frozen',
    };
  }

  // Pre-start (counting-down / armed): distance + time to line.
  if (distanceToLineMetres === null) {
    return {
      label: 'TO LINE',
      value: '—',
    };
  }
  const distance = formatDistance(Math.abs(distanceToLineMetres), 'm').replace(' m', '');
  const time = secondsToLine === null ? '—' : `${Math.round(secondsToLine)}s`;
  return {
    label: distanceToLineMetres < 0 ? 'OCS — METRES OVER' : 'TO LINE',
    value: `${distance} m · ${time}`,
  };
}
