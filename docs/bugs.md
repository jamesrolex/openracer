# Bug tracker

Source of truth for known bugs, quirks, and investigations. Numbered
sequentially (B-001, B-002…). Never re-use a number. Keep fixed bugs in the
log — the history is the record of how we debugged.

## Workflow

1. Spot a bug → add a new row in the table below, assign the next number.
2. Create a detailed entry in "Entries" following the template.
3. Commit under `fix:` or `docs:` depending on whether code changed.
4. Close by setting the row's status to `fixed` and filling in "Resolution".
5. Fixed bugs are never deleted — they become the change log.

## How to know if something is a bug vs out-of-scope

If it contradicts `docs/phase-0-plan.md` or `docs/decisions.md`, it's a bug.
If the behaviour isn't covered there yet, it's a feature gap — log it in
`docs/phase-N-plan.md` for the relevant phase instead, or open a GitHub
issue with the `feature` label.

## Index

| ID | Title | Phase | Severity | Status | Resolution |
|---|---|---|---|---|---|
| B-001 | SOG / COG display garbage when stationary (iOS -1 sentinel) | 0 | medium | fixed | Negative `coords.speed` / `coords.heading` now treated as unavailable (null) |
| B-002 | DEV pill collides with ConnectionBadge in top-left | 0 | low | fixed | Pill moved to bottom-right, trimmed to just `DEV` label |
| B-003 | Monster-size em-dash placeholder reads as a loading bar | 0 | medium | fixed | Placeholder values render at `muted` emphasis (h2 size) so they read as "no data" |
| B-004 | LAT/LON DMM format wraps awkwardly on iPhone width; also scope drift from Phase 0 plan | 0 | medium | fixed | HomeScreen now uses decimal format (per Phase 0 plan); user-pref `coordFormat` reserved for future screens |
| B-005 | ConnectionBadge says "Starlink" for any constant connection (confusing on home WiFi) | 0 | low | fixed | Label changed from "Starlink" to "Online" — neutral, accurate for any constant source |
| B-006 | Screenshot → AirDrop → paste loop for diagnostics is slow | 0 | medium | fixed | DevPanel gained a "Copy" button that puts the rows on the clipboard via `expo-clipboard` |

Severity scale: `critical` (exit-gate blocker), `high` (feature broken for
many users), `medium` (feature broken for some), `low` (cosmetic / edge case).

Status set: `investigating`, `open`, `fixed`, `wontfix`, `deferred-to-N`.

---

## Entries

### B-001 — SOG / COG display garbage when stationary

**Reported:** 2026-04-24 by project owner during first run.
**Phase:** 0
**Severity:** medium
**Status:** fixed
**Fix:** commit `TBD` (see git log around 2026-04-24).

**Symptom**

On the HomeScreen:
- **SOG** reads `-1.9 kn`
- **COG** reads `359°`
- **LAT / LON** display correctly (`52° 49.358' N, 004° 30.582' W` — Abersoch)
- Bottom meta: "GPS 7 m · updated 0 s ago" — GPS fix is fine

Originally presented as "no usable data from iOS". In hindsight, LAT/LON were correct — the misleading values in SOG and COG were the real defect.

**Environment**

- Device: real iPhone via Expo Go
- Expo SDK 54, expo-location 19.0.8
- Stationary (phone on a table), GPS fix acquired

**Root cause**

iOS's `CLLocation.speed` and `CLLocation.course` return `-1` when the value cannot be reliably measured — typically when the device is stationary and there are no deltas to derive speed or direction from. Apple's documentation: *"A negative value indicates an invalid speed."* expo-location passes this sentinel through unchanged.

My original `useGPS` hook used `reading.coords.speed ?? null`, which only nulls `null` / `undefined`, **not `-1`**. So `-1` m/s flowed into the store, got converted to `-1.9 kn` for display (correct m/s→kn math on wrong input), and `-1°` normalised to `359°` via `formatBearing` (correct modular arithmetic on wrong input).

The code was doing exactly what it said; the input assumption was wrong.

**Diagnostic that nailed it**

The DevPanel showed the raw values directly:

```
sog (m/s): -1.000
cog (°): -1.0
heading (°): -1.0
accuracy (m): 7.0
```

Because position and accuracy were valid but speed/heading were literal `-1.000`, the sentinel behaviour was obvious on sight. Without the DevPanel, this would have taken rounds of adding console.logs to a native hook.

**Fix**

Extracted a pure sanitiser `src/hooks/gpsSanitise.ts` that treats any negative `speed` or `heading` as unavailable (null). Jest unit tests cover:

- valid moving reading passes through
- `speed = -1` only → `sog = null`, `cog/heading` preserved
- `heading = -1` only → `cog/heading = null`, `sog` preserved
- both `-1` (the B-001 stationary case) → both null, position + accuracy still valid
- zero is a valid measured value (not sentinel) and passes through

UI now renders `"—"` for SOG and COG when the device is stationary, which is correct and not misleading.

**Lessons for future marine-sensor work**

- Sensor drivers often use in-band sentinel values (-1, 999, NaN) to signal "unavailable". Always sanitise at the driver boundary.
- Adding a pure helper + unit tests at the first sign of sensor-data nuance pays back immediately. The next time we see weird numbers, we'll add cases to `gpsSanitise.test.ts`.
- The DevPanel infrastructure paid for itself on its first day. Keep extending it.
