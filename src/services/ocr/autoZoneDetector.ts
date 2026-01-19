/**
 * Auto Zone Detector
 * Automatically detects parsing zones from OCR blocks
 */

import type { OcrBlock } from './index';
import type { ZoneDefinition, ZoneType, NormalizedBoundingBox } from '../../types/zones';
import { createScopedLogger } from '../../utils/debug';

const logger = createScopedLogger('AutoZoneDetector');

interface NormalizedBlock {
  text: string;
  normalizedBoundingBox: NormalizedBoundingBox;
  lines: {
    text: string;
    normalizedY: number;
    normalizedHeight: number;
  }[];
}

// Keywords that indicate totals section
const TOTAL_KEYWORDS = [
  'total',
  'subtotal',
  'tax',
  'iva',
  'vat',
  'sum',
  'amount',
  'balance',
  'due',
  'suma',
  'importe',
  'gesamt',
  'somme',
  'montant',
];

// Keywords to skip (not product names)
const SKIP_KEYWORDS = [
  'receipt',
  'ticket',
  'recibo',
  'phone',
  'tel',
  'address',
  'cashier',
  'terminal',
  'register',
  'member',
  'client',
  'welcome',
  'thank',
  'gracias',
  'documento',
  'fecha',
  'hora',
  'date',
  'time',
  'change',
  'cambio',
  'vuelto',
  'paid',
  'pago',
  'payment',
  'efectivo',
  'tarjeta',
  'card',
  'cash',
  'credit',
  'debit',
];

/**
 * Normalize OCR blocks to 0-1 coordinate space
 */
function normalizeBlocks(
  blocks: OcrBlock[],
  dimensions: { width: number; height: number }
): NormalizedBlock[] {
  // First, infer actual dimensions from blocks if needed
  let maxX = 0;
  let maxY = 0;
  blocks.forEach((block) => {
    maxX = Math.max(maxX, block.boundingBox.left + block.boundingBox.width);
    maxY = Math.max(maxY, block.boundingBox.top + block.boundingBox.height);
  });

  // Use larger of provided or inferred dimensions
  const effectiveWidth = Math.max(dimensions.width, maxX * 1.05);
  const effectiveHeight = Math.max(dimensions.height, maxY * 1.05);

  return blocks.map((block) => ({
    text: block.lines.map((l) => l.text).join(' '),
    normalizedBoundingBox: {
      x: block.boundingBox.left / effectiveWidth,
      y: block.boundingBox.top / effectiveHeight,
      width: block.boundingBox.width / effectiveWidth,
      height: block.boundingBox.height / effectiveHeight,
    },
    lines: block.lines.map((line) => ({
      text: line.text,
      normalizedY: line.boundingBox.top / effectiveHeight,
      normalizedHeight: line.boundingBox.height / effectiveHeight,
    })),
  }));
}

/**
 * Check if text contains a price pattern
 */
function containsPrice(text: string): boolean {
  // Match various price formats: 12.34, 12,34, $12.34, €12,34
  return /[\d]+[.,]\d{2}(?!\d)/.test(text);
}

/**
 * Check if text looks like a date
 */
function containsDate(text: string): boolean {
  // Match various date formats
  return (
    /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(text) ||
    /\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}/.test(text) ||
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(text)
  );
}

/**
 * Check if text is a total line
 */
function isTotalLine(text: string): boolean {
  const lower = text.toLowerCase();
  return TOTAL_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Check if text should be skipped (not a product)
 */
function shouldSkipLine(text: string): boolean {
  const lower = text.toLowerCase();
  return SKIP_KEYWORDS.some((kw) => lower.includes(kw)) || isTotalLine(text);
}

/**
 * Check if text looks like a standalone price line
 */
function isStandalonePrice(text: string): boolean {
  const cleaned = text.trim();
  return /^\$?€?[\d.,\s]+$/.test(cleaned) && containsPrice(cleaned);
}

/**
 * Check if text looks like a product name
 */
function isProductName(text: string): boolean {
  const cleaned = text.trim();
  if (cleaned.length < 3) return false;
  if (isStandalonePrice(cleaned)) return false;
  if (shouldSkipLine(cleaned)) return false;
  if (/^[\d\s\-\/\.\:]+$/.test(cleaned)) return false;
  // Must have at least 2 letters
  return /[a-zA-Z]{2,}/.test(cleaned);
}

/**
 * Create a zone definition
 */
function createZone(
  type: ZoneType,
  bbox: NormalizedBoundingBox,
  padding: number = 0.02
): ZoneDefinition {
  return {
    id: `auto-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    boundingBox: {
      x: Math.max(0, bbox.x - padding),
      y: Math.max(0, bbox.y - padding),
      width: Math.min(1 - Math.max(0, bbox.x - padding), bbox.width + padding * 2),
      height: Math.min(1 - Math.max(0, bbox.y - padding), bbox.height + padding * 2),
    },
    isRequired: type === 'product_names' || type === 'prices',
  };
}

/**
 * Merge overlapping or adjacent bounding boxes
 */
function mergeBoundingBoxes(boxes: NormalizedBoundingBox[]): NormalizedBoundingBox {
  if (boxes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Math.min(...boxes.map((b) => b.x));
  let minY = Math.min(...boxes.map((b) => b.y));
  let maxX = Math.max(...boxes.map((b) => b.x + b.width));
  let maxY = Math.max(...boxes.map((b) => b.y + b.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export interface AutoDetectedZones {
  zones: ZoneDefinition[];
  confidence: number;
  debug: {
    storeNameFound: boolean;
    dateFound: boolean;
    productsFound: number;
    pricesFound: number;
    totalFound: boolean;
  };
}

/**
 * Auto-detect parsing zones from OCR blocks
 * Analyzes the structure of the receipt to identify:
 * - Store name (usually top of receipt)
 * - Date (look for date patterns)
 * - Product names section
 * - Prices section
 * - Total section
 */
export function autoDetectZones(
  blocks: OcrBlock[],
  dimensions: { width: number; height: number }
): AutoDetectedZones {
  logger.log('Starting auto zone detection');
  logger.log('Blocks:', blocks.length);
  logger.log('Dimensions:', dimensions);

  if (blocks.length === 0) {
    return {
      zones: [],
      confidence: 0,
      debug: {
        storeNameFound: false,
        dateFound: false,
        productsFound: 0,
        pricesFound: 0,
        totalFound: false,
      },
    };
  }

  const normalizedBlocks = normalizeBlocks(blocks, dimensions);
  const zones: ZoneDefinition[] = [];
  const debug = {
    storeNameFound: false,
    dateFound: false,
    productsFound: 0,
    pricesFound: 0,
    totalFound: false,
  };

  // Sort blocks by Y position (top to bottom)
  const sortedBlocks = [...normalizedBlocks].sort(
    (a, b) => a.normalizedBoundingBox.y - b.normalizedBoundingBox.y
  );

  // 1. Detect store name (usually the first text block at the top)
  for (const block of sortedBlocks.slice(0, 3)) {
    const text = block.text.trim();
    if (text.length >= 3 && text.length <= 60 && /[a-zA-Z]{2,}/.test(text)) {
      // Check it's not a date or skip line
      if (!containsDate(text) && !shouldSkipLine(text)) {
        zones.push(createZone('store_name', block.normalizedBoundingBox, 0.01));
        debug.storeNameFound = true;
        logger.log('Found store name:', text.substring(0, 30));
        break;
      }
    }
  }

  // 2. Detect date zone
  for (const block of sortedBlocks) {
    if (containsDate(block.text)) {
      zones.push(createZone('date', block.normalizedBoundingBox, 0.01));
      debug.dateFound = true;
      logger.log('Found date in:', block.text.substring(0, 30));
      break;
    }
  }

  // 3. Detect total zone (look for "total" keyword with price)
  for (let i = sortedBlocks.length - 1; i >= 0; i--) {
    const block = sortedBlocks[i];
    const lower = block.text.toLowerCase();
    if (lower.includes('total') && !lower.includes('sub') && containsPrice(block.text)) {
      zones.push(createZone('total', block.normalizedBoundingBox, 0.01));
      debug.totalFound = true;
      logger.log('Found total:', block.text.substring(0, 30));
      break;
    }
  }

  // 4. Identify items section
  // Find blocks that contain product names (between header and totals)
  const productBlocks: NormalizedBlock[] = [];
  const priceOnlyBlocks: NormalizedBlock[] = [];

  // Determine header end (after store name and date) and totals start
  let headerEndY = 0.15; // Default: top 15% is header
  let totalsStartY = 0.85; // Default: bottom 15% is totals

  // Find where totals section starts
  for (let i = sortedBlocks.length - 1; i >= 0; i--) {
    const block = sortedBlocks[i];
    if (isTotalLine(block.text)) {
      totalsStartY = Math.min(totalsStartY, block.normalizedBoundingBox.y - 0.02);
    }
  }

  // Analyze middle section for products and prices
  for (const block of sortedBlocks) {
    const y = block.normalizedBoundingBox.y;

    // Skip header and footer regions
    if (y < headerEndY || y > totalsStartY) continue;

    // Check each line in the block
    for (const line of block.lines) {
      if (isStandalonePrice(line.text)) {
        priceOnlyBlocks.push({
          ...block,
          normalizedBoundingBox: {
            ...block.normalizedBoundingBox,
            y: line.normalizedY,
            height: line.normalizedHeight,
          },
        });
        debug.pricesFound++;
      } else if (isProductName(line.text)) {
        productBlocks.push({
          ...block,
          normalizedBoundingBox: {
            ...block.normalizedBoundingBox,
            y: line.normalizedY,
            height: line.normalizedHeight,
          },
        });
        debug.productsFound++;
      }
    }
  }

  logger.log('Product blocks found:', productBlocks.length);
  logger.log('Price-only blocks found:', priceOnlyBlocks.length);

  // 5. Create product_names zone
  if (productBlocks.length > 0) {
    // Check if receipt is columnar (prices in separate column)
    const isColumnar = priceOnlyBlocks.length >= productBlocks.length * 0.5;

    if (isColumnar && priceOnlyBlocks.length > 0) {
      // Columnar layout: create separate zones for products and prices

      // Products zone: left side
      const productBboxes = productBlocks.map((b) => b.normalizedBoundingBox);
      const productMerged = mergeBoundingBoxes(productBboxes);

      // Limit width to left portion
      const avgProductX =
        productBboxes.reduce((sum, b) => sum + b.x + b.width / 2, 0) / productBboxes.length;
      const avgPriceX =
        priceOnlyBlocks.reduce(
          (sum, b) => sum + b.normalizedBoundingBox.x + b.normalizedBoundingBox.width / 2,
          0
        ) / priceOnlyBlocks.length;

      if (avgPriceX > avgProductX) {
        // Prices are to the right of products
        productMerged.width = Math.min(productMerged.width, avgPriceX - productMerged.x - 0.02);

        zones.push(createZone('product_names', productMerged, 0.02));

        // Prices zone: right side
        const priceBboxes = priceOnlyBlocks.map((b) => b.normalizedBoundingBox);
        const priceMerged = mergeBoundingBoxes(priceBboxes);
        zones.push(createZone('prices', priceMerged, 0.02));

        logger.log('Detected columnar layout - products left, prices right');
      } else {
        // Mixed layout or prices on left - just create a single product zone
        zones.push(createZone('product_names', productMerged, 0.02));
        logger.log('Detected mixed layout');
      }
    } else {
      // Inline layout: products and prices on same lines
      // Create a zone covering the entire items section
      const allItemBboxes = [...productBlocks, ...priceOnlyBlocks].map(
        (b) => b.normalizedBoundingBox
      );
      const itemsMerged = mergeBoundingBoxes(allItemBboxes);
      zones.push(createZone('product_names', itemsMerged, 0.02));
      logger.log('Detected inline layout');
    }
  }

  // Calculate confidence based on what was detected
  let confidence = 30;
  if (debug.storeNameFound) confidence += 15;
  if (debug.dateFound) confidence += 10;
  if (debug.productsFound > 0) confidence += 20;
  if (debug.pricesFound > 0) confidence += 15;
  if (debug.totalFound) confidence += 10;

  logger.log('Auto-detected zones:', zones.length);
  logger.log('Detection confidence:', confidence);
  logger.log('Debug info:', debug);

  return {
    zones,
    confidence: Math.min(100, confidence),
    debug,
  };
}

/**
 * Refine auto-detected zones based on parsing results
 * Call this after initial parsing to improve zone accuracy
 */
export function refineZones(
  zones: ZoneDefinition[],
  parsedItems: number,
  expectedTotal: number | null,
  actualItemsSum: number
): ZoneDefinition[] {
  // If parsing was successful (got items), return zones as-is
  if (parsedItems > 0) {
    return zones;
  }

  // If no items were parsed, try to expand product zones
  return zones.map((zone) => {
    if (zone.type === 'product_names') {
      // Expand zone slightly
      return {
        ...zone,
        boundingBox: {
          x: Math.max(0, zone.boundingBox.x - 0.05),
          y: Math.max(0, zone.boundingBox.y - 0.02),
          width: Math.min(1 - zone.boundingBox.x + 0.05, zone.boundingBox.width + 0.1),
          height: Math.min(1 - zone.boundingBox.y + 0.02, zone.boundingBox.height + 0.04),
        },
      };
    }
    return zone;
  });
}
