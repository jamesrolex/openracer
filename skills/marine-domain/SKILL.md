# Marine domain primer

Read this before writing any sailing-specific code. Claude Code doesn't need to become a sailor, but it needs enough context to use the right terms, units, and conventions.

## When to use this skill

- Implementing anything related to sailing physics (wind, speed, angles)
- Writing user-facing text that includes marine terminology
- Choosing variable names for marine concepts
- Validating that a calculation matches what a sailor expects
- Deciding units (metric vs imperial, nautical vs decimal)

## Unit conventions (locked)

| Quantity | Unit | Symbol | Why |
|---|---|---|---|
| Speed | Knots | kn or kt | Universal marine standard |
| Short distance | Metres | m | Metric, clear |
| Long distance | Nautical miles | nm | 1 nm = 1 minute of latitude |
| Depth | Metres | m | Metric |
| Bearing/heading | Degrees true | °T or ° | True north, not magnetic |
| Wind angle | Degrees | ° | Relative to boat or true |
| Coordinates | Decimal degrees (internal) | lat, lon | Precision, computation |
| Coordinates (display) | DMM (default) | 52° 49.230'N | User-preferred |
| Time | UTC (internal) | Z | No timezone bugs |
| Time (display) | Local | BST / GMT | What the sailor sees |

**1 knot = 1 nautical mile per hour = 0.5144 m/s**

**1 nautical mile = 1852 metres = 1.15078 statute miles**

## Coordinate formats

Three formats for lat/lon. Support converting between them. **Internal = decimal degrees. Default display = DMM.**

| Format | Example | Use |
|---|---|---|
| Decimal degrees (DD) | `52.8205, -4.5025` | Internal storage, API |
| Degrees + decimal minutes (DMM) | `52° 49.230' N, 004° 30.150' W` | Default display, user input |
| Degrees, minutes, seconds (DMS) | `52° 49' 13.8" N, 004° 30' 09.0" W` | Traditional charts, optional |

**DMM is the marine default.** It's what's written on course papers, on chart plotters, on VHF announcements. "Buoy is at 52 49.2 north, 4 30.15 west." Don't default to decimal.

Longitude is negative west of Greenwich. Handle negative values carefully.

## Wind: apparent vs true

Critical distinction. Mix these up and everything downstream is wrong.

### Apparent Wind (what the boat feels)

- **AWA** — Apparent Wind Angle. Degrees off the bow. Port negative or starboard positive. Usually shown 0-180° with side indicated.
- **AWS** — Apparent Wind Speed. Knots. What the anemometer measures directly.

The boat's motion distorts the wind it experiences. A stationary boat in 10 kn true wind feels 10 kn. The same boat moving forward at 5 kn into that wind feels roughly 15 kn from ahead.

### True Wind (what the weather is actually doing)

- **TWA** — True Wind Angle. Degrees off the bow from the actual wind direction.
- **TWS** — True Wind Speed. Knots.
- **TWD** — True Wind Direction. Degrees true (where the wind is coming FROM).

True wind is calculated from apparent wind + boat speed + boat heading. This calculation matters — a mistake here ripples through everything.

```
TWA = function(AWA, AWS, BoatSpeed, BoatHeading)
TWS = magnitude of (apparent wind vector - boat velocity vector)
TWD = HDG + TWA (normalised 0-360)
```

Use an established marine library for this calculation. SignalK has reference implementations. Don't reinvent.

## Boat directions

Four different "directions" a boat can have. Don't confuse them.

| Term | Abbrev | Meaning |
|---|---|---|
| Heading | HDG | Direction the bow points |
| Course over ground | COG | Direction the boat is actually moving |
| Course to steer | CTS | Direction the helmsman should aim for to compensate for current |
| Bearing to waypoint | BRG | Direction to next mark |

**Why they differ:** wind + current + leeway push the boat sideways. A boat heading 270° in a 2kn current flowing south will have a COG of about 255°. The helmsman steers the bow one direction; the boat goes another.

## Speed types

| Term | Abbrev | Meaning |
|---|---|---|
| Speed over ground | SOG | From GPS. True speed across the earth. |
| Speed through water | STW | From paddle wheel sensor. Speed relative to water. |
| Velocity made good | VMG | Component of boat velocity in the direction of the wind (upwind) or away from it (downwind). The thing that matters for racing. |

**VMG is the racing metric.** If you're pointing high into the wind at 4 kn, you're moving slower upwind than a boat footing off at 5 kn in a better direction. VMG = boatSpeed × cos(TWA). Maximising VMG is the tactical goal upwind.

## Sailing angles (points of sail)

|  Angle to wind (TWA) | Name | What's happening |
|---|---|---|
| 0-40° | In irons / close-hauled | Can't sail directly into wind; close-hauled = tight upwind |
| 40-60° | Close reach | Fast, pointing high, sails tight |
| 60-110° | Beam reach | Fastest for most boats, wind on the side |
| 110-160° | Broad reach | Wind over the quarter, downwind-ish |
| 160-180° | Running | Directly downwind, slowest for modern boats (they'd rather reach and gybe) |

## Racing concepts

### Start line

Imaginary line between committee boat and a pin buoy. Crossing before the start gun = OCS (on course side) = penalty. Start line timing is make-or-break: the goal is to hit the line at full speed exactly when the gun fires.

Start sequence (standard):
- 5 minutes before start: warning signal (class flag up)
- 4 minutes: preparatory signal (P flag)
- 1 minute: one minute signal
- 0: start (warning signal down)

### Race timer

Countdown from T-5:00 to 0:00 then counts up. Key feature for any sailor: "how long until the start, given where I am and where the line is?"

### Laylines

The angle at which the boat can just make the next mark without tacking. Mark is upwind, so you can't sail directly at it — you tack back and forth. At some point, you've gone far enough that you can tack and lay the mark on one tack. That's the layline.

Overstanding the layline (sailing past it) is wasted distance. Understanding (tacking short) means you can't make the mark and have to tack twice more.

### Tack and gybe

**Tack** — turning the bow through the wind. Boat goes from port tack (wind from port side) to starboard tack (wind from starboard). Upwind manoeuvre.

**Gybe** — turning the stern through the wind. Downwind manoeuvre. Different dynamics, can be dangerous if uncontrolled.

### Header and lift

- **Header** — wind shifts toward the bow. Boat is forced to point lower. Bad for current tack; tack now to get onto the new wind.
- **Lift** — wind shifts away from bow. Boat can point higher. Good for current tack; press on.

Gust-aware tactics detect these automatically. "Gust with header → tack." "Gust with lift → press on."

### Polars

A boat's theoretical maximum speed at each combination of TWS and TWA. A graph looks like a flower — hence "polar diagram."

Critical for racing: tells you the optimal TWA to sail at in current conditions. A boat's polar is unique. OpenRacer calibrates personal polars from session data.

## Safety basics

### MOB (man overboard)

Critical safety event. App must:
1. Mark position immediately
2. Start timer
3. Show bearing and distance back to position
4. Large, clear UI (panic mode)
5. Be impossible to miss or accidentally dismiss

### AIS (Automatic Identification System)

Boats broadcast position, speed, heading, identity on VHF. Receivers pick up nearby vessels. Critical for collision avoidance at night and in fog.

- **CPA** — Closest Point of Approach. How close will we get if neither boat changes course.
- **TCPA** — Time to CPA. When that happens.

Alarm on CPA < 0.25 nm and TCPA < 10 min (typical defaults).

### Anchor alarm

Boat anchored, user sleeps. GPS drift outside user-set radius (50m default) triggers alarm. Anchor dragging is a real hazard.

### Depth alarm

User sets minimum depth under keel. Alarm when real depth drops below. Typical: 3m for a cruising yacht, 1.5m for a racing dinghy.

## Tidal awareness

Most UK racing is in tidal waters. Current affects everything.

- Tidal stream: horizontal water movement. 2-4 kn typical Cardigan Bay. Can exceed boat speed.
- Tide height: vertical water level. Matters for depth.
- Tidal diamonds: points on charts where predicted tidal stream is published.
- Springs vs neaps: tidal range varies through lunar cycle. Springs = extreme tides, neaps = small tides.

OpenRacer integrates UKHO (UK), NOAA (US), XTide (worldwide offline) for tidal predictions.

## Weather

Primary values displayed and used:

- Wind speed and direction (TWS, TWD)
- Wind forecast at T+1h, T+3h, T+6h, T+24h
- Gust speed
- Wave height
- Barometric pressure (for trend detection)
- Visibility
- Cloud cover

OpenRacer uses Open-Meteo with the ECMWF marine model. 5km resolution in European waters, hourly updates, 16-day forecast.

## Common variable naming

Follow SignalK conventions where possible:

| SignalK path | TypeScript variable |
|---|---|
| `navigation.position` | `position: { latitude, longitude }` |
| `navigation.speedOverGround` | `sog` (knots in UI, m/s in storage per SignalK) |
| `navigation.courseOverGroundTrue` | `cog` (degrees) |
| `navigation.headingTrue` | `heading` or `hdg` |
| `environment.wind.speedApparent` | `aws` |
| `environment.wind.angleApparent` | `awa` |
| `environment.wind.speedTrue` | `tws` |
| `environment.wind.angleTrueWater` | `twa` |
| `environment.depth.belowKeel` | `depth` |
| `performance.velocityMadeGood` | `vmg` |

**SignalK stores speeds in m/s internally.** Convert to knots only for display. Easy source of bugs — be vigilant.

## Unit conversion rules

- Storage: SignalK native (m/s for speed, metres for distance, radians for angles)
- Computation: whatever's convenient, convert explicitly
- Display: knots for speed, nm or m for distance, degrees for angles, DMM for coords
- Never display more precision than makes sense: SOG to 1 decimal, COG to integer, coords to 3 decimal minutes

```typescript
// Always explicit conversion at the UI boundary
<BigNumber
  label="SOG"
  value={metersPerSecondToKnots(boat.sog).toFixed(1)}
  unit="kn"
/>
```

## Common pitfalls

1. **Wind angle sign** — is port negative or positive? Pick one, enforce everywhere.
2. **Heading vs COG** — never substitute one for the other silently. Different things.
3. **True vs magnetic** — we use true throughout. Some GPS outputs magnetic; convert.
4. **m/s vs knots** — SignalK native is m/s. UI is knots. Confusion here breeds bugs.
5. **Bearing normalisation** — always 0-360, never negative, never >360. Modular arithmetic.
6. **Antimeridian** — longitude wraps at ±180. Distance and bearing calculations must handle it.
7. **DMS vs DMM parsing** — user might type either. Be forgiving.

## References

- SignalK specification: https://signalk.org/specification/
- NMEA 0183 standard for sensor data
- Practical marine physics: any RYA text or OpenCPN developer docs

## When a sailor checks your work

At some point a real sailor will see what Claude Code has built. They will immediately spot:

- Wrong units
- Wrong angle conventions (port/starboard, magnetic/true)
- Impossible numbers (6 kn wind making 10 kn boat speed upwind — no)
- Unrealistic decimal precision
- Landlubber terminology

When in doubt, ask the project owner. They race every Wednesday. "Does this value look right to you?" is always allowed.
