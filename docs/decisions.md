# Locked architectural decisions

Decisions we've already made, captured so they don't get re-litigated every session.

If something is on this list, it's settled. Don't propose alternatives unless you have a strong reason and the project owner agrees to revisit.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Mobile framework | React Native + Expo SDK 52+ | Managed workflow, cross-platform, huge community, mature |
| Language | TypeScript strict mode | Type safety, refactor confidence |
| State | Zustand | Simpler than Redux, sufficient for our scope |
| Local storage | expo-sqlite | SQL familiarity, queryable, transactional |
| Maps | MapLibre | Open source, offline MBTiles, not Google/Mapbox |
| Charts / viz | Deferred | Phase 4+ when debrief needs it |
| UI library | Tamagui, added Phase 1 | Phase 0 uses RN primitives to avoid over-coupling |
| Testing | Jest + React Native Testing Library | Standard |
| Navigation | React Navigation | Standard, mature |
| Bundle ID | `com.openracer.app` | Reserved for us |

## Architecture

- **Offline-first.** Every feature works with no network. Cloud is an amplifier, never a dependency.
- **Three connectivity modes** — offline / patchy / constant. Features declare behaviour in each.
- **Local-first data.** User data is stored locally. Cloud sync is opt-in and opportunistic.
- **Never block on network.** Any network fetch has a local fallback or returns immediately.
- **SignalK data model** throughout. Even when we're not talking to a SignalK server, our types follow SignalK paths and units.
- **Tier portability.** The app is Tier 1. Tier 2 (Pi) and Tier 3 (full kit) extend but never replace. Same codebase.

## AI

- **Cloud AI:** Anthropic Claude API primary. Abstraction layer allows swap.
- **Local AI:** Llama 3.2 3B on-device for offline Q&A and debrief.
- **BYO API key default.** User provides their own Anthropic key. Optional hosted tier for those who don't want to.
- **Cost target:** ~£7/year for a 30-race sailor at today's prices.

## Data sources

- **Tidal:** UKHO Admiralty (UK, 10k free req/mo), NOAA (US, free), XTide (worldwide offline GPL library).
- **Weather:** Open-Meteo (AGPLv3, ECMWF model, 16-day forecast, hourly refresh).
- **Charts:** OpenSeaMap primary, MBTiles format for offline.
- **Marks (committee):** SAP Buoy Pinger schema for interop.

## Standards

- **British English** for all user-facing strings. `colour`, `centre`, `metre`, `harbour`, `aeroplane`, `organise`.
- **Metric / nautical units** by default. Knots, metres, nautical miles, degrees true. User-switchable but defaults are fixed.
- **Conventional commits.** `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`.
- **Semantic versioning** for releases. `v0.1.0-phase0`, `v0.2.0-phase1`, etc.

## Licences

- **Software:** MIT
- **Hardware designs:** CERN-OHL-P
- **Docs:** CC BY-SA 4.0

## Product tiers

| Tier | Cost | Hardware | Market |
|---|---|---|---|
| 1 | Free | Phone only | Club racers, dinghies, any sailor |
| 2 | £200-350 | Raspberry Pi + existing NMEA | Cruiser-racers with legacy instruments |
| 3 | £650-1,100 | Full kit (anemometer, depth, enclosures) | Replacement for B&G Triton² / Raymarine i70 |

Tier 3 BOM is locked (see `openracer_project_spec_v6.docx` and `racing_nav_sourcing_sheet.xlsx`). Key parts: Veinasa CXS02B-N ultrasonic anemometer with NMEA 0183, ESP32-S3 controller, Open Echo DIY depth sounder, Raspberry Pi 4 4GB, Kindle Paperwhite for crew displays.

## Development model

- **Solo for Phases 0-5** (weeks 1-28). Project owner + Claude Code.
- **2-3 collaborators for Phases 6-9**. Community contributors welcome once scaffold is stable.
- **Open source from day one.** Repo public on GitHub. First commit is the spec.

## Timeline

- **60 weeks** to v1 community launch (Phase 11 complete).
- **First shippable alpha at week 10** — course entry flagship.
- **Post-v1 cruising platform** (Phases 12-20) sketched, not committed. Another ~74 weeks if pursued.

## What's explicitly NOT in the v1 scope

- Full cruising chart platform (S-57, S-63, oeSENC) — post-v1 Phase 17
- Full NMEA 2000 integration (engine, tanks, battery) — post-v1 Phase 15
- Weather routing (GRIB-based) — post-v1 Phase 13
- AIS with CPA/TCPA — post-v1 Phase 14 (basic display only in v1)
- Autopilot bridge (PyPilot integration) — post-v1 Phase 16
- Satellite comms integration beyond iPhone Starlink — post-v1 Phase 19
- Dinghy Edition (Apple Watch primary) — post-v1 Phase 12+
- **Tier 3 custom hardware** (ESP32-S3 anemometer, Open Echo depth sounder, IP68 enclosures) — moved to post-v1 Phase 10.5, see "Build system" below
- **MCP server write endpoints + tools** — v1.5. Read-only resources only in v1.8 Phase.
- **Open API write endpoints + webhooks** — v1.5. Read-only REST + WebSocket mirror of SignalK in v1 Phase 8.

## Build system evolution (locked after Phase 0 review, 2026-04-24)

The project crosses three build-system thresholds. Plan the transitions; do not discover them mid-phase.

| Phase | Build system | Trigger | What changes |
|---|---|---|---|
| 0-1 | **Expo Go** | Default | JS-only changes, pure-Expo modules (location, network, sqlite). Zero Xcode. |
| 2 onwards | **EAS dev build** | First native module outside Expo Go (MapLibre at Phase 2) | Xcode + Android Studio installed. Dev client built once via `eas build --profile development`. Fast JS reload still works; native changes require a rebuild. |
| 11 | **EAS production build** | Community launch | App Store + Play Store binaries via EAS submit. Code signing, provisioning profiles, store listings. |

**Rule:** do not migrate early. Expo Go is faster while it works. First sign of a native-module need = plan the migration inside the phase that needs it.

## Tier 3 hardware — deferred to post-v1 (locked after Phase 0 review, 2026-04-24)

Tier 3 (ESP32-S3 controller, Veinasa CXS02B-N ultrasonic anemometer, Open Echo depth sounder, Raspberry Pi 4, IP68 enclosures) is a parallel hardware-engineering track of ~200 hours of firmware + PCB + mechanical + environmental testing. Running it concurrently with v1 software risks missing the racing season.

**Decision:** Tier 3 ships as post-v1 Phase 10.5, not v1 Phase 10.

**Implication:**
- v1 ships Tier 1 (phone) + Tier 2 (Pi + existing NMEA instruments).
- Tier 3 BOM (`docs/hardware_sourcing.xlsx`) is preserved but frozen until v1 lands.
- `docs/roadmap.md` updated to reflect the new phase ordering.
- Tier 3 may be pursued earlier if a hardware collaborator joins the project; solo, it is deferred.

## Local AI — device test before UX (locked after Phase 0 review, 2026-04-24)

Llama 3.2 3B on-device is the biggest technical unknown in the plan:

- Quantised model download: 2-4 GB
- Cold inference on iPhone 13: estimated 10-30 seconds per short debrief
- Android inference perf is device-dependent and harder to guarantee

**Decision:** Phase 4 begins with a **device-performance spike**, not UX work.

- Ship a minimal screen that runs a canned prompt through `llama.rn` on the project owner's actual phone, logs cold-start time, warm inference time, and memory watermark.
- If cold inference > 30 s or memory > 1.5 GB, redesign the UX around asynchronous debriefs (start debrief → notify when ready) BEFORE writing the Q&A screen.
- If perf is acceptable, proceed with the UX as specced.

Gust-aware nudges are signal-processing, not LLM-driven, and are unaffected by this gate.

## When to revisit

These decisions are locked but not eternal. Triggers for revisiting:

- Technology: major Expo / React Native / Zustand release with breaking changes
- Market: a competitor ships something we hadn't anticipated
- User research: actual sailors at Abersoch SC tell us something we got wrong
- Scale: more than 100 active users stresses an assumption

Until one of those fires, decisions stay locked.
