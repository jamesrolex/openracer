/**
 * useWindShiftTracker — feeds the wind-shift snapshot from the live boat
 * store. Maintains a 60-sample rolling buffer of (cog, sog) and tracks
 * a baseline upwind COG that resets on tack events.
 *
 * Designed to be cheap: samples push at 1 Hz only when COG changes
 * meaningfully, never re-renders the whole tree.
 */

import { useEffect, useRef, useState } from 'react';

import {
  computeShift,
  isTackEvent,
  medianDegrees,
  type CogSample,
  type WindShiftSnapshot,
} from '../domain/windShift';
import { useBoatStore } from '../stores/useBoatStore';

const BUFFER_SIZE = 60; // 60 samples ≈ 60 s at 1 Hz
const BASELINE_MIN_SAMPLES = 6;

export function useWindShiftTracker(): WindShiftSnapshot {
  const samplesRef = useRef<CogSample[]>([]);
  const baselineRef = useRef<number | null>(null);
  const [snapshot, setSnapshot] = useState<WindShiftSnapshot>({
    shiftDegrees: 0,
    quality: 'unavailable',
    samples: 0,
    currentTack: null,
  });

  const cog = useBoatStore((s) => s.cog);
  const sog = useBoatStore((s) => s.sog);
  const lastUpdate = useBoatStore((s) => s.lastUpdate);

  useEffect(() => {
    if (cog === null || sog === null || lastUpdate === null) return;
    const sample: CogSample = {
      at: lastUpdate,
      cogDegrees: cog,
      sogMps: sog,
    };
    const next = [...samplesRef.current, sample];
    if (next.length > BUFFER_SIZE) next.shift();

    // Tack detection — reset baseline on a confirmed tack.
    if (isTackEvent(next)) {
      baselineRef.current = null;
    }

    // If no baseline yet, take it as soon as we have enough stable samples.
    if (baselineRef.current === null && next.length >= BASELINE_MIN_SAMPLES) {
      const recentCogs = next
        .slice(-BASELINE_MIN_SAMPLES)
        .map((s) => s.cogDegrees);
      baselineRef.current = medianDegrees(recentCogs);
    }

    samplesRef.current = next;
    setSnapshot(computeShift(next, baselineRef.current));
  }, [cog, sog, lastUpdate]);

  return snapshot;
}
