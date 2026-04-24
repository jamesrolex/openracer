# Phase 1.5 — Race-day polish

**Duration:** 2 weeks
**Why this exists:** Phase 1 shipped a working alpha. The Navionics
competitor research + first on-device demo at Abersoch YC surfaced a
short list of high-value features that don't need new infrastructure
— no charts, no instruments, no native modules. Two weeks of polish
that turns the alpha into something a sailor at Abersoch would
genuinely want to use every Wednesday night.

This phase is **between** the Phase 1 alpha ship and the Phase 2 chart
work that needs MapLibre + EAS dev build. Everything in scope here
runs in Expo Go.

## Why we do this before Phase 2

1. **The exit gate from Phase 1 is dogfooding-driven.** The 3-minute
   test is a real on-water trial, not a unit test. We learned at the
   first demo that the timer + start-line is solid but the race
   officer's tools aren't there yet. Fix that before chart work
   starts pulling attention.
2. **Phase 2 (MapLibre + EAS dev build) is a multi-week native-module
   migration.** Slipping a polish bucket in between the two big
   architectural blocks gives us a clean checkpoint.
3. **The Navionics research changed our positioning.** "The racing
   app for the clubs the big vendors ignored" needs the features that
   make a club race officer's life easier — not just a sailor's.

## In scope (4 features)

### 1.5.1 — Gun-sync one-tap button

**The problem.** Today's "Sync to next minute" button works, but it
needs a deliberate three-step interaction (open timer → tap button →
confirm). At a real start, the RC's gun fires, sailors hear it, and
they need to snap their countdown to that moment in <1 second.

**The shape.** Replace the existing tri-button row (Sync / -1 min /
+1 min) with a giant circular **GUN!** button as the dominant
pre-start action. Tap it the instant you hear the horn, sequence
snaps to the next whole minute. -1 min and +1 min remain as smaller
pill buttons below.

**Tunable.** A long-press on GUN! opens a confirm-or-undo sheet. The
default is single-tap-instant, but if a sailor mis-fires they get
3 seconds to tap "Undo" and the previous gun time restores.

**Effort:** 1 day. New `GunSyncButton` component, wire to existing
`syncToMinute` action, add an undo-stash to `useRaceStore`.

**Acceptance:** Stopwatch test — sailor hears a real horn, times the
tap-to-confirmed-sync. Median ≤ 1.0 s, p95 ≤ 1.5 s.

---

### 1.5.2 — Sequence states: postponement (AP) + individual recall (X)

**The problem.** Phase 1 only knows Rule 26 (5/4/1/0). Real club
racing uses the AP (postponement) flag at least 30% of starts, and
individual recalls happen too. The race officer's iPhone can't
represent either today.

**The shape.** Extend the `RaceState` enum and `useRaceStore`:

- `'postponed'` — AP flag is up. Countdown frozen at current value;
  big AP icon overlays the timer; "Drop AP" button restarts the
  sequence at T-5 from a sailor-set restart time.
- `'individual-recall'` — flag X up after the gun. Doesn't pause the
  race for the rest of the fleet, but visually flags the OCS state
  in the timer header. Auto-clears 4 minutes after the gun (per
  Rule 29.1) unless the OCS boats are visible to the RC.
- `'general-recall-flagged'` — first-class state instead of just
  bumping `recallCount`. Visually shows the "First Substitute" flag
  in the header during the recall countdown.

Persisted with the rest of `useRaceStore` so a kill-mid-postponement
restores cleanly.

**Effort:** 3 days. Touches the timer state machine, the
`makeSnapshot` function, the notification scheduling (postponement
should cancel scheduled T-5/T-4/T-1/T-0 alerts and re-arm on resume),
and the `RaceTimerScreen` UI. Worth doing the state-machine first as
a pure-domain refactor with unit tests, then wiring the UI.

**Acceptance:** Race officer can:
- Tap AP. Countdown freezes. Visual is unambiguous.
- Tap "Drop AP" + a target restart time. Sequence resumes at T-5
  from that time.
- Hit individual recall after the gun. X flag visible until 4 min
  after the gun OR a manual clear.
- Kill app mid-postponement. Re-open. State preserved.

---

### 1.5.3 — Favoured-end indicator on the start-line readout

**The problem.** We already compute `lineBias` in `domain/startLine.ts`
and the `StartLineReadout` component renders it as a tiny text label.
Sailors miss it. The bias on a typical Abersoch start-line is
±5–15° — knowing which end is favoured is half the battle.

**The shape.** Promote the bias from buried text to a dominant
readout: a left-or-right pointing arrow with the bias in degrees,
colour-coded:

- 0–3°: muted grey, "EVEN"
- 3–8°: white, "PIN +6°" or "BOAT +6°"
- 8–15°: amber, "PIN +12°" or "BOAT +12°"
- > 15°: red, "PIN +18°" or "BOAT +18°"

Goes ABOVE the distance-to-line panel. No new geometry — we already
compute it. Just promotion + visual treatment.

**Effort:** 0.5 days. New `FavouredEndChip` component slotted into
`StartLineReadout`. Update the existing tests.

**Acceptance:** When you stand 50 m perpendicular to a known
biased line, the chip reads correctly within 2°. Visible from arm's
length on the cockpit at full sun (44+pt).

---

### 1.5.4 — GPX export from race sessions

**The problem.** We log 1 Hz tracks during every race (Phase 1 pulled
this forward from Phase 2). The data is locked in SQLite. Sailors
want to share it with the club — debrief, post-race analysis, fleet
comparison.

**The shape.** From `RaceSessionScreen`, add an **Export GPX** action
in the toolbar. Tap → builds a valid GPX 1.1 file from the track
points → opens the iOS share sheet. Save to Files, AirDrop to a
laptop, email it, drop into a WhatsApp group.

GPX is the universal format. Every analysis tool (Strava, RaceQs,
Sailing Performance, Expedition) imports it. No web viewer needed
for v1.5 — just hand them a `.gpx` file, they take it from there.

**Effort:** 1 day. Pure-function `tracksToGpx(session, points)` with
unit tests. Share-sheet integration via `expo-sharing`. Dependency
already in the project.

**Acceptance:**
- Exports a valid GPX 1.1 file (validates against GPX schema).
- Track contains every recorded point with `<time>`, `<lat>`, `<lon>`,
  `<sog>` extension.
- Imports cleanly into RaceQs and Strava on the project owner's
  account (sanity check, not automated).
- File is visible in iOS Files app after a "Save to Files" action.

---

## Out of scope for Phase 1.5

These are tempting but belong elsewhere — log here so we don't drift.

- **Web replay viewer for GPX.** Phase 2/3. Needs a hosted static
  site; v1.5 hands sailors the file and lets them choose a viewer.
- **Layline calculation from manual tack angle.** Phase 2 — needs a
  chart view to render usefully.
- **Apple Watch race-timer mirror.** Phase 2.5 — needs EAS dev build.
- **Tidal current overlay.** Phase 2 — needs MapLibre.
- **Multi-crew yacht-data sync (BLE).** Phase 4.5 — needs BLE +
  signed-bundle sync layer.
- **Polars / VMG / target boatspeed.** Phase 2+ — needs polar
  ingestion model.
- **Visual route mapper / drag-and-drop course builder.** Phase 2 —
  needs MapLibre. Logged in `docs/future-features.md`.
- **Live wind shift bar.** Phase 2 — depends on a stable AWA
  estimation pipeline; phone compass alone is too noisy.

If a Phase 1.5 feature gets blocked or proves a bad fit, we don't
fall back to one of the above. We close out the open items, ship
1.5, and start Phase 2.

## Dependencies added

None. Every feature uses existing libraries:

- `expo-haptics` (already in) — for the GUN! tap haptic.
- `expo-sharing` (need to confirm — may already be in for QR share).
- No new state stores, no new native modules, no MapLibre, no BLE.

## Build system

Stays in **Expo Go**. The whole point of Phase 1.5 is to ship more
value before the EAS dev build migration.

## Risk + mitigations

1. **Postponement state machine is the largest refactor.** If it
   eats more than 4 days, ship 1.5 without it and re-spec for
   Phase 2.
2. **Gun-sync UX needs on-water testing.** The latency from "I hear
   the horn" to "I tap" is the dominant factor — phone vs paper
   stopwatch. Plan for one Wednesday-night dogfood mid-phase.
3. **GPX export works for the project owner — but other people's
   apps may quibble on the schema.** Test against RaceQs + Strava.
   If both refuse, we have a real problem. If one accepts, fine.

## Acceptance gate (overall Phase 1.5)

- [ ] All four features built, unit-tested, audit clean.
- [ ] Project owner runs a real Wednesday-night race using the
      timer with a postponement and a general recall. Finishes
      without app crash. Track exports as GPX, opens cleanly in
      RaceQs.
- [ ] Updated `docs/spec-summary.md` with the Phase 1.5 features.
- [ ] One blog-post-style retro pinning the v1.5 → v2 boundary.
- [ ] At least 8 atomic commits, conventional format. Push after
      each step.

## Sequencing inside Phase 1.5

Two weeks. Suggested order:

**Week 1 — UX + state machine.**
1. Day 1: GunSyncButton — biggest UX win, lowest risk. Gives the RC
   a tangible improvement immediately.
2. Day 2: FavouredEndChip — half-day of work. Pair with day 1
   commit.
3. Days 3-5: Sequence-state refactor (AP + individual recall).
   Pure-domain refactor first, tests, then UI.

**Week 2 — Export + dogfood.**
1. Days 6-7: GPX export. Domain function + unit tests + share-sheet
   integration.
2. Day 8: Wednesday-night on-water dogfood (or first available race
   day at Abersoch).
3. Days 9-10: Bugs found in dogfood + retro + ship.

If anything blows up, the pin moves. The whole phase is meant to be
finishable inside two weeks of part-time work — not a precise
schedule.

---

## Retro — 2026-04-24 evening (Phase 1.5 condensed)

The Phase 1.5 plan was written this morning, all four features built and
committed by evening. Single dev session, ~five hours of focused work
including the Navionics-research detour that motivated the phase.

**Shipped:**
- ✅ GUN! one-tap button + 4-second Undo affordance. Replaces the
  buried "Sync" button. Phone-grade haptic at the tap.
- ✅ Favoured-end chip on StartLineReadout. Promotes the existing
  computeLineBias output from buried text to a left/right arrow
  with magnitude, colour-banded from neutral grey through amber to
  red. Manual wind-direction input added to Settings (`°T 0–360`).
- ✅ Postponement (AP) + individual recall (X) state machine.
  RaceState extended; makeSnapshot grew a TimerExtras parameter so
  `postponedAt` freezes the snapshot at the moment AP went up and
  `individualRecallAt` overlays running/starting only inside the
  4-min Rule 29.1 window. 8 new unit tests; the raceTimer suite is
  now 22 tests total. AP banner pre-empts the GUN! button. Drop AP
  with a 5/10/15-min restart picker. Notifications cancel on AP-
  raise + re-arm on AP-drop; haptic refs reset cleanly.
- ✅ GPX 1.1 export from any past race session. Pure-function
  `buildGpx()` with 9 unit tests covering header, metadata,
  trkpts, namespace extensions for SOG/COG, XML escaping,
  empty-trkseg, balanced tags, and filename safety. Wired into
  RaceSessionScreen via a new "Export GPX" toolbar action that
  writes to FileSystem.cacheDirectory + opens the share sheet
  (mimeType + UTI both set so iOS knows the file type).

**Counts at end of phase:**
- 213 unit tests across 20 suites, all green.
- 17/17 expo-doctor checks pass.
- 5 commits pushed during the phase (Phase-1.5 plan, GUN!+chip,
  AP/X, GPX export, plus an offline-fix commit at the start).

**On-water exit gate (still open):**
- One real Wednesday-night race at Abersoch with the project owner
  as RC, including a postponement and a general recall, finishing
  with a clean GPX export into RaceQs.

**What we learned this phase:**
- The Phase 1 timer state machine being a pure function paid off
  hard. AP + X dropped in via a single `extras` parameter; the
  test suite caught every regression. Time-anchored design wins.
- Navionics research two days ago changed positioning (the
  "racing app for clubs the big vendors ignored" pitch) and that
  changed scope. Phase 1.5 only exists because the research
  identified four high-value, low-effort wins that didn't need
  Phase 2 infrastructure.
- Expo Go offline behaviour is unreliable. EAS Update gives a
  noticeably better cached experience but the truly bulletproof
  path is an EAS dev build + Apple Developer Program. Flagging
  for the next phase boundary.
