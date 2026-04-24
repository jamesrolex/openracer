import type { Mark } from '../types/mark';

import {
  RACE_DAY_RECENT_DAYS,
  defaultValidityFor,
  deriveConfidence,
  isMarkActive,
  seasonalWindowFor,
} from './markLifecycle';

const utc = (iso: string): Date => new Date(iso);

function fixture(partial: Partial<Mark> = {}): Mark {
  return {
    id: 'm-1',
    name: 'Yellow',
    latitude: 52.8,
    longitude: -4.5,
    tier: 'club-seasonal',
    source: 'club-library',
    icon: 'racing-yellow',
    shape: 'spherical',
    validFrom: null,
    validUntil: null,
    owner: 'Abersoch SC',
    confidence: 1,
    ...partial,
  };
}

describe('seasonalWindowFor', () => {
  it('spans April 1 to October 31 of the given year', () => {
    const { from, until } = seasonalWindowFor(utc('2026-07-15T12:00:00Z'));
    expect(from.toISOString()).toBe('2026-04-01T00:00:00.000Z');
    expect(until.toISOString()).toBe('2026-10-31T23:59:59.999Z');
  });

  it('tracks the year when called in a leap year', () => {
    const { from, until } = seasonalWindowFor(utc('2024-02-29T00:00:00Z'));
    expect(from.getUTCFullYear()).toBe(2024);
    expect(until.getUTCFullYear()).toBe(2024);
  });

  it('rolls to the next year when called in December', () => {
    // Dec 2026 is off-season; the window for that "now" is still 2026's.
    const { from } = seasonalWindowFor(utc('2026-12-15T00:00:00Z'));
    expect(from.toISOString()).toBe('2026-04-01T00:00:00.000Z');
  });
});

describe('isMarkActive', () => {
  it('chart-permanent is always active', () => {
    const m = fixture({ tier: 'chart-permanent' });
    expect(isMarkActive(m, utc('2026-01-01T00:00:00Z'))).toBe(true);
    expect(isMarkActive(m, utc('2026-12-31T23:59:59Z'))).toBe(true);
  });

  it('club-seasonal is active inside the April–October window', () => {
    const m = fixture({ tier: 'club-seasonal' });
    expect(isMarkActive(m, utc('2026-04-01T00:00:00Z'))).toBe(true);
    expect(isMarkActive(m, utc('2026-07-15T12:00:00Z'))).toBe(true);
    expect(isMarkActive(m, utc('2026-10-31T23:59:59Z'))).toBe(true);
  });

  it('club-seasonal is inactive outside the window', () => {
    const m = fixture({ tier: 'club-seasonal' });
    expect(isMarkActive(m, utc('2026-03-31T23:59:59Z'))).toBe(false);
    expect(isMarkActive(m, utc('2026-11-01T00:00:00Z'))).toBe(false);
    expect(isMarkActive(m, utc('2027-02-15T00:00:00Z'))).toBe(false);
  });

  it('race-day-recent respects validUntil', () => {
    const m = fixture({
      tier: 'race-day-recent',
      validFrom: '2026-04-10T12:00:00Z',
      validUntil: '2026-04-24T12:00:00Z',
    });
    expect(isMarkActive(m, utc('2026-04-10T12:00:00Z'))).toBe(true);
    expect(isMarkActive(m, utc('2026-04-24T12:00:00Z'))).toBe(true);
    expect(isMarkActive(m, utc('2026-04-24T12:00:01Z'))).toBe(false);
  });

  it('single-race-temporary respects validUntil', () => {
    const m = fixture({
      tier: 'single-race-temporary',
      validFrom: '2026-04-24T18:00:00Z',
      validUntil: '2026-04-24T21:00:00Z',
    });
    expect(isMarkActive(m, utc('2026-04-24T20:59:59Z'))).toBe(true);
    expect(isMarkActive(m, utc('2026-04-24T21:00:01Z'))).toBe(false);
  });

  it('dated tiers with null validUntil are treated as active (defensive)', () => {
    const m = fixture({ tier: 'race-day-recent', validUntil: null });
    expect(isMarkActive(m, utc('2026-05-01T00:00:00Z'))).toBe(true);
  });
});

describe('defaultValidityFor', () => {
  const now = utc('2026-04-24T12:00:00Z');

  it('chart-permanent → both null', () => {
    expect(defaultValidityFor('chart-permanent', now)).toEqual({
      validFrom: null,
      validUntil: null,
    });
  });

  it('club-seasonal → current season window', () => {
    const { validFrom, validUntil } = defaultValidityFor('club-seasonal', now);
    expect(validFrom).toBe('2026-04-01T00:00:00.000Z');
    expect(validUntil).toBe('2026-10-31T23:59:59.999Z');
  });

  it('race-day-recent → now to now + 14 days', () => {
    const { validFrom, validUntil } = defaultValidityFor('race-day-recent', now);
    expect(validFrom).toBe('2026-04-24T12:00:00.000Z');
    expect(validUntil).toBe('2026-05-08T12:00:00.000Z');
    const diff = new Date(validUntil!).getTime() - new Date(validFrom!).getTime();
    expect(diff).toBe(RACE_DAY_RECENT_DAYS * 86_400_000);
  });

  it('single-race-temporary → explicit session end takes precedence', () => {
    const end = utc('2026-04-24T20:00:00Z');
    const { validUntil } = defaultValidityFor('single-race-temporary', now, end);
    expect(validUntil).toBe('2026-04-24T20:00:00.000Z');
  });

  it('single-race-temporary → falls back to +6h when no session', () => {
    const { validUntil } = defaultValidityFor('single-race-temporary', now);
    expect(validUntil).toBe('2026-04-24T18:00:00.000Z');
  });
});

describe('deriveConfidence', () => {
  const now = utc('2026-04-24T12:00:00Z');

  it('chart-permanent + club-library → 0.95', () => {
    expect(
      deriveConfidence(
        { tier: 'chart-permanent', source: 'club-library', validFrom: null },
        now,
      ),
    ).toBe(0.95);
  });

  it('club-seasonal + committee-push → 0.9 (0.85 + 0.05)', () => {
    expect(
      deriveConfidence(
        { tier: 'club-seasonal', source: 'committee-push', validFrom: null },
        now,
      ),
    ).toBe(0.9);
  });

  it('race-day-recent freshly created → no age penalty', () => {
    expect(
      deriveConfidence(
        { tier: 'race-day-recent', source: 'gps-drop', validFrom: now.toISOString() },
        now,
      ),
    ).toBe(0.7);
  });

  it('race-day-recent at 14-day boundary → full -0.2 age penalty', () => {
    const created = utc('2026-04-10T12:00:00Z');
    expect(
      deriveConfidence(
        {
          tier: 'race-day-recent',
          source: 'gps-drop',
          validFrom: created.toISOString(),
        },
        now,
      ),
    ).toBe(0.5);
  });

  it('point-and-triangulate is the least trusted source', () => {
    expect(
      deriveConfidence(
        {
          tier: 'race-day-recent',
          source: 'point-and-triangulate',
          validFrom: now.toISOString(),
        },
        now,
      ),
    ).toBe(0.6);
  });

  it('single-race-temporary carries a flat -0.1 penalty', () => {
    expect(
      deriveConfidence(
        {
          tier: 'single-race-temporary',
          source: 'gps-drop',
          validFrom: now.toISOString(),
        },
        now,
      ),
    ).toBe(0.4);
  });

  it('clamps to [0, 1]', () => {
    const v = deriveConfidence(
      {
        tier: 'single-race-temporary',
        source: 'point-and-triangulate',
        validFrom: now.toISOString(),
      },
      now,
    );
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });
});
