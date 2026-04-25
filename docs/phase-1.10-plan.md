# Phase 1.10 — Personal sailor log

**Duration:** ~1 day
**Build system:** **Expo Go** — pure-JS, ships via EAS Update.
**Why this exists:** project owner cited C-Map's tracking feature
("very cool to see where I'd sailed and how many miles") — that
kind of personal lifetime log is what turns a racing tool into
something a sailor opens between races. Good for retention; better
for storytelling at the bar after.

Crew might race on several boats over a season. Each phone keeps
its own personal log — total miles raced, total miles cruised,
boats joined, races sailed. **The log is per-device** because that
matches the human ("what have I done"); not per-boat ("what has
this boat done"). Aggregates across boats fall out naturally.

## In scope

### 1.10.1 — Storage

- New SQLite migration **v9**: `joined_boats` table.
  - `id TEXT PRIMARY KEY` (own boat-join record)
  - `sender_id TEXT NOT NULL` (boat-owner committee id)
  - `sender_name TEXT NOT NULL`
  - `boat_name TEXT NOT NULL`
  - `joined_at TEXT NOT NULL` (ISO)
  - `marks_added INTEGER NOT NULL` (count of marks ingested)
  - `polar_received INTEGER NOT NULL` (0/1)
  - Index on `sender_id` for "show me my history with this boat".
- Extend `useTripStore` with `lifetimeCruiseMetres: number` —
  never resets, accumulates whenever the trip odometer is
  resetting. Existing `distanceMetres` becomes "current trip"
  only.

### 1.10.2 — Boat join history

- `ingestBoatProfile` now writes a row into `joined_boats` after
  the marks/polar are persisted.
- New repo: `src/stores/joinedBoatsRepo.ts` — list/insert/delete
  operations. Listing returns rows sorted newest-first, with
  total miles raced on each boat (computed by joining
  race_sessions to … hmm, race-sessions don't carry a boat id
  yet. For v1 we don't link races to boats; per-boat-miles is
  Phase 4.5 work. Phase 1.10 shows: when you joined, which
  marks came in.)

### 1.10.3 — Lifetime aggregates

Computed on demand (not stored — derived from existing data so
there's no consistency problem):

- **Total race miles** = `Σ race_sessions.sailed_metres` for
  finished sessions.
- **Total cruise miles** = `useTripStore.lifetimeCruiseMetres`.
- **Days at sea** = count distinct `recorded_at` dates across
  all `race_track_points` + cruise odometer activity.
- **Max SOG (lifetime)** = `MAX(sog_mps)` from
  `race_track_points` + `useTripStore.maxSogMps` (lifetime).
- **Race count** = count of `race_sessions` with
  `state = 'finished'`.
- **Boats joined** = count of `joined_boats` rows.

### 1.10.4 — Sailor Log Screen

New screen at Settings → Racing → "My sailing log". Layout:

1. **Lifetime banner** at top — single big number (total nm) +
   sub-stats (race count, days at sea, max SOG).
2. **Recent boats** card — list of joined boats with the join
   date + marks-added count. Tap a row → drill in (placeholder
   for Phase 4.5+ "races with this boat" view; v1 just shows
   the join detail).
3. **Recent races** card — top 5 finished races by date with
   distance + duration. Tap a row → existing RaceSessionScreen.
4. **Cruise log** card — current trip + lifetime cruise miles +
   max SOG. Reset is still on Home; this screen is read-only.

### 1.10.5 — Settings entry point

`Settings → Racing` gains a new link "My sailing log" between
"Saved courses" and "Race history".

## Out of scope for Phase 1.10

- **Per-boat race log** ("how many miles I've raced on Lyric
  specifically") — needs to tag race sessions with the boat id
  at arming time. Phase 4.5+ when the boat-join model becomes a
  first-class concept.
- **Heatmap of places sailed** — Phase 2 (needs MapLibre).
- **Personal-best leaderboards** ("longest race", "windiest
  day") — Phase 1.11+ once the basic log proves useful.
- **Cross-device sync** (one log across iPhone + Apple Watch +
  iPad) — Phase 4.5+ requires a sync layer.
- **Public sharing** ("share my year-in-review") — Phase 11
  with the App Store launch.

## Phase 1.10 exit gate

- [ ] Boat-profile join writes a `joined_boats` row on the
      receiving phone.
- [ ] Sailor Log screen renders lifetime stats + boats + races
      in airplane mode.
- [ ] Cruise miles ticker accumulates correctly across trip
      resets.
- [ ] `npm run audit` clean.
- [ ] EAS Update bundle published.
