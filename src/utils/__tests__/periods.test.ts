import { describeChange, getComparableRange } from '../periods';

const endOfDay = (y: number, m: number, d: number) => new Date(y, m, d, 23, 59, 59, 999);

describe('getComparableRange', () => {
  it('compares the month so far with the same days of the previous month', () => {
    const { current, previous } = getComparableRange('month', new Date(2026, 9, 5, 15));
    expect(current).toEqual({ start: new Date(2026, 9, 1), end: endOfDay(2026, 9, 5) });
    expect(previous).toEqual({ start: new Date(2026, 8, 1), end: endOfDay(2026, 8, 5) });
  });

  it('clamps the previous month to its last day', () => {
    const { previous } = getComparableRange('month', new Date(2026, 2, 31, 9));
    expect(previous.end).toEqual(endOfDay(2026, 1, 28));
  });

  it('compares the last 7 days with the 7 before them, across a new year', () => {
    const { current, previous } = getComparableRange('week', new Date(2026, 0, 1, 10));
    expect(current).toEqual({ start: new Date(2025, 11, 26), end: endOfDay(2026, 0, 1) });
    expect(previous).toEqual({ start: new Date(2025, 11, 19), end: endOfDay(2025, 11, 25) });
  });

  it('compares the year so far with the same date last year, clamping a leap day', () => {
    const { current, previous } = getComparableRange('year', new Date(2028, 1, 29, 12));
    expect(current).toEqual({ start: new Date(2028, 0, 1), end: endOfDay(2028, 1, 29) });
    expect(previous).toEqual({ start: new Date(2027, 0, 1), end: endOfDay(2027, 1, 28) });
  });

  it.each(['week', 'month', 'year'] as const)('never overlaps or inverts the %s ranges', (p) => {
    const { current, previous } = getComparableRange(p, new Date(2026, 2, 31, 9));
    expect(previous.start.getTime()).toBeLessThan(previous.end.getTime());
    expect(previous.end.getTime()).toBeLessThan(current.start.getTime());
  });
});

describe('describeChange', () => {
  it('reports more spending with its difference', () => {
    expect(describeChange(120, 100)).toEqual({ direction: 'more', delta: 20 });
  });

  it('reports less spending with its difference', () => {
    expect(describeChange(80.5, 100)).toEqual({ direction: 'less', delta: 19.5 });
  });

  it('treats a sub-cent difference as the same', () => {
    expect(describeChange(100, 100.004)).toEqual({ direction: 'same', delta: 0 });
  });

  it('says nothing when the previous period had no spending', () => {
    expect(describeChange(50, 0)).toBeNull();
    expect(describeChange(0, 0)).toBeNull();
  });
});
