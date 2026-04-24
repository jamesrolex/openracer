# OpenRacer roadmap

## v1 — the racing app

60 weeks, 11 phases, from scaffold to community launch.

| Phase | Weeks | Theme | Deliverable |
|---|---|---|---|
| **0** | 1-2 | Skeleton & offline foundations | Expo app, live GPS, airplane-mode works |
| **1** | 3-10 | Course entry hero + race timer + start line | Full race in 3 min course-to-start, offline |
| **2** | 11-14 | Chart upload, polars, VMG, track logging | Full race start-to-finish logged offline |
| **3** | 15-18 | Navigation mode v1 + tidal + weather | MOB, anchor, waypoint, route work offline |
| **4** | 19-24 | AI debriefs + gust-aware nudges | 30s online / 3min offline debrief; live gust alerts |
| **5** | 25-28 | Natural-language Q&A | "Why did we lose?" works online + offline |
| **6** | 29-34 | Pi distribution + auto-discovery wizard | Pi detects NMEA, installs unattended |
| **7** | 35-42 | Tier 2 display orchestrator | Multi-Kindle in race, nudge tuning |
| **8** | 43-46 | MCP server + Open API + webhooks | Claude Desktop queries; third-party webhooks |
| **9** | 47-52 | Boat learning + venue heuristics | Personal polar diverges from published after 10 sessions |
| **10** | 53-56 | Tier 3 hardware kit + IP68 hardening | First Tier 3 boat racing |
| **11** | 57-60 | Docs, packaging, community launch | GitHub release, first external contributor |

### Phase exit gates

Each phase has explicit exit criteria before moving on:

- **Phase 0:** GPS in aeroplane mode on iOS + Android, tests pass, typecheck clean
- **Phase 1:** VHF-announcement-to-start-timer-armed under 3 min, all offline
- **Phase 2:** 2-hour race logged start-to-finish with no network
- **Phase 3:** MOB + anchor + waypoint + route functional offline
- **Phase 4:** Gust detection 90%+ accurate on recorded sessions; cloud debrief under 30s
- **Phase 5:** Ten Q&A queries answered correctly online + same set offline
- **Phase 6:** Pi auto-detects common NMEA devices (B&G, Raymarine, Garmin) unaided
- **Phase 7:** Two Kindles + phone orchestrated in a real race
- **Phase 8:** Claude Desktop successfully completes an `analyze_session` via MCP
- **Phase 9:** Boat learning visibly improving recommendations on the project owner's data
- **Phase 10:** First Tier 3 hardware kit survives a full season on a test boat
- **Phase 11:** First external contributor PR merged

### First shippable alpha

**Week 10 (end of Phase 1).** This is important.

By end of Phase 1, the app does one thing better than any commercial competitor: course entry in under 3 minutes from VHF announcement. We ship this to Abersoch SC as an alpha — ugly, missing features, but it nails the hero feature. That's the moment OpenRacer becomes a real project, not just a spec.

## Post-v1 — the cruising platform

Sketched in spec Part 11. Not committed. A decision point after v1 launches, based on:

- Did v1 land? Is there a user base?
- Does the team exist to sustain 74 more weeks?
- Does the market want this, or are the cruising users served by OpenCPN + Navionics?

| Phase | Weeks | Theme |
|---|---|---|
| 12 | 12w | Cruising extension: advanced waypoints, full routes, passage logs |
| 13 | 8w | GRIB + weather overlay + basic weather routing |
| 14 | 10w | Full AIS with CPA/TCPA, AIS-SART, DSC |
| 15 | 8w | NMEA 2000 full bus: engine, tanks, battery |
| 16 | 6w | Autopilot bridge via PyPilot |
| 17 | 12w | S-57 vector + oeSENC support (compete with OpenCPN) |
| 18 | 8w | Voyage features: logbook, float plan, crew |
| 19 | 6w | Satellite comms integration |
| 20 | 4w | Commercial marine features, fleet management |

Total post-v1: ~74 weeks.

## Strategic questions before Phase 12

Will be relevant at week ~55, not now:

- Is the racing user base from v1 big enough to fund cruising development?
- Free tier or paid tier for cruising features?
- Is UKHO commercial chart licensing worth the cost?
- Do we have the team to run a project of this scope?
- Has Navionics / OpenCPN / Raymarine shipped something that changes the calculus?

## How we track progress

- Each phase gets its own plan document (`docs/phase-N-plan.md`) with detailed task breakdown
- Each phase plan is written at the START of the phase, not upfront (scope shifts as we learn)
- Phase 0 plan already exists as the template: `docs/phase-0-plan.md`
- Each phase closes with a retrospective note appended to the plan doc

## Pivot triggers

Explicit list of reasons we'd re-plan mid-phase:

- A core technology choice proves unworkable (unlikely — we've picked conservatively)
- Real sailor feedback at Abersoch SC fundamentally contradicts an assumption
- A competitor ships something that makes our hero feature redundant
- A key data source (UKHO, Open-Meteo, etc.) changes terms
- Project owner's life circumstances change such that the timeline must shift

Small scope tweaks are normal; full pivots are rare and deliberate.
