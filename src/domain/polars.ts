/**
 * polars — parse + evaluate polar tables.
 *
 * A polar table is a 2-D grid: rows = TWS bins (true wind speed in knots),
 * columns = TWA bins (true wind angle in degrees, 0 = head to wind, 180 =
 * dead downwind). Each cell is a target boatspeed in knots.
 *
 * We accept the standard ORC text format that sailors paste from
 * orc-certs.com or class websites:
 *
 *     twa/tws  6     8     10    12    16    20
 *     32       3.50  4.20  4.60  4.85  5.10  5.20
 *     36       4.20  5.10  5.60  5.85  6.10  6.20
 *     ...
 *
 * Lookup uses bilinear interpolation between the four nearest cells.
 * Out-of-range TWS / TWA clamp to the nearest edge — sailors get a
 * conservative estimate rather than a NaN.
 *
 * Exposed as pure functions; no I/O. The Settings screen owns the
 * persisted polar string and re-parses on edit.
 */

export interface PolarTable {
  /** Sorted ascending. */
  twsBinsKn: number[];
  /** Sorted ascending. */
  twaBinsDeg: number[];
  /** Flat array, TWA-major. Index: targetSpeed[twaIdx * twsBinsKn.length + twsIdx].
   *  This matches the input row layout (each input row is a TWA, each
   *  cell is a TWS). */
  targetSpeedKn: number[];
}

export interface ParseResult {
  ok: boolean;
  table?: PolarTable;
  error?: string;
}

/** Parse a polar table from the standard ORC text grid. */
export function parsePolarTable(input: string): ParseResult {
  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  if (lines.length < 2) {
    return { ok: false, error: 'Need a header row + at least one data row.' };
  }

  // Header: first cell is "twa/tws" or similar; remaining cells are TWS bins.
  const header = lines[0]!.split(/\s+/);
  if (header.length < 2) {
    return { ok: false, error: 'Header row must include at least one TWS bin.' };
  }
  const twsBinsKn = header.slice(1).map((s) => Number(s));
  if (twsBinsKn.some((n) => !Number.isFinite(n))) {
    return { ok: false, error: 'TWS bins must be numeric.' };
  }

  const twaBinsDeg: number[] = [];
  const speedRows: number[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i]!.split(/\s+/);
    if (cells.length !== twsBinsKn.length + 1) {
      return {
        ok: false,
        error: `Row ${i} has ${cells.length} cells, expected ${twsBinsKn.length + 1}.`,
      };
    }
    const twa = Number(cells[0]);
    if (!Number.isFinite(twa)) {
      return { ok: false, error: `Row ${i} TWA "${cells[0]}" is not numeric.` };
    }
    const speeds = cells.slice(1).map((s) => Number(s));
    if (speeds.some((n) => !Number.isFinite(n))) {
      return { ok: false, error: `Row ${i} contains non-numeric speeds.` };
    }
    twaBinsDeg.push(twa);
    speedRows.push(speeds);
  }

  // Sort by TWA ascending (some polar tables list 32, 36, 40 already; some
  // list 180, 170, … — handle either).
  const order = twaBinsDeg
    .map((v, idx) => ({ v, idx }))
    .sort((a, b) => a.v - b.v);
  const sortedTwa = order.map((o) => o.v);
  const sortedRows = order.map((o) => speedRows[o.idx]!);
  const flat: number[] = [];
  for (const row of sortedRows) flat.push(...row);

  return {
    ok: true,
    table: {
      twsBinsKn,
      twaBinsDeg: sortedTwa,
      targetSpeedKn: flat,
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  if (value <= min) return min;
  if (value >= max) return max;
  return value;
}

/** Bilinear interpolation. Returns target boatspeed in knots. */
export function evaluatePolar(
  table: PolarTable,
  twsKn: number,
  twaDeg: number,
): number {
  const tws = clamp(
    twsKn,
    table.twsBinsKn[0]!,
    table.twsBinsKn[table.twsBinsKn.length - 1]!,
  );
  // Polar tables typically only define TWA from 32-180 (or 30-180). Mirror
  // 180-360 to 360-180 for downwind broad reaches when the user enters
  // a TWA on the other side.
  const twaSym = twaDeg > 180 ? 360 - twaDeg : twaDeg;
  const twa = clamp(
    twaSym,
    table.twaBinsDeg[0]!,
    table.twaBinsDeg[table.twaBinsDeg.length - 1]!,
  );

  const twsIdx = lowerBoundIdx(table.twsBinsKn, tws);
  const twaIdx = lowerBoundIdx(table.twaBinsDeg, twa);

  const tws0 = table.twsBinsKn[twsIdx]!;
  const tws1 = table.twsBinsKn[twsIdx + 1] ?? tws0;
  const twa0 = table.twaBinsDeg[twaIdx]!;
  const twa1 = table.twaBinsDeg[twaIdx + 1] ?? twa0;

  const tFracTws = tws1 === tws0 ? 0 : (tws - tws0) / (tws1 - tws0);
  const tFracTwa = twa1 === twa0 ? 0 : (twa - twa0) / (twa1 - twa0);

  // Memory layout is TWA-major: index = twaIdx * twsBinsLen + twsIdx.
  const twsLen = table.twsBinsKn.length;
  const twaLen = table.twaBinsDeg.length;
  const twsIdxNext = Math.min(twsIdx + 1, twsLen - 1);
  const twaIdxNext = Math.min(twaIdx + 1, twaLen - 1);
  const v00 = table.targetSpeedKn[twaIdx * twsLen + twsIdx]!;
  const v01 = table.targetSpeedKn[twaIdxNext * twsLen + twsIdx]!;
  const v10 = table.targetSpeedKn[twaIdx * twsLen + twsIdxNext]!;
  const v11 = table.targetSpeedKn[twaIdxNext * twsLen + twsIdxNext]!;

  // Bilinear.
  const v0 = v00 + (v01 - v00) * tFracTwa;
  const v1 = v10 + (v11 - v10) * tFracTwa;
  return v0 + (v1 - v0) * tFracTws;
}

/** Largest index whose binValue ≤ value. */
function lowerBoundIdx(bins: number[], value: number): number {
  for (let i = bins.length - 1; i >= 0; i--) {
    if (bins[i]! <= value) return i;
  }
  return 0;
}

/** A small library of class-default polars so a sailor can pick a
 *  "good enough" table without sourcing one. Numbers approximate; for
 *  serious racing the sailor pastes their own ORC certificate. */
export const BUILTIN_POLARS: { id: string; name: string; raw: string }[] = [
  {
    id: 'j24',
    name: 'J/24 (class default)',
    raw: `twa/tws 6     8     10    12    16    20
32      3.50  4.20  4.60  4.85  5.10  5.20
36      4.20  5.10  5.60  5.85  6.10  6.20
40      4.60  5.50  6.00  6.20  6.40  6.50
60      4.90  5.80  6.30  6.50  6.70  6.80
90      5.20  6.00  6.50  6.70  6.90  7.00
120     4.80  5.70  6.30  6.50  6.80  7.00
150     4.10  5.10  5.80  6.10  6.50  6.70
180     3.60  4.60  5.30  5.70  6.10  6.40`,
  },
  {
    id: 'sigma33',
    name: 'Sigma 33 (cruiser-racer)',
    raw: `twa/tws 6     8     10    12    16    20
32      3.80  4.50  4.90  5.10  5.40  5.50
40      4.80  5.60  6.00  6.20  6.40  6.50
60      5.20  6.00  6.40  6.60  6.80  6.90
90      5.50  6.30  6.70  6.90  7.10  7.20
120     5.10  5.90  6.40  6.60  6.90  7.00
150     4.40  5.30  5.90  6.20  6.60  6.80
180     3.80  4.80  5.40  5.80  6.20  6.50`,
  },
];
