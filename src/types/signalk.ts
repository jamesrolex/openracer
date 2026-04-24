/**
 * SignalK-aligned domain types.
 *
 * Storage convention (per skills/marine-domain/SKILL.md):
 * - Speeds in metres per second (SignalK native). Convert to knots at display boundary.
 * - Distances in metres.
 * - Angles in degrees true, 0-360 (normalised). SignalK spec uses radians internally;
 *   we keep degrees for readability and convert only when a library demands radians.
 * - Coordinates in decimal degrees. Longitude negative west of Greenwich.
 * - Timestamps as ISO 8601 UTC strings.
 *
 * Paths mirror SignalK where a path exists — see the skill for the mapping table.
 */

export type Latitude = number;
export type Longitude = number;

export interface GeoPosition {
  latitude: Latitude;
  longitude: Longitude;
}

export type MetresPerSecond = number;
export type Knots = number;
export type Metres = number;
export type NauticalMiles = number;
export type DegreesTrue = number;
export type IsoTimestamp = string;

/** SignalK: `navigation.position` + derived values. */
export interface NavigationState {
  position: GeoPosition | null;
  /** `navigation.speedOverGround` — m/s. */
  sog: MetresPerSecond | null;
  /** `navigation.courseOverGroundTrue` — degrees true, 0-360. */
  cog: DegreesTrue | null;
  /** `navigation.headingTrue` — degrees true, 0-360. Distinct from COG. */
  heading: DegreesTrue | null;
  /** GPS horizontal accuracy estimate, metres. */
  accuracy: Metres | null;
  /** When the above values were last observed. */
  lastUpdate: IsoTimestamp | null;
}

/** SignalK: `environment.wind.*`. All fields optional — not every tier has wind sensors. */
export interface WindState {
  /** `environment.wind.speedApparent` — m/s. */
  aws?: MetresPerSecond;
  /** `environment.wind.angleApparent` — degrees, port negative / starboard positive. */
  awa?: number;
  /** `environment.wind.speedTrue` — m/s. */
  tws?: MetresPerSecond;
  /** `environment.wind.angleTrueWater` — degrees. */
  twa?: number;
  /** True wind direction, degrees true. Where the wind is coming FROM. */
  twd?: DegreesTrue;
}

/** SignalK: `environment.depth.belowKeel` — metres. */
export type DepthBelowKeel = Metres;

/** SignalK: `performance.velocityMadeGood` — m/s. */
export type VelocityMadeGood = MetresPerSecond;
