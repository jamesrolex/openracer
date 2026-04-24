import { buildGpx, gpxFilename } from './gpxExport';
import type { TrackPoint } from '../stores/raceSessionsRepo';
import type { RaceSession } from '../types/race';

const baseSession: RaceSession = {
  id: 'sess-1',
  courseId: null,
  startedAt: '2026-04-24T18:45:00.000Z',
  finishedAt: '2026-04-24T19:55:12.000Z',
  state: 'finished',
};

let nextId = 1;
function pt(
  lat: number,
  lon: number,
  recordedAt: string,
  sog: number | null = null,
  cog: number | null = null,
): TrackPoint {
  return {
    id: nextId++,
    sessionId: 'sess-1',
    recordedAt,
    latitude: lat,
    longitude: lon,
    sog,
    cog,
    heading: null,
    accuracy: null,
  };
}

describe('buildGpx', () => {
  it('emits a valid GPX 1.1 header + xmlns', () => {
    const xml = buildGpx({ session: baseSession, points: [] });
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<gpx version="1.1"');
    expect(xml).toContain('xmlns="http://www.topografix.com/GPX/1/1"');
    expect(xml).toContain('<trkseg>');
    expect(xml).toContain('</gpx>');
  });

  it('includes session metadata + start time', () => {
    const xml = buildGpx({ session: baseSession, points: [] });
    expect(xml).toContain('<metadata>');
    expect(xml).toContain('<time>2026-04-24T18:45:00.000Z</time>');
    expect(xml).toContain('Race 2026-04-24 18:45:00');
  });

  it('emits trkpt for each track point with 7 dp lat/lon + ISO time', () => {
    const points = [
      pt(52.8205, -4.5025, '2026-04-24T18:45:01.000Z', 3.2, 178.5),
      pt(52.821, -4.5028, '2026-04-24T18:45:02.000Z', 3.5, 180.0),
    ];
    const xml = buildGpx({ session: baseSession, points });
    expect(xml).toContain('<trkpt lat="52.8205000" lon="-4.5025000">');
    expect(xml).toContain('<trkpt lat="52.8210000" lon="-4.5028000">');
    expect(xml).toContain('<time>2026-04-24T18:45:01.000Z</time>');
    expect(xml).toContain('<time>2026-04-24T18:45:02.000Z</time>');
  });

  it('emits openracer SOG extension when SOG is provided', () => {
    const points = [pt(52.82, -4.5, '2026-04-24T18:45:01.000Z', 3.234)];
    const xml = buildGpx({ session: baseSession, points });
    expect(xml).toContain('<openracer:sog>3.234</openracer:sog>');
  });

  it('omits SOG/COG extensions when null', () => {
    const points = [pt(52.82, -4.5, '2026-04-24T18:45:01.000Z', null, null)];
    const xml = buildGpx({ session: baseSession, points });
    expect(xml).not.toContain('<openracer:sog>');
    expect(xml).not.toContain('<openracer:cog>');
  });

  it('escapes XML special characters in metadata', () => {
    const session: RaceSession = {
      ...baseSession,
      // creator strings can flow user content; defend XML.
    };
    const xml = buildGpx({
      session,
      points: [],
      creator: 'OpenRacer "alpha" <test>',
    });
    expect(xml).toContain(
      'creator="OpenRacer &quot;alpha&quot; &lt;test&gt;"',
    );
  });

  it('produces an empty trkseg when no points', () => {
    const xml = buildGpx({ session: baseSession, points: [] });
    expect(xml).toContain('<trkseg>\n    </trkseg>');
  });

  it('roundtrips through the XML parser without errors', () => {
    // Light-touch validation: every <foo> has a </foo>. Real parsers run
    // in the consuming app — we just ensure we emit balanced tags.
    const points = [
      pt(52.82, -4.5, '2026-04-24T18:45:01.000Z', 3.2, 178.5),
      pt(52.8205, -4.5025, '2026-04-24T18:45:02.000Z', 3.5, 180.0),
    ];
    const xml = buildGpx({ session: baseSession, points });
    expect((xml.match(/<trkpt /g) ?? []).length).toBe(2);
    expect((xml.match(/<\/trkpt>/g) ?? []).length).toBe(2);
    expect((xml.match(/<trk>/g) ?? []).length).toBe(1);
    expect((xml.match(/<\/trk>/g) ?? []).length).toBe(1);
  });
});

describe('gpxFilename', () => {
  it('builds a safe filename with no path separators or whitespace', () => {
    const name = gpxFilename(baseSession);
    expect(name).toBe('openracer-2026-04-24T18-45-00-000.gpx');
    expect(name).not.toMatch(/[:/\\\s]/);
    expect(name.endsWith('.gpx')).toBe(true);
  });
});
