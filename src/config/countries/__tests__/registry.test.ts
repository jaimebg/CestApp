import { COUNTRIES, getAllTemplates, getChainTemplate, templateKey } from '../index';

test('keeps the Spanish chain ids', () => {
  expect(
    getAllTemplates()
      .filter((t) => t.country === 'ES')
      .map((t) => t.chainId)
      .sort()
  ).toEqual([
    'alcampo',
    'aldi',
    'carrefour',
    'consum',
    'dia',
    'eroski',
    'hiperdino',
    'lidl',
    'mercadona',
  ]);
});

test('template keys are unique', () => {
  const keys = getAllTemplates().map(templateKey);
  expect(new Set(keys).size).toBe(keys.length);
});

test('every template belongs to a defined country', () => {
  for (const t of getAllTemplates()) expect(COUNTRIES[t.country]).toBeDefined();
});

test('looks templates up by country and chain', () => {
  expect(getChainTemplate('ES', 'mercadona')?.name).toBe('Mercadona');
  expect(getChainTemplate('PT', 'mercadona')).toBeNull();
});

test('every NIF the old lookup knew is on its template', () => {
  const nifs = getAllTemplates().flatMap((t) => t.nifPatterns.map((n) => n.replace('-', '')));
  for (const nif of [
    'A46103834',
    'A28425270',
    'A78947579',
    'A28090108',
    'A60195278',
    'F20033361',
    'A08207769',
    'A28164754',
    'F46078986',
    'A28581882',
    'B82258301',
    'A35032517',
  ]) {
    expect(nifs).toContain(nif);
  }
});
