import { allCues, cueFor } from './voiceCues';

describe('cueFor', () => {
  it('returns the minute cues at exactly the boundary seconds', () => {
    expect(cueFor(300)?.phrase).toBe('Five minutes');
    expect(cueFor(240)?.phrase).toBe('Four minutes');
    expect(cueFor(180)?.phrase).toBe('Three minutes');
    expect(cueFor(120)?.phrase).toBe('Two minutes');
    expect(cueFor(60)?.phrase).toBe('One minute');
  });

  it('returns the tens-second cues', () => {
    expect(cueFor(30)?.phrase).toBe('Thirty seconds');
    expect(cueFor(20)?.phrase).toBe('Twenty');
    expect(cueFor(10)?.phrase).toBe('Ten');
  });

  it('returns the final-five cues', () => {
    expect(cueFor(5)?.phrase).toBe('Five');
    expect(cueFor(4)?.phrase).toBe('Four');
    expect(cueFor(3)?.phrase).toBe('Three');
    expect(cueFor(2)?.phrase).toBe('Two');
    expect(cueFor(1)?.phrase).toBe('One');
    expect(cueFor(0)?.phrase).toBe('Gun!');
  });

  it('returns null between cued seconds', () => {
    expect(cueFor(299)).toBeNull();
    expect(cueFor(150)).toBeNull();
    expect(cueFor(45)).toBeNull();
    expect(cueFor(15)).toBeNull();
    expect(cueFor(7)).toBeNull();
    expect(cueFor(-1)).toBeNull();
  });

  it('escalates priority through the sequence', () => {
    expect(cueFor(300)?.priority).toBe(1);
    expect(cueFor(30)?.priority).toBe(2);
    expect(cueFor(5)?.priority).toBe(3);
    expect(cueFor(0)?.priority).toBe(4);
  });

  it('catalogue is uniquely keyed by atSecond', () => {
    const seconds = allCues.map((c) => c.atSecond);
    expect(new Set(seconds).size).toBe(seconds.length);
  });

  it('catalogue is sorted descending so earlier cues match first', () => {
    const seconds = allCues.map((c) => c.atSecond);
    expect(seconds).toEqual([...seconds].sort((a, b) => b - a));
  });
});
