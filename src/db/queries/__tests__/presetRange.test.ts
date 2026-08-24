import { getPresetDateRange } from '../dayRange';

describe('getPresetDateRange', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 7, 24, 12, 0, 0));
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  it('starts this week on Monday', () => {
    const range = getPresetDateRange('thisWeek');
    expect(range.start?.getDay()).toBe(1);
    expect(range.start?.getDate()).toBe(24);
  });

  it('passes custom dates through', () => {
    const range = getPresetDateRange('custom', {
      start: new Date(2026, 0, 1),
      end: new Date(2026, 0, 31),
    });
    expect(range.start?.getDate()).toBe(1);
    expect(range.end?.getDate()).toBe(31);
  });

  it('returns null bounds for custom without a range', () => {
    const range = getPresetDateRange('custom');
    expect(range.start).toBeNull();
    expect(range.end).toBeNull();
  });

  it('bounds this month to the first and today', () => {
    const range = getPresetDateRange('thisMonth');
    expect(range.start?.getDate()).toBe(1);
    expect(range.start?.getMonth()).toBe(7);
    expect(range.end?.getDate()).toBe(24);
  });
});
