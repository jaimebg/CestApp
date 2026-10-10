import type { ParsedItem, ParsedReceipt } from '../ocr/parser';
import type { RecordScore, TruthItem, TruthTicket } from './types';

export const NAME_SIMILARITY_THRESHOLD = 0.6;

export function toCents(euros: number): number {
  return Math.round(euros * 100);
}

export function normalizeName(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
}

function levenshtein(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, substitution);
    }
    previous = current;
  }
  return previous[b.length];
}

/** 1 for the same name, falling towards 0 as edits accumulate, after normalizeName. */
export function nameSimilarity(a: string, b: string): number {
  const x = normalizeName(a);
  const y = normalizeName(b);
  const longest = Math.max(x.length, y.length);
  if (longest === 0) return 1;
  return 1 - levenshtein(x, y) / longest;
}

export interface ItemMatch {
  found: number;
  missing: TruthItem[];
  extra: ParsedItem[];
}

/**
 * Pairs parsed items with truth items one to one. A pair needs the same line
 * total in cents and names at least NAME_SIMILARITY_THRESHOLD alike; among
 * several candidates the most alike name wins.
 */
export function matchItems(parsed: ParsedItem[], truth: TruthItem[]): ItemMatch {
  const unmatched = [...parsed];
  const missing: TruthItem[] = [];
  let found = 0;

  for (const expected of truth) {
    let bestIndex = -1;
    let bestSimilarity = 0;

    unmatched.forEach((candidate, index) => {
      if (toCents(candidate.totalPrice) !== toCents(expected.totalPrice)) return;
      const similarity = nameSimilarity(candidate.name, expected.name);
      if (similarity >= NAME_SIMILARITY_THRESHOLD && similarity > bestSimilarity) {
        bestIndex = index;
        bestSimilarity = similarity;
      }
    });

    if (bestIndex === -1) {
      missing.push(expected);
    } else {
      unmatched.splice(bestIndex, 1);
      found++;
    }
  }

  return { found, missing, extra: unmatched };
}

function localDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function itemsAnswer(items: ParsedItem[]): string {
  return items
    .map((item) => toCents(item.totalPrice))
    .sort((a, b) => a - b)
    .join(',');
}

function storeMatches(parsed: ParsedReceipt, chain: string): boolean {
  if (parsed.chainId) return parsed.chainId === chain;
  return (
    parsed.storeName !== null && normalizeName(parsed.storeName).includes(normalizeName(chain))
  );
}

export function scoreRecord(
  id: string,
  parsed: ParsedReceipt | null,
  truth: TruthTicket,
  error: string | null = null
): RecordScore {
  if (parsed === null) {
    return {
      id,
      ticket: truth.ticket,
      error,
      store: false,
      date: false,
      total: false,
      itemsFound: 0,
      itemsMissing: truth.items.length,
      itemsExtra: 0,
      fullyCorrect: false,
      answers: { store: null, date: null, total: null, items: '' },
    };
  }

  const store = storeMatches(parsed, truth.chain);
  const date = parsed.date !== null && localDay(parsed.date) === truth.date;
  const total = parsed.total !== null && toCents(parsed.total) === toCents(truth.total);
  const match = matchItems(parsed.items, truth.items);

  return {
    id,
    ticket: truth.ticket,
    error,
    store,
    date,
    total,
    itemsFound: match.found,
    itemsMissing: match.missing.length,
    itemsExtra: match.extra.length,
    fullyCorrect: store && date && total && match.missing.length === 0 && match.extra.length === 0,
    answers: {
      store: parsed.chainId ?? (parsed.storeName ? normalizeName(parsed.storeName) : null),
      date: parsed.date ? localDay(parsed.date) : null,
      total: parsed.total !== null ? toCents(parsed.total) : null,
      items: itemsAnswer(parsed.items),
    },
  };
}

/** The share of answers that agree with the most common one. */
export function stability(answers: (string | number | null)[]): number {
  if (answers.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const answer of answers) {
    const key = String(answer);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Math.max(...counts.values()) / answers.length;
}
