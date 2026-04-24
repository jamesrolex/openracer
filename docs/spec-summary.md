# OpenRacer — spec summary

The fast version. Full detail in `openracer_spec_v0.6.docx`.

## One-line pitch

Open-source sailing race navigation system. Works offline, amplifies online. Runs on any hardware from phone-only to full kit.

## Problem

Club sailors can't afford B&G Triton² (£2,500–4,000). Racing apps are either too simple (stopwatch + GPS) or locked to proprietary hardware. Nothing sits in the middle. Meanwhile Grand Prix yachts now carry Starlink and can run real-time AI coaching — but that capability is locked inside £500k racing programmes.

## Solution

One React Native codebase. Three product tiers:

- **Tier 1** — Free phone app. GPS, race timer, course entry, polars, AI. Works fully offline.
- **Tier 2** — £200–350. Raspberry Pi + existing NMEA instruments. Adds real wind data, multi-crew Kindle displays.
- **Tier 3** — £650–1,100. Full kit with custom sensors, mast-head anemometer, depth sounder, IP68 enclosures.

Same app controls all three. Same data model. Additional sensors just stream in via SignalK.

## Two modes

**Race mode** — VMG, laylines, start timer, gust-aware tactical nudges, course building, AI debriefs.

**Cruise mode** (v1 light version, full platform post-v1) — waypoint navigation, MOB, anchor alarm, depth alarm, basic AIS display, digital logbook, trip log, night mode.

Toggle at top-right. Auto-switch when race timer arms.

## Course entry — the hero feature

Seven input methods, target <3 minutes from VHF announcement to race timer armed:

1. **Committee-boat push** — mDNS + BLE broadcast, SAP Buoy Pinger schema, signed bundles. One tap accept. 3 seconds.
2. **Pick from library** — fixed club marks, tiered by lifespan.
3. **Chart seamarks** — OpenSeaMap cardinal/buoy data.
4. **Drop at current GPS** — sailing past the mark.
5. **Point phone at mark** — compass + triangulation refine.
6. **Bearing + distance** — "280° 0.4nm from CB".
7. **Tap on chart** — know roughly where.

Mark lifespan tiers: club-seasonal (Apr-Oct) · chart-permanent (OpenSeaMap) · race-day-recent (14 days) · single-race-temporary.

## Connectivity — three scenarios

| Mode | Typical | Behaviour |
|---|---|---|
| Offline | Cardigan Bay, mid-Channel, rural UK | Full function, cloud features queue |
| Patchy | Most club venues, intermittent 4G | Offline-first, bursts when signal returns |
| Constant | Starlink yacht, in-harbour, coastal 5G | Real-time AI coach, live AIS, fleet tracking, streaming telemetry |

**Same codebase handles all three.** GPS is satellite-based, so racing works anywhere. Cloud enhances.

## AI layer

Four uses, each with offline/patchy/constant path:

- **Q&A** — "why did we lose to that boat?" Local Llama 3.2 3B offline, Claude API when online.
- **Post-race debrief** — 2-3 min offline, 30 sec patchy, 15 sec constant connection.
- **Gust-aware nudges** — deterministic signal processing, fully offline. Detects gust-with-header (tack) vs gust-with-lift (press on).
- **Real-time coaching** — constant-connection mode only. Mid-race voice coaching via Claude API.

Cost: ~£7/year for a 30-race sailor. Bring-your-own-API-key default.

## MCP server

OpenRacer ships an MCP server. Power users point Claude Desktop, ChatGPT Pro, or custom agents at it. Exposes resources (polars, sessions, marks, tracks), tools (set_mark, start_timer, analyze_session), prompts (compare_sessions, identify_weakness).

With constant connection, MCP becomes a gateway to live external services — the AI queries MarineTraffic's MCP for live AIS data, surfaces fleet positions on your chart.

## Open API

Distinct from MCP. Traditional REST + WebSocket + webhooks, builds on SignalK's existing API. Enables club websites, sailmakers, coaches, other apps.

## Boat learning

Over a season, local computation learns:
- Personal polar (typically 5–15% different from published)
- Tacking/gybing losses
- Start-line behaviour patterns
- Venue heuristics (which side pays in which wind)
- Gust-handling signature

All local. Cloud sync opt-in for cross-device.

## Ecosystem — we build ON, not rebuild

- **SignalK** — data hub (existing)
- **OpenCPN + Dashboard Tactics** — racing calcs (existing, MIT/GPL)
- **OpenPlotter** — Pi distribution (existing)
- **SAP Sailing Analytics** — open-sourced Oct 2025, we use Buoy Pinger schema
- **PyPilot** — autopilot (existing, post-v1 bridge)
- **XTide, Open-Meteo, OpenSeaMap, NOAA** — data

## Architecture layers

L0 Sensors → L1 Mobile app → L2 Pi distribution → L3 SignalK server → L4 Core plugin → L5 E-ink renderer → L6 Data enrichment → L7 Analytics & learning → L8 AI coaching → L9 MCP server → L10 P2P sharing → L11 Open API → L12 Offline cache manager

L12 is cross-cutting, underneath everything. Manages tile storage, queued cloud requests, cached API responses, background sync.

## Licensing

- Software: MIT
- Hardware: CERN-OHL-P
- Docs: CC-BY-SA 4.0

## Target market

30-boat club (Abersoch Yacht Club, North Wales, Cardigan Bay) as beachhead. Patchy cell signal at the venue — perfect offline-first test environment. Owner races there, has lab access for IP68 hardware hardening.

Broader: any sailing club, racing yachts of any scale, eventually cruising community post-v1.

## What makes us different

No commercial competitor offers the full combination:
- <60 sec course entry
- Boat-to-boat committee push
- Gust-aware AI coaching
- Full offline racing
- Starlink-era real-time amplification
- MCP + Open API
- Open source + hardware-agnostic
- Three tiers from free to full kit

See full spec Part 1 for competitor feature grid.
