# OpenRacer roadmap

## v1 — the racing app

56 weeks, 11 phases, from scaffold to community launch. Tier 3 hardware defers to post-v1 per `docs/decisions.md`.

| Phase | Weeks | Theme | Deliverable | Build system |
|---|---|---|---|---|
| **0** | 1-2 | Skeleton & offline foundations | Expo app, live GPS, aeroplane-mode works | Expo Go |
| **1** | 3-10 | Course entry hero + race timer + start line | Full race in 3 min course-to-start, offline | Expo Go → EAS dev build (BLE committee push) |
| **2** | 11-14 | Chart upload, polars, VMG, track logging | Full race start-to-finish logged offline | EAS dev build (MapLibre) |
| **3** | 15-18 | Navigation mode v1 + tidal + weather | MOB, anchor, waypoint, route work offline | EAS dev build |
| **4** | 19-24 | AI debriefs + gust-aware nudges | 30s online / 3min offline debrief; live gust alerts | EAS dev build |
| **5** | 25-28 | Natural-language Q&A | "Why did we lose?" works online + offline | EAS dev build |
| **6** | 29-34 | Pi distribution + auto-discovery wizard | Pi detects NMEA, installs unattended | EAS dev build + Pi (OpenPlotter) |
| **7** | 35-42 | Tier 2 display orchestrator | Multi-Kindle in race, nudge tuning | EAS dev build + Pi |
| **8** | 43-46 | MCP server (read-only) + Open API (read-only) | Claude Desktop queries session resources; REST+WS mirror of SignalK | EAS dev build |
| **9** | 47-52 | Boat learning + venue heuristics | Personal polar diverges from published after 10 sessions | EAS dev build |
| **10** | 53-54 | Hardening, beta polish, store-prep | Store listings drafted, crash-free rate > 99.5% | EAS dev build |
| **11** | 55-56 | Docs, packaging, community launch | GitHub release, App Store + Play Store live, first external contributor | **EAS production build** |

### Phase exit gates

Each phase has explicit exit criteria before moving on:

- **Phase 0:** GPS in aeroplane mode on iOS + Android, tests pass, typecheck clean
- **Phase 1:** VHF-announcement-to-start-timer-armed under 3 min, all offline
- **Phase 2:** 2-hour race logged start-to-finish with no network
- **Phase 3:** MOB + anchor + waypoint + route functional offline
- **Phase 4:** Gust detection 90%+ accurate on recorded sessions; cloud debrief under 30s; **Phase-4 device spike passes** (see `docs/decisions.md` "Local AI" section)
- **Phase 5:** Ten Q&A queries answered correctly online + same set offline
- **Phase 6:** Pi auto-detects common NMEA devices (B&G, Raymarine, Garmin) unaided
- **Phase 7:** Two Kindles + phone orchestrated in a real race
- **Phase 8:** Claude Desktop successfully reads a session resource via MCP; Open API returns a valid SignalK-shaped response
- **Phase 9:** Boat learning visibly improving recommendations on the project owner's data
- **Phase 10:** Crash-free rate > 99.5% on two weeks of beta use; store listings approved internally
- **Phase 11:** App Store + Play Store live; first external contributor PR merged

### Two ship moments

**Week 10 — alpha to Abersoch SC.** End of Phase 1. Course entry in under 3 minutes from VHF announcement, ugly but functional. Three real sailors race with it mid-season. Their feedback reshapes Phases 2-11.

**Week 56 — community launch.** End of Phase 11. App Store + Play Store live, open-source repo public, first external contributor.

## Post-v1 — the cruising platform + Tier 3 hardware

Sketched in spec Part 11. Not committed. A decision point after v1 launches, based on:

- Did v1 land? Is there a user base?
- Does the team exist to sustain ~80 more weeks?
- Does the market want this, or are the cruising users served by OpenCPN + Navionics?
- Did a hardware collaborator join, unlocking Tier 3?

| Phase | Weeks | Theme |
|---|---|---|
| 10.5 | 16w | **Tier 3 hardware kit + IP68 hardening** (deferred from v1) |
| 12 | 12w | Cruising extension: advanced waypoints, full routes, passage logs |
| 13 | 8w | GRIB + weather overlay + basic weather routing |
| 14 | 10w | Full AIS with CPA/TCPA, AIS-SART, DSC |
| 15 | 8w | NMEA 2000 full bus: engine, tanks, battery |
| 16 | 6w | Autopilot bridge via PyPilot |
| 17 | 12w | S-57 vector + oeSENC support (compete with OpenCPN) |
| 18 | 8w | Voyage features: logbook, float plan, crew |
| 19 | 6w | Satellite comms integration |
| 20 | 4w | Commercial marine features, fleet management |
| 21 | 6w | **MCP + Open API write endpoints + webhooks** (deferred from v1) |

Total post-v1: ~96 weeks if everything shipped.

## Strategic questions before Phase 10.5 and Phase 12

Relevant at week ~55, not now:

- Is the racing user base from v1 big enough to fund hardware + cruising development?
- Free tier or paid tier for cruising features?
- Is UKHO commercial chart licensing worth the cost?
- Do we have the team — especially a hardware collaborator for Tier 3?
- Has Navionics / OpenCPN / Raymarine shipped something that changes the calculus?

## How we track progress

- Each phase gets its own plan document (`docs/phase-N-plan.md`) with detailed task breakdown
- Each phase plan is written at the START of the phase, not upfront (scope shifts as we learn)
- Phase 0 plan already exists as the template: `docs/phase-0-plan.md`
- Each phase closes with a retrospective note appended to the plan doc
- Bugs go in `docs/bugs.md`; out-of-scope ideas go in the relevant phase plan or a GitHub issue

## Pivot triggers

Explicit list of reasons we'd re-plan mid-phase:

- A core technology choice proves unworkable (unlikely — we've picked conservatively)
- Real sailor feedback at Abersoch SC fundamentally contradicts an assumption
- A competitor ships something that makes our hero feature redundant
- A key data source (UKHO, Open-Meteo, etc.) changes terms
- Phase 4 device spike fails — local AI UX must be redesigned before the screen is built
- Project owner's life circumstances change such that the timeline must shift

Small scope tweaks are normal; full pivots are rare and deliberate.
