/**
 * Auto Zone Detector
 * Automatically detects parsing zones from OCR blocks
 */

import type { OcrBlock } from './index';
import type { ZoneDefinition, ZoneType, NormalizedBoundingBox } from '../../types/zones';
import { createScopedLogger } from '../../utils/debug';
import { detectRegionFromText, type RegionalPreset } from '../../config/regionalPresets';

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
  'factura',
  'phone',
  'tel',
  'telefono',
  'teléfono',
  'address',
  'direccion',
  'dirección',
  'cashier',
  'cajero',
  'terminal',
  'register',
  'caja',
  'member',
  'socio',
  'client',
  'cliente',
  'welcome',
  'bienvenido',
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
  'credito',
  'crédito',
  'debito',
  'débito',
  // Company/legal info
  'c.i.f',
  'cif',
  'n.i.f',
  'nif',
  's.l.',
  's.a.',
  'supermercados',
  'hipermercados',
  // Store codes and addresses
  'www.',
  'http',
  '@',
  'email',
  'correo',
];

// Keywords that indicate header/company info (not products)
const HEADER_KEYWORDS = [
  'supermercados',
  'hipermercados',
  's.l.',
  's.a.',
  'sociedad',
  'empresa',
  'tienda',
  'sucursal',
  'centro',
  'comercial',
  'avda',
  'avenida',
  'calle',
  'c/',
  'plaza',
  'polígono',
  'codigo postal',
  'c.p.',
];

/**
 * Check if text contains a known store name from regional preset
 * Returns the matched store name or null
 */
function findKnownStoreName(text: string, preset: RegionalPreset | null): string | null {
  if (!preset?.commonStores) return null;

  const upper = text.toUpperCase();

  for (const storeName of preset.commonStores) {
    if (upper.includes(storeName)) {
      return storeName;
    }
  }

  return null;
}

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
 * Extract price value from text (assumes comma as decimal separator for Spain)
 */
function extractPriceValue(text: string): number | null {
  // Match price pattern with comma decimal (European format)
  const commaMatch = text.match(/[\d.]+,\d{2}/);
  if (commaMatch) {
    const normalized = commaMatch[0].replace(/\./g, '').replace(',', '.');
    const value = parseFloat(normalized);
    return isNaN(value) ? null : value;
  }

  // Match price pattern with dot decimal (US format)
  const dotMatch = text.match(/\d+\.\d{2}/);
  if (dotMatch) {
    const value = parseFloat(dotMatch[0]);
    return isNaN(value) ? null : value;
  }

  return null;
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
  // Must have at least 2 letters (Unicode-aware)
  return hasMinLetters(cleaned, 2);
}

/**
 * Check if text is a header/company info line (not a product)
 */
function isHeaderLine(text: string): boolean {
  const lower = text.toLowerCase();
  return HEADER_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Check if text contains letters (including Unicode/accented characters)
 */
function hasLetters(text: string): boolean {
  // Match any letter including accented characters, ñ, etc.
  return /\p{L}/u.test(text);
}

/**
 * Check if text has at least N letters
 */
function hasMinLetters(text: string, minCount: number): boolean {
  const matches = text.match(/\p{L}/gu);
  return matches !== null && matches.length >= minCount;
}

/**
 * Check if a line looks like an item line (product name + price)
 * This handles inline layouts where product and price are on the same line
 */
function isItemLine(text: string): boolean {
  const cleaned = text.trim();

  // Must have some minimum length
  if (cleaned.length < 5) return false;

  // Skip if it's a header/skip line
  if (shouldSkipLine(cleaned)) return false;
  if (isHeaderLine(cleaned)) return false;
  if (isTotalLine(cleaned)) return false;

  // Must have a price pattern
  const hasPrice = containsPrice(cleaned);
  if (!hasPrice) return false;

  // Must not be a standalone price
  if (isStandalonePrice(cleaned)) return false;

  // Must have some text (letters) before or around the price
  // Use Unicode-aware letter matching for Spanish/accented characters
  const hasText = hasMinLetters(cleaned, 2);

  // Check for pattern: text followed by price at the end
  // Common patterns: "PRODUCT NAME 1,99" or "PRODUCT NAME 1.99"
  // Use Unicode letter class \p{L} for international support
  const hasInlinePrice = /\p{L}.+\s+\d+[.,]\d{2}/u.test(cleaned);

  return hasText && (hasInlinePrice || hasPrice);
}

/**
 * Extract the Y range where item lines appear
 * Returns the start and end Y positions of the items section
 */
function findItemsYRange(
  blocks: NormalizedBlock[],
  totalsStartY: number
): { startY: number; endY: number } | null {
  const itemLines: { y: number; text: string }[] = [];
  let linesChecked = 0;
  let linesWithPrice = 0;

  for (const block of blocks) {
    for (const line of block.lines) {
      linesChecked++;

      // Skip lines in totals section
      if (line.normalizedY >= totalsStartY) continue;

      // Log lines that have prices for debugging
      if (containsPrice(line.text)) {
        linesWithPrice++;
        const isItem = isItemLine(line.text);
        logger.log(`Line with price: "${line.text.substring(0, 50)}" -> isItemLine: ${isItem}`);
      }

      if (isItemLine(line.text)) {
        itemLines.push({ y: line.normalizedY, text: line.text });
      }
    }
  }

  logger.log(
    `Checked ${linesChecked} lines, ${linesWithPrice} with prices, ${itemLines.length} detected as items`
  );

  if (itemLines.length === 0) {
    return null;
  }

  // Sort by Y position
  itemLines.sort((a, b) => a.y - b.y);

  // Find the first and last item lines
  const startY = itemLines[0].y;
  const endY = itemLines[itemLines.length - 1].y;

  logger.log(
    `Found ${itemLines.length} item lines from Y=${startY.toFixed(3)} to Y=${endY.toFixed(3)}`
  );
  if (itemLines.length > 0) {
    logger.log('First item line:', itemLines[0].text.substring(0, 40));
    logger.log('Last item line:', itemLines[itemLines.length - 1].text.substring(0, 40));
  }

  return { startY, endY };
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
  /** Total value detected directly from OCR (bypasses zone extraction issues) */
  detectedTotal: number | null;
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

  // Log sample blocks to see structure
  if (blocks.length > 0) {
    const sampleBlocks = blocks.slice(0, 5);
    logger.log('Sample blocks:');
    sampleBlocks.forEach((block, i) => {
      const lines = block.lines.map((l) => l.text).join(' | ');
      logger.log(`  Block ${i}: "${lines.substring(0, 80)}"`);
    });
  }

  if (blocks.length === 0) {
    return {
      zones: [],
      confidence: 0,
      detectedTotal: null,
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
  let detectedTotal: number | null = null;
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

  // Detect regional preset from all text
  const allText = sortedBlocks.map((b) => b.text).join('\n');
  const preset = detectRegionFromText(allText);

  // 1. Detect store name (usually the first text block at the top)
  // First, try to find a block with a known store name (prioritize this)
  let storeNameBlock: NormalizedBlock | null = null;
  let foundStoreName: string | null = null;

  for (const block of sortedBlocks.slice(0, 5)) {
    const text = block.text.trim();
    const knownStore = findKnownStoreName(text, preset);
    if (knownStore) {
      storeNameBlock = block;
      foundStoreName = knownStore;
      logger.log('Found known store name:', knownStore, 'in:', text.substring(0, 40));
      break;
    }
  }

  // If no known store found, use heuristic (first valid text block)
  if (!storeNameBlock) {
    for (const block of sortedBlocks.slice(0, 3)) {
      const text = block.text.trim();
      if (text.length >= 3 && text.length <= 60 && hasMinLetters(text, 2)) {
        // Check it's not a date or skip line
        if (!containsDate(text) && !shouldSkipLine(text)) {
          storeNameBlock = block;
          logger.log('Found store name (heuristic):', text.substring(0, 30));
          break;
        }
      }
    }
  }

  if (storeNameBlock) {
    zones.push(createZone('store_name', storeNameBlock.normalizedBoundingBox, 0.01));
    debug.storeNameFound = true;
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

  // 3. Detect total zone (look for total keywords with price)
  // Use regional preset keywords if available
  const totalKeywords = preset?.keywords?.total || TOTAL_KEYWORDS;

  // First, try to find a block with both total keyword AND price
  for (let i = sortedBlocks.length - 1; i >= 0; i--) {
    const block = sortedBlocks[i];
    const upper = block.text.toUpperCase();
    const lower = block.text.toLowerCase();

    // Check for any total keyword (from preset or default)
    const hasTotalKeyword = totalKeywords.some((kw) => upper.includes(kw.toUpperCase()));
    const isSubtotal = lower.includes('sub');
    const hasPrice = containsPrice(block.text);

    if (hasTotalKeyword && !isSubtotal && hasPrice) {
      zones.push(createZone('total', block.normalizedBoundingBox, 0.03));
      debug.totalFound = true;
      // Extract the actual total value
      detectedTotal = extractPriceValue(block.text);
      logger.log(
        'Found total (same block):',
        block.text.substring(0, 30),
        '- value:',
        detectedTotal
      );
      break;
    }
  }

  // If not found, look for total keyword and then find the nearest price below it
  // This handles receipts where "TOTAL" and the price are on separate lines
  if (!debug.totalFound) {
    let totalKeywordBlock: NormalizedBlock | null = null;
    let totalKeywordY = 0;

    // Find the total keyword (search from bottom up, skip subtotals)
    for (let i = sortedBlocks.length - 1; i >= 0; i--) {
      const block = sortedBlocks[i];
      const upper = block.text.toUpperCase();
      const lower = block.text.toLowerCase();

      const hasTotalKeyword = totalKeywords.some((kw) => upper.includes(kw.toUpperCase()));
      const isSubtotal = lower.includes('sub') || lower.includes('parcial');

      // Must be in bottom half and be a total (not subtotal)
      if (hasTotalKeyword && !isSubtotal && block.normalizedBoundingBox.y > 0.5) {
        totalKeywordBlock = block;
        totalKeywordY = block.normalizedBoundingBox.y;
        logger.log(
          'Found total keyword (no price):',
          block.text.substring(0, 30),
          'at Y:',
          totalKeywordY.toFixed(3)
        );
        break;
      }
    }

    // If we found a total keyword, look for a price nearby (below it)
    if (totalKeywordBlock) {
      let nearestPriceBlock: NormalizedBlock | null = null;
      let smallestDistance = Infinity;

      for (const block of sortedBlocks) {
        const blockY = block.normalizedBoundingBox.y;
        // Look for prices within 10% of image height below the total keyword
        const distance = blockY - totalKeywordY;

        if (distance >= -0.02 && distance < 0.1 && containsPrice(block.text)) {
          // Prefer standalone prices (not item lines with product names)
          const isStandalone = isStandalonePrice(block.text);
          const effectiveDistance = isStandalone ? distance : distance + 0.05; // Penalize non-standalone

          if (effectiveDistance < smallestDistance) {
            smallestDistance = effectiveDistance;
            nearestPriceBlock = block;
          }
        }
      }

      if (nearestPriceBlock) {
        // Create a zone that covers both the keyword and the price
        // Use extra vertical padding (0.05 = 5%) to survive aspect ratio transformations
        const mergedBbox = mergeBoundingBoxes([
          totalKeywordBlock.normalizedBoundingBox,
          nearestPriceBlock.normalizedBoundingBox,
        ]);
        // Extend the zone vertically to ensure it captures the price after transformations
        const extendedBbox: NormalizedBoundingBox = {
          ...mergedBbox,
          y: Math.max(0, mergedBbox.y - 0.02),
          height: Math.min(1 - Math.max(0, mergedBbox.y - 0.02), mergedBbox.height + 0.06),
        };
        zones.push(createZone('total', extendedBbox, 0.02));
        debug.totalFound = true;
        // Extract the actual total value from the price block
        detectedTotal = extractPriceValue(nearestPriceBlock.text);
        logger.log(
          'Found total (split blocks):',
          totalKeywordBlock.text.substring(0, 20),
          '+',
          nearestPriceBlock.text.substring(0, 15),
          '- value:',
          detectedTotal
        );
      }
    }
  }

  // 4. Identify items section
  // First, find where totals section starts
  // Only consider lines that have BOTH a total keyword AND a price, and are in the bottom half
  let totalsStartY = 0.85; // Default: bottom 15% is totals

  for (let i = sortedBlocks.length - 1; i >= 0; i--) {
    const block = sortedBlocks[i];
    const blockY = block.normalizedBoundingBox.y;

    // Only consider total lines in the bottom 60% of the receipt
    // This avoids "TOTAL ARTICULOS: 5" type lines near the header
    if (blockY < 0.4) continue;

    // Must have both "total" keyword AND a price to be the totals section
    // Use preset keywords if available
    const upper = block.text.toUpperCase();
    const lower = block.text.toLowerCase();
    const hasTotalKeyword =
      totalKeywords.some((kw) => upper.includes(kw.toUpperCase())) && !lower.includes('articul');
    const hasPrice = containsPrice(block.text);

    if (hasTotalKeyword && hasPrice) {
      totalsStartY = Math.min(totalsStartY, blockY - 0.02);
      logger.log(`Found totals line at Y=${blockY.toFixed(3)}: "${block.text.substring(0, 40)}"`);
    }
  }

  logger.log('Totals section starts at Y:', totalsStartY.toFixed(3));

  // Try to find items using the new inline detection method first
  const itemsYRange = findItemsYRange(sortedBlocks, totalsStartY);

  // Also do traditional detection for comparison/fallback
  const productBlocks: NormalizedBlock[] = [];
  const priceOnlyBlocks: NormalizedBlock[] = [];
  let inlineItemCount = 0;

  // Determine header end (after store name and date)
  let headerEndY = 0.15; // Default: top 15% is header

  // Analyze all blocks for products and prices
  for (const block of sortedBlocks) {
    const y = block.normalizedBoundingBox.y;

    // Skip totals section
    if (y > totalsStartY) continue;

    // Check each line in the block
    for (const line of block.lines) {
      // Skip lines too high (likely header)
      if (line.normalizedY < headerEndY) continue;

      if (isItemLine(line.text)) {
        // This line has both product name and price inline
        inlineItemCount++;
        productBlocks.push({
          ...block,
          normalizedBoundingBox: {
            ...block.normalizedBoundingBox,
            y: line.normalizedY,
            height: line.normalizedHeight,
          },
        });
        debug.productsFound++;
      } else if (isStandalonePrice(line.text)) {
        priceOnlyBlocks.push({
          ...block,
          normalizedBoundingBox: {
            ...block.normalizedBoundingBox,
            y: line.normalizedY,
            height: line.normalizedHeight,
          },
        });
        debug.pricesFound++;
      } else if (isProductName(line.text) && !isHeaderLine(line.text)) {
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
  logger.log('Inline item lines found:', inlineItemCount);
  logger.log('Price-only blocks found:', priceOnlyBlocks.length);

  // 5. Create product_names zone
  // Determine if this is a columnar layout (many product blocks + price blocks)
  // vs inline layout (product names and prices on same line)
  const isLikelyColumnar =
    productBlocks.length >= 5 && priceOnlyBlocks.length >= productBlocks.length * 0.5;

  // Prefer columnar detection when we have many product/price blocks
  // Even if we found some inline items, columnar is more accurate for receipts with separated columns
  if (isLikelyColumnar && productBlocks.length > inlineItemCount * 3) {
    logger.log(
      'Using columnar detection (product blocks:',
      productBlocks.length,
      'vs inline:',
      inlineItemCount,
      ')'
    );
    // Fall through to columnar handling below
  } else if (itemsYRange && inlineItemCount >= 2) {
    // Create a full-width zone covering the detected items area
    const itemsZone: NormalizedBoundingBox = {
      x: 0.02, // Almost full width
      y: itemsYRange.startY,
      width: 0.96,
      height: itemsYRange.endY - itemsYRange.startY + 0.03, // Add some padding
    };
    zones.push(createZone('product_names', itemsZone, 0.02));
    logger.log('Created items zone from inline detection:', {
      startY: itemsYRange.startY.toFixed(3),
      endY: itemsYRange.endY.toFixed(3),
      height: (itemsYRange.endY - itemsYRange.startY).toFixed(3),
    });
  }

  // Use columnar detection if we didn't create a zone yet
  if (zones.filter((z) => z.type === 'product_names').length === 0 && productBlocks.length > 0) {
    // Fall back to traditional detection
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
      logger.log('Detected inline layout (fallback)');
    }
  } else {
    // No products found - create a default items zone in the middle section
    logger.log('No products detected, creating default items zone');
    const defaultItemsZone: NormalizedBoundingBox = {
      x: 0.02,
      y: headerEndY,
      width: 0.96,
      height: totalsStartY - headerEndY - 0.02,
    };
    zones.push(createZone('product_names', defaultItemsZone, 0.02));
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
  logger.log('Detected total value:', detectedTotal);
  logger.log('Debug info:', debug);

  return {
    zones,
    confidence: Math.min(100, confidence),
    detectedTotal,
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
