import type { OcrBlock } from './index';
import type { ParsedReceipt, ParsedItem } from './parser';
import type { ZoneDefinition, NormalizedBoundingBox } from '../../types/zones';
import type {
  StoreParsingTemplate,
  TemplateDimensions,
} from '../../db/schema/storeParsingTemplates';

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
    console.log('[TemplateParser] Dimension mismatch detected!');
    console.log('[TemplateParser] Provided dimensions:', providedDimensions);
    console.log('[TemplateParser] Inferred from OCR blocks:', {
      width: inferredWidth,
      height: inferredHeight,
    });
    console.log('[TemplateParser] Max OCR bounds:', { maxX, maxY });
    return { width: inferredWidth, height: inferredHeight };
  }

  // If aspect ratios are very different, prefer inferred
  const aspectDiff = Math.abs(providedAspect - inferredAspect) / providedAspect;
  if (aspectDiff > 0.2) {
    console.log('[TemplateParser] Aspect ratio mismatch - using inferred dimensions');
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
    console.log(`[isBlockInZone] Block bbox:`, bb);
    console.log(`[isBlockInZone] Zone bbox:`, zb);
  }

  // Method 1: Check if block overlaps with zone (at least 30%)
  if (rectanglesOverlap(bb, zb, 0.3)) {
    if (debug) console.log(`[isBlockInZone] Match via 30% overlap`);
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
    if (debug) console.log(`[isBlockInZone] Match via center point`);
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
    console.log(
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

function correlateProductsWithPrices(
  productBlocks: OcrBlockWithNormalized[],
  priceBlocks: OcrBlockWithNormalized[],
  decimalSeparator: '.' | ',',
  imageHeight: number
): ParsedItem[] {
  const items: ParsedItem[] = [];

  console.log('[correlateProducts] Starting correlation');
  console.log('[correlateProducts] Product blocks:', productBlocks.length);
  console.log('[correlateProducts] Price/all blocks:', priceBlocks.length);
  console.log('[correlateProducts] imageHeight for normalization:', imageHeight);

  // Extract lines with their normalized Y positions
  const productLines = productBlocks.flatMap((block) =>
    block.lines.map((line) => ({
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

  console.log('[correlateProducts] Product lines:', productLines.length);
  console.log('[correlateProducts] Price lines:', priceLines.length);
  if (productLines.length > 0) {
    console.log(
      '[correlateProducts] First few product lines:',
      productLines.slice(0, 3).map((l) => ({ text: l.text.substring(0, 30), y: l.y.toFixed(3) }))
    );
  }

  const pricePattern = decimalSeparator === ',' ? /[\d.]+,\d{2}/ : /\d+\.?\d{2}/;

  // Find all price-like lines
  const validPriceLines = priceLines.filter((p) => pricePattern.test(p.text));
  console.log('[correlateProducts] Valid price lines found:', validPriceLines.length);
  if (validPriceLines.length > 0) {
    console.log(
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
        console.log(
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
      console.log(
        `[correlateProducts] No match for "${product.text}" - closest price distance: ${closestPrice.distance.toFixed(3)}`
      );
    }
  }

  console.log(`[correlateProducts] Total items matched: ${items.length}`);
  return items;
}

export function parseWithTemplate(
  blocks: OcrBlock[],
  template: StoreParsingTemplate,
  rawText: string,
  imageDimensions: { width: number; height: number }
): ParsedReceipt {
  console.log('[TemplateParser] Starting parseWithTemplate');
  console.log('[TemplateParser] Provided image dimensions:', imageDimensions);
  console.log('[TemplateParser] Number of blocks:', blocks.length);
  console.log('[TemplateParser] Number of zones:', template.zones.length);

  // Infer actual dimensions from OCR blocks
  const inferredDims = inferImageDimensionsFromBlocks(blocks, imageDimensions);
  console.log('[TemplateParser] Inferred dimensions from OCR:', inferredDims);

  // Check for potential rotation (aspect ratio inversion)
  const providedAspect = imageDimensions.width / imageDimensions.height;
  const inferredAspect = inferredDims.width / inferredDims.height;
  const isLikelyRotated =
    (providedAspect > 1 && inferredAspect < 1) || (providedAspect < 1 && inferredAspect > 1);

  if (isLikelyRotated) {
    console.log('[TemplateParser] WARNING: Image appears to be rotated! Aspect ratios inverted.');
    console.log(
      '[TemplateParser] Provided aspect:',
      providedAspect.toFixed(2),
      'Inferred aspect:',
      inferredAspect.toFixed(2)
    );
  }

  const normalizedBlocks = normalizeBlocks(blocks, imageDimensions);

  console.log(
    '[TemplateParser] Normalized blocks sample:',
    normalizedBlocks.slice(0, 2).map((b) => ({
      text: b.lines
        .map((l) => l.text)
        .join(' ')
        .substring(0, 50),
      bbox: b.normalizedBoundingBox,
    }))
  );

  // Scale zones if image aspect ratios differ
  const scaledZones = scaleZonesForAspectRatio(
    template.zones,
    template.templateImageDimensions,
    imageDimensions
  );

  console.log(
    '[TemplateParser] Zones after scaling:',
    scaledZones.map((z) => ({
      type: z.type,
      bbox: z.boundingBox,
    }))
  );

  const zones = scaledZones;
  const hints = template.parsingHints || {};

  const decimalSeparator = hints.decimalSeparator || '.';
  const dateFormat = hints.dateFormat || 'DMY';

  let storeName: string | null = null;
  let date: Date | null = null;
  let time: string | null = null;
  let total: number | null = null;
  let subtotal: number | null = null;
  let tax: number | null = null;
  let items: ParsedItem[] = [];

  // Log all blocks for debugging
  console.log('[TemplateParser] All normalized blocks:');
  normalizedBlocks.forEach((block, i) => {
    console.log(
      `  Block ${i}: bbox=${JSON.stringify(block.normalizedBoundingBox)}, text="${block.lines
        .map((l) => l.text)
        .join(' ')
        .substring(0, 40)}"`
    );
  });

  for (const zone of zones) {
    console.log(`[TemplateParser] Processing zone ${zone.type} with bbox:`, zone.boundingBox);
    const zoneBlocks = getBlocksInZone(normalizedBlocks, zone, true);
    const textLines = extractTextFromZone(normalizedBlocks, zone, imageDimensions);
    console.log(
      `[TemplateParser] Zone ${zone.type}: ${zoneBlocks.length} blocks, ${textLines.length} lines`
    );
    console.log(`[TemplateParser] Zone ${zone.type} lines:`, textLines.slice(0, 5));

    switch (zone.type) {
      case 'store_name':
        storeName = textLines[0] || null;
        break;

      case 'date':
        date = parseDate(textLines, dateFormat);
        const timeMatch = textLines.join(' ').match(/(\d{1,2}:\d{2})/);
        if (timeMatch) time = timeMatch[1];
        break;

      case 'total':
        total = extractPrice(textLines, decimalSeparator);
        break;

      case 'subtotal':
        subtotal = extractPrice(textLines, decimalSeparator);
        break;

      case 'tax':
        tax = extractPrice(textLines, decimalSeparator);
        break;

      case 'product_names': {
        const priceZone = zones.find((z) => z.type === 'prices');
        if (priceZone) {
          // Use explicit prices zone
          const priceBlocks = getBlocksInZone(normalizedBlocks, priceZone);
          items = correlateProductsWithPrices(
            zoneBlocks,
            priceBlocks,
            decimalSeparator,
            imageDimensions.height
          );
        } else {
          // No explicit prices zone - try to find prices anywhere in the receipt
          // by looking for price-like blocks that align horizontally with products
          console.log('[TemplateParser] No prices zone - auto-detecting prices from all blocks');
          items = correlateProductsWithPrices(
            zoneBlocks,
            normalizedBlocks, // Search all blocks for prices
            decimalSeparator,
            imageDimensions.height
          );
        }
        break;
      }
    }
  }

  const confidence = calculateConfidence(storeName, date, items, total);

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
