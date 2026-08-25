import en from '../locales/en.json';
import es from '../locales/es.json';
import { DEFAULT_CATEGORIES } from '@/src/db/categoryDefaults';

type Bundle = { [key: string]: string | Bundle };

function flatten(bundle: Bundle, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(bundle)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[path] = value;
    else Object.assign(out, flatten(value, path));
  }
  return out;
}

const flatEn = flatten(en as Bundle);
const flatEs = flatten(es as Bundle);

describe('locale bundles', () => {
  it('define the same keys', () => {
    expect(Object.keys(flatEs).sort()).toEqual(Object.keys(flatEn).sort());
  });

  it('leave no string empty', () => {
    const blank = Object.entries({ ...flatEn, ...flatEs })
      .filter(([, value]) => value.trim().length === 0)
      .map(([key]) => key);
    expect(blank).toEqual([]);
  });

  /**
   * Category rows store an English name and the UI renders `categories.*`
   * instead. A seeded category with no entry here would fall back to that raw
   * English name in the Spanish app, which is how the namespace came to exist
   * fully translated and entirely unused.
   */
  it('translate every seeded category', () => {
    const keys = Object.keys(flatEn);
    for (const category of DEFAULT_CATEGORIES) {
      // Bracket access, not toHaveProperty: these keys contain dots.
      expect(keys).toContain(`categories.${category.translationKey}`);
      expect(flatEs[`categories.${category.translationKey}`]).toBeTruthy();
    }
  });

  it('carry a Spanish year placeholder, not the English one', () => {
    expect(flatEs['scan.yearPlaceholder']).toBe('AAAA');
    expect(flatEn['scan.yearPlaceholder']).toBe('YYYY');
  });
});
