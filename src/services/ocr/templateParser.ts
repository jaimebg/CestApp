import type { OcrBlock } from './index';
import type { ParsedReceipt, ParsedItem } from './parser';
import { parseReceipt } from './parser';
import { parseItemsSpatially } from './spatialCorrelator';
import type { ZoneDefinition, NormalizedBoundingBox } from '../../types/zones';
import type {
  StoreParsingTemplate,
  TemplateDimensions,
} from '../../db/schema/storeParsingTemplates';
import { detectRegionFromText, type RegionalPreset } from '../../config/regionalPresets';
import { createScopedLogger } from '../../utils/debug';

const logger = createScopedLogger('TemplateParser');

export interface OcrBlockWithNormalized extends OcrBlock {
  normalizedBoundingBox: NormalizedBoundingBox;
}

/**
 * Scales zone coordinates to account for aspect ratio differences between
 * the template's original image and the current image being parsed.
 */
function scaleZonesForAspectRatio(
  zones: ZoneDefinition[],
  templateDimensions: TemplateDimensions | null | undefined,
  currentDimensions: { width: number; height: number }
): ZoneDefinition[] {
  // If no template dimensions stored, return zones as-is
  if (!templateDimensions) {
    return zones;
  }

  const templateAspectRatio = templateDimensions.width / templateDimensions.height;
  const currentAspectRatio = currentDimensions.width / currentDimensions.height;

  // If aspect ratios are similar (within 10%), no scaling needed
  const ratioDifference = Math.abs(templateAspectRatio - currentAspectRatio) / templateAspectRatio;
  if (ratioDifference < 0.1) {
    return zones;
  }

  // Calculate scaling factors
  // If current image is wider (larger aspect ratio), horizontal zones need to expand
  // If current image is taller (smaller aspect ratio), vertical zones need to expand
  const widthScale =
    currentAspectRatio > templateAspectRatio ? currentAspectRatio / templateAspectRatio : 1;
  const heightScale =
    currentAspectRatio < templateAspectRatio ? templateAspectRatio / currentAspectRatio : 1;

  // Add padding to zones to account for aspect ratio differences
  const paddingFactor = Math.max(ratioDifference * 0.5, 0.05);

  return zones.map((zone) => ({
    ...zone,
    boundingBox: {
      x: Math.max(0, zone.boundingBox.x - paddingFactor),
      y: Math.max(0, zone.boundingBox.y - paddingFactor),
      width: Math.min(
        1 - Math.max(0, zone.boundingBox.x - paddingFactor),
        zone.boundingBox.width + paddingFactor * 2
      ),
      height: Math.min(
        1 - Math.max(0, zone.boundingBox.y - paddingFactor),
        zone.boundingBox.height + paddingFactor * 2
      ),
    },
  }));
}

/**
 * Infer actual image dimensions from OCR block coordinates.
 * This is needed because RNImage.getSize may return different dimensions
 * than what ML Kit OCR sees (due to EXIF rotation, internal resizing, etc.)
 */
function inferImageDimensionsFromBlocks(
  blocks: OcrBlock[],
  providedDimensions: { width: number; height: number }
): { width: number; height: number } {
  if (blocks.length === 0) return providedDimensions;

  let maxX = 0;
  let maxY = 0;

  blocks.forEach((block) => {
    maxX = Math.max(maxX, block.boundingBox.left + block.boundingBox.width);
    maxY = Math.max(maxY, block.boundingBox.top + block.boundingBox.height);
  });

  // If the inferred bounds are significantly different from provided dimensions,
  // use the inferred bounds (with some padding for edge cases)
  const inferredWidth = Math.ceil(maxX * 1.05); // 5% padding
  const inferredHeight = Math.ceil(maxY * 1.05);

  const providedAspect = providedDimensions.width / providedDimensions.height;
  const inferredAspect = inferredWidth / inferredHeight;

  // Check if provided dimensions would cause normalization issues
  const wouldOverflow = maxX > providedDimensions.width || maxY > providedDimensions.height;

  if (wouldOverflow) {
    logger.log('Dimension mismatch detected!');
    logger.log('Provided dimensions:', providedDimensions);
    logger.log('Inferred from OCR blocks:', {
      width: inferredWidth,
      height: inferredHeight,
    });
    logger.log('Max OCR bounds:', { maxX, maxY });
    return { width: inferredWidth, height: inferredHeight };
  }

  // If aspect ratios are very different, prefer inferred
  const aspectDiff = Math.abs(providedAspect - inferredAspect) / providedAspect;
  if (aspectDiff > 0.2) {
    logger.log('Aspect ratio mismatch - using inferred dimensions');
    return { width: inferredWidth, height: inferredHeight };
  }

  return providedDimensions;
}

function normalizeBlocks(
  blocks: OcrBlock[],
  imageDimensions: { width: number; height: number }
): OcrBlockWithNormalized[] {
  // First, infer correct dimensions from blocks
  const correctedDimensions = inferImageDimensionsFromBlocks(blocks, imageDimensions);

  return blocks.map((block) => ({
    ...block,
    normalizedBoundingBox: {
      x: block.boundingBox.left / correctedDimensions.width,
      y: block.boundingBox.top / correctedDimensions.height,
      width: block.boundingBox.width / correctedDimensions.width,
      height: block.boundingBox.height / correctedDimensions.height,
    },
  }));
}

// Check if two rectangles overlap (more lenient than center-point check)
function rectanglesOverlap(
  r1: NormalizedBoundingBox,
  r2: NormalizedBoundingBox,
  minOverlapRatio: number = 0.3
): boolean {
  // Calculate overlap area
  const overlapX = Math.max(0, Math.min(r1.x + r1.width, r2.x + r2.width) - Math.max(r1.x, r2.x));
  const overlapY = Math.max(0, Math.min(r1.y + r1.height, r2.y + r2.height) - Math.max(r1.y, r2.y));
  const overlapArea = overlapX * overlapY;

  // Calculate the smaller rectangle's area (usually the block)
  const r1Area = r1.width * r1.height;

  // Return true if overlap is significant relative to the block size
  return r1Area > 0 && overlapArea / r1Area >= minOverlapRatio;
}

function isBlockInZone(
  block: OcrBlockWithNormalized,
  zone: ZoneDefinition,
  debug: boolean = false
): boolean {
  const bb = block.normalizedBoundingBox;
  const zb = zone.boundingBox;

  if (debug) {
    logger.log(`[isBlockInZone] Block bbox:`, bb);
    logger.log(`[isBlockInZone] Zone bbox:`, zb);
  }

  // Method 1: Check if block overlaps with zone (at least 30%)
  if (rectanglesOverlap(bb, zb, 0.3)) {
    if (debug) logger.log(`[isBlockInZone] Match via 30% overlap`);
    return true;
  }

  // Method 2: Check if block center is in zone (original method, as fallback)
  const blockCenterX = bb.x + bb.width / 2;
  const blockCenterY = bb.y + bb.height / 2;

  if (
    blockCenterX >= zb.x &&
    blockCenterX <= zb.x + zb.width &&
    blockCenterY >= zb.y &&
    blockCenterY <= zb.y + zb.height
  ) {
    if (debug) logger.log(`[isBlockInZone] Match via center point`);
    return true;
  }

  // Method 3: Check if zone contains any part of the block (very lenient)
  // Block intersects zone if they overlap at all
  const intersects = !(
    bb.x + bb.width < zb.x ||
    bb.x > zb.x + zb.width ||
    bb.y + bb.height < zb.y ||
    bb.y > zb.y + zb.height
  );

  return intersects;
}

function getBlocksInZone(
  blocks: OcrBlockWithNormalized[],
  zone: ZoneDefinition,
  debug: boolean = false
): OcrBlockWithNormalized[] {
  const matches = blocks.filter((block) => isBlockInZone(block, zone, debug));
  if (debug) {
    logger.log(
      `[getBlocksInZone] Zone ${zone.type}: checked ${blocks.length} blocks, found ${matches.length} matches`
    );
  }
  return matches;
}

function extractTextFromZone(
  blocks: OcrBlockWithNormalized[],
  zone: ZoneDefinition,
  imageDimensions: { width: number; height: number }
): string[] {
  const zoneBlocks = getBlocksInZone(blocks, zone);
  const lines: string[] = [];
  const zb = zone.boundingBox;

  zoneBlocks.forEach((block) => {
    block.lines.forEach((line) => {
      // Also check if individual line is in zone (lines have their own bounding boxes)
      const lineNormY = line.boundingBox.top / imageDimensions.height;
      const lineNormHeight = line.boundingBox.height / imageDimensions.height;

      // Check if line overlaps with zone vertically
      const lineTop = lineNormY;
      const lineBottom = lineNormY + lineNormHeight;
      const zoneTop = zb.y;
      const zoneBottom = zb.y + zb.height;

      if (lineBottom >= zoneTop && lineTop <= zoneBottom) {
        lines.push(line.text.trim());
      }
    });
  });

  // If no lines matched with strict checking, fall back to all lines from matching blocks
  if (lines.length === 0) {
    zoneBlocks.forEach((block) => {
      block.lines.forEach((line) => {
        lines.push(line.text.trim());
      });
    });
  }

  return lines;
}

function parsePrice(text: string, decimalSeparator: '.' | ',' = '.'): number | null {
  const cleanText = text.replace(/[^\d.,]/g, '');

  if (decimalSeparator === ',') {
    const normalized = cleanText.replace(/\./g, '').replace(',', '.');
    const value = parseFloat(normalized);
    return isNaN(value) ? null : value;
  }

  const value = parseFloat(cleanText.replace(/,/g, ''));
  return isNaN(value) ? null : value;
}

function extractPrice(lines: string[], decimalSeparator: '.' | ','): number | null {
  const pricePattern = decimalSeparator === ',' ? /[\d.]+,\d{2}/ : /\d+[.,]?\d{2}/;

  for (const line of lines) {
    const match = line.match(pricePattern);
    if (match) {
      return parsePrice(match[0], decimalSeparator);
    }
  }
  return null;
}

/**
 * Extract the total price from a total zone
 * More sophisticated than extractPrice - prefers standalone prices and larger values
 */
function extractTotalPrice(lines: string[], decimalSeparator: '.' | ','): number | null {
  const pricePattern = decimalSeparator === ',' ? /[\d.]+,\d{2}/ : /\d+[.,]?\d{2}/;

  // Standalone price pattern (just a number, optionally with currency symbol)
  const standalonePattern =
    decimalSeparator === ','
      ? /^\s*[€$]?\s*[\d.]+,\d{2}\s*[€$]?\s*$/
      : /^\s*[€$]?\s*\d+\.?\d{2}\s*[€$]?\s*$/;

  let bestPrice: number | null = null;
  let foundStandalone = false;

  logger.log('[extractTotalPrice] Lines to check:', lines);

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if this is a standalone price (highly preferred for totals)
    const isStandalone = standalonePattern.test(trimmed);

    // Skip lines that look like item lines (have letters before the price)
    // Unless it contains "total" keyword
    const hasLettersBeforePrice = /\p{L}.*\d+[.,]\d{2}/u.test(trimmed);
    const hasTotalKeyword = /total|importe|suma/i.test(trimmed);

    if (hasLettersBeforePrice && !hasTotalKeyword && !isStandalone) {
      // This looks like an item line, skip it for total extraction
      logger.log('[extractTotalPrice] Skipping item-like line:', trimmed);
      continue;
    }

    const match = trimmed.match(pricePattern);
    if (match) {
      const price = parsePrice(match[0], decimalSeparator);
      logger.log(
        '[extractTotalPrice] Found price:',
        price,
        'standalone:',
        isStandalone,
        'in:',
        trimmed
      );
      if (price !== null && price > 0) {
        // Prefer standalone prices
        if (isStandalone && !foundStandalone) {
          bestPrice = price;
          foundStandalone = true;
        } else if (isStandalone && foundStandalone) {
          // Multiple standalone prices - take the larger one (likely the total)
          if (price > (bestPrice || 0)) {
            bestPrice = price;
          }
        } else if (!foundStandalone) {
          // No standalone found yet, take largest price seen
          if (price > (bestPrice || 0)) {
            bestPrice = price;
          }
        }
      }
    }
  }

  logger.log('[extractTotalPrice] Best price found:', bestPrice);
  return bestPrice;
}

function parseDate(lines: string[], dateFormat: 'DMY' | 'MDY' | 'YMD'): Date | null {
  const datePatterns = [
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/,
    /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/,
  ];

  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        let day: number, month: number, year: number;

        if (match[1].length === 4) {
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
        } else {
          const first = parseInt(match[1]);
          const second = parseInt(match[2]);
          year = parseInt(match[3]);

          if (year < 100) year += 2000;

          if (dateFormat === 'MDY') {
            month = first;
            day = second;
          } else if (dateFormat === 'YMD') {
            month = second;
            day = parseInt(match[3]);
          } else {
            day = first;
            month = second;
          }
        }

        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return new Date(year, month - 1, day);
        }
      }
    }
  }
  return null;
}

/**
 * Check if a line is a header/metadata line that shouldn't be matched as a product
 * Uses generic patterns that work for any receipt
 */
function isHeaderLine(text: string): boolean {
  const lower = text.toLowerCase();
  const upper = text.toUpperCase();

  // Generic patterns for header lines
  const headerPatterns = [
    /\bNIF\b/i, // Tax ID
    /\bCIF\b/i, // Tax ID
    /\bS\.?A\.?U?\.?\s*$/i, // Legal entity suffix
    /\bS\.?L\.?\s*$/i, // Legal entity suffix
    /^www\./i, // URL
    /^http/i, // URL
    /\.es\s*$/i, // Spanish domain
    /\.com\s*$/i, // Domain
    /^C\/\s*\p{L}/iu, // Street address "C/ ..."
    /^Calle\s/i, // Street
    /^Avda\.?\s/i, // Avenue
    /^\d{5}\p{L}/u, // Postal code + city
    /SUPERMERCADOS/i, // Store type
    /HIPERMERCADOS/i, // Store type
  ];

  for (const pattern of headerPatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}

function correlateProductsWithPrices(
  productBlocks: OcrBlockWithNormalized[],
  priceBlocks: OcrBlockWithNormalized[],
  decimalSeparator: '.' | ',',
  imageHeight: number
): ParsedItem[] {
  const items: ParsedItem[] = [];

  logger.log('[correlateProducts] Starting correlation');
  logger.log('[correlateProducts] Product blocks:', productBlocks.length);
  logger.log('[correlateProducts] Price/all blocks:', priceBlocks.length);
  logger.log('[correlateProducts] imageHeight for normalization:', imageHeight);

  // Extract lines with their normalized Y positions, filtering header lines
  const productLines = productBlocks.flatMap((block) =>
    block.lines
      .filter((line) => !isHeaderLine(line.text.trim()))
      .map((line) => ({
        text: line.text.trim(),
        // Line boundingBox.top is in absolute image pixels, normalize it
        y: line.boundingBox.top / imageHeight,
      }))
  );

  const priceLines = priceBlocks.flatMap((block) =>
    block.lines.map((line) => ({
      text: line.text.trim(),
      y: line.boundingBox.top / imageHeight,
    }))
  );

  logger.log('[correlateProducts] Product lines:', productLines.length);
  logger.log('[correlateProducts] Price lines:', priceLines.length);
  if (productLines.length > 0) {
    logger.log(
      '[correlateProducts] First few product lines:',
      productLines.slice(0, 3).map((l) => ({ text: l.text.substring(0, 30), y: l.y.toFixed(3) }))
    );
  }

  const pricePattern = decimalSeparator === ',' ? /[\d.]+,\d{2}/ : /\d+\.?\d{2}/;

  // Find all price-like lines
  const validPriceLines = priceLines.filter((p) => pricePattern.test(p.text));
  logger.log('[correlateProducts] Valid price lines found:', validPriceLines.length);
  if (validPriceLines.length > 0) {
    logger.log(
      '[correlateProducts] First few price lines:',
      validPriceLines.slice(0, 5).map((l) => ({ text: l.text, y: l.y.toFixed(3) }))
    );
  }

  for (const product of productLines) {
    if (!product.text || product.text.length < 2) continue;

    let closestPrice: { text: string; y: number; distance: number } | null = null;

    for (const price of priceLines) {
      if (!pricePattern.test(price.text)) continue;

      const distance = Math.abs(price.y - product.y);
      if (!closestPrice || distance < closestPrice.distance) {
        closestPrice = { ...price, distance };
      }
    }

    // Use a more lenient threshold - 10% of image height should capture items on the same line
    if (closestPrice && closestPrice.distance < 0.1) {
      const priceValue = parsePrice(closestPrice.text, decimalSeparator);
      if (priceValue && priceValue > 0) {
        logger.log(
          `[correlateProducts] Matched "${product.text}" with price ${priceValue} (distance: ${closestPrice.distance.toFixed(3)})`
        );
        items.push({
          name: product.text,
          quantity: 1,
          unitPrice: priceValue,
          totalPrice: priceValue,
          unit: null,
          confidence: 80,
        });
      }
    } else if (closestPrice) {
      logger.log(
        `[correlateProducts] No match for "${product.text}" - closest price distance: ${closestPrice.distance.toFixed(3)}`
      );
    }
  }

  logger.log(`[correlateProducts] Total items matched: ${items.length}`);
  return items;
}

export function parseWithTemplate(
  blocks: OcrBlock[],
  template: StoreParsingTemplate,
  rawText: string,
  imageDimensions: { width: number; height: number }
): ParsedReceipt {
  logger.log('Starting parseWithTemplate (hybrid approach)');
  logger.log('Provided image dimensions:', imageDimensions);
  logger.log('Number of blocks:', blocks.length);
  logger.log('Number of zones:', template.zones.length);

  // First, get the text-based parsing result as a baseline
  const allLines = blocks.flatMap((block) => block.lines.map((line) => line.text));
  const textBasedResult = parseReceipt(allLines);
  logger.log('Text-based baseline:', {
    items: textBasedResult.items.length,
    total: textBasedResult.total,
    confidence: textBasedResult.confidence,
  });

  // Infer actual dimensions from OCR blocks
  const inferredDims = inferImageDimensionsFromBlocks(blocks, imageDimensions);
  logger.log('Inferred dimensions from OCR:', inferredDims);

  const normalizedBlocks = normalizeBlocks(blocks, imageDimensions);

  // Scale zones if image aspect ratios differ
  const scaledZones = scaleZonesForAspectRatio(
    template.zones,
    template.templateImageDimensions,
    imageDimensions
  );

  logger.log(
    'Zones after scaling:',
    scaledZones.map((z) => ({
      type: z.type,
      bbox: z.boundingBox,
    }))
  );

  const zones = scaledZones;
  const hints = template.parsingHints || {};

  // Detect regional preset if no template hints are set
  const detectedPreset = detectRegionFromText(rawText);

  // Use template hints if available, otherwise fall back to detected preset or defaults
  const decimalSeparator = hints.decimalSeparator || detectedPreset?.decimalSeparator || '.';
  const dateFormat = hints.dateFormat || detectedPreset?.dateFormat || 'DMY';

  logger.log(
    'Using decimal separator:',
    decimalSeparator,
    hints.decimalSeparator ? '(from template)' : detectedPreset ? '(from preset)' : '(default)'
  );

  // Start with text-based results
  let storeName: string | null = textBasedResult.storeName;
  let date: Date | null = textBasedResult.date;
  let time: string | null = textBasedResult.time;
  let total: number | null = textBasedResult.total;
  let subtotal: number | null = textBasedResult.subtotal;
  let tax: number | null = textBasedResult.tax;
  let items: ParsedItem[] = textBasedResult.items;

  // Now use zones to REFINE specific fields
  for (const zone of zones) {
    logger.log(`Processing zone ${zone.type} with bbox:`, zone.boundingBox);
    const textLines = extractTextFromZone(normalizedBlocks, zone, imageDimensions);
    logger.log(`Zone ${zone.type}: ${textLines.length} lines`);

    switch (zone.type) {
      case 'store_name':
        // Only override if zone extraction found something
        if (textLines.length > 0 && textLines[0].trim()) {
          storeName = textLines[0].trim();
          logger.log('Zone extracted store name:', storeName);
        }
        break;

      case 'date':
        const zoneParsedDate = parseDate(textLines, dateFormat);
        if (zoneParsedDate) {
          date = zoneParsedDate;
          logger.log('Zone extracted date:', date);
        }
        const timeMatch = textLines.join(' ').match(/(\d{1,2}:\d{2})/);
        if (timeMatch) time = timeMatch[1];
        break;

      case 'total':
        const zoneTotal = extractTotalPrice(textLines, decimalSeparator);
        if (zoneTotal !== null) {
          total = zoneTotal;
          logger.log('Zone extracted total:', total);
        } else {
          // Fallback to simple extraction if smart extraction fails
          const fallbackTotal = extractPrice(textLines, decimalSeparator);
          if (fallbackTotal !== null) {
            total = fallbackTotal;
            logger.log('Zone extracted total (fallback):', total);
          }
        }
        break;

      case 'subtotal':
        const zoneSubtotal = extractPrice(textLines, decimalSeparator);
        if (zoneSubtotal !== null) subtotal = zoneSubtotal;
        break;

      case 'tax':
        const zoneTax = extractPrice(textLines, decimalSeparator);
        if (zoneTax !== null) tax = zoneTax;
        break;

      case 'product_names':
      case 'prices': {
        // Only process once (when we hit product_names zone)
        if (zone.type !== 'product_names') break;

        const productZone = zones.find((z) => z.type === 'product_names');
        const priceZone = zones.find((z) => z.type === 'prices');

        if (!productZone) break;

        // Get blocks in each zone for spatial correlation
        const productBlocks = getBlocksInZone(normalizedBlocks, productZone);

        // For price blocks: use ALL blocks, not just those in the narrow prices zone
        // The spatial correlation will match by Y position anyway, and the prices zone
        // might be too narrow due to zone detection/transformation issues
        const priceBlocks = normalizedBlocks;

        logger.log('Product blocks in zone:', productBlocks.length);
        logger.log('All blocks for price matching:', priceBlocks.length);

        // COLUMNAR LAYOUT: Use spatial correlation when we have separate zones
        if (priceZone && productBlocks.length > 0) {
          logger.log('Using spatial correlation for columnar layout');
          const correlatedItems = correlateProductsWithPrices(
            productBlocks,
            priceBlocks,
            decimalSeparator,
            inferredDims.height
          );

          logger.log('Spatially correlated items:', correlatedItems.length);

          if (correlatedItems.length > 0) {
            // Use correlated items if we got a good result
            if (correlatedItems.length >= items.length * 0.5 || items.length === 0) {
              items = correlatedItems;
              logger.log('Using spatially correlated items');
            }
          }
        }

        // INLINE LAYOUT FALLBACK: If no price zone or correlation failed, try text parsing
        if (items.length === 0 || (priceZone === undefined && productBlocks.length > 0)) {
          const productLines = extractTextFromZone(normalizedBlocks, productZone, imageDimensions);
          logger.log('Trying inline text parsing on', productLines.length, 'lines');

          const zoneItemsResult = parseReceipt(productLines);
          logger.log('Inline parsing result:', zoneItemsResult.items.length, 'items');

          if (zoneItemsResult.items.length > items.length) {
            items = zoneItemsResult.items;
            logger.log('Using inline-parsed items');
          }
        }
        break;
      }
    }
  }

  const confidence = calculateConfidence(storeName, date, items, total);

  logger.log('Final hybrid result:', {
    storeName,
    items: items.length,
    total,
    confidence,
  });

  return {
    storeName,
    storeAddress: null,
    date,
    time,
    dateString: date ? date.toISOString().split('T')[0] : null,
    items,
    subtotal,
    tax,
    discount: null,
    total,
    paymentMethod: null,
    rawText,
    confidence,
  };
}

function calculateConfidence(
  storeName: string | null,
  date: Date | null,
  items: ParsedItem[],
  total: number | null
): number {
  let confidence = 40;

  if (storeName) confidence += 10;
  if (date) confidence += 10;
  if (items.length > 0) confidence += 15;
  if (total !== null) confidence += 10;

  const itemsTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  if (total && Math.abs(itemsTotal - total) < 1) {
    confidence += 15;
  }

  return Math.min(100, confidence);
}

export function shouldUseTemplate(
  template: StoreParsingTemplate | null,
  fallbackConfidence: number
): boolean {
  if (!template) return false;
  if (template.confidence < 40) return false;
  if (template.useCount < 2 && template.confidence < 60) return false;
  return true;
}

/**
 * Enhanced parsing using spatial correlation
 * Combines text-based parsing with spatial analysis for better accuracy
 */
export function parseWithSpatialCorrelation(
  blocks: OcrBlock[],
  rawText: string,
  imageDimensions: { width: number; height: number },
  options?: {
    preset?: RegionalPreset;
    template?: StoreParsingTemplate;
  }
): ParsedReceipt {
  logger.log('Starting enhanced spatial parsing');

  // First, get text-based result as baseline
  const allLines = blocks.flatMap((block) => block.lines.map((line) => line.text));
  const textBasedResult = parseReceipt(allLines);

  // Detect regional preset if not provided
  const preset = options?.preset || detectRegionFromText(rawText);

  // Infer dimensions from blocks
  const inferredDims = inferImageDimensionsFromBlocks(blocks, imageDimensions);

  // Run spatial analysis
  const spatialResult = parseItemsSpatially(blocks, inferredDims, preset || undefined);

  const spatialItemsSum = spatialResult.items.reduce((sum, i) => sum + i.totalPrice, 0);
  const textItemsSum = textBasedResult.items.reduce((sum, i) => sum + i.totalPrice, 0);

  logger.log('Spatial analysis results:', {
    textItems: textBasedResult.items.length,
    textItemsSum: textItemsSum.toFixed(2),
    spatialItems: spatialResult.items.length,
    spatialItemsSum: spatialItemsSum.toFixed(2),
    detectedTotal: textBasedResult.total,
    isColumnar: spatialResult.layout.isColumnar,
    presetUsed: preset?.id || 'none',
  });

  // Decide which items to use based on quality
  let finalItems: ParsedItem[];

  // If spatial found more items and they have reasonable quality, prefer spatial
  if (
    spatialResult.items.length > textBasedResult.items.length &&
    spatialResult.items.length >= 2
  ) {
    // Check which sum is closer to detected total
    if (textBasedResult.total !== null) {
      const spatialDiff = Math.abs(spatialItemsSum - textBasedResult.total);
      const textDiff = Math.abs(textItemsSum - textBasedResult.total);

      finalItems = spatialDiff <= textDiff ? spatialResult.items : textBasedResult.items;
      logger.log(
        `Selected ${spatialDiff <= textDiff ? 'spatial' : 'text'} items based on total match`
      );
    } else {
      // No total to compare, use spatial if it found more
      finalItems = spatialResult.items;
      logger.log('Selected spatial items (more items found)');
    }
  } else if (spatialResult.layout.isColumnar && spatialResult.items.length > 0) {
    // For columnar layouts, prefer spatial correlation
    finalItems = spatialResult.items;
    logger.log('Selected spatial items (columnar layout)');
  } else {
    // Stick with text-based
    finalItems = textBasedResult.items;
    logger.log('Selected text-based items');
  }

  // Calculate combined confidence
  let confidence = textBasedResult.confidence;

  // Boost confidence if spatial analysis agrees with text analysis
  if (
    spatialResult.items.length > 0 &&
    textBasedResult.items.length > 0 &&
    Math.abs(spatialResult.items.length - textBasedResult.items.length) <= 2
  ) {
    confidence = Math.min(100, confidence + 10);
  }

  return {
    ...textBasedResult,
    items: finalItems,
    confidence,
  };
}
