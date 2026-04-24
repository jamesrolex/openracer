/**
 * gpxExport — turn a race session + its track points into a valid GPX 1.1
 * document. Pure function; no I/O. The screen handles writing it to disk
 * and opening the share sheet.
 *
 * GPX 1.1 spec: https://www.topografix.com/GPX/1/1/
 *
 * Each track point is a `<trkpt>` with lat/lon + timestamp. SOG is
 * encoded as a custom extension (`<openracer:sog>` in m/s); some tools
 * (RaceQs, Strava) ignore unknown extensions, others (Garmin Connect)
 * read `<speed>` if present in their own namespace. We emit both for
 * maximum compatibility — the schema-strict tools only read what they
 * recognise.
 *
 * Track is a single segment per session. If we ever support post-race
 * stitched-from-multiple-sessions exports we'll add segment splitting.
 */

import type { TrackPoint } from '../stores/raceSessionsRepo';
import type { RaceSession } from '../types/race';

const NS_GPX = 'http://www.topografix.com/GPX/1/1';
const NS_XSI = 'http://www.w3.org/2001/XMLSchema-instance';
const NS_SCHEMA =
  'http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd';
const NS_OPENRACER = 'https://openracer.app/gpx/1';

/** Escape XML special characters in attribute / element text. */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function trkptXml(p: TrackPoint): string {
  const sogPart =
    p.sog !== null
      ? `      <extensions><openracer:sog>${p.sog.toFixed(3)}</openracer:sog></extensions>\n`
      : '';
  const cogPart =
    p.cog !== null
      ? `      <extensions><openracer:cog>${p.cog.toFixed(1)}</openracer:cog></extensions>\n`
      : '';
  return (
    `    <trkpt lat="${p.latitude.toFixed(7)}" lon="${p.longitude.toFixed(7)}">\n` +
    `      <time>${p.recordedAt}</time>\n` +
    sogPart +
    cogPart +
    `    </trkpt>\n`
  );
}

export interface GpxExportInput {
  session: RaceSession;
  points: readonly TrackPoint[];
  /** App version string (used in <metadata><creator>). */
  creator?: string;
}

/** Generate the GPX 1.1 document text. Pure function — no I/O. */
export function buildGpx({
  session,
  points,
  creator = 'OpenRacer',
}: GpxExportInput): string {
  const sessionName = `Race ${session.startedAt.replace('T', ' ').slice(0, 19)}`;
  const trkpts = points.map(trkptXml).join('');
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<gpx version="1.1" creator="${xmlEscape(creator)}"\n` +
    `     xmlns="${NS_GPX}"\n` +
    `     xmlns:xsi="${NS_XSI}"\n` +
    `     xmlns:openracer="${NS_OPENRACER}"\n` +
    `     xsi:schemaLocation="${NS_SCHEMA}">\n` +
    `  <metadata>\n` +
    `    <name>${xmlEscape(sessionName)}</name>\n` +
    `    <time>${session.startedAt}</time>\n` +
    `  </metadata>\n` +
    `  <trk>\n` +
    `    <name>${xmlEscape(sessionName)}</name>\n` +
    `    <type>sailing</type>\n` +
    `    <trkseg>\n` +
    trkpts +
    `    </trkseg>\n` +
    `  </trk>\n` +
    `</gpx>\n`
  );
}

/** A safe filename for the export, no spaces or path separators. */
export function gpxFilename(session: RaceSession): string {
  const stamp = session.startedAt.replace(/[:.]/g, '-').replace(/Z$/, '');
  return `openracer-${stamp}.gpx`;
}
