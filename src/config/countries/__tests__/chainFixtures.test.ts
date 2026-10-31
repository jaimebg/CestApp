import {
  basketWithinTolerance,
  readFixture,
  type ChainFixture,
} from '../../../services/bench/fixture';
import { SCRUB_VERSION, scrubRaw } from '../../../services/bench/scrub';
import { chainFixtureFiles } from './chainFixtureFiles';

const fixtures = chainFixtureFiles() as { name: string; fixture: ChainFixture }[];

test('finds the chain fixtures', () => {
  expect(Array.isArray(fixtures)).toBe(true);
});

for (const { name, fixture } of fixtures) {
  describe(name, () => {
    it('was produced by the scrub tool and has nothing left to scrub', () => {
      expect(fixture.scrubbedBy).toBe(SCRUB_VERSION);
      expect(scrubRaw(fixture.raw)).toEqual(fixture.raw);
    });

    it('is read as its chain and country', () => {
      expect(readFixture(fixture)).toMatchObject({
        chainId: fixture.chainId,
        countryCode: fixture.country,
      });
    });

    it('adds up to the printed figure within the basket tolerance', () => {
      const parsed = readFixture(fixture);
      expect(parsed).not.toBeNull();
      expect(basketWithinTolerance(parsed!, fixture.printed)).toBe(true);
    });
  });
}
