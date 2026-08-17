import { fontModules, fonts, money } from '../type';

describe('font registry', () => {
  it('exposes every family it declares as a loadable module', () => {
    for (const family of Object.values(fonts)) {
      expect(Object.keys(fontModules)).toContain(family);
    }
  });

  it('resolves money() to a family the app actually loads', () => {
    // A wrong fontFamily string fails silently in React Native — the text
    // renders in the system font and nothing throws. This is the guard.
    for (const weight of Object.keys(fonts) as (keyof typeof fonts)[]) {
      expect(Object.keys(fontModules)).toContain(money(weight).fontFamily);
    }
  });

  it('loads no font it cannot name', () => {
    const named = new Set<string>(Object.values(fonts));
    for (const family of Object.keys(fontModules)) {
      expect(named.has(family)).toBe(true);
    }
  });
});
