# Phase 1.8 — Dashboard catalogue

**Duration:** ~2 days
**Build system:** **Expo Go** — pure-JS, ships via EAS Update.
**Why this exists:** project owner's two reinforcing notes — "we will
have wind, VMG, etc. different displays" and "screen space is very
important" — point at one architecture: a **dashboard catalogue**
with a swipe selector. Each dashboard takes the whole screen, no
shared chrome stealing pixels. Phase 1.7 shipped the first dashboard
(Helm Display Mode); this phase generalises that into a system and
adds three more.

The same architecture is what Phase 7 e-ink displays will consume:
phone or Pi configures *which* dashboard to render on each display;
the e-ink driver just renders. So building the catalogue properly
now pays back later.

## In scope

### 1.8.1 — Dashboard interface + registry

A typed contract every dashboard implements. Each dashboard exports:

```ts
interface DashboardDefinition {
  id: string;            // 'race-countdown' | 'wind' | 'vmg' | 'big-numbers'
  name: string;          // displayed in selector + breadcrumb
  category: 'race' | 'cruise' | 'tactical';
  /** Render the dashboard. The dashboard reads from stores directly
   *  (useBoatStore, useRaceStore, useSettingsStore, useCoursesStore)
   *  so it can run inside the catalogue without prop-passing every
   *  variable. */
  Component: React.FC<{ variant: ThemeVariant }>;
  /** When true, the dashboard is only available in race mode (timer
   *  armed). Race-only dashboards are hidden from the cruise picker. */
  raceOnly: boolean;
  /** When true, only available in cruise mode. */
  cruiseOnly: boolean;
}
```

A central `dashboardCatalogue` array exports the full ordered list.
Adding a 5th dashboard is a one-line append.

### 1.8.2 — Refactor HelmDisplayLayout → RaceCountdownDashboard

Same component, same render. Renamed + repackaged as a
`DashboardDefinition`. `id: 'race-countdown'`, race-only.

### 1.8.3 — WindDashboard

The wind-shift bar promoted to a full screen, plus:
- Current estimated TWA (from manualTrueWindDegrees - boat.cog).
- Estimated TWS (from manualTrueWindKn).
- A simple compass-rose-style indicator showing TWD relative to boat
  heading.
- Wind shift bar at the bottom, full-width.
- Honest "no wind direction set" message when manualTrueWindDegrees
  is null.

Read-only. No controls. Tap-and-hold returns to the dashboard
selector. Renders identically in day / night / kindle.

### 1.8.4 — VMGDashboard

Polar performance dashboard:
- TARGET boatspeed (from polar) + ACTUAL (SOG) — top half.
- VMG (`SOG × cos(TWA in radians)`) — middle.
- % OF TARGET — bottom half, with a simple bar.
- "No polar set" fallback when polarRaw is null.

### 1.8.5 — BigNumbersDashboard

The dirt-simple cockpit speedometer. Just SOG (huge) + COG (big)
filling the whole screen. No timer, no course, nothing else. The
view a sailor wants when they don't care about anything but "how
fast and which way?". Available in both race and cruise modes.

### 1.8.6 — DashboardSelector + swipe nav

The container component that holds the catalogue:
- Top strip: current dashboard name + small chevrons (◀ ▶) +
  small "•••" tap-to-open list.
- The active dashboard fills the rest of the screen.
- Horizontal swipe gesture cycles between dashboards (filtered by
  the current mode — race / cruise).
- Last-shown dashboard id persists per mode in useSettingsStore.

### 1.8.7 — Wire into RaceTimerScreen + Home

- Race Timer's existing "Helm display" toggle now opens the
  DashboardSelector (race mode) instead of just one layout.
- HomeScreen gains a "◐ Cruise display — wind / VMG / big numbers"
  link in cruise mode (no race armed). Routes to a new
  CruiseDisplayScreen that wraps the selector in cruise mode.
- `lastRaceDashboardId` + `lastCruiseDashboardId` persist per mode
  in useSettingsStore — re-entering the catalogue lands on the
  last view shown for that mode.

## Out of scope for Phase 1.8

- **Cruise mode dashboard slot on Home** — bigger refactor; Phase
  1.9. Cruise sailors get the dashboards via a "Cruise display"
  link on Home for now.
- **Live tide / weather dashboard** — needs Phase 2 charts +
  XTide harmonic data ingest.
- **Pi e-ink rendering** — Phase 7. The catalogue architecture is
  shaped for it; the renderer comes later.
- **Custom user dashboards** (drag-drop widgets) — Phase 9+ once
  AI-driven debrief learns sailor preferences.

## Phase 1.8 exit gate

- [x] Dashboard catalogue exports 4 dashboards (countdown, wind,
      VMG, big-numbers).
- [x] Project owner can swipe between race-mode dashboards from the
      Race Timer's helm display toggle.
- [x] Each dashboard renders cleanly in day / night / kindle.
- [x] CruiseDisplay reachable from Home in cruise mode.
- [x] Per-mode last-shown id persisted in useSettingsStore.
- [x] `npm run audit` clean.
- [x] EAS Update bundle published.

---

## Retro — 2026-04-25 (resumed after Phase 1.11 polish)

Phase 1.8 was paused mid-spec back in March to ship the more concrete
crew-sync work (1.9 → 1.11). Picked it back up after 1.11 went out.

**Shipped:**

- ✅ `src/dashboards/types.ts` — `DashboardDefinition` contract +
  `dashboardsForMode` filter (4 unit tests).
- ✅ `RaceCountdownDashboard` — rebuilt from HelmDisplayLayout's
  shape but reading from stores directly (no prop drilling). 180-pt
  countdown + state label + secondary readout.
- ✅ `WindDashboard` — TWA + tack side + point-of-sail label
  (close-hauled / beam reach / etc.) + TWS / TWD numbers. Wind shift
  bar pinned at the bottom.
- ✅ `VMGDashboard` — TARGET (polar) / ACTUAL (SOG) / VMG numbers
  stacked vertically + percent-of-target bar. Honest empty-state
  when polar or wind is missing.
- ✅ `BigNumbersDashboard` — SOG (220-pt) + COG (120-pt). Respects
  user speed-unit setting (kn / kmh / mph). Simplest fallback.
- ✅ `DashboardSelector` — chrome strip with chevrons, dashboard
  name + N/total counter, "•••" inline picker, horizontal swipe to
  cycle, long-press for exit affordance.
- ✅ Wired into RaceTimerScreen → race-mode catalogue replaces the
  single-view helm-mode branch; persists `lastRaceDashboardId`.
- ✅ New `CruiseDisplayScreen` reachable from Home (cruise mode
  only); persists `lastCruiseDashboardId`.

**Architecture decisions worth keeping:**

- **Each dashboard reads from stores directly** — keeps the
  catalogue declarative (no big switch on dashboard id passing
  props down). Adding a fifth dashboard is a one-line append to
  `dashboardCatalogue`.
- **PanResponder, not Reanimated** — for a swipe-to-cycle gesture,
  the built-in `PanResponder` is sufficient and adds nothing to
  the bundle. Reanimated stays reserved for the chart renderer
  (Phase 2).
- **Long-press exit at the container, not per-dashboard** — the
  dashboard component never has to know about exit, which keeps
  the contract simple.

**Unchanged (deliberately):**

- The legacy `HelmDisplayLayout` component is left in place and
  un-imported. Will be deleted in Phase 1.8.1 cleanup once we're
  sure the dashboard catalogue is the right shape.

**What this enables:**

- Dad helms upwind on Pantera. Phone's mounted. He swipes once →
  Wind dashboard. He sees +6° lift on the bar, eases the sheet.
  Swipes back → Race countdown for the start gun.
- A delivery cruise: open cruise display, leave it on big-numbers
  the whole way. SOG and COG fill the screen, easy to read at a
  glance from the helm.
- Phase 7 e-ink port: the same `DashboardDefinition` contract is
  what the Pi will render. Each Kindle gets one dashboard pinned;
  the catalogue is the configuration surface.

**Phase placement next:**

Phase 2 (charts) is still gated on Apple Developer Program £79.
Other Phase 1.x candidates that don't need either:

- Per-leg timer (start of each leg → "leg 2 sailed in 4:32").
- Voice race-officer cues (audio: "3 minutes — 2 minutes — gun!").
- Wind shift trend graph (history of computed shifts over the race).
- Boat-leaderboard share (post-race QR with boats + finish times).
