/**
 * useRaceTrackLogger — writes a GPS fix per second to the active race
 * session while the timer is in 'starting' or 'running' state.
 *
 * Mount once at the app root (App.tsx) after useLiveTelemetry so the
 * boat store has fresh values by the time this ticks.
 *
 * We intentionally start logging a few seconds before the gun
 * ('starting' begins at T=0) so the first point of the track is the
 * moment of crossing, not the first update after the app realised
 * what state it was in.
 *
 * No backpressure — SQLite inserts on one connection are serialised
 * and each point is < 200 bytes. A 3-hour race at 1 Hz is ~2 MB.
 */

import { useEffect, useRef } from 'react';

import { makeSnapshot } from '../domain/raceTimer';
import { insertTrackPoint } from '../stores/raceSessionsRepo';
import { useBoatStore } from '../stores/useBoatStore';
import { useRaceStore } from '../stores/useRaceStore';

const WRITE_INTERVAL_MS = 1000;
const LOGGABLE_STATES = new Set(['starting', 'running']);

export function useRaceTrackLogger(): void {
  const lastWriteRef = useRef<number>(0);

  const activeSessionId = useRaceStore((s) => s.activeSessionId);
  const sequenceStartTime = useRaceStore((s) => s.sequenceStartTime);
  const sequence = useRaceStore((s) => s.sequence);

  useEffect(() => {
    if (!activeSessionId || !sequenceStartTime) {
      lastWriteRef.current = 0;
      return;
    }

    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const now = Date.now();
      const snap = makeSnapshot(sequenceStartTime, new Date(now), sequence);
      if (!LOGGABLE_STATES.has(snap.state)) return;
      if (now - lastWriteRef.current < WRITE_INTERVAL_MS) return;

      const boat = useBoatStore.getState();
      if (!boat.position) return;
      lastWriteRef.current = now;

      void insertTrackPoint(activeSessionId, {
        recordedAt: new Date(now),
        latitude: boat.position.latitude,
        longitude: boat.position.longitude,
        sog: boat.sog,
        cog: boat.cog,
        heading: boat.heading,
        accuracy: boat.accuracy,
      });

      // Keep a live running-total of metres sailed in the race store so
      // the timer screen can show a progress bar without re-reading every
      // track point from SQLite on every 250 ms tick.
      useRaceStore
        .getState()
        .addTrackDistance(boat.position.latitude, boat.position.longitude);
    };

    // Fire immediately, then every tick. 250ms cadence matches the
    // GPS + timer refresh; the inner guard drops writes if the snapshot
    // state isn't loggable.
    tick();
    const id = setInterval(tick, 250);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activeSessionId, sequenceStartTime, sequence]);
}
