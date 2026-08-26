import type { OcrBlock } from './index';
import { detectChain } from './chainDetector';
import { containsKeyword, parsePrice, TOTAL_KEYWORDS } from './parseUtils';

/** `detectChain`'s name-matching confidence. Below this a match is a guess. */
const CHAIN_CONFIDENCE = 85;

/** A price column's right edges sit within this many line heights of each other. */
const COLUMN_TOLERANCE = 1;

/**
 * Growth reaches this many line heights. Calibrated against the Mercadona photo
 * fixture, whose header block sits 88px from the item block at a 20px line
 * height — real ML Kit blocks are coarse multi-line unions, so the gaps between
 * them span several lines.
 */
const GROWTH_REACH = 5;

/** Fewer price-shaped blocks than this, with no anchor, means no receipt. */
const MIN_PRICES = 3;

export interface ReceiptBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ReceiptRegion {
  blocks: OcrBlock[];
  bounds: ReceiptBounds;
  anchor: 'chain' | 'total' | 'priceColumn' | 'none';
  kept: number;
}

const right = (b: OcrBlock) => b.boundingBox.left + b.boundingBox.width;
const bottom = (b: OcrBlock) => b.boundingBox.top + b.boundingBox.height;

const hasPrice = (b: OcrBlock) => b.text.split(/\s+/).some((token) => parsePrice(token) !== null);

const hasTotalWord = (b: OcrBlock) => {
  const text = b.text.toLowerCase();
  return TOTAL_KEYWORDS.some((word) => containsKeyword(text, word));
};

function medianLineHeight(blocks: OcrBlock[]): number {
  const heights = blocks.map((b) => b.boundingBox.height).sort((a, b) => a - b);
  if (heights.length === 0) return 0;
  return heights[Math.floor(heights.length / 2)];
}

function boundsOf(blocks: OcrBlock[]): ReceiptBounds {
  const left = Math.min(...blocks.map((b) => b.boundingBox.left));
  const top = Math.min(...blocks.map((b) => b.boundingBox.top));
  return {
    left,
    top,
    width: Math.max(...blocks.map(right)) - left,
    height: Math.max(...blocks.map(bottom)) - top,
  };
}

/** The strongest evidence that a given block belongs to a receipt. */
function findAnchor(
  blocks: OcrBlock[],
  lineHeight: number
): { block: OcrBlock; anchor: ReceiptRegion['anchor'] } | null {
  const chain = detectChain(blocks);
  if (chain.chain && chain.confidence >= CHAIN_CONFIDENCE && chain.matchedPattern) {
    const pattern = chain.matchedPattern.toLowerCase();
    const matched = blocks.find((b) => b.text.toLowerCase().includes(pattern));
    if (matched) return { block: matched, anchor: 'chain' };
  }

  const total = blocks.find((b) => hasTotalWord(b) && hasPrice(b));
  if (total) return { block: total, anchor: 'total' };

  // A right-aligned run of prices is a receipt's most distinctive geometry.
  const priced = blocks.filter(hasPrice);
  for (const candidate of priced) {
    const column = priced.filter(
      (b) => Math.abs(right(b) - right(candidate)) <= lineHeight * COLUMN_TOLERANCE
    );
    if (column.length >= MIN_PRICES) return { block: candidate, anchor: 'priceColumn' };
  }

  return null;
}

interface Row {
  blocks: OcrBlock[];
  top: number;
  bottom: number;
}

/**
 * Groups blocks into rows by vertical overlap.
 *
 * A receipt line prints its name, quantity and price as separate blocks at the
 * same height in non-overlapping columns, so rows — not individual blocks — are
 * what grow vertically. A block sharing a row with the receipt is kept even
 * when it sits in a column of its own; the known limitation is a sidebar that
 * spans the receipt's vertical range, which the manual crop covers.
 */
function toRows(blocks: OcrBlock[]): Row[] {
  const rows: Row[] = [];
  for (const candidate of [...blocks].sort((a, b) => a.boundingBox.top - b.boundingBox.top)) {
    const top = candidate.boundingBox.top;
    const base = bottom(candidate);
    const row = rows.find((r) => top < r.bottom && r.top < base);
    if (row) {
      row.blocks.push(candidate);
      row.top = Math.min(row.top, top);
      row.bottom = Math.max(row.bottom, base);
    } else {
      rows.push({ blocks: [candidate], top, bottom: base });
    }
  }
  return rows;
}

function grow(blocks: OcrBlock[], seed: OcrBlock, lineHeight: number): OcrBlock[] {
  const rows = toRows(blocks);
  const seedRow = rows.find((r) => r.blocks.includes(seed));
  if (!seedRow) return [seed];

  const region = [seedRow];
  const rest = rows.filter((r) => r !== seedRow);
  const reach = lineHeight * GROWTH_REACH;

  let added = true;
  while (added) {
    added = false;
    for (let i = rest.length - 1; i >= 0; i -= 1) {
      const candidate = rest[i];
      const touches = region.some(
        (member) =>
          Math.max(candidate.top - member.bottom, member.top - candidate.bottom, 0) <= reach
      );
      if (touches) {
        region.push(candidate);
        rest.splice(i, 1);
        added = true;
      }
    }
  }

  const kept = new Set(region.flatMap((r) => r.blocks));
  return blocks.filter((b) => kept.has(b));
}

/**
 * The receipt inside a capture's OCR blocks, or `null` when there is none.
 *
 * Anchors on receipt-shaped evidence, then grows through adjacent blocks. What
 * is left outside — window chrome from a screenshot, a desk under a photo, a
 * second receipt in frame — never reaches the parser.
 *
 * Refusing needs a high bar: a false refusal is worse than a bad parse, because
 * the review screen exists to fix bad parses. When nothing anchors but prices
 * are present, every block is returned with `anchor: 'none'` rather than
 * refusing — uncertain degrades to the old behaviour.
 */
export function findReceiptRegion(blocks: OcrBlock[]): ReceiptRegion | null {
  if (blocks.length === 0) return null;

  const lineHeight = medianLineHeight(blocks);
  const anchor = findAnchor(blocks, lineHeight);

  if (!anchor) {
    if (blocks.filter(hasPrice).length < MIN_PRICES) return null;
    return { blocks, bounds: boundsOf(blocks), anchor: 'none', kept: 1 };
  }

  const kept = grow(blocks, anchor.block, lineHeight);
  return {
    blocks: kept,
    bounds: boundsOf(kept),
    anchor: anchor.anchor,
    kept: kept.length / blocks.length,
  };
}
