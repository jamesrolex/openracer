/**
 * windShift — pure logic for tracking wind shifts from a phone-only data
 * stream (GPS COG + manual tack-angle setting).
 *
 * Without a real instrument feed (anemometer + masthead unit) we can't
 * measure apparent wind directly. But on an upwind leg, the boat's COG
 * rotates with the wind, and the difference between two upwind COGs on
 * the same tack measures the shift directly.
 *
 * Algorithm:
 *  1. Buffer COG samples while moving (sog > threshold).
 *  2. Detect tacks by a sustained > 60° COG change within a 10-second
 *     window. Sample on the previous tack ends; new tack begins.
 *  3. Within each tack, take the median COG across the most recent
 *     stable window (>= 5 samples) as the "current upwind COG".
 *  4. Compare to the baseline COG (the user's first stable upwind COG
 *     since the leg started, or since the last reset).
 *  5. Shift = currentUpwindCog - baselineCog, normalised to ±180°.
 *     Sign convention: port-tack lift = +ve, header = -ve.
 *
 * The function is deterministic on a sorted sample list. Caller manages
 * buffer + drives sample additions; this module is pure transformation.
 */

export interface CogSample {
  /** ISO timestamp. */
  at: string;
  cogDegrees: number;
  /** m/s — used to filter out stationary noise. */
  sogMps: number;
}

export type CurrentTack = 'port' | 'starboard';

export interface WindShiftSnapshot {
  /** Degrees relative to baseline. Positive = lift, negative = header. */
  shiftDegrees: number;
  /** Confidence label — 'good' | 'low' (insufficient samples or
   *  high spread) | 'unavailable' (no upwind baseline yet). */
  quality: 'good' | 'low' | 'unavailable';
  /** Sample count behind the current tack's stable window. */
  samples: number;
  /** Optional best-estimate of the current tack from COG signs. Null
   *  when not yet determinable. */
  currentTack: CurrentTack | null;
}

const MIN_SOG_MPS = 0.5; // ~1 kn — drop stationary samples
const MIN_STABLE_SAMPLES = 5;
const MAX_STABLE_SPREAD_DEGREES = 12; // wider than this and we call it 'low' quality
const TACK_THRESHOLD_DEGREES = 60;

/** Median of a sorted-ish array of degree values. Handles 0/360 wrap by
 *  rotating to a centred frame before averaging. */
export function medianDegrees(values: readonly number[]): number {
  if (values.length === 0) return 0;
  // Rotate so the first value is at 180°, take the median of the rotation,
  // then rotate back. Robust to wrap.
  const pivot = values[0]!;
  const rotated = values.map((v) => normalise(v - pivot + 180));
  const sorted = [...rotated].sort((a, b) => a - b);
  const m = sorted.length;
  const med =
    m % 2 === 1
      ? sorted[(m - 1) / 2]!
      : (sorted[m / 2 - 1]! + sorted[m / 2]!) / 2;
  return normalise(med + pivot - 180);
}

/** 0–360 normalise. */
function normalise(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Signed shift from a → b in degrees, normalised to ±180. */
export function signedDelta(a: number, b: number): number {
  const d = ((b - a + 540) % 360) - 180;
  return d;
}

/** Spread of a window of headings, accounting for wrap. */
export function angularSpread(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const pivot = values[0]!;
  const rotated = values.map((v) => signedDelta(pivot, v));
  const min = Math.min(...rotated);
  const max = Math.max(...rotated);
  return max - min;
}

/**
 * Compute a wind-shift snapshot from a buffer of COG samples + a baseline.
 * Returns 'unavailable' if there isn't enough data yet.
 */
export function computeShift(
  samples: readonly CogSample[],
  baselineCog: number | null,
): WindShiftSnapshot {
  if (baselineCog === null) {
    return {
      shiftDegrees: 0,
      quality: 'unavailable',
      samples: 0,
      currentTack: null,
    };
  }
  // Take the recent stable window — last MIN_STABLE_SAMPLES non-stationary
  // samples whose spread is below threshold.
  const moving = samples.filter((s) => s.sogMps >= MIN_SOG_MPS);
  if (moving.length < MIN_STABLE_SAMPLES) {
    return {
      shiftDegrees: 0,
      quality: 'unavailable',
      samples: moving.length,
      currentTack: null,
    };
  }
  const recent = moving.slice(-MIN_STABLE_SAMPLES * 2);
  const cogs = recent.map((s) => s.cogDegrees);
  const spread = angularSpread(cogs);
  const median = medianDegrees(cogs);
  const shift = signedDelta(baselineCog, median);
  const quality: WindShiftSnapshot['quality'] =
    spread > MAX_STABLE_SPREAD_DEGREES ? 'low' : 'good';
  return {
    shiftDegrees: shift,
    quality,
    samples: recent.length,
    currentTack: shift >= 0 ? 'port' : 'starboard',
  };
}

/** Detect a tack at the latest sample — true if the most recent COG
 *  diverges from the median of the prior ≥ 3 samples by more than
 *  TACK_THRESHOLD_DEGREES. Caller resets buffers on a tack event. */
export function isTackEvent(samples: readonly CogSample[]): boolean {
  if (samples.length < 4) return false;
  const last = samples[samples.length - 1]!;
  const prior = samples.slice(-4, -1).map((s) => s.cogDegrees);
  const priorMedian = medianDegrees(prior);
  return Math.abs(signedDelta(priorMedian, last.cogDegrees)) > TACK_THRESHOLD_DEGREES;
}
