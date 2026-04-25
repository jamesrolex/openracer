/**
 * useCruiseTrackLogger — writes 1Hz GPS samples to the active cruise
 * track. Pure side-effect; mounted once, watches the boat store.
 *
 * Phase 1.16. Mirrors `useRaceTrackLogger` (race-mode) but writes to
 * the cruise tables. Active iff `useCruiseTrackStore.activeTrack` is
 * non-null.
 */

import { useEffect, useRef } from 'react';

import { useBoatStore } from '../stores/useBoatStore';
import {
  appendCruiseTrackPoint,
  updateCruiseTrackProgress,
} from '../stores/cruiseTrackRepo';
import { useCruiseTrackStore } from '../stores/useCruiseTrackStore';
import { distanceBetween } from '../utils/geo';

const NOISE_FLOOR_M = 2;
const MAX_JUMP_M = 500;
const SAMPLE_INTERVAL_MS = 1000;

export function useCruiseTrackLogger(): void {
  const lastWriteRef = useRef<number>(0);

  useEffect(() => {
    const unsubscribe = useBoatStore.subscribe(() => {
      const trackState = useCruiseTrackStore.getState();
      const track = trackState.activeTrack;
      if (!track) return;

      const boat = useBoatStore.getState();
      if (!boat.position || !boat.lastUpdate) return;

      const now = Date.now();
      if (now - lastWriteRef.current < SAMPLE_INTERVAL_MS) return;

      // Compute delta against the store's last logged position.
      const last =
        trackState.lastLatitude !== null && trackState.lastLongitude !== null
          ? {
              latitude: trackState.lastLatitude,
              longitude: trackState.lastLongitude,
            }
          : null;

      let delta = 0;
      if (last) {
        const d = distanceBetween(last, boat.position);
        if (d > MAX_JUMP_M) {
          // Fresh fix after signal loss — re-seed without counting the jump.
          trackState.noteProgress({
            addedDistanceMetres: 0,
            sogMps: boat.sog,
            latitude: boat.position.latitude,
            longitude: boat.position.longitude,
          });
          lastWriteRef.current = now;
          return;
        }
        if (d < NOISE_FLOOR_M) {
          // Below noise floor — don't write, but bump the timer so we
          // don't keep retrying every render.
          lastWriteRef.current = now;
          return;
        }
        delta = d;
      }

      // Persist + update live stats.
      lastWriteRef.current = now;
      void (async () => {
        await appendCruiseTrackPoint(track.id, {
          recordedAt: new Date(),
          latitude: boat.position!.latitude,
          longitude: boat.position!.longitude,
          sog: boat.sog,
          cog: boat.cog,
          heading: boat.heading,
          accuracy: boat.accuracy,
        });
        const next = useCruiseTrackStore.getState();
        await updateCruiseTrackProgress(track.id, {
          distanceMetres: next.liveDistanceMetres + delta,
          maxSogMps:
            boat.sog !== null &&
            (next.liveMaxSogMps === null || boat.sog > next.liveMaxSogMps)
              ? boat.sog
              : next.liveMaxSogMps,
          pointCount: next.livePointCount + 1,
        });
      })();
      trackState.noteProgress({
        addedDistanceMetres: delta,
        sogMps: boat.sog,
        latitude: boat.position.latitude,
        longitude: boat.position.longitude,
      });
    });

    return unsubscribe;
  }, []);
}
