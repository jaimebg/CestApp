import type { TFunction } from 'i18next';
import { categoryLabel, categoryLabelWithIcon } from '../categoryLabel';
import { DEFAULT_CATEGORIES } from '@/src/db/categoryDefaults';
import en from '@/src/i18n/locales/en.json';
import es from '@/src/i18n/locales/es.json';

const lookup = (bundle: Record<string, Record<string, string>>) =>
  ((key: string) => {
    const [namespace, leaf] = key.split('.');
    return bundle[namespace]?.[leaf] ?? key;
  }) as unknown as TFunction;

const t = lookup(en as never);

describe('categoryLabel', () => {
  it('translates every seeded category in both locales', () => {
    for (const category of DEFAULT_CATEGORIES) {
      for (const [name, bundle] of [
        ['en', en],
        ['es', es],
      ] as const) {
        const label = categoryLabel(category.name, lookup(bundle as never));
        expect(`${name}:${category.name}:${label}`).not.toMatch(/categories\./);
        expect(label.length).toBeGreaterThan(0);
      }
    }
  });

  it('renders the Spanish label rather than the stored English name', () => {
    expect(categoryLabel('Dairy', lookup(es as never))).toBe('Lácteos');
    expect(categoryLabel('Personal Care', lookup(es as never))).toBe('Cuidado personal');
  });

  it('falls back to the stored name for a category we did not seed', () => {
    expect(categoryLabel('Garden Centre', t)).toBe('Garden Centre');
  });

  it('reports an absent category as uncategorised', () => {
    expect(categoryLabel(null, t)).toBe(en.item.uncategorized);
    expect(categoryLabel(undefined, t)).toBe(en.item.uncategorized);
  });
});

describe('categoryLabelWithIcon', () => {
  it('prefixes the icon when the category has one', () => {
    expect(categoryLabelWithIcon({ name: 'Dairy', icon: '🥛' }, t)).toBe('🥛 Dairy');
  });

  it('omits the separator when there is no icon', () => {
    expect(categoryLabelWithIcon({ name: 'Dairy', icon: null }, t)).toBe('Dairy');
  });

  it('returns null for no category', () => {
    expect(categoryLabelWithIcon(null, t)).toBeNull();
  });
});
