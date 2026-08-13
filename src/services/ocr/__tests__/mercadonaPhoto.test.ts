import { MERCADONA_PHOTO_BLOCKS } from './fixtures.mercadonaPhoto';
import { autoDetectZones } from '../autoZoneDetector';
import { parseWithTemplate, parseWithSpatialCorrelation } from '../templateParser';
import type { StoreParsingTemplate } from '../../../db/schema/storeParsingTemplates';
import type { ParsedReceipt } from '../parser';

const DIMS = { width: 612, height: 1122 };

const EXPECTED_ITEMS = [
  { name: 'BEBIDA AVENA', quantity: 1, totalPrice: 1.0 },
  { name: 'ZUMO NARANJA C/PULPA', quantity: 2, unitPrice: 1.75, totalPrice: 3.5 },
  { name: 'TORTITA LEGUMBRE 44%', quantity: 1, totalPrice: 1.75 },
  { name: 'ESCALOPIN SALMÓN', quantity: 1, totalPrice: 7.8 },
  { name: 'PECHUGA PAVO 92%', quantity: 2, unitPrice: 2.85, totalPrice: 5.7 },
  { name: '100% INTEGRAL FINO', quantity: 1, totalPrice: 1.5 },
  { name: 'QUESO COTTAGE', quantity: 3, unitPrice: 1.35, totalPrice: 4.05 },
  { name: 'CREMA COTTAGE', quantity: 1, totalPrice: 1.5 },
  { name: 'PLATANO', quantity: 0.914, unit: 'kg', totalPrice: 1.78 },
];

const NON_ITEM_TEXT = [
  'descripción',
  'p. unit',
  'importe',
  'total',
  'tarjeta',
  'comerciante',
  'minorista',
  'devoluciones',
  'factura',
  'teléfono',
  'visa',
  'verificado',
];

function parseViaZones(): ParsedReceipt {
  const detected = autoDetectZones(MERCADONA_PHOTO_BLOCKS, DIMS);
  const template = {
    id: 0,
    storeId: 0,
    zones: detected.zones,
    parsingHints: null,
    sampleImagePath: null,
    templateImageDimensions: DIMS,
    fingerprint: null,
    confidence: 70,
    useCount: 0,
    successCount: 0,
    failureCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as StoreParsingTemplate;

  const rawText = MERCADONA_PHOTO_BLOCKS.map((b) => b.text).join('\n');
  return parseWithTemplate(MERCADONA_PHOTO_BLOCKS, template, rawText, DIMS);
}

function parseViaSpatial(): ParsedReceipt {
  const rawText = MERCADONA_PHOTO_BLOCKS.map((b) => b.text).join('\n');
  return parseWithSpatialCorrelation(MERCADONA_PHOTO_BLOCKS, rawText, DIMS);
}

describe.each([
  ['auto-detected zones (parseWithTemplate)', parseViaZones],
  ['no zones (parseWithSpatialCorrelation)', parseViaSpatial],
])('Mercadona columnar receipt photo via %s', (_label, parse) => {
  const result = parse();

  it('uses the canonical chain name, not the raw header line', () => {
    expect(result.storeName).toBe('Mercadona');
  });

  it('extracts the total', () => {
    expect(result.total).toBe(28.58);
  });

  it('extracts exactly the 9 real line items', () => {
    expect(result.items).toHaveLength(EXPECTED_ITEMS.length);
  });

  it('does not add column headers, totals or footer text as items', () => {
    const names = result.items.map((i) => i.name.toLowerCase());
    for (const junk of NON_ITEM_TEXT) {
      expect(names.some((n) => n.includes(junk))).toBe(false);
    }
  });

  it('does not add bare prices as items', () => {
    const names = result.items.map((i) => i.name.trim());
    expect(names.some((n) => /^\d+[,.]\d{2}$/.test(n))).toBe(false);
  });

  it('items sum to the receipt total', () => {
    const sum = result.items.reduce((s, i) => s + i.totalPrice, 0);
    expect(sum).toBeCloseTo(28.58, 2);
  });

  it('names items exactly, without the quantity column leaking in', () => {
    expect(result.items.map((i) => i.name.trim())).toEqual(EXPECTED_ITEMS.map((i) => i.name));
  });

  describe.each(EXPECTED_ITEMS)('item "$name"', (expected) => {
    const find = () =>
      result.items.find((i) => i.name.toUpperCase().includes(expected.name.toUpperCase()));

    it('is present', () => {
      expect(find()).toBeDefined();
    });

    it(`has line total ${expected.totalPrice}`, () => {
      expect(find()?.totalPrice).toBeCloseTo(expected.totalPrice, 2);
    });

    it(`has quantity ${expected.quantity}`, () => {
      expect(find()?.quantity).toBeCloseTo(expected.quantity, 3);
    });

    if (expected.unitPrice !== undefined) {
      it(`has unit price ${expected.unitPrice}`, () => {
        expect(find()?.unitPrice).toBeCloseTo(expected.unitPrice, 2);
      });
    }

    if (expected.unit !== undefined) {
      it(`has unit "${expected.unit}"`, () => {
        expect(find()?.unit).toBe(expected.unit);
      });
    }
  });
});
