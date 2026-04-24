# OpenRacer

**Open-source racing and navigation system for sailors.**

Works offline. Amplifies online. Starts at zero cost on a phone, scales to a full instrumented racing boat.

## What it is

A cross-platform app (iOS, Android, Raspberry Pi dashboard) that gives club racers and cruisers the kind of tactical tooling that normally costs £2,500+ in proprietary marine electronics — but works with whatever you already have on board.

Three tiers share one codebase:

| Tier | Hardware | Cost | Who it's for |
|------|----------|------|--------------|
| 1 | Phone only | £0 | Club racers, dinghies, anyone starting out |
| 2 | Pi + existing NMEA | £200-350 | Cruiser-racers with legacy instruments |
| 3 | Full kit | £650-1,100 | Replace old B&G/Raymarine, still cheaper than new |

## Status

🚧 **Phase 0 — Skeleton & offline foundations.** Early scaffolding, not yet usable.

See `docs/roadmap.md` for the full 11-phase, 60-week plan to v1 community launch, and the post-v1 cruising platform vision.

## Documentation

- **`docs/spec-summary.md`** — condensed product specification
- **`docs/openracer_spec_v0.6.docx`** — full spec, the bible
- **`docs/phase-0-plan.md`** — what we're building right now
- **`docs/decisions.md`** — locked architectural decisions
- **`docs/roadmap.md`** — all 11 phases + future platform vision

## For contributors

Development is AI-assisted via Claude Code. Instructions for the AI live in `CLAUDE.md` at the repo root.

If you're a human contributor, the same docs work for you — start with `docs/spec-summary.md` and `docs/phase-0-plan.md`.

## Licences

- **Software:** MIT
- **Hardware designs:** CERN-OHL-P
- **Documentation:** CC BY-SA 4.0

## Credits

Builds on the open-source marine ecosystem: [SignalK](https://signalk.org/), [OpenCPN](https://opencpn.org/), [OpenPlotter](https://openplotter.readthedocs.io/), [OpenSeaMap](https://openseamap.org/), [SAP Sailing Analytics](https://github.com/SAP/sailing-analytics-v2), [XTide](https://flaterco.com/xtide/), [Open-Meteo](https://open-meteo.com/).
