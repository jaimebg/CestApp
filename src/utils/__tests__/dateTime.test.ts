import { buildValidatedDateTime } from '../dateTime';

describe('buildValidatedDateTime', () => {
  it('builds a date from valid day/month/year', () => {
    const date = buildValidatedDateTime(15, 8, 2026, '14:30');
    expect(date).toEqual(new Date(2026, 7, 15, 14, 30, 0, 0));
  });

  it('returns null for a rolled-over month', () => {
    expect(buildValidatedDateTime(15, 13, 2026, null)).toBeNull();
  });

  it('returns null for an impossible day', () => {
    expect(buildValidatedDateTime(30, 2, 2026, null)).toBeNull();
  });

  it('returns null for days past the month end', () => {
    expect(buildValidatedDateTime(31, 4, 2026, null)).toBeNull();
  });

  it('keeps the date when time is empty', () => {
    const date = buildValidatedDateTime(1, 1, 2026, '');
    expect(date).toEqual(new Date(2026, 0, 1));
  });
});
