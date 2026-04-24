# Phase 1 — Course entry hero + race timer + start line

**Duration:** 8 weeks (weeks 3-10 of the project)
**Goal:** A sailor hears a VHF course announcement, opens OpenRacer, has the course built and the race timer armed in **under 3 minutes** — fully offline, at Abersoch Yacht Club.

Phase 0 proved the stack. Phase 1 is the first time OpenRacer does something a club racer couldn't already do with a stopwatch and a chart.

## Why we do this next

Three reasons:

1. **Course entry is the moat.** Every racing app has a timer. None have seven input methods with committee-boat push. This is the feature that earns trust. If we nail it, Abersoch sailors use it instead of the paper course sheet. If we don't, nothing else matters.
2. **The hero feature forces the offline-first contract to become real.** Phase 0 set up the plumbing. Phase 1 is the first feature that has to stand up to "works in aeroplane mode" scrutiny end-to-end — from mark creation through course build through timer arm.
3. **The first shippable alpha lands at the end of Phase 1.** Three real sailors at Abersoch SC race with it mid-season. Their feedback reshapes Phases 2-11. If Phase 1 slips, the alpha slips past the racing window and we lose a year.

## What "done" looks like

A stranger walking up to the project owner's phone at Abersoch on a Wednesday evening, being told the course over the VHF ("leave Yellow port, round Red, finish upwind of Committee — start 18:45"), and ticking through:

- Open app → Race mode already active
- Tap "Build course" → template picker
- Pick "Windward-Leeward" template
- Tap Start line marks from library (2 taps)
- Tap Windward mark from library (1 tap)
- Confirm → course saved
- Tap "Arm timer" → 5:00 countdown starts
- Total elapsed: ≤ 3 minutes, zero network, no confusion

That's the exit gate.

## Build-system migrations scheduled inside Phase 1

Three transitions land this phase. Plan them; do not discover them.

| When | Migration | Reason | Risk |
|---|---|---|---|
| Week 1 | **Tamagui added** | Locked in `decisions.md`. Library screen and course-entry flow deserve a real UI library. | Low. Additive, no runtime behaviour change. |
| Week 4 | **Expo Go → EAS dev build** | BLE for committee-boat push is not in Expo Go. | Medium. First time using Xcode + Android Studio. One-day setup cost. |
| Week 5 | **MapLibre integrated** | Chart tap and chart-seamark methods need a map. Pulled forward from Phase 2. | Medium. Big native module. Budget a day for Android edge cases. |

**Trade-off flagged:** `decisions.md` originally scheduled MapLibre for Phase 2. Pulling it forward is deliberate — two of the seven course-entry methods are chart-dependent, and doing them chart-less would be a fake deliverable. See "Open questions" at the bottom; final call before week 5 starts.

## In scope — by week

Each week has a specific deliverable and a mini exit gate. The week only ends when its gate is green.

---

### Week 1 — Mark data model + storage foundation

**Deliverable:** Every mark-related type is defined, persisted in SQLite, and covered by unit tests. Tamagui is installed and the theme is ported.

**Work:**
- Extend `src/types/mark.ts` with `MarkIcon` (cardinal N/S/E/W, lateral port/starboard, racing-yellow, racing-red, racing-orange, committee-boat, custom) and `MarkShape` (spherical, pillar, can, conical)
- New types: `src/types/course.ts` (Leg, LegType: `start` | `windward` | `leeward` | `reach` | `finish`, Course with ordered legs + template origin)
- New types: `src/types/race.ts` (RaceTimerState, StartSequence, RaceState: `idle` | `armed` | `running` | `finished`)
- SQLite schema + migrations in `src/stores/db/`:
  - `marks` table (all fields from Mark type, indexed by `tier`, `validUntil`)
  - `courses` table + `course_legs` join table (ordered)
  - `race_sessions` table (start timestamp, template, course id)
- Mark repository (`src/stores/marksRepo.ts`): `create`, `update`, `delete`, `list({ tier?, search?, bbox? })`, `purgeExpired()`
- Expiry logic for each tier (unit tests):
  - `club-seasonal`: auto-valid Apr 1 – Oct 31 of current UK sailing year
  - `chart-permanent`: no expiry
  - `race-day-recent`: 14 days from `validFrom`
  - `single-race-temporary`: until end of current race session
- Confidence function (unit test): derives `confidence: 0..1` from tier + source + age
- Install Tamagui, port `src/theme/tokens.ts` → Tamagui config, migrate `BigNumber` / `ConnectionBadge` / `ModeToggle` to Tamagui equivalents. **Visual output must be identical** (snapshot test or visual diff with pre-Tamagui build).
- `useMarksStore` Zustand store backed by the repo

**Exit gate:**
- [ ] `marksRepo` round-trip test: create → list → update → delete → purge
- [ ] Expiry rules pass all edge cases (year boundary, leap day, seasonal window)
- [ ] `npm run audit` clean
- [ ] App still runs on iOS + Android, HomeScreen visually unchanged
- [ ] Tamagui confirmed working; no raw RN `StyleSheet` left in `components/`

---

### Week 2 — Mark Library screen

**Deliverable:** A usable screen where a sailor curates their club's marks. This screen is the backbone of six of the seven course-entry methods.

**Work:**
- `src/screens/MarkLibraryScreen.tsx` per `skills/design-system/SKILL.md` list-screen spec:
  - Top bar: back arrow, title "Mark Library", `+ Add` button
  - Search box (filters by name + notes)
  - Tier tabs: `Seasonal · Permanent · Recent · All`
  - `MarkCard` list (one per mark), tier-coloured badge
  - Swipe-to-delete on `race-day-recent` and `single-race-temporary` only
  - Empty state per tab ("No seasonal marks yet — tap + Add to create one")
- `src/screens/MarkEditScreen.tsx` — add/edit form:
  - Name, icon picker, shape picker
  - Coordinates: DMM input (marine default per `marine-domain` skill), decimal toggle, "Use current GPS" button
  - Tier picker with inline explanation of lifespan
  - Notes field
  - Validation: name required, coords parseable, lat ∈ [-90,90], lon ∈ [-180,180]
- DMM parser + unit tests: forgiving of user input (`52 49.230N`, `52° 49.230' N`, `52:49.230N` all parse)
- Seed the library from a small bundled `assets/abersoch-marks.json` — the real Abersoch racing marks, already-known coordinates, tier `club-seasonal`. Gives the library something to show on first launch.
- Navigation: React Navigation stack from HomeScreen → MarkLibrary → MarkEdit
- Placeholder "Marks" entry point on HomeScreen (tiny button, becomes proper button in week 3)

**Exit gate:**
- [ ] Can create, edit, delete a mark on device
- [ ] Search narrows the list correctly
- [ ] Tier filter respects expiry (expired race-day marks don't appear in `Recent` tab)
- [ ] DMM parser accepts all three typed formats in unit tests
- [ ] First-launch shows seeded Abersoch marks
- [ ] `npm run audit` clean
- [ ] Tested in aeroplane mode — no network calls

---

### Week 3 — Course Entry shell + Method 1: Library pick

**Deliverable:** The first full end-to-end course entry flow. Pick from library is the highest-impact method (most-used at a home club) so it ships first and sets the UX pattern every other method reuses.

**Work:**
- `src/screens/CourseEntryScreen.tsx` — the hub:
  - Top: race template picker (Windward-Leeward, Olympic, Triangle, Trapezoid, Round-the-cans, Custom)
  - Template drives which legs are required (e.g. W-L needs Start line + Windward mark)
  - Each leg slot shows the chosen mark (or "Tap to add mark")
  - Reorder legs (drag-handle on Custom template only)
  - Bottom: `[Save as draft] [Arm timer →]` (Arm-timer is disabled until all required legs are filled)
- `src/components/CourseStrip.tsx` — compact horizontal display of the current course (used on HomeScreen later)
- **Method 1: Library pick** — tapping a leg slot opens a sheet:
  - List of library marks, filtered tabs per `MarkLibraryScreen`, nearby-first sort (by `distanceBetween` using current GPS)
  - Tap mark → slot populated
  - Inline `+ New mark` to pop the `MarkEditScreen` without losing the course draft
- Courses persist as draft rows in the `courses` table (survive app kill)
- HomeScreen: add `CourseStrip` showing the active/draft course if any; `[Build course]` button when none
- Course templates defined in `src/types/course.ts` as data (not hard-coded screens) so future templates are additive

**Exit gate:**
- [ ] Picking the W-L template and selecting library marks for Start/Windward fills the course
- [ ] `Arm timer` disabled until required slots filled, enabled when complete
- [ ] Killing and reopening the app restores the in-progress course
- [ ] Nearby-first sort correct against a known fixture (tested with geo utility)
- [ ] Stopwatch: project owner can build a W-L course in **under 30 seconds** with seeded marks
- [ ] `npm run audit` clean
- [ ] Aeroplane mode test passes

---

### Week 4 — Method 2: Committee-boat push + EAS dev build migration

**The biggest single piece of Phase 1.** One week, one method, on purpose. Everything else is scaffolded; this week is about making committee-boat push actually work.

**Work:**
- **Migrate to EAS dev build.** Install Xcode + Android Studio. Create EAS project, run `eas build --profile development` for both platforms, install dev client on the project owner's iPhone + an Android device. Document gotchas in `docs/dev-build-setup.md`.
- Add `react-native-ble-plx` (BLE) and `react-native-zeroconf` (mDNS).
- **SAP Buoy Pinger schema** (open-sourced Oct 2025): implement TypeScript decoder/encoder in `src/domain/buoyPinger.ts`. Unit tests against the public schema fixtures. This is a Course-Push bundle: course + marks + metadata + ECDSA signature.
- mDNS advertise + discover: committee boat advertises `_openracer-course._tcp.local` on WiFi; sailor app discovers and shows "Committee detected: Abersoch SC".
- BLE fallback: same bundle over BLE characteristic when WiFi isn't available (Abersoch SC has no club WiFi on the water).
- Signed bundles: generate ECDSA keypair per committee; course bundle carries signature; receiver verifies against a local trust list of committee public keys.
- First-time committee trust flow: scan QR code at the club → adds public key to trust list. **No silent trust-on-first-use.**
- UI: on `CourseEntryScreen`, if a committee broadcast is detected, a banner appears: "Abersoch Race Committee has a course for you — [Accept] [Dismiss]". One tap accept → course loads with every leg populated.
- Test with a second phone broadcasting a canned bundle. Full round-trip.

**Exit gate:**
- [ ] Two devices (both running dev builds) see each other via mDNS on shared WiFi
- [ ] Same two devices see each other over BLE with WiFi off on both
- [ ] Accepting a broadcast course populates every required leg in one tap
- [ ] Unsigned bundle is rejected with a clear error
- [ ] Signed-by-untrusted-key bundle shows "Unknown committee — scan QR to trust"
- [ ] Buoy Pinger schema unit tests pass against the fixtures
- [ ] `npm run audit` clean
- [ ] Aeroplane mode test: committee push still works (LAN/BLE only, no cell)

**Contingency:** If BLE is blocking by end-of-week, ship mDNS-only and log committee-over-BLE as a Phase-1.5 bug with severity `medium`. Do not let BLE consume week 5.

---

### Week 5 — Method 3: Drop-at-GPS + Method 4: Bearing + distance + MapLibre integration

Two easier methods + the MapLibre migration that unlocks week 6.

**Work:**
- **Method 3: Drop-at-GPS**
  - `CourseEntryScreen` leg-slot sheet gains a `📍 Drop at current GPS` action
  - Long-press = drop with custom name; short-press = auto-name ("Mark dropped 18:42")
  - Creates a `single-race-temporary` mark, auto-purged at end of race
  - Large, obvious button — this is used while sailing past a mark, one-handed
- **Method 4: Bearing + distance from reference**
  - Sheet action: `📐 Bearing + distance from…`
  - Pick reference mark from library (nearest first)
  - Input: bearing (0-360°), distance (with unit toggle: nm / m), optional name
  - Compute target coordinates via `destinationPoint()` from `geo.ts`
  - Live preview showing computed lat/lon as user types
  - Validate: bearing 0-360, distance > 0, result within 100nm of reference (sanity check)
  - Creates a `single-race-temporary` mark by default, upgradable to `race-day-recent`
- **MapLibre integration:**
  - Add `@maplibre/maplibre-react-native`
  - `src/components/Chart.tsx` — a minimal MapLibre view that renders:
    - A single MBTiles basemap (bundle a small Abersoch-area tile package as `assets/abersoch.mbtiles` for dev)
    - Boat position marker (from `useBoatStore`)
    - Course leg markers + lines
  - No interactivity yet — that's week 6
  - Android + iOS tested; offline (mbtiles) loads with no network
- Bug-sweep: any quirks from the EAS migration that have accumulated

**Exit gate:**
- [ ] Drop-at-GPS creates a mark at current coordinates within 5m of external reference
- [ ] Bearing+distance from a known mark produces the expected target (verified against an online bearing/distance calculator)
- [ ] Aeroplane-mode test: both methods work offline
- [ ] MapLibre renders Abersoch MBTiles basemap on iOS + Android with no network
- [ ] Boat position marker updates on the chart at 1Hz
- [ ] `npm run audit` clean

---

### Week 6 — Method 5: Chart tap + Method 6: Chart seamarks

Chart-dependent methods, now that MapLibre is in.

**Work:**
- **Method 5: Tap on chart**
  - `Chart` component gains gesture handling (`onPress` → lat/lon at tap)
  - Sheet action on a leg slot: `🗺️ Tap on chart` opens a full-screen chart sheet
  - Long-press on chart drops a candidate marker; short-press recentres
  - Confirm → prompts for tier (defaults to `single-race-temporary`) + optional name
  - Handles pinch-zoom, drag-pan, with bounds clamped to the downloaded tile region
- **Method 6: Chart seamarks (OpenSeaMap)**
  - Bundle OpenSeaMap seamark vector data for Abersoch area (a `.geojson` derived from OSM `seamark:*` tags — cardinals, buoys, beacons)
  - Render seamarks as tappable layer on `Chart`
  - Tap seamark → prefilled mark edit sheet (name from OSM `seamark:name`, tier auto `chart-permanent`, source `chart-seamark`)
  - Caveat: v1 ships with the bundled Abersoch seamarks only. Post-Phase-1, a background fetch tops up the user's local tile/seamark cache when on wifi. Log that as a bug/feature-gap, don't build it now.
- Decide (Thursday of week 6): is there budget left for Method 7 (point-at-mark)?
  - If yes → attempt in week 7 alongside race timer
  - If no → defer to Phase 1.5 / early Phase 2, log explicitly

**Exit gate:**
- [ ] Chart-tap creates a mark at the tapped coordinates (within visible cursor tolerance)
- [ ] Tapping an Abersoch seamark creates a `chart-permanent` mark correctly populated
- [ ] Pinch-zoom + pan perform at 30fps+ on the project owner's phone
- [ ] Aeroplane-mode test: both methods work offline with bundled tiles
- [ ] `npm run audit` clean
- [ ] Method 7 decision recorded in `docs/phase-1-plan.md` retro section

---

### Week 7 — Race timer + Start line

The other half of the exit gate. A course with no timer is half a feature.

**Work:**
- **Race timer**
  - `src/stores/useRaceStore.ts` — `RaceTimerState`, transitions: `idle → armed → counting-down → starting → running → finished`
  - `src/screens/RaceTimerScreen.tsx`:
    - `BigNumber` at monster size showing `T−5:00` → `T−0:00` → `T+0:00` ascending
    - State-based colour: amber <5 min, red <1 min, green running
    - Buttons: `Sync now` (round to nearest minute — the classic racer's move), `+1 min`, `−1 min`, `General recall (reset to T−5)`, `Abandon`
  - Foreground-safe + background-safe:
    - Timer is time-anchored (store start-of-sequence timestamp in SQLite), not tick-counted — killing the app and reopening resumes correctly
    - Local notifications at T−5, T−4, T−1, T−0 (per the standard start sequence) so the sailor hears them even if screen is off
  - Haptics at each minute transition; strong haptic + optional audio horn at T−0
  - Auto-switches `useSettingsStore.mode` to `race` when armed (ties off the Phase 0 `ModeToggle` placeholder)
- **Start line**
  - `src/domain/startLine.ts`:
    - Given the two start-line marks from the course, compute line length (m), line bearing (°T)
    - Given current GPS + SOG + COG, compute: distance-to-line (m, negative = over early), time-to-line at current SOG (s), line-bias relative to true wind (if TWS known, else hidden)
  - `src/components/StartLineReadout.tsx` — on HomeScreen during `armed` or `counting-down`:
    - Big distance-to-line number (colour-coded: red if negative, amber if within 1 boat-length, green)
    - Time-to-line number
    - Tiny line-bias indicator (shown only if wind data is present)
  - "On course side" warning — big red flash + haptic when distance < 0 inside the last minute

**Exit gate:**
- [ ] Timer armed from the Course Entry screen flows into countdown
- [ ] Killing app mid-countdown and reopening shows correct remaining time (±1 sec)
- [ ] Notifications fire at T−5, T−4, T−1, T−0 even with screen off (tested with phone locked)
- [ ] Distance-to-line verified against a known test fixture (two marks 100m apart, boat at midpoint perpendicular = 0, boat 50m behind = −50m not +50m)
- [ ] Auto-switch to Race mode when timer arms
- [ ] `npm run audit` clean
- [ ] Aeroplane-mode test: full countdown runs correctly offline

---

### Week 8 — Polish, exit-gate test, alpha ship

The week that turns eight pieces into one product.

**Work:**
- End-to-end "3-minute test" dry runs. Stopwatch in hand. VHF announcement style course. Target: ≤ 3 minutes VHF-to-timer-armed, across at least **three course templates** and **three input method mixes**. Record times, find the friction, fix it.
- If Method 7 (point-at-mark) was greenlit in week 6: implement using `expo-sensors` compass + a short triangulation (two sightings from different positions). If it doesn't converge cleanly by Wednesday, rip it out and ship without. Do not let it eat the alpha.
- Onboarding pass: first-launch state needs a minimal "welcome, grant GPS, here's your library" flow. No accounts, no upsell. Thirty seconds to first course.
- Empty-state audit: every screen has a useful empty state
- Error-state audit: no raw stack traces reach the sailor; friendly messages everywhere
- `README.md` updated with the Phase 1 feature list
- Tag `v0.2.0-phase1`
- Build a signed internal distribution via `eas build --profile preview` for both iOS (TestFlight) and Android (APK)
- Write `docs/alpha-tester-guide.md` — single page, what to test, how to report a bug (GitHub issue template linked)
- Ship the alpha to three Abersoch sailors by Friday of week 8

**Phase 1 exit gate (overall):**
- [ ] **3-minute rule:** VHF-style course built and timer armed in ≤ 3 minutes, verified on at least 5 timed runs across different templates, all offline
- [ ] All seven input methods demonstrable on device (or Method 7 formally deferred to Phase 1.5)
- [ ] Committee-push round-trip works between two real devices
- [ ] Race timer runs a full T−5 to T+0 cycle accurately with phone locked
- [ ] Start-line readout passes the +/- sign test
- [ ] `npm run audit` clean
- [ ] 100% aeroplane-mode run of the 3-minute exit test
- [ ] TestFlight build + Android APK in three alpha testers' hands
- [ ] `docs/bugs.md` has no `critical` or `high` rows unresolved
- [ ] At least 40 atomic commits over the 8 weeks, conventional format

---

## Out of scope for Phase 1 — DO NOT BUILD

**If any of these are asked for during Phase 1, push back with: "that's Phase N scope, want me to add a note?"**

- **Full chart interactions** — only the minimum for tap + seamark. No routing, no measurement tools, no chart layers, no multi-basemap support. Phase 2.
- **Polars, VMG, laylines** — Phase 2. Do not compute these yet.
- **Track logging / session recording** — Phase 2. The timer creates a session row, but nothing is logged against it yet.
- **Gust detection, tactical nudges** — Phase 4.
- **AI debrief, Q&A, any Claude API / Llama model** — Phase 4-5.
- **Navigation-mode features** (MOB, anchor alarm, waypoint nav, routes, depth alarm, night mode) — Phase 3. Cruise mode is still a placeholder.
- **Weather** — no Open-Meteo, no forecast display. Wind is only referenced for start-line bias, and if TWS is unavailable the bias readout hides itself.
- **Tidal** — no XTide, no UKHO. Phase 3.
- **AIS** — Phase 3 (basic) / post-v1 (full).
- **Pi / Tier 2 / Tier 3** — Phase 6 onwards.
- **MCP server, Open API** — Phase 8.
- **Boat learning, personal polar adjustment** — Phase 9.
- **User accounts, auth, cross-device sync** — later. Local-only for alpha.
- **Settings screens beyond unit toggle + committee key management** — later.
- **App Store / Play Store submission** — Phase 11. Alpha ships via TestFlight + APK only.
- **Live fleet tracking, live AIS, live coaching** — these are constant-connection features and are not in scope for v1's race flow even when signal is present. Stub the purpose, don't build.
- **Multi-language** — `en-GB` only.
- **Custom icons / branding / splash** — minimal polish only; real brand treatment in Phase 10.

## Dependencies added this phase

Flag every one of these in a commit message before installing:

| Package | Why | Week |
|---|---|---|
| `tamagui` + `@tamagui/core` | UI library, locked in `decisions.md` | 1 |
| `@react-navigation/native` + `@react-navigation/stack` | Multi-screen nav | 2 |
| `react-native-ble-plx` | Committee-boat BLE | 4 |
| `react-native-zeroconf` | Committee-boat mDNS | 4 |
| `expo-crypto` | ECDSA verification for signed bundles | 4 |
| `expo-notifications` | Race-timer notifications | 7 |
| `expo-haptics` | Timer / OCS haptics | 7 |
| `@maplibre/maplibre-react-native` | Chart | 5 |
| `expo-sensors` | Compass for point-at-mark, if built | 8 |

No other deps without prior flag.

## Bug & decision discipline continues

- Every bug discovered gets a B-### row in `docs/bugs.md` (B-009 onwards — never reuse numbers)
- Architectural decisions made during the phase get appended to `docs/decisions.md` with a date stamp
- Week-by-week retrospective notes appended at the bottom of this file under "Retro"

## Risks & open questions — flag before starting

1. **MapLibre pulled forward from Phase 2** — deliberate, but it's the single biggest native dependency and can absorb more time than budgeted if Android tile loading misbehaves. Mitigation: bundled MBTiles, no network tiles in Phase 1.
2. **BLE + mDNS in week 4 is the tightest week.** Committee-boat push is the feature that differentiates us. If week 4 overruns, the cascade is painful. Mitigation: the contingency plan above (ship mDNS-only + log BLE as bug).
3. **Point-at-mark (Method 7) is genuinely hard.** Compass accuracy on consumer phones is poor; triangulation needs two sightings from different positions. Mitigation: explicit go/no-go Thursday of week 6.
4. **The 3-minute claim must survive first contact with a sailor who isn't us.** Solo dev testing always clocks faster than a first-time user under VHF time pressure. Mitigation: week 8 alpha with Abersoch sailors — if one of them can't hit 3 min, that's the actionable feedback for Phase 1.5.
5. **Tamagui migration regresses Phase 0 visuals** — low probability but detectable. Mitigation: week 1 visual-parity gate before moving on.
6. **Xcode + Android Studio setup eats week 4.** Mitigation: do a setup spike in the first day of week 4, separate from feature work, and log issues in `docs/dev-build-setup.md`.

## Recommended commit cadence

Eight weeks, aim for ≥ 40 atomic commits (5+/week). If a week ends with only 1-2 commits, the work wasn't broken down enough.

## When Phase 1 is done

State clearly: "Phase 1 complete. Exit gate met (3-min course entry + timer armed, all offline). Alpha in X testers' hands. Awaiting green light to propose Phase 2 plan."

Then stop. Let the Abersoch feedback arrive. Open a fresh session for Phase 2 once there's real data to plan against.

## Parking lot — ideas raised mid-phase

Not in Phase 1 scope; captured so they aren't lost.

- **Visual course builder on the chart** (post-MapLibre). Tap the chart to
  place legs in sequence, drag to reorder, long-press a rounding mark to
  swap port/starboard. Replaces text-and-lists UX with a sea-chart-as-
  canvas pattern. **Natural home:** end of Phase 2 or a Phase 2.5
  delivery once chart tile + seamark layers are in.
- **"Point at mark" via compass + triangulation** (Method 7 in the spec).
  The sailor stands on the boat, points the phone at the mark, taps; phone
  records the compass bearing. Move 50m away, point again, tap. App
  triangulates the two bearings to fix the mark's position. Already listed
  as Method 7 with a go/no-go gate in Week 6; this memo reaffirms James
  wants it built rather than dropped. **Natural home:** Week 6-8 per the
  existing plan; if it slips, revisit once MapLibre is in so we can
  visualise the two bearing lines on the chart and show the triangulated
  fix point before committing.
- **Photo-of-course-board OCR**. Take a photo of the committee-boat
  course sheet and let the app parse it into a populated course (course
  code / mark IDs + rounding). Realistic path: on-device OCR via Vision
  Kit (iOS) + ML Kit (Android) extracts text; a parser maps "1 to 4 to 2
  to 4 to finish" or "W-L, Y → R (P)" into mark references against the
  library. Useful when committees don't broadcast and the sailor has
  30 seconds before the five. **Natural home:** a Phase 4-5 delivery
  once AI/Claude integration is wired — or sooner as a deterministic
  parser if committees use a consistent format.
- **Start-line type selector + rabbit-start support**. Today a start leg
  is simply "two marks" and the code has no opinion about which is the
  committee boat vs the pin end. Week 7 delivers distance-to-line +
  OCS warning, which requires the geometry to be explicit. Planned shape:
  a `startType` field on the course — `standard-line` (2 marks: CB
  starboard-end, pin port-end by ISAF convention), `rabbit` (1 moving
  mark; sailor must be behind the rabbit boat's stern at the gun), and
  `gate` (2 gate marks, same geometry as a downwind gate). UX: a
  single pill selector on the course-entry start leg that swaps the
  slot count and labels. **Natural home:** Week 7 — the timer needs to
  know. For now we treat the slot-1 mark as CB and slot-2 as pin; that
  matches club convention and is forward-compatible.

Both features get their own phase-plan entries when we get there; these
notes are just pointers.

## Retro (to be appended as we go)

_(Week-by-week notes land here during the phase, not upfront.)_
