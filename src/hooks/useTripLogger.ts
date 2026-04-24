/**
 * useTripLogger — feeds the trip odometer from the live boat store.
 *
 * Only records in cruise mode. When the sailor switches into race mode
 * we pause logging (race distance lives in raceSessionsRepo instead).
 * This avoids double-counting the same water across a cruise + race
 * and keeps the two mental models clean.
 *
 * Mount once in App.tsx alongside useLiveTelemetry and
 * useRaceTrackLogger.
 */

import { useEffect, useRef } from 'react';

import { useBoatStore } from '../stores/useBoatStore';
import { useTripStore } from '../stores/useTripStore';

export function useTripLogger() {
  const position = useBoatStore((s) => s.position);
  const sog = useBoatStore((s) => s.sog);
  const mode = useBoatStore((s) => s.mode);
  const lastUpdate = useBoatStore((s) => s.lastUpdate);

  const recordPosition = useTripStore((s) => s.recordPosition);
  const pause = useTripStore((s) => s.pause);

  const wasCruise = useRef(mode === 'cruise');

  // Pause logging when we leave cruise mode so race laps don't fold in.
  useEffect(() => {
    if (wasCruise.current && mode !== 'cruise') pause();
    wasCruise.current = mode === 'cruise';
  }, [mode, pause]);

  useEffect(() => {
    if (mode !== 'cruise') return;
    if (!position) return;
    recordPosition(position, sog);
    // lastUpdate is the 1Hz tick; including it means we fold in every fix
    // without having to watch `position` identity changes that may not
    // fire on same-lat/lon but fresh timestamp readings.
  }, [position, sog, mode, lastUpdate, recordPosition]);
}
