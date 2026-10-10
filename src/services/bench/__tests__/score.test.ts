import { createManualParsedReceipt, type ParsedItem, type ParsedReceipt } from '../../ocr/parser';
import { matchItems, nameSimilarity, normalizeName, scoreRecord, stability } from '../score';
import type { TruthTicket } from '../types';

function item(name: string, totalPrice: number): ParsedItem {
  return { name, quantity: 1, unitPrice: totalPrice, totalPrice, unit: null, confidence: 90 };
}

function receipt(overrides: Partial<ParsedReceipt> = {}): ParsedReceipt {
  return {
    ...createManualParsedReceipt(new Date(2026, 7, 11)),
    storeName: 'Mercadona',
    total: 4.5,
    items: [item('BEBIDA AVENA', 1), item('ZUMO NARANJA C/PULPA', 3.5)],
    ...overrides,
  };
}

const TRUTH: TruthTicket = {
  ticket: 'mercadona-a',
  chain: 'mercadona',
  date: '2026-08-11',
  total: 4.5,
  items: [
    { name: 'BEBIDA AVENA', totalPrice: 1 },
    { name: 'ZUMO NARANJA C/PULPA', quantity: 2, totalPrice: 3.5 },
  ],
  captures: ['a'],
};

describe('normalizeName', () => {
  it('ignores accents, case and spacing', () => {
    expect(normalizeName('  Escalopín   salmón ')).toBe('ESCALOPIN SALMON');
  });
});

describe('nameSimilarity', () => {
  it('scores identical names as 1', () => {
    expect(nameSimilarity('Queso cottage', 'QUESO COTTAGE')).toBe(1);
  });

  it('keeps a truncated name close', () => {
    expect(nameSimilarity('LECHE SEMI HACEND', 'LECHE SEMI HACENDADO')).toBeCloseTo(0.85, 2);
  });

  it('keeps different products apart', () => {
    expect(nameSimilarity('PLATANO', 'QUESO COTTAGE')).toBeLessThan(0.6);
  });
});

describe('matchItems', () => {
  it('finds every item of a correct reading', () => {
    expect(matchItems(receipt().items, TRUTH.items)).toEqual({ found: 2, missing: [], extra: [] });
  });

  it('counts a misread price as one missing and one extra', () => {
    const parsed = [item('BEBIDA AVENA', 1), item('ZUMO NARANJA C/PULPA', 3.8)];

    const match = matchItems(parsed, TRUTH.items);

    expect(match.found).toBe(1);
    expect(match.missing).toEqual([TRUTH.items[1]]);
    expect(match.extra).toEqual([parsed[1]]);
  });

  it('accepts a name misread by a letter', () => {
    const parsed = [item('BEBIDA AVENA', 1), item('ZUMO NARANIA C/PULPA', 3.5)];

    expect(matchItems(parsed, TRUTH.items).found).toBe(2);
  });

  it('rejects a different name at the same price', () => {
    const parsed = [item('ENTREGADO', 1), item('ZUMO NARANJA C/PULPA', 3.5)];

    const match = matchItems(parsed, TRUTH.items);

    expect(match.found).toBe(1);
    expect(match.missing).toEqual([TRUTH.items[0]]);
  });

  it('pairs repeated items one to one', () => {
    const truth = [
      { name: 'PLATANO', totalPrice: 1.78 },
      { name: 'PLATANO', totalPrice: 1.78 },
    ];

    const match = matchItems([item('PLATANO', 1.78)], truth);

    expect(match.found).toBe(1);
    expect(match.missing).toHaveLength(1);
  });
});

describe('scoreRecord', () => {
  it('marks a correct reading fully correct', () => {
    const score = scoreRecord('a', receipt(), TRUTH);

    expect(score).toMatchObject({
      id: 'a',
      ticket: 'mercadona-a',
      error: null,
      store: true,
      date: true,
      total: true,
      itemsFound: 2,
      itemsMissing: 0,
      itemsExtra: 0,
      fullyCorrect: true,
    });
    expect(score.answers).toEqual({
      store: 'MERCADONA',
      date: '2026-08-11',
      total: 450,
      items: '100,350',
    });
  });

  it('trusts the detected chain over the printed name', () => {
    expect(scoreRecord('a', receipt({ chainId: 'carrefour' }), TRUTH).store).toBe(false);
  });

  it('fails a total one cent off', () => {
    const score = scoreRecord('a', receipt({ total: 4.49 }), TRUTH);

    expect(score.total).toBe(false);
    expect(score.fullyCorrect).toBe(false);
  });

  it('fails a date on another day', () => {
    expect(scoreRecord('a', receipt({ date: new Date(2026, 7, 12) }), TRUTH).date).toBe(false);
  });

  it('scores a capture nothing was read from as all wrong, keeping the reason', () => {
    const score = scoreRecord('a', null, TRUTH, 'boom');

    expect(score).toMatchObject({
      error: 'boom',
      store: false,
      date: false,
      total: false,
      itemsFound: 0,
      itemsMissing: 2,
      itemsExtra: 0,
      fullyCorrect: false,
    });
  });
});

describe('stability', () => {
  it('is the share agreeing with the most common answer', () => {
    expect(stability(['a', 'a', 'b'])).toBeCloseTo(2 / 3);
  });

  it('is unaffected by which side of a tie wins', () => {
    expect(stability(['a', 'a', 'b', 'b'])).toBe(0.5);
  });

  it('treats a missing answer as an answer', () => {
    expect(stability([null, null, 5])).toBeCloseTo(2 / 3);
  });

  it('is 0 with nothing to compare', () => {
    expect(stability([])).toBe(0);
  });
});
