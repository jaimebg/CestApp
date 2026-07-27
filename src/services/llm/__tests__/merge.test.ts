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
});
