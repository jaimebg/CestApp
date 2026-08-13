import type { OcrBlock } from './index';

interface PositionedLine {
  text: string;
  centerY: number;
  left: number;
  height: number;
}

/**
 * Fraction of the median line height within which two lines are considered
 * to sit on the same printed row. Generous enough to absorb the slight skew
 * of a hand-held photo, tight enough to keep adjacent rows apart.
 */
const ROW_TOLERANCE_RATIO = 0.6;

/**
 * Rebuilds the printed rows of a receipt from OCR geometry.
 *
 * OCR engines segment columnar receipts into one block per column, so the
 * flattened line list arrives in block order: every product name first, then
 * every unit price, then every line total. Text parsing cannot recover the
 * association from that ordering.
 *
 * Grouping lines by vertical position and re-joining them left-to-right
 * restores the row a human sees:
 *   "2 ZUMO NARANJA C/PULPA" + "1,75" + "3,50"
 *     -> "2 ZUMO NARANJA C/PULPA 1,75 3,50"
 *
 * For single-column receipts every row holds one line, so this is a no-op.
 */
export function reconstructRows(blocks: OcrBlock[]): string[] {
  const lines: PositionedLine[] = [];

  for (const block of blocks) {
    for (const line of block.lines) {
      const text = line.text.trim();
      if (!text) continue;
      const { top, height, left } = line.boundingBox;
      lines.push({ text, centerY: top + height / 2, left, height });
    }
  }

  if (lines.length === 0) return [];

  lines.sort((a, b) => a.centerY - b.centerY);

  const sortedHeights = lines.map((l) => l.height).sort((a, b) => a - b);
  const medianHeight = sortedHeights[Math.floor(sortedHeights.length / 2)];
  const tolerance = Math.max(medianHeight * ROW_TOLERANCE_RATIO, 1);

  const rows: PositionedLine[][] = [];
  let current: PositionedLine[] = [];
  let currentCenter = 0;

  for (const line of lines) {
    if (current.length === 0 || Math.abs(line.centerY - currentCenter) <= tolerance) {
      current.push(line);
      currentCenter = current.reduce((sum, l) => sum + l.centerY, 0) / current.length;
    } else {
      rows.push(current);
      current = [line];
      currentCenter = line.centerY;
    }
  }

  if (current.length > 0) rows.push(current);

  return rows.map((row) =>
    [...row]
      .sort((a, b) => a.left - b.left)
      .map((l) => l.text)
      .join(' ')
  );
}
