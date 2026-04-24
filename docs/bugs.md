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
| B-007 | LAT/LON show signed decimals without hemisphere letters | 0 | medium | fixed | HomeScreen now uses `formatLatLon(..., 'decimal')` — e.g. `52.8226° N`, `4.5097° W` |
| B-008 | LON still wraps on iPhone width because `formatLatLon(decimal)` left-pads to 3 digits (`004.5097° W`) | 0 | low | fixed | Decimal format no longer pads the whole-degree part — padding stays on DMM/DMS per marine convention but chart-plotter-style decimal has no padding |
| B-009 | Tamagui `createTamagui` crashes on boot: zIndex tokens use numeric keys (`$0..$3`) while other scales use `$xxs..$huge` | 1 | high | fixed | zIndex keys realigned to the shared scale (`xxs..huge`); Tamagui 1.x enforces symmetric token keys at runtime, not at typecheck time |
| B-010 | "Marks →" link on HomeScreen is hard to press (12 pt text, no background, ~15 pt tap target) | 1 | medium | fixed | Replaced bare text link with a pill-shaped button using accent fill and 44 pt minimum tap target per HIG |
| B-011 | Text inputs on MarkEdit + MarkLibrary are squashed (Tamagui `size="$md"` collides with my 8-point spacing scale → 16 pt-tall input) | 1 | medium | fixed | Dropped Tamagui `size` prop on `Input` everywhere; inputs now use explicit `height={44}`, `paddingHorizontal`, `fontSize` matching the design-system body scale |
| B-012 | Rounding direction (port / starboard) not shown on CourseEntry leg rows — data model has it but UI never rendered it | 1 | medium | fixed | LegRow now shows a tappable P / S chip that toggles per-leg rounding; CourseStrip inherits the same marker under each rounding chip |
| B-013 | Point-at-mark second bearing is confusing — user can't tell which sighting they're capturing, no visual aid for aiming | 1 | high | fixed | Rebuilt MarkPointAtScreen around a live CompassDial with a fixed red crosshair and a persistent green wedge for the first-sighting bearing; added a colour-coded "STEP 1/2 OF 2" banner that flips amber → green when enough distance has been walked |

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

---

### B-009 — Tamagui `createTamagui` crashes on boot (zIndex token shape)

**Reported:** 2026-04-24 by project owner on first launch after Tamagui migration.
**Phase:** 1 (Week 1)
**Severity:** high — app fails to render past the provider.
**Status:** fixed
**Fix:** commit on 2026-04-24 — zIndex keys realigned to the shared scale.

**Symptom**

On app boot, red screen:

```
createTamagui() invalid tokens.zIndex:
Received: $0, $1, $2, $3
Expected a subset of: $xxs, $xs, $sm, $md, $lg, $xl, $xxl, $huge, $true
```

App never reaches the HomeScreen.

**Root cause**

Tamagui 1.x enforces that every token scale (space, size, radius, zIndex) shares the **same key set**, so any prop can resolve against any scale. The config initially defined `zIndex: { 0, 1, 2, 3 }` while the other scales used `xxs, xs, sm, md, lg, xl, xxl, huge, true`. The runtime check threw before the provider mounted.

Typecheck did NOT catch it — Tamagui's TS types accept any zIndex shape; only the runtime validator enforces symmetry.

**Fix**

`tamagui.config.ts` now uses the shared key set for zIndex too:

```ts
const zIndexTokens = {
  xxs: 1, xs: 10, sm: 100, md: 200, lg: 300,
  xl: 500, xxl: 1000, huge: 9999, true: 100,
};
```

Values are a sensible progression; only a few map to anything semantic in-app.

**Diagnostic that nailed it**

The error message itself listed both what it saw and what it wanted, so no further digging was needed. Worth remembering: Tamagui's runtime errors are terse but informative — read them literally.

**Lessons**

- Tamagui's token-shape contract is enforced at runtime, not typecheck. Bundle-builds will succeed, audit will pass, and the app still crashes on boot.
- For the rest of Phase 1, any new createTamagui field gets a manual `expo start` sanity check, not just `npm run audit`.

### B-013 — Point-at-mark second bearing is confusing

**Symptom**

On-device feedback from the product owner after first real usage:
"adding the second bearing was confusing". The original MarkPointAtScreen
showed a plain list of live readings (heading, accuracy, GPS fix) with a
one-line step label and a "FIRST SIGHTING LOCKED" panel after the first
capture. No visual aid for aiming, no indication that the phone's top
edge was the bearing reference, no persistent view of where the first
sighting had pointed.

**Environment**

- Expo Go on iPhone 15 Pro
- Method 7 (compass + triangulation) flow during on-device dogfooding

**Root cause**

The screen was data-dense but visually flat. The "two bearings to
triangulate" mental model is simple but needs to be *shown*, not
labelled. Without a visual compass, the sailor has to:

1. Mentally map the live heading number to a direction.
2. Remember what bearing the first sighting was pointing at (and
   whether they pointed at the same mark).
3. Trust that their current aim is the same as before, across a
   position shift of ≥20 m.

The second bearing felt tacked on because the screen didn't explain
its own state visually.

**Fix**

Rebuilt around a `CompassDial` SVG component that sits front and centre.
Three mechanics do the heavy lifting:

1. **Rotating compass rose** — the whole dial rotates so the current
   true heading sits under a fixed red crosshair at the top. Aim the
   phone's top edge at the mark; the number under the crosshair IS
   the bearing.
2. **Persistent green wedge** at the first-sighting bearing once step
   1 is captured. The sailor can see "I pointed that way last time"
   as they walk to position 2.
3. **Colour-coded step banner** — the pill at the top flips from
   accent blue (step 1) to amber (step 2, not moved enough) to green
   (step 2, baseline satisfied). Copy underneath updates to match:
   "walk ≥ 20 m perpendicular" during step 2 with a live distance
   counter.

Button label also changes with context ("Capture bearing 1" → "Walk
N m more" → "Capture bearing 2 + triangulate") so the next action is
always explicit.

**Lessons**

- Triangulation is a visual concept. Showing it with a fixed crosshair
  + rotating rose removes most of the cognitive load.
- Colour-coded step banners beat text step labels when the flow is
  linear but has gating conditions (distance moved, in this case).
- The "what does the top edge of the phone mean" mental model is
  load-bearing — the red crosshair at 12 o'clock makes it literal.
