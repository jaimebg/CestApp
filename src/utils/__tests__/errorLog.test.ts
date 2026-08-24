import { appendError, type ErrorLogEntry } from '../errorLog';

const entry = (message: string): ErrorLogEntry => ({
  timestamp: '2026-08-24T10:00:00.000Z',
  scope: 'test',
  message,
});

describe('appendError', () => {
  it('puts the new entry first and keeps the newest 50', () => {
    const seed = Array.from({ length: 50 }, (_, i) => entry(`old-${i}`));
    const result = appendError(seed, entry('new'));
    expect(result).toHaveLength(50);
    expect(result[0].message).toBe('new');
    expect(result[49].message).toBe('old-48');
  });

  it('capifies: replaces nothing when under the cap', () => {
    const result = appendError([entry('a')], entry('b'));
    expect(result.map((e) => e.message)).toEqual(['b', 'a']);
  });
});
