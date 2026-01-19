/**
 * Spatial Correlator for Receipt Parsing
 * Uses spatial clustering to correlate product names with prices
 */

import type { OcrBlock } from './index';
import type { ParsedItem } from './parser';
import type { RegionalPreset } from '../../config/regionalPresets';
import { createScopedLogger } from '../../utils/debug';

const logger = createScopedLogger('SpatialCorrelator');

/**
 * OCR element with normalized position
 */
export interface OcrElement {
  text: string;
  x: number; // Normalized X position (0-1)
  y: number; // Normalized Y position (0-1)
  width: number; // Normalized width
  height: number; // Normalized height
  rawBounds: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

/**
 * A cluster of OCR elements that appear on the same visual line
 */
export interface LineCluster {
  y: number; // Average Y position
  elements: OcrElement[];
  text: string; // Combined text (left to right)
  price: number | null; // Detected price (rightmost number)
  priceText: string | null; // Original price text
  productText: string | null; // Text before price
}

/**
 * Receipt layout analysis
 */
export interface LayoutAnalysis {
  isColumnar: boolean;
  priceColumnX: number | null; // Normalized X where prices typically appear
  averageLineHeight: number;
  itemZoneY: { start: number; end: number } | null;
}

/**
 * Extract all text elements from OCR blocks with normalized positions
 */
export function extractOcrElements(
  blocks: OcrBlock[],
  imageDimensions: { width: number; height: number }
): OcrElement[] {
  const elements: OcrElement[] = [];

  for (const block of blocks) {
    for (const line of block.lines) {
      elements.push({
        text: line.text.trim(),
        x: line.boundingBox.left / imageDimensions.width,
        y: line.boundingBox.top / imageDimensions.height,
        width: line.boundingBox.width / imageDimensions.width,
        height: line.boundingBox.height / imageDimensions.height,
        rawBounds: line.boundingBox,
      });
    }
  }

  // Sort by Y position, then by X position
  elements.sort((a, b) => {
    if (Math.abs(a.y - b.y) < 0.01) {
      return a.x - b.x;
    }
    return a.y - b.y;
  });

  return elements;
}

/**
 * Cluster elements by line based on Y position
 * Elements within tolerance are considered on the same line
 */
export function clusterByLine(elements: OcrElement[], tolerance: number = 0.02): LineCluster[] {
  if (elements.length === 0) return [];

  const clusters: LineCluster[] = [];
  let currentCluster: OcrElement[] = [elements[0]];

  for (let i = 1; i < elements.length; i++) {
    const element = elements[i];
    const avgY = currentCluster.reduce((sum, e) => sum + e.y, 0) / currentCluster.length;

    // Check if element is on the same line (within tolerance)
    if (Math.abs(element.y - avgY) <= tolerance) {
      currentCluster.push(element);
    } else {
      // Finalize current cluster and start new one
      clusters.push(createLineCluster(currentCluster));
      currentCluster = [element];
    }
  }

  // Don't forget the last cluster
  if (currentCluster.length > 0) {
    clusters.push(createLineCluster(currentCluster));
  }

  return clusters;
}

/**
 * Create a LineCluster from a group of elements
 */
function createLineCluster(elements: OcrElement[]): LineCluster {
  // Sort elements left to right
  const sorted = [...elements].sort((a, b) => a.x - b.x);

  const avgY = sorted.reduce((sum, e) => sum + e.y, 0) / sorted.length;
  const combinedText = sorted.map((e) => e.text).join(' ');

  // Try to extract price from the line
  const { price, priceText, productText } = extractPriceFromLine(sorted);

  return {
    y: avgY,
    elements: sorted,
    text: combinedText,
    price,
    priceText,
    productText,
  };
}

/**
 * Price patterns for extraction
 */
const PRICE_PATTERNS = [
  // European format: 12,99 or 12, 99
  /(\d+)[,\s]\s*(\d{2})(?:\s*€)?$/,
  // US format: 12.99
  /(\d+)\.(\d{2})(?:\s*\$)?$/,
  // With currency symbol: $12.99 or 12,99€
  /[$€]\s*(\d+)[.,](\d{2})/,
  /(\d+)[.,](\d{2})\s*[$€]/,
  // Simple: just digits with 2 decimals
  /(\d+)[.,](\d{2})$/,
];

/**
 * Extract price from a line of elements
 * Prices typically appear on the right side
 */
function extractPriceFromLine(elements: OcrElement[]): {
  price: number | null;
  priceText: string | null;
  productText: string | null;
} {
  if (elements.length === 0) {
    return { price: null, priceText: null, productText: null };
  }

  // Check elements from right to left for price
  for (let i = elements.length - 1; i >= 0; i--) {
    const element = elements[i];
    const text = element.text.trim();

    // Try to match price patterns
    for (const pattern of PRICE_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        const intPart = match[1];
        const decPart = match[2];
        const price = parseFloat(`${intPart}.${decPart}`);

        if (price > 0 && price < 10000) {
          // Combine text from elements before this one
          const productElements = elements.slice(0, i);
          const productText =
            productElements.length > 0 ? productElements.map((e) => e.text).join(' ') : null;

          return {
            price,
            priceText: text,
            productText,
          };
        }
      }
    }
  }

  // No price found - might be a product-only line
  return {
    price: null,
    priceText: null,
    productText: elements.map((e) => e.text).join(' '),
  };
}

/**
 * Analyze receipt layout to determine if columnar or inline
 */
export function analyzeLayout(elements: OcrElement[]): LayoutAnalysis {
  // Find elements that look like prices
  const priceElements: OcrElement[] = [];
  const priceXPositions: number[] = [];

  for (const element of elements) {
    const text = element.text.trim();
    if (PRICE_PATTERNS.some((pattern) => pattern.test(text))) {
      priceElements.push(element);
      priceXPositions.push(element.x);
    }
  }

  // Calculate average line height
  let avgLineHeight = 0.03; // Default
  if (elements.length > 1) {
    const heights = elements.map((e) => e.height).filter((h) => h > 0);
    if (heights.length > 0) {
      avgLineHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
    }
  }

  // Determine if columnar based on price X positions
  let isColumnar = false;
  let priceColumnX: number | null = null;

  if (priceXPositions.length >= 3) {
    // Calculate standard deviation of X positions
    const mean = priceXPositions.reduce((a, b) => a + b, 0) / priceXPositions.length;
    const variance =
      priceXPositions.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / priceXPositions.length;
    const stdDev = Math.sqrt(variance);

    // If prices are well-aligned (low std dev), it's columnar
    if (stdDev < 0.1) {
      isColumnar = true;
      priceColumnX = mean;
    }
  }

  // Try to identify item zone (between header and totals)
  const itemZoneY = detectItemZone(elements);

  return {
    isColumnar,
    priceColumnX,
    averageLineHeight: avgLineHeight,
    itemZoneY,
  };
}

/**
 * Detect the Y range where items typically appear
 * Items are usually between header (store name, address) and totals
 */
function detectItemZone(elements: OcrElement[]): { start: number; end: number } | null {
  if (elements.length < 5) return null;

  // Common total keywords
  const totalKeywords = [
    'total',
    'subtotal',
    'importe',
    'suma',
    'iva',
    'tax',
    'cambio',
    'efectivo',
    'tarjeta',
  ];

  // Find first element with price (likely start of items)
  let startY = 0.15; // Default: after ~15% of receipt (header)
  for (const element of elements) {
    if (PRICE_PATTERNS.some((pattern) => pattern.test(element.text))) {
      startY = Math.max(0.05, element.y - 0.02);
      break;
    }
  }

  // Find first total keyword (likely end of items)
  let endY = 0.85; // Default: before ~85% of receipt (footer)
  for (const element of elements) {
    const lowerText = element.text.toLowerCase();
    if (totalKeywords.some((kw) => lowerText.includes(kw))) {
      endY = element.y;
      break;
    }
  }

  return { start: startY, end: endY };
}

/**
 * Extract items from line clusters
 */
export function extractItemsFromClusters(
  clusters: LineCluster[],
  layout: LayoutAnalysis,
  preset?: RegionalPreset
): ParsedItem[] {
  const items: ParsedItem[] = [];
  const itemZone = layout.itemZoneY;

  // Filter to clusters in item zone
  const itemClusters = itemZone
    ? clusters.filter((c) => c.y >= itemZone.start && c.y <= itemZone.end)
    : clusters;

  for (let i = 0; i < itemClusters.length; i++) {
    const cluster = itemClusters[i];

    // Skip if no product text
    if (!cluster.productText || cluster.productText.length < 2) {
      continue;
    }

    // Skip if matches skip keywords
    const lowerText = cluster.productText.toLowerCase();
    const skipKeywords = preset?.skipKeywords || [];
    if (skipKeywords.some((kw) => lowerText.includes(kw.toLowerCase()))) {
      continue;
    }

    // Skip total/subtotal lines
    const totalKeywords = ['total', 'subtotal', 'importe', 'suma', 'iva', 'tax'];
    if (totalKeywords.some((kw) => lowerText.includes(kw))) {
      continue;
    }

    // If cluster has a price, create item
    if (cluster.price !== null && cluster.price > 0) {
      const item = createItemFromCluster(cluster);
      if (item) {
        items.push(item);
      }
    }
  }

  return items;
}

/**
 * Handle multi-line items by merging clusters without prices
 * into previous clusters with prices
 */
export function mergeMultilineItems(clusters: LineCluster[]): LineCluster[] {
  const merged: LineCluster[] = [];
  let pendingTextLines: string[] = [];

  for (const cluster of clusters) {
    if (cluster.price !== null) {
      // This cluster has a price - it's an item line
      if (pendingTextLines.length > 0) {
        // Prepend pending text to this item's name
        const combinedProductText = [...pendingTextLines, cluster.productText]
          .filter(Boolean)
          .join(' ');
        merged.push({
          ...cluster,
          productText: combinedProductText,
        });
        pendingTextLines = [];
      } else {
        merged.push(cluster);
      }
    } else if (cluster.productText) {
      // No price - might be continuation of next item or header text
      const text = cluster.productText.trim();

      // Check if it looks like a continuation line
      const isLikelyContinuation =
        text.length > 2 &&
        text.length < 40 &&
        !/^[\d\-\/\.\:]+$/.test(text) && // Not just numbers
        !text.match(/^(total|subtotal|iva|tax|fecha|hora|date|time)/i);

      if (isLikelyContinuation) {
        pendingTextLines.push(text);
      }
    }
  }

  return merged;
}

/**
 * Create a ParsedItem from a line cluster
 */
function createItemFromCluster(cluster: LineCluster): ParsedItem | null {
  if (!cluster.productText || cluster.price === null) {
    return null;
  }

  let name = cluster.productText.trim();
  let quantity = 1;
  let unitPrice = cluster.price;
  let unit: ParsedItem['unit'] = null;

  // Try to extract quantity from name
  // Patterns: "3 x Product", "Product x3", "3 Product", "2 UDS Product"
  const qtyPatterns = [
    /^(\d+)\s*[xX×]\s*(.+)$/, // "3 x Product"
    /^(.+?)\s*[xX×]\s*(\d+)$/, // "Product x 3"
    /^(\d+)\s+(?!kg|g|l|ml|gr|lt)(.+)$/i, // "3 Product" (not units)
    /^(\d+)\s*(uds?|unid?\.?)\s*(.+)$/i, // "3 UDS Product"
  ];

  for (const pattern of qtyPatterns) {
    const match = name.match(pattern);
    if (match) {
      if (pattern === qtyPatterns[0]) {
        quantity = parseInt(match[1], 10);
        name = match[2].trim();
      } else if (pattern === qtyPatterns[1]) {
        name = match[1].trim();
        quantity = parseInt(match[2], 10);
      } else if (pattern === qtyPatterns[2]) {
        quantity = parseInt(match[1], 10);
        name = match[2].trim();
      } else if (pattern === qtyPatterns[3]) {
        quantity = parseInt(match[1], 10);
        name = match[3].trim();
      }

      if (quantity > 1 && quantity < 100) {
        unitPrice = cluster.price / quantity;
        unit = 'each';
        break;
      } else {
        // Reset if quantity seems wrong
        quantity = 1;
        unitPrice = cluster.price;
      }
    }
  }

  // Try to extract weight-based units
  const weightPatterns: { pattern: RegExp; unit: ParsedItem['unit'] }[] = [
    { pattern: /(\d+[.,]?\d*)\s*kg/i, unit: 'kg' },
    { pattern: /(\d+[.,]?\d*)\s*g(?:r)?(?!\w)/i, unit: 'g' },
    { pattern: /(\d+[.,]?\d*)\s*l(?:t)?(?!\w)/i, unit: 'l' },
    { pattern: /(\d+[.,]?\d*)\s*ml/i, unit: 'ml' },
  ];

  for (const { pattern, unit: unitType } of weightPatterns) {
    const match = name.match(pattern);
    if (match) {
      const qty = parseFloat(match[1].replace(',', '.'));
      if (qty > 0) {
        quantity = qty;
        unit = unitType;
        unitPrice = cluster.price / quantity;
        name = name.replace(match[0], '').trim();
        break;
      }
    }
  }

  // Clean up name
  name = name
    .replace(/\s+/g, ' ')
    .replace(/^[\-\*\.]+/, '')
    .replace(/[\-\*\.]+$/, '')
    .trim();

  // Skip if name is too short or just numbers
  if (name.length < 2 || /^\d+$/.test(name)) {
    return null;
  }

  // Calculate confidence based on various factors
  let confidence = 60;
  if (name.length > 5) confidence += 10;
  if (cluster.elements.length >= 2) confidence += 5; // Price was separate element
  if (!/[^a-zA-Z0-9\s\-áéíóúñü]/.test(name)) confidence += 10; // Clean name
  if (unit !== null) confidence += 5;

  return {
    name,
    quantity,
    unitPrice: Math.round(unitPrice * 100) / 100,
    totalPrice: cluster.price,
    unit,
    confidence: Math.min(confidence, 95),
  };
}

/**
 * Main function: Parse items using spatial correlation
 */
export function parseItemsSpatially(
  blocks: OcrBlock[],
  imageDimensions: { width: number; height: number },
  preset?: RegionalPreset
): {
  items: ParsedItem[];
  layout: LayoutAnalysis;
  clusters: LineCluster[];
} {
  logger.log('Starting spatial parsing');
  logger.log('Image dimensions:', imageDimensions);
  logger.log('Number of blocks:', blocks.length);

  // Extract all text elements with positions
  const elements = extractOcrElements(blocks, imageDimensions);
  logger.log('Extracted elements:', elements.length);

  // Analyze layout
  const layout = analyzeLayout(elements);
  logger.log('Layout analysis:', {
    isColumnar: layout.isColumnar,
    priceColumnX: layout.priceColumnX,
    itemZoneY: layout.itemZoneY,
  });

  // Cluster by line
  const rawClusters = clusterByLine(elements);
  logger.log('Raw clusters:', rawClusters.length);

  // Log sample clusters with prices
  const clustersWithPrices = rawClusters.filter((c) => c.price !== null);
  logger.log('Clusters with detected prices:', clustersWithPrices.length);
  if (clustersWithPrices.length > 0) {
    logger.log(
      'Sample clusters with prices:',
      clustersWithPrices.slice(0, 5).map((c) => ({
        text: c.text.substring(0, 50),
        productText: c.productText?.substring(0, 30),
        price: c.price,
        y: c.y.toFixed(3),
      }))
    );
  }

  // Merge multi-line items
  const clusters = mergeMultilineItems(rawClusters);
  logger.log('Merged clusters:', clusters.length);

  // Extract items from clusters
  const items = extractItemsFromClusters(clusters, layout, preset);
  logger.log('Extracted items:', items.length);
  if (items.length > 0) {
    logger.log(
      'Sample items:',
      items.slice(0, 5).map((i) => ({
        name: i.name.substring(0, 30),
        price: i.totalPrice,
      }))
    );
  }

  return { items, layout, clusters };
}

/**
 * Correlate product lines with price lines in columnar layout
 * When products and prices are in separate columns
 */
export function correlateColumnarItems(
  clusters: LineCluster[],
  layout: LayoutAnalysis,
  preset?: RegionalPreset
): ParsedItem[] {
  if (!layout.isColumnar || layout.priceColumnX === null) {
    return [];
  }

  const items: ParsedItem[] = [];
  const productClusters: LineCluster[] = [];
  const priceClusters: LineCluster[] = [];

  // Separate product and price clusters
  for (const cluster of clusters) {
    const avgX = cluster.elements.reduce((sum, e) => sum + e.x, 0) / cluster.elements.length;

    if (Math.abs(avgX - layout.priceColumnX!) < 0.15) {
      // This cluster is in the price column
      if (cluster.price !== null) {
        priceClusters.push(cluster);
      }
    } else if (avgX < layout.priceColumnX!) {
      // This cluster is to the left (product names)
      productClusters.push(cluster);
    }
  }

  logger.log('Columnar correlation:');
  logger.log('Product clusters:', productClusters.length);
  logger.log('Price clusters:', priceClusters.length);

  // Match products with prices by Y position
  for (const productCluster of productClusters) {
    // Find closest price cluster by Y
    let bestMatch: { cluster: LineCluster; distance: number } | null = null;

    for (const priceCluster of priceClusters) {
      const distance = Math.abs(priceCluster.y - productCluster.y);
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { cluster: priceCluster, distance };
      }
    }

    // If match is close enough (within ~3% of image height)
    if (bestMatch && bestMatch.distance < 0.03) {
      const combinedCluster: LineCluster = {
        y: productCluster.y,
        elements: [...productCluster.elements, ...bestMatch.cluster.elements],
        text: `${productCluster.text} ${bestMatch.cluster.text}`,
        price: bestMatch.cluster.price,
        priceText: bestMatch.cluster.priceText,
        productText: productCluster.text,
      };

      const item = createItemFromCluster(combinedCluster);
      if (item) {
        items.push(item);
      }
    }
  }

  return items;
}
