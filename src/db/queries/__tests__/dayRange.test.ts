import { dayRange } from '../dayRange';

describe('dayRange', () => {
  it('spans the whole local day', () => {
    const { start, end } = dayRange(new Date(2026, 7, 17, 9, 32, 15, 250));

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(7);
    expect(start.getDate()).toBe(17);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);

    expect(end.getDate()).toBe(17);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);
  });

  it('covers both ends of the same day', () => {
    const { start, end } = dayRange(new Date(2026, 7, 17, 9, 32));

    const firstMinute = new Date(2026, 7, 17, 0, 0, 0, 0);
    const lastMinute = new Date(2026, 7, 17, 23, 59, 59, 999);

    expect(firstMinute >= start && firstMinute <= end).toBe(true);
    expect(lastMinute >= start && lastMinute <= end).toBe(true);
  });

  it('excludes the neighbouring days', () => {
    const { start, end } = dayRange(new Date(2026, 7, 17, 9, 32));

    const dayBefore = new Date(2026, 7, 16, 23, 59, 59, 999);
    const dayAfter = new Date(2026, 7, 18, 0, 0, 0, 0);

    expect(dayBefore >= start).toBe(false);
    expect(dayAfter <= end).toBe(false);
  });

  it('does not mutate the date it is given', () => {
    const original = new Date(2026, 7, 17, 9, 32, 15, 250);
    const copy = new Date(original.getTime());

    dayRange(original);

    expect(original.getTime()).toBe(copy.getTime());
  });

  it('handles a month boundary', () => {
    const { start, end } = dayRange(new Date(2026, 7, 31, 18, 0));

    expect(start.getMonth()).toBe(7);
    expect(start.getDate()).toBe(31);
    expect(end.getMonth()).toBe(7);
    expect(end.getDate()).toBe(31);
    expect(end.getHours()).toBe(23);
  });
});
