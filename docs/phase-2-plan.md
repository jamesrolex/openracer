# Phase 2 — Chart, laylines, tide, post-race replay

**Duration:** 6 weeks
**Build system:** **EAS dev build** (Phase B trigger pulled).
**Goal:** ship a chart view a sailor can use both pre-race (visual
course building, lay-line eyeballing, tide picture) and post-race
(track replay on a recognisable map of Cardigan Bay). The phase
ends when a 2-hour race can be planned, raced, and debriefed
without ever being online.

## Why this phase exists

Phase 1 + 1.5 turned OpenRacer into a working racing tool. But
every screen is a numbers + lists view. Sailors are visual
thinkers — particularly the project owner. The competitor
research (`/Research/OpenRacer - Navionics Competitor Deep-
Dive.md` in the vault) confirmed the gap: every other racing app
ships a chart view. Without one we can't:

- Show the course as a map (the most-asked feature)
- Drop marks by tap-on-chart (Methods 5 + 6 deferred from Phase 1)
- Render lay lines (the tactical feature that turns "I think I
  can fetch" into "I can fetch")
- Show tidal current (the single most-praised Navionics feature)
- Replay a race for post-race debrief (the abandoned-RaceQs gap)

We've stretched as far as it makes sense to without charts. Time
to ship them.

## What "done" looks like

- Open the app in airplane mode at Abersoch. Tap **Chart**. A
  recognisable nautical chart of Cardigan Bay loads in <2 s.
- Build a course by tapping marks directly on the chart. Drag a
  mark to reposition. Reorder rounding legs by drag.
- During a race, the chart shows boat position + course marks +
  live track. Lay lines render to the windward mark in both tacks
  using the manual-tack-angle setting.
- An animated tide overlay shows current direction + magnitude
  across the chart, scrubable forward in time.
- After a race, open Race History → tap a session → see the full
  track plotted on the chart with mark crossings.
- Everything works without cellular. MBTiles for the home venue
  ship inside the app bundle.

## Build-system migration — EAS dev build

The single biggest change. Expo Go can't load MapLibre. Migration
plan (Week 1):

1. Sign up for the **Apple Developer Program** (£79/year). Already
   discussed; pull the trigger now.
2. `npx eas-cli credentials` — set up iOS provisioning.
3. `eas build --profile development --platform ios` — first dev
   build. ~25 min queue.
4. Install on the project owner's iPhone via TestFlight or
   ad-hoc. Confirm everything from Phase 1.5 still works.
5. From this point onward the project owner runs OpenRacer like
   any normal app on their phone — icon on home screen, no Expo
   Go. The `eas update` cloud bundle continues to work for OTA
   JS-only updates.

Android can wait — the project owner is on iPhone and there's no
Android dogfood loop yet. Pi distribution (Phase 6) will deal
with Android.

## In scope — by week

### Week 1 — EAS dev build + MapLibre install

- Apple Developer signup, iOS provisioning, first dev build on the
  project owner's phone.
- `npx expo install @maplibre/maplibre-react-native` and any
  required peer deps.
- Re-audit: every test still green; doctor still clean.
- Smoke-test: render a single static `MapView` with a default
  basemap from the Internet (pre-offline).
- **Acceptance:** dev build installed; MapView renders on device.

### Week 2 — Abersoch MBTiles + offline basemap

- Source an offline-friendly chart of Cardigan Bay. Two viable
  paths:
  - **OpenSeaMap MBTiles export** — community-maintained, free,
    nautical detail (depths, light sectors, seamarks).
  - **UKHO admiralty-derived MBTiles** — copyright-restricted,
    requires a licence for redistribution. Not viable for an
    open-source project.
- Bundle MBTiles into the app via `expo-asset` or a static
  manifest. Total bundle size ≤ 30 MB after compression.
- New `<NauticalMapView>` component wraps `MapLibre` with
  Abersoch defaults (zoom level, centre, attribution overlay).
- **Acceptance:** chart of Cardigan Bay renders in airplane mode.
  Boat marker (driven by `useBoatStore.position`) tracks on the
  chart at 1 Hz.

### Week 3 — Course on chart + live race track

- Render every mark in the active course as a tappable icon on
  the chart, colour-coded by tier.
- Draw the course route — solid line for windward/leeward legs,
  dashed for reach, gates as paired pins.
- During an active race (`useRaceStore.activeSessionId`), append
  each track point to a live polyline overlay at 1 Hz.
- Course strip remains as a fallback view for tablet-style
  presentation.
- **Acceptance:** during a Phase 1.5 race-timer dogfood, the
  chart updates at 1 Hz with no jank.

### Week 4 — Methods 5 + 6 (chart-tap drop + chart-tap seamark)

- **Method 5 — drop-at-chart-tap.** From `MarkLibrary` or
  `CourseEntry`, tap "Add mark" → "Pick on chart" → tap any
  point → mark is created at that latitude/longitude.
- **Method 6 — chart-tap seamark.** Tap an OpenSeaMap-rendered
  seamark (lateral buoy, cardinal mark) → app reads the lat/lon
  + name from the basemap → adds a `chart-permanent` mark.
- Both methods run in airplane mode using the bundled MBTiles.
- **Acceptance:** All seven course-entry methods now work
  (Methods 1-4 + 7 from Phase 1, plus 5 + 6 here). Phase 1
  exit-gate "all seven methods demonstrable" finally closes.

### Week 5 — Visual route mapper / drag-and-drop course builder

The feature the project owner asked for explicitly during the
yacht-club demo conversation.

- New screen / mode: tap-and-hold on the chart spawns a numbered
  rounding leg at that point. Drag to reposition.
- Long-press on a leg pin opens a sheet: change rounding (P/S),
  delete leg, change leg type.
- Reorder legs by drag (existing `react-native-gesture-handler`
  + a simple list reorder).
- This is the "build a course like you're drawing on the chart"
  paradigm. Replaces the slot-by-slot list flow for new courses;
  the list flow stays as a fallback for keyboard-only use.
- **Acceptance:** a sailor can build a windward-leeward course
  on chart in under 30 seconds (matches the Phase 1 30-second
  benchmark).

### Week 6 — Lay-line overlay + tidal current arrows

Two related features that share the chart-overlay infrastructure.

**Lay-line overlay:**
- Read `manualTackAngle` (new setting, default 88° for the
  project owner's boat).
- Read true wind direction from existing `manualTrueWindDegrees`.
- Compute port + starboard layline bearings to the active
  windward mark.
- Render as faint dashed lines on the chart from the windward
  mark.
- Hidden if either input is missing.

**Tidal current overlay:**
- Embed XTide harmonic constants for Cardigan Bay tide stations
  (public domain).
- Compute current direction + magnitude at a grid of points
  across the chart at the current time (or a scrub time).
- Render as small arrows. Magnitude → arrow length.
- Time scrubber along the bottom of the chart for "what's the
  tide doing in an hour?"
- **Acceptance:** Tide arrows match the Cardigan Bay tide tables
  for the next 6 hours within 10° / 0.2 kn.

### Bonus / stretch — Polars + VMG

Slot at the end of Week 6 if there's time. Not committed.

- Add `polarTable` to settings — user pastes their boat's polar
  (TWS × TWA → target boatspeed table) or picks an ORC class
  default.
- During a race, show "Target: 6.2 kn @ TWA 45°" alongside SOG.
- Compute VMG from SOG + heading + TWA when polar exists.
- Hide all of this if no polar is set.

If this slips, it becomes Phase 2.5 alongside post-race debrief.

## Out of scope for Phase 2

- **AI debrief / "why did we lose"** — Phase 4. Needs a server
  side and a different effort level.
- **Multi-crew yacht-data sync** — Phase 4.5.
- **Apple Watch race-timer mirror** — Phase 2.5; needs the dev
  build but is its own stack.
- **Rabbit Option C live broadcast** — Phase 4.5 with the BLE
  peer-sync.
- **Weather GRIB overlay** — Phase 3 / 4.
- **AIS** — Phase 3 (basic) / post-v1 (full).
- **Live wind shift bar** — depends on stable AWA estimation;
  defer to a later phase.
- **MCP server / Open API** — Phase 8.

## Dependencies added this phase

| Package | Why | Week |
|---|---|---|
| `@maplibre/maplibre-react-native` | Chart rendering | 1 |
| `@mapbox/mbtiles` (or equivalent) | MBTiles loader | 2 |
| `xtide-js` (or a hand-rolled harmonic computation) | Tidal current data | 6 |

No other deps without prior flag.

## Risks + mitigations

1. **EAS dev build gotchas.** First time setting up Apple
   provisioning. Could eat a day if push-notification
   entitlements or location-when-in-use background modes need
   tweaking. **Mitigation:** start of week 1, not deferred.
2. **MBTiles size.** Cardigan Bay at zoom 12-15 with seamarks is
   probably 15-25 MB. App bundle stays manageable. If it doesn't,
   ship as a downloadable asset post-install (1-time download
   over WiFi at the club).
3. **MapLibre performance on iPhone.** Pinch-zoom + pan should be
   60 fps on a recent phone. If it stutters with a live boat
   marker + a track polyline of 7,000 points, batch the polyline
   into segments and decimate older points.
4. **XTide data freshness.** Harmonic constants are
   long-stable but new tide stations occasionally publish.
   **Mitigation:** ship a snapshot, document how to refresh.
5. **Chart-tap accuracy.** A finger covers ~10 mm; at zoom 14
   that's ~5 m of latitude. Sufficient for a windward mark to
   ±5 m, not for a navigation hazard. **Mitigation:** snap to
   nearest seamark when one is within 30 m of the tap.

## Phase 2 exit gate (overall)

- [ ] Project owner runs OpenRacer as an installed app on his
      iPhone (no Expo Go in the loop).
- [ ] Builds a course on the chart in ≤ 30 s.
- [ ] Lays a 2-hour race start-to-finish in airplane mode with the
      chart up the whole time, no crashes, no battery panic
      (≥ 60% battery remaining after 2 hours).
- [ ] Track replays cleanly on the chart in Race History.
- [ ] Tide arrows visible + match the Cardigan Bay tide tables.
- [ ] Lay lines render on the chart to the active windward mark.
- [ ] All seven course-entry methods demonstrable on device.
- [ ] `npm run audit` clean (typecheck, jest, lint, expo-doctor
      including any new MapLibre-specific checks).
- [ ] Updated `docs/spec-summary.md` with the chart features.

## How we track progress

- One commit per visible feature, atomic + conventional.
- Push after each commit.
- Append a one-line bullet to `Projects/OpenRacer.md` in the
  vault at each weekly checkpoint.
- Bug log discipline continues — every quirk into `docs/bugs.md`.

## Pivot triggers

- MapLibre proves unworkable on iPhone (extremely unlikely): swap
  to `react-native-maps` with raster tiles only. Lose seamark
  data; gain stability.
- Apple Developer signup gets stuck for >3 days: pause Phase 2,
  ship more Phase 1.5 polish via EAS Update until sorted.
- A real Wednesday-night race surfaces a critical Phase 1.5 bug:
  fix it first, then resume Phase 2 work.
