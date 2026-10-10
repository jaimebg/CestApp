import { replayRecord } from '../replay';
import { mercadonaRecord } from './benchFixtures';

describe('replayRecord', () => {
  it('reads a recorded capture the way the review screen opens it', () => {
    const parsed = replayRecord(mercadonaRecord('m1'));

    expect(parsed?.storeName).toBe('Mercadona');
    expect(parsed?.total).toBeCloseTo(28.58, 2);
    expect(parsed?.items).toHaveLength(9);
  });

  it('has nothing to read from a blank capture', () => {
    expect(replayRecord({ ...mercadonaRecord('m1'), raw: { text: '', blocks: [] } })).toBeNull();
  });
});
