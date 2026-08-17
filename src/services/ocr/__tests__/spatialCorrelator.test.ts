import { SPAIN_PRESET } from '../../../config/regionalPresets';
import {
  analyzeLayout,
  extractItemsFromClusters,
  type LayoutAnalysis,
  type LineCluster,
  type OcrElement,
} from '../spatialCorrelator';

function cluster(y: number, productText: string, price: number | null): LineCluster {
  return {
    y,
    elements: [],
    text: price === null ? productText : `${productText} ${price}`,
    price,
    priceText: price === null ? null : String(price),
    productText,
  };
}

function element(y: number, text: string): OcrElement {
  return {
    text,
    x: 0.1,
    y,
    width: 0.5,
    height: 0.02,
    rawBounds: { left: 100, top: y * 1000, width: 500, height: 20 },
  };
}

const NO_ZONE_LAYOUT: LayoutAnalysis = {
  isColumnar: false,
  priceColumnX: null,
  averageLineHeight: 0.02,
  itemZoneY: null,
};

describe('extractItemsFromClusters', () => {
  it('keeps products whose names merely contain a keyword', () => {
    const items = extractItemsFromClusters(
      [
        cluster(0.4, 'ATÚN CLARO OLIVA PK6', 4.75),
        cluster(0.45, 'ACEITE OLIVA VIRGEN', 6.9),
        cluster(0.5, 'CARDO EN CONSERVA', 1.85),
      ],
      NO_ZONE_LAYOUT,
      SPAIN_PRESET
    );

    expect(items.map((i) => i.name)).toEqual([
      'ATÚN CLARO OLIVA PK6',
      'ACEITE OLIVA VIRGEN',
      'CARDO EN CONSERVA',
    ]);
  });

  it('still drops genuine totals and tax lines', () => {
    const items = extractItemsFromClusters(
      [cluster(0.4, 'LECHE ENTERA', 0.98), cluster(0.8, 'TOTAL', 0.98), cluster(0.85, 'IVA', 0.09)],
      NO_ZONE_LAYOUT,
      SPAIN_PRESET
    );

    expect(items.map((i) => i.name)).toEqual(['LECHE ENTERA']);
  });
});

describe('analyzeLayout item zone', () => {
  it('does not end the item zone on a product containing a keyword', () => {
    const elements: OcrElement[] = [
      element(0.1, 'MERCADONA, S.A.'),
      element(0.3, 'LECHE ENTERA 0,98'),
      element(0.4, 'ACEITE OLIVA VIRGEN 6,90'),
      element(0.5, 'PAN INTEGRAL 1,20'),
      element(0.9, 'TOTAL 9,08'),
    ];

    const layout = analyzeLayout(elements);

    expect(layout.itemZoneY?.end).toBe(0.9);
  });
});
