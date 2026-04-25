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

### 1.8.7 — Wire into RaceTimerScreen + Settings

- Race Timer's existing "Helm display" toggle now opens the
  DashboardSelector instead of just one layout. First swipe goes
  to the next race-mode dashboard.
- Settings → Display gains a "Default dashboard (race / cruise)"
  pair of pickers. Sets which dashboard is active when the sailor
  enters helm mode.

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

- [ ] Dashboard catalogue exports 4 dashboards (countdown, wind,
      VMG, big-numbers).
- [ ] Project owner can swipe between race-mode dashboards from the
      Race Timer's helm display toggle.
- [ ] Each dashboard renders cleanly in day / night / kindle.
- [ ] Settings → Default dashboard picker remembers per mode.
- [ ] `npm run audit` clean.
- [ ] EAS Update bundle published.

## Sequencing

- **Hour 1**: 1.8.1 interface + registry skeleton.
- **Hour 2**: 1.8.2 refactor HelmDisplayLayout → RaceCountdown.
- **Hour 3**: 1.8.3 WindDashboard.
- **Hour 4**: 1.8.4 VMGDashboard + 1.8.5 BigNumbers.
- **Hour 5**: 1.8.6 selector + swipe.
- **Hour 6**: 1.8.7 wire-in + settings + audit + commit + EAS.
