import {
  COURSE_TEMPLATES,
  appendRoundingLeg,
  getTemplate,
  isCourseReadyToArm,
  mutateStartLegForStartType,
  remainingLegsToFill,
} from './courseTemplates';

describe('course templates', () => {
  it('exports all six canonical templates', () => {
    const ids = COURSE_TEMPLATES.map((t) => t.id).sort();
    expect(ids).toEqual([
      'custom',
      'olympic',
      'round-the-cans',
      'trapezoid',
      'triangle',
      'windward-leeward',
    ]);
  });

  it('W-L produces the expected leg shape', () => {
    const legs = getTemplate('windward-leeward').buildLegs();
    expect(legs.map((l) => l.type)).toEqual(['start', 'windward', 'leeward', 'finish']);
    expect(legs.map((l) => l.requiredMarks)).toEqual([2, 1, 1, 2]);
    // Rounding marks are port by default per ISAF.
    expect(legs[1]!.rounding).toBe('port');
    expect(legs[2]!.rounding).toBe('port');
    // Start and finish have no rounding side.
    expect(legs[0]!.rounding).toBeNull();
    expect(legs[3]!.rounding).toBeNull();
  });

  it('buildLegs returns fresh leg objects each call', () => {
    const a = getTemplate('windward-leeward').buildLegs();
    const b = getTemplate('windward-leeward').buildLegs();
    expect(a[0]!.id).not.toBe(b[0]!.id);
  });
});

describe('readiness helpers', () => {
  const legs = getTemplate('windward-leeward').buildLegs();

  it('unfilled W-L is not ready; six marks remaining', () => {
    expect(isCourseReadyToArm(legs)).toBe(false);
    expect(remainingLegsToFill(legs)).toBe(6); // 2 + 1 + 1 + 2
  });

  it('half-filled W-L is still not ready', () => {
    const partial = legs.map((l, i) =>
      i === 0 ? { ...l, markIds: ['m-a', 'm-b'] } : l,
    );
    expect(isCourseReadyToArm(partial)).toBe(false);
    expect(remainingLegsToFill(partial)).toBe(4);
  });

  it('fully filled W-L is ready', () => {
    const full = legs.map((l) => ({
      ...l,
      markIds: Array(l.requiredMarks).fill('m-x') as string[],
    }));
    expect(isCourseReadyToArm(full)).toBe(true);
    expect(remainingLegsToFill(full)).toBe(0);
  });

  it('empty course is never ready', () => {
    expect(isCourseReadyToArm([])).toBe(false);
  });
});

describe('appendRoundingLeg', () => {
  it('inserts a new leg before the finish', () => {
    const legs = getTemplate('custom').buildLegs();
    // custom starts as [start, finish]
    const extended = appendRoundingLeg(legs, 'Extra');
    expect(extended.map((l) => l.type)).toEqual(['start', 'windward', 'finish']);
    expect(extended[1]!.label).toBe('Extra');
  });

  it('appends at end when no finish leg is present', () => {
    const legs = [getTemplate('windward-leeward').buildLegs()[0]!]; // just start
    const out = appendRoundingLeg(legs, 'Solo');
    expect(out.map((l) => l.type)).toEqual(['start', 'windward']);
  });
});

describe('mutateStartLegForStartType', () => {
  it('keeps standard-line as 2-mark "Start line"', () => {
    const legs = getTemplate('windward-leeward').buildLegs();
    const out = mutateStartLegForStartType(legs, 'standard-line');
    const start = out.find((l) => l.type === 'start')!;
    expect(start.requiredMarks).toBe(2);
    expect(start.label).toBe('Start line');
  });

  it('rabbit-shapes the start leg to 1 mark + new label', () => {
    const legs = getTemplate('windward-leeward').buildLegs();
    const out = mutateStartLegForStartType(legs, 'rabbit');
    const start = out.find((l) => l.type === 'start')!;
    expect(start.requiredMarks).toBe(1);
    expect(start.label).toContain('Pin');
  });

  it('gate-shapes the start leg to 1 mark with guard-boat label', () => {
    const legs = getTemplate('triangle').buildLegs();
    const out = mutateStartLegForStartType(legs, 'gate');
    const start = out.find((l) => l.type === 'start')!;
    expect(start.requiredMarks).toBe(1);
    expect(start.label).toContain('Guard');
  });

  it('trims a stale CB+pin pair to one mark on rabbit toggle', () => {
    const legs = getTemplate('windward-leeward').buildLegs();
    const withMarks = legs.map((l) =>
      l.type === 'start' ? { ...l, markIds: ['cb', 'pin'] } : l,
    );
    const out = mutateStartLegForStartType(withMarks, 'rabbit');
    const start = out.find((l) => l.type === 'start')!;
    expect(start.markIds).toEqual(['cb']);
  });

  it('does not touch non-start legs', () => {
    const legs = getTemplate('olympic').buildLegs();
    const out = mutateStartLegForStartType(legs, 'rabbit');
    // Compare indices 1+ (skip start). Same length, same labels.
    expect(out.slice(1).map((l) => ({ type: l.type, label: l.label }))).toEqual(
      legs.slice(1).map((l) => ({ type: l.type, label: l.label })),
    );
  });
});
