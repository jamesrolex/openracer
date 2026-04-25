/**
 * RaceCountdownDashboard — fullscreen race-timer kiosk view.
 *
 * Same rendering shape as HelmDisplayLayout (180-pt countdown + secondary
 * readout) but reads its data from stores directly so it can plug into
 * the dashboard catalogue without prop drilling. HelmDisplayLayout still
 * exists as a stand-alone component used inside the legacy helm-mode
 * branch in RaceTimerScreen — that branch will be migrated to the
 * catalogue in 1.8.7.
 */

import { useEffect, useState } from 'react';
import { Text, View } from 'tamagui';

import { computeCourseDistance, metresToNm, progressPercent } from '../domain/courseDistance';
import { formatCountdown, makeSnapshot, type TimerSnapshot } from '../domain/raceTimer';
import { computeBoatStartState } from '../domain/startLine';
import { useBoatStore } from '../stores/useBoatStore';
import { useCoursesStore } from '../stores/useCoursesStore';
import { useMarksStore } from '../stores/useMarksStore';
import { useRaceStore } from '../stores/useRaceStore';
import { getTheme } from '../theme/theme';
import { formatDistance } from '../utils/format';
import type { DashboardComponentProps, DashboardDefinition } from './types';

interface SecondaryReadout {
  label: string;
  value: string;
}

function RaceCountdownDashboard({ variant }: DashboardComponentProps) {
  const theme = getTheme(variant);

  const sequenceStartTime = useRaceStore((s) => s.sequenceStartTime);
  const sequence = useRaceStore((s) => s.sequence);
  const postponedAt = useRaceStore((s) => s.postponedAt);
  const individualRecallAt = useRaceStore((s) => s.individualRecallAt);
  const sailedMetres = useRaceStore((s) => s.sailedMetres);

  const draft = useCoursesStore((s) => s.activeDraft);
  const marks = useMarksStore((s) => s.marks);
  const totalMetres =
    draft !== null ? computeCourseDistance(draft.legs, marks).totalMetres : 0;

  const position = useBoatStore((s) => s.position);
  const cog = useBoatStore((s) => s.cog);
  const sog = useBoatStore((s) => s.sog);

  const [snapshot, setSnapshot] = useState<TimerSnapshot>(() =>
    makeSnapshot(sequenceStartTime, new Date(), sequence, {
      postponedAt,
      individualRecallAt,
    }),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setSnapshot(
        makeSnapshot(sequenceStartTime, new Date(), sequence, {
          postponedAt,
          individualRecallAt,
        }),
      );
    }, 250);
    return () => clearInterval(id);
  }, [sequenceStartTime, sequence, postponedAt, individualRecallAt]);

  const startLeg = draft?.legs.find((l) => l.type === 'start');
  const cb = marks.find((m) => m.id === startLeg?.markIds[0]);
  const pin = marks.find((m) => m.id === startLeg?.markIds[1]);
  const startLineState =
    cb && pin && position && draft?.startType === 'standard-line'
      ? computeBoatStartState(
          position,
          cog,
          sog,
          { latitude: cb.latitude, longitude: cb.longitude },
          { latitude: pin.latitude, longitude: pin.longitude },
        )
      : null;

  const distanceToLineMetres =
    startLineState?.side === 'behind'
      ? -Math.abs(startLineState.distanceMetres)
      : startLineState?.distanceMetres ?? null;
  const secondsToLine = startLineState?.secondsToLine ?? null;

  const stateLabel = stateLabelFor(snapshot.state);
  const countdownText = sequenceStartTime ? formatCountdown(snapshot.secondsToStart) : 'T−:--:--';
  const secondary = chooseSecondary({
    snapshot,
    distanceToLineMetres,
    secondsToLine,
    totalCourseMetres: totalMetres,
    sailedMetres,
  });

  return (
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
    </View>
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

  if (snapshot.state === 'postponed') {
    return { label: 'AP', value: 'Frozen' };
  }

  if (distanceToLineMetres === null) {
    return { label: 'TO LINE', value: '—' };
  }
  const distance = formatDistance(Math.abs(distanceToLineMetres), 'm').replace(' m', '');
  const time = secondsToLine === null ? '—' : `${Math.round(secondsToLine)}s`;
  return {
    label: distanceToLineMetres < 0 ? 'OCS — METRES OVER' : 'TO LINE',
    value: `${distance} m · ${time}`,
  };
}

export const raceCountdownDashboard: DashboardDefinition = {
  id: 'race-countdown',
  name: 'Race countdown',
  shortName: 'Countdown',
  category: 'race',
  raceOnly: true,
  cruiseOnly: false,
  Component: RaceCountdownDashboard,
};
