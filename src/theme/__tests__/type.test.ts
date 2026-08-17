import { fontModules, fonts, mono, money } from '../type';

describe('font registry', () => {
  it('exposes every family it declares as a loadable module', () => {
    for (const family of Object.values(fonts)) {
      expect(Object.keys(fontModules)).toContain(family);
    }
  });

  it('resolves money() to a family the app actually loads', () => {
    // A wrong fontFamily string fails silently in React Native — the text
    // renders in the system font and nothing throws. This is the guard.
    for (const weight of Object.keys(mono) as (keyof typeof mono)[]) {
      expect(Object.keys(fontModules)).toContain(money(weight).fontFamily);
    }
  });

  it('loads no font it cannot name', () => {
    const named = new Set<string>([...Object.values(fonts), ...Object.values(mono)]);
    for (const family of Object.keys(fontModules)) {
      expect(named.has(family)).toBe(true);
    }
  });
});

describe('currency typography', () => {
  it('sets money in IBM Plex Mono, not Inter', () => {
    // Receipts are printed in mono; the app's figures should read the same.
    expect(money().fontFamily).toMatch(/^IBMPlexMono_/);
    expect(money('regular').fontFamily).toBe(mono.regular);
    expect(money('semibold').fontFamily).toBe(mono.semibold);
  });

  it('does not declare tabular figures, because mono is already tabular', () => {
    expect(money().fontVariant).toBeUndefined();
  });

  it('loads both mono weights and no more', () => {
    const monoFamilies = Object.keys(fontModules).filter((f) => f.startsWith('IBMPlexMono_'));
    expect(monoFamilies.sort()).toEqual([mono.regular, mono.semibold].sort());
  });
});
