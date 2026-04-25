# Phases 1.12 → 1.15 — Race-day extras

**Duration:** 1 session
**Build system:** **Expo Go** — pure-JS, ships via EAS Update.
**Why this exists:** James asked "do all four" of the candidate
features after Phase 1.8 dashboard catalogue shipped. Each phase is
small enough to fit in one ship, so they're grouped under one plan
doc with sub-phase retros.

## Phase 1.12 — Voice race-officer cues

The helm shouldn't have to look at the phone during the start. Eyes
on the line, eyes on the boat. Audio fills the gap.

**New dep:** `expo-speech` (in standard Expo Go SDK 54 — no dev
build needed). Logged here for the dependency-flag rule.

### Cadence

| Time | Phrase |
|---|---|
| T-5:00 → T-1:00 (each minute) | "Five minutes" / "Four minutes" / … |
| T-0:30 | "Thirty seconds" |
| T-0:20 | "Twenty" |
| T-0:10 | "Ten" |
| T-0:05 → T-0:01 | "Five, four, three, two, one" |
| T-0:00 | "Gun!" |

### Implementation

- `src/domain/voiceCues.ts` — pure `cueFor(integerSecond)` returning
  the phrase + priority for that integer countdown second. 7 unit
  tests cover the catalogue + de-duplication invariants.
- `useSettingsStore` — `voiceCuesEnabled: boolean` (default `true`),
  persisted, toggled in Settings via new `BooleanRow` component.
- `RaceTimerScreen` — new effect that fires `Speech.speak()` once
  per integer countdown second when a cue exists. Long-press
  haptics + this effect both run on the same 250ms tick.

## Phase 1.13 — Wind shift trend dashboard

Fifth dashboard in the catalogue. Plots a 5-minute history of
computed wind shifts as a polyline against ±20° y-axis. Tells the
sailor whether shifts are oscillating around the baseline (consider
tacking on lifts) or progressively veering / backing.

### Implementation

- `src/dashboards/WindTrendDashboard.tsx` — pure RN/SVG, 150-entry
  ring buffer sampled every 2s from `useWindShiftTracker`.
- Min / max / now stats above the chart for at-a-glance reads.
- Honest "Building history…" empty-state until ≥ 8 samples.
- Appended one-line to `dashboardCatalogue`.

## Phase 1.14 — Per-leg timer

Post-race breakdown: "leg 1 took 4:32, leg 2 took 5:18, the run was
6:01". A first cut at race-debrief data without polar attribution
(that's Phase 4).

### Algorithm

- Walk track points in time order.
- For each leg, find the first point within 30m of the leg's
  target (the rounding mark, or the midpoint of a gate / line).
- Require the boat to leave the rounding radius first before
  re-entering counts — handles the common case where the start
  point is already inside the threshold (start line midpoint).
- Incomplete legs report elapsed-up-to-last-track-point so
  abandoned races stay readable.

### Implementation

- `src/domain/legTiming.ts` — pure `computeLegTimings(legs, track,
  marks)` returning `{ legs[], totalDurationSeconds, totalDistanceMetres }`.
  8 unit tests cover single / multi / incomplete / line-leg cases
  and the format helper.
- `RaceSessionScreen` — new "Leg breakdown" card under summary
  stats; shows label, mm:ss, nm per leg + "Mark not rounded" tag
  on incomplete legs.

## Phase 1.15 — Boat-leaderboard share

Post-race QR with race name + boat name + gun time + finish time +
elapsed seconds. Receivers merge multiple finish records into a
leaderboard view sorted by elapsed seconds (line honours; no
handicap correction in v1).

### Wire format

New envelope kind `openracer-finish` joins the existing four:

```ts
{ kind: 'openracer-finish'; version: '1.0.0'; bundle: SignedFinishRecord }
```

`SignedFinishRecord.payload` carries: schema version, issued at,
sender id + name, race name, boat name, gun at, finished at,
elapsed seconds, optional course id. Signed with the device's
existing committee/signing keypair (canonical-JSON ECDSA P-256).

### Bug fixed in passing

`decodeQr` was rejecting `openracer-boat-profile` envelopes
(reached: missing branch in the kind guard). Phase 1.9b
boat-profile QR scan was effectively non-functional. While adding
`openracer-finish` I refactored the kind guard into a single
`knownKinds` array so the mistake can't recur.

### Persistence

- v10 migration: `leaderboard_entries` table keyed by `(race_name,
  gun_at, sender_id)` so re-sharing the same finish updates rather
  than duplicating.
- `src/stores/leaderboardRepo.ts` — `recordFinish`,
  `listLeaderboardRaces`, `listFinishersForRace`,
  `deleteFinishersForRace`.

### UI

- `ShareFinishScreen` — reachable from `RaceSessionScreen` once
  the session has `finishedAt` set; renders a 260-pt QR + boat
  name + race name + elapsed mm:ss.
- `LeaderboardScreen` — list of races, drill into one to see
  finishers sorted fastest-first. Accessible from Settings → My
  boat → Leaderboard. Inline "Clear this race's entries" for tidy
  test runs.
- `ScanCoursePushScreen` — fifth dispatch branch handles
  `openracer-finish` (verify trust + signature → confirm dialog →
  `recordFinish`).

## Out of scope

- **Handicap correction (PHRF / IRC / RYA)** — needs a per-boat
  handicap field + class definitions. Phase 4.5+.
- **Aggregating across phones automatically** — every phone
  collects scans into its own leaderboard, no server. Multi-phone
  sync is Phase 8 (MCP / API).
- **Trend-graph polar attribution ("you sailed 92% of polar on
  leg 2")** — needs polar lookup at every track point, more
  expensive computation. Phase 4 debrief.

## Phase exit gates

- [x] Voice cues fire at the right seconds (7 unit tests).
- [x] Toggle in Settings persists.
- [x] Wind shift trend dashboard plots; honest empty-state.
- [x] Per-leg timer passes 8 unit tests; renders on RaceSession.
- [x] Finish-record codec round-trips + rejects tampering (4 tests).
- [x] decodeQr accepts boat-profile + finish kinds.
- [x] Leaderboard screen lists, drills, sorts by elapsed.
- [x] `npm run audit` clean (293 tests pass).
- [x] EAS Update published.

## Retro — 2026-04-25

Shipped all four phases in one session while James was out adding
marks for Pantera. The fact that I could group them under one plan
doc tells you the dashboard-catalogue + signed-bundle architecture
from earlier phases keeps paying back: each new feature was a small
file plus a one-line append to a registry.

**What this enables next Wednesday:**

- Dad helms upwind on Pantera. Phone in the cockpit, screen off,
  pocketed — he hears "two minutes", "one minute", "thirty",
  "ten", "five-four-three-two-one-gun!". Eyes on the line.
- Mid-race, James swipes once → wind shift trend. Sees the wind has
  veered 6° over the last 3 minutes; calls a tack to pick up the
  next lift.
- Post-race, James opens the session in Race history → leg
  breakdown — "we lost it on leg 3, blew through layline by 200m".
- He shares his finish with two competitors at the bar. Each of
  them gets the leaderboard on their phone, sorted by elapsed.

**Bugs found in passing:** `decodeQr` rejected boat-profile
envelopes since the original Phase 1.9b ship — silent bug that
broke the boat-profile scan flow. Caught only because I added a
new envelope kind and re-read the guard. Fixed.
