import { voteTotal, mergeParsedReceipts } from '../merge';
import type { ParsedReceipt, ParsedItem } from '../../ocr/parser';
import type { LlmReceipt } from '../types';

const LINES = ['1 HAC LECHE SEMI 1L 0,98', '2 PAN INTEGRAL 1,20 2,40', 'TOTAL (€) 3,38'];

function item(name: string, totalPrice: number): ParsedItem {
  return { name, quantity: 1, unitPrice: totalPrice, totalPrice, unit: null, confidence: 80 };
}

function deterministic(overrides: Partial<ParsedReceipt> = {}): ParsedReceipt {
  return {
    storeName: 'Mercadona',
    storeAddress: null,
    date: new Date('2026-03-10'),
    time: '18:45',
    dateString: '10/03/2026',
    items: [],
    subtotal: null,
    tax: null,
    discount: null,
    total: 3.38,
    paymentMethod: 'card',
    rawText: LINES.join('\n'),
    confidence: 40,
    chainId: 'mercadona',
    chainName: 'Mercadona',
    chainConfidence: 98,
    parsingMethod: 'chain',
    ...overrides,
  };
}

function llm(overrides: Partial<LlmReceipt> = {}): LlmReceipt {
  return {
    storeName: 'Mercadona S.A.',
    date: '10/03/2026',
    time: '18:45',
    total: 3.38,
    items: [item('Leche semidesnatada', 0.98), item('Pan integral', 2.4)],
    ...overrides,
  };
}

describe('voteTotal', () => {
  it('returns the majority value with three sources', () => {
    expect(voteTotal(3.38, 3.38, 9.99)).toBe(3.38);
    expect(voteTotal(9.99, 3.38, 3.38)).toBe(3.38);
  });

  it('keeps the parser total when three sources disagree', () => {
    expect(voteTotal(1, 2, 3)).toBe(1);
  });

  it('keeps the parser total when detectedTotal is null', () => {
    expect(voteTotal(3.38, null, 9.99)).toBe(3.38);
  });

  it('fills the gap from the LLM when the parser has no total', () => {
    expect(voteTotal(null, null, 3.38)).toBe(3.38);
  });

  it('returns null when no source has a total', () => {
    expect(voteTotal(null, null, null)).toBeNull();
  });

  it('fills the gap from detectedTotal when the parser and the LLM have no total', () => {
    expect(voteTotal(null, 3.38, null)).toBe(3.38);
  });

  it('prefers detectedTotal over the LLM total when the parser has no total', () => {
    expect(voteTotal(null, 3.38, 9.99)).toBe(3.38);
  });

  it('keeps the parser total when the LLM has no total', () => {
    expect(voteTotal(3.38, 9.99, null)).toBe(3.38);
  });
});

describe('mergeParsedReceipts', () => {
  it('applies LLM items automatically when they reconcile', () => {
    const result = mergeParsedReceipts(deterministic(), llm(), LINES, null);
    expect(result.outcome).toBe('auto');
    expect(result.merged.items).toHaveLength(2);
  });

  it('never overrides chain identity', () => {
    const result = mergeParsedReceipts(deterministic(), llm(), LINES, null);
    expect(result.merged.chainId).toBe('mercadona');
    expect(result.merged.chainName).toBe('Mercadona');
    expect(result.merged.parsingMethod).toBe('chain');
  });

  it('keeps the deterministic store name when present', () => {
    const result = mergeParsedReceipts(deterministic(), llm(), LINES, null);
    expect(result.merged.storeName).toBe('Mercadona');
  });

  it('fills the store name only when the deterministic one is null', () => {
    const result = mergeParsedReceipts(deterministic({ storeName: null }), llm(), LINES, null);
    expect(result.merged.storeName).toBe('Mercadona S.A.');
  });

  it('fills both date and dateString from the LLM when the parser has neither', () => {
    const result = mergeParsedReceipts(
      deterministic({ date: null, dateString: null }),
      llm({ date: '15/04/2026' }),
      LINES,
      null
    );
    expect(result.merged.date).toEqual(new Date(2026, 3, 15));
    expect(result.merged.dateString).toBe('15/04/2026');
  });

  it('fills neither date field when the LLM date is malformed', () => {
    const result = mergeParsedReceipts(
      deterministic({ date: null, dateString: null }),
      llm({ date: '2026-03-10' }),
      LINES,
      null
    );
    expect(result.merged.date).toBeNull();
    expect(result.merged.dateString).toBeNull();
  });

  it('never overrides the parser date with the LLM date', () => {
    const result = mergeParsedReceipts(deterministic(), llm({ date: '01/01/2020' }), LINES, null);
    expect(result.merged.date).toEqual(deterministic().date);
    expect(result.merged.dateString).toBe(deterministic().dateString);
  });

  it('never takes rawText or paymentMethod from the LLM', () => {
    const result = mergeParsedReceipts(deterministic(), llm(), LINES, null);
    expect(result.merged.rawText).toBe(LINES.join('\n'));
    expect(result.merged.paymentMethod).toBe('card');
  });

  it('downgrades to a proposal when items do not reconcile', () => {
    const result = mergeParsedReceipts(
      deterministic(),
      llm({ items: [item('Leche semidesnatada', 0.98)] }),
      LINES,
      null
    );
    expect(result.outcome).toBe('proposal');
  });

  it('drops hallucinated items before reconciling', () => {
    const result = mergeParsedReceipts(
      deterministic(),
      llm({ items: [...llm().items, item('Caviar', 500)] }),
      LINES,
      null
    );
    expect(result.merged.items.every((current) => current.name !== 'Caviar')).toBe(true);
    expect(result.outcome).toBe('auto');
  });

  it('returns none when the LLM produced no usable items', () => {
    const result = mergeParsedReceipts(deterministic(), llm({ items: [] }), LINES, null);
    expect(result.outcome).toBe('none');
    expect(result.merged).toEqual(deterministic());
  });

  it('never auto-applies when the merged total is null', () => {
    const result = mergeParsedReceipts(
      deterministic({ total: null }),
      llm({ total: null }),
      LINES,
      null
    );
    expect(result.outcome).not.toBe('auto');
  });

  it('fills neither date field when the LLM date rolls over to a calendar-invalid date', () => {
    const result = mergeParsedReceipts(
      deterministic({ date: null, dateString: null }),
      llm({ date: '31/02/2026' }),
      LINES,
      null
    );
    expect(result.merged.date).toBeNull();
    expect(result.merged.dateString).toBeNull();
  });

  it('downgrades to a proposal when a reconciling LLM result has fewer items than the deterministic parse', () => {
    const result = mergeParsedReceipts(
      deterministic({ items: [item('A', 1), item('B', 1), item('C', 1.38)] }),
      llm(),
      LINES,
      null
    );
    expect(result.outcome).toBe('proposal');
  });

  it('stays auto when a reconciling LLM result has the same number of items as the deterministic parse', () => {
    const result = mergeParsedReceipts(
      deterministic({ items: [item('X', 1), item('Y', 1)] }),
      llm(),
      LINES,
      null
    );
    expect(result.outcome).toBe('auto');
  });

  it('stays auto when a reconciling LLM result has more items than the deterministic parse', () => {
    const result = mergeParsedReceipts(
      deterministic({ items: [item('X', 1)] }),
      llm(),
      LINES,
      null
    );
    expect(result.outcome).toBe('auto');
  });

  it('downgrades a fabricated single item priced at the total to a proposal, never auto', () => {
    const totalLines = ['1 HAC LECHE SEMI 1L 0,98', '2 PAN INTEGRAL 1,20 2,40', 'TOTAL (€) 3,38'];
    const result = mergeParsedReceipts(
      deterministic({ items: [] }),
      llm({ items: [item('Total compra', 3.38)] }),
      totalLines,
      null
    );
    expect(result.outcome).not.toBe('auto');
    expect(result.outcome).toBe('proposal');
  });

  it('stays auto for a single-item LLM result when the deterministic parse also finds exactly one item', () => {
    const result = mergeParsedReceipts(
      deterministic({ items: [item('Leche semidesnatada', 0.98)], total: 0.98 }),
      llm({ items: [item('Leche semidesnatada', 0.98)], total: 0.98 }),
      LINES,
      null
    );
    expect(result.outcome).toBe('auto');
  });

  it('stays auto for a reconciling multi-item LLM result against a zero-item deterministic parse', () => {
    const result = mergeParsedReceipts(deterministic({ items: [] }), llm(), LINES, null);
    expect(result.outcome).toBe('auto');
  });
});
