/**
 * Chain Parser Service
 * Chain-specific receipt parsing using templates
 */

import type { ChainTemplate, ItemPattern } from '../../config/spanishChains';
import type { ParsedItem, ParsedReceipt } from './parser';
import { ChainDetectionResult, applyChainOcrCorrectionsToLines } from './chainDetector';
import { detectTaxRegion } from '../../config/taxRegions';

/**
 * Chain parsing result with additional metadata
 */
export interface ChainParseResult extends ParsedReceipt {
  chainId: string | null;
  chainName: string | null;
  chainConfidence: number;
  parsingMethod: 'chain' | 'generic';
}

/**
 * Parse price from text (Spanish format: comma as decimal)
 */
function parsePrice(text: string): number | null {
  let cleaned = text.replace(/[$€£¥]/g, '').trim();

  // Handle space between decimal parts: "12, 50" -> "12,50"
  cleaned = cleaned.replace(/(\d+),\s+(\d{2})/, '$1,$2');
  cleaned = cleaned.replace(/(\d+)\.\s+(\d{2})/, '$1.$2');

  // Match price patterns
  const patterns = [
    /^(\d+),(\d{2})$/,
    /^(\d+)\.(\d{2})$/,
    /(\d+),(\d{2})\s*[A-Za-z]*$/,
    /(\d+)\.(\d{2})\s*[A-Za-z]*$/,
    /^(\d+),(\d{2})/,
    /^(\d+)\.(\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return parseFloat(`${match[1]}.${match[2]}`);
    }
  }

  return null;
}

/**
 * Parse date using chain-specific patterns
 */
function parseDateWithPatterns(
  text: string,
  patterns: RegExp[]
): { date: Date | null; dateString: string | null } {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let day: number, month: number, year: number;

      // Most patterns are DMY for Spanish receipts
      if (match.length >= 4) {
        day = parseInt(match[1], 10);
        month = parseInt(match[2], 10) - 1;
        year = parseInt(match[3], 10);

        // Handle 2-digit years
        if (year < 100) {
          year += 2000;
        }

        // Validate
        if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime()) && date.getFullYear() >= 2000) {
            return { date, dateString: match[0] };
          }
        }
      }
    }
  }

  return { date: null, dateString: null };
}

/**
 * Parse time from text
 */
function parseTime(text: string): string | null {
  const patterns = [/(\d{1,2}):(\d{2})(?::\d{2})?/, /(\d{1,2})[hH](\d{2})/];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = match[2];

      if (hours >= 0 && hours < 24 && parseInt(minutes, 10) < 60) {
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
      }
    }
  }

  return null;
}

/**
 * Parse items using chain-specific patterns
 */
function parseItemsWithPatterns(
  lines: string[],
  itemPatterns: ItemPattern[],
  chain: ChainTemplate
): ParsedItem[] {
  const items: ParsedItem[] = [];
  const skipKeywords = [
    'total',
    'subtotal',
    'iva',
    'igic',
    'ipsi',
    'importe',
    'tarjeta',
    'efectivo',
    'cambio',
    'fecha',
    'hora',
    'nif',
    'cif',
    'gracias',
    'ticket',
    'factura',
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length < 3) continue;

    // Skip non-item lines
    const lowerLine = line.toLowerCase();
    if (skipKeywords.some((kw) => lowerLine.includes(kw))) {
      continue;
    }

    // Try each item pattern
    for (const itemPattern of itemPatterns) {
      const match = line.match(itemPattern.pattern);
      if (match) {
        const groups = itemPattern.groups;

        let name = groups.name ? match[groups.name] : null;
        let quantity = groups.quantity ? parseFloat(match[groups.quantity].replace(',', '.')) : 1;
        let unitPrice = groups.unitPrice ? parsePrice(match[groups.unitPrice]) : null;
        let totalPrice = groups.totalPrice ? parsePrice(match[groups.totalPrice]) : null;
        const unitStr = groups.unit ? match[groups.unit]?.toLowerCase() : null;

        // Determine unit
        let unit: ParsedItem['unit'] = null;
        if (unitStr) {
          if (unitStr === 'kg' || unitStr === 'kilos') unit = 'kg';
          else if (unitStr === 'g' || unitStr === 'gr' || unitStr === 'gramos') unit = 'g';
          else if (unitStr === 'l' || unitStr === 'lt' || unitStr === 'litros') unit = 'l';
          else if (unitStr === 'ml') unit = 'ml';
        }

        // If we only have unit price, look for total price on next line
        if (unitPrice && !totalPrice && i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          const nextPrice = parsePrice(nextLine);
          if (nextPrice && /^\d+[,\.]\d{2}/.test(nextLine)) {
            totalPrice = nextPrice;
          }
        }

        // Calculate missing values
        if (totalPrice && !unitPrice && quantity) {
          unitPrice = totalPrice / quantity;
        }
        if (unitPrice && quantity && !totalPrice) {
          totalPrice = unitPrice * quantity;
        }

        // Validate and add item
        if (name && totalPrice && totalPrice > 0 && totalPrice < 10000) {
          // Clean up name
          name = name.trim().replace(/\s+/g, ' ');

          // Skip if name is too short or just numbers
          if (name.length < 2 || /^\d+$/.test(name)) {
            continue;
          }

          items.push({
            name,
            quantity: quantity || 1,
            unitPrice: unitPrice ? Math.round(unitPrice * 100) / 100 : totalPrice,
            totalPrice: Math.round(totalPrice * 100) / 100,
            unit,
            confidence: 80, // Higher confidence for chain-specific parsing
          });

          break; // Found a match, move to next line
        }
      }
    }
  }

  return items;
}

/**
 * Extract totals using chain-specific keywords
 */
function extractTotalsWithChain(
  lines: string[],
  chain: ChainTemplate
): {
  subtotal: number | null;
  tax: number | null;
  discount: number | null;
  total: number | null;
} {
  let subtotal: number | null = null;
  let tax: number | null = null;
  let discount: number | null = null;
  let total: number | null = null;

  const totalKeywords = chain.parsing.totalKeywords.map((k) => k.toUpperCase());
  const subtotalKeywords = chain.parsing.subtotalKeywords.map((k) => k.toUpperCase());
  const taxKeywords = chain.parsing.taxKeywords.map((k) => k.toUpperCase());
  const discountKeywords = chain.parsing.discountKeywords.map((k) => k.toUpperCase());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();

    let price = parsePrice(line);

    // Check next line for standalone price
    if (price === null && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (/^\d+[,\.]\d{2}/.test(nextLine)) {
        price = parsePrice(nextLine);
      }
    }

    if (price !== null && price > 0) {
      // Check for subtotal
      if (subtotalKeywords.some((kw) => upperLine.includes(kw))) {
        subtotal = price;
        continue;
      }

      // Check for tax
      if (taxKeywords.some((kw) => upperLine.includes(kw))) {
        tax = price;
        continue;
      }

      // Check for discount
      if (discountKeywords.some((kw) => upperLine.includes(kw))) {
        discount = price;
        continue;
      }

      // Check for total (must not be subtotal)
      const isSubtotal = upperLine.includes('SUB');
      if (!isSubtotal && totalKeywords.some((kw) => upperLine.includes(kw))) {
        if (total === null || price > total) {
          total = price;
        }
      }
    }
  }

  return { subtotal, tax, discount, total };
}

/**
 * Extract store name using chain template
 */
function extractStoreNameWithChain(lines: string[], chain: ChainTemplate): string {
  // For known chains, we can use the chain name directly
  // But also try to find the exact store location from the receipt

  const headerLines = lines.slice(0, 10);

  // Look for chain name in header
  for (const line of headerLines) {
    for (const pattern of chain.namePatterns) {
      if (pattern.test(line)) {
        return chain.name;
      }
    }
  }

  return chain.name;
}

/**
 * Extract store address
 */
function extractStoreAddress(lines: string[]): string | null {
  const addressPatterns = [
    /\d+\s+\w+\s+(calle|avenida|avda|c\/|plaza|pol[íi]gono)/i,
    /^C\/\s*\p{L}/iu,
    /^\d{5}\s+\p{L}/u,
  ];

  const headerLines = lines.slice(0, 15);

  for (const line of headerLines) {
    for (const pattern of addressPatterns) {
      if (pattern.test(line)) {
        return line.trim();
      }
    }
  }

  return null;
}

/**
 * Extract payment method
 */
function extractPaymentMethod(text: string): 'cash' | 'card' | 'digital' | null {
  const lowerText = text.toLowerCase();

  if (/\b(efectivo|met[aá]lico|contado)\b/.test(lowerText)) {
    return 'cash';
  }
  if (/\b(tarjeta|visa|mastercard|contactless|cr[eé]dito|d[eé]bito)\b/.test(lowerText)) {
    return 'card';
  }
  if (/\b(bizum|apple\s*pay|google\s*pay)\b/.test(lowerText)) {
    return 'digital';
  }
  if (/[X\*]{4,}\d{4}/.test(text)) {
    return 'card';
  }

  return null;
}

/**
 * Parse receipt using chain-specific template
 */
export function parseWithChainTemplate(
  lines: string[],
  detection: ChainDetectionResult
): ChainParseResult {
  const chain = detection.chain;

  if (!chain) {
    // Should not happen, but return empty result if no chain
    return {
      storeName: null,
      storeAddress: null,
      date: null,
      time: null,
      dateString: null,
      items: [],
      subtotal: null,
      tax: null,
      discount: null,
      total: null,
      paymentMethod: null,
      rawText: lines.join('\n'),
      confidence: 0,
      chainId: null,
      chainName: null,
      chainConfidence: 0,
      parsingMethod: 'generic',
    };
  }

  // Apply chain-specific OCR corrections
  const correctedLines = applyChainOcrCorrectionsToLines(lines, chain);
  const rawText = correctedLines.join('\n');

  // Extract store info
  const storeName = extractStoreNameWithChain(correctedLines, chain);
  const storeAddress = extractStoreAddress(correctedLines);

  // Extract date and time using chain-specific patterns
  let dateResult = { date: null as Date | null, dateString: null as string | null };
  let time: string | null = null;

  for (const line of correctedLines.slice(0, 15)) {
    if (!dateResult.date) {
      dateResult = parseDateWithPatterns(line, chain.parsing.datePatterns);
    }
    if (!time) {
      time = parseTime(line);
    }
    if (dateResult.date && time) break;
  }

  // Parse items using chain-specific patterns
  const items = parseItemsWithPatterns(correctedLines, chain.parsing.itemPatterns, chain);

  // Extract totals using chain-specific keywords
  const { subtotal, tax, discount, total } = extractTotalsWithChain(correctedLines, chain);

  // Extract payment method
  const paymentMethod = extractPaymentMethod(rawText);

  // Detect tax region
  const taxRegion = detectTaxRegion(rawText, null, storeName);

  // Calculate confidence
  let confidence = 50;

  // Boost for chain detection
  confidence += Math.min(detection.confidence * 0.3, 30);

  // Boost for found data
  if (storeName) confidence += 5;
  if (dateResult.date) confidence += 10;
  if (items.length > 0) confidence += 15;
  if (total !== null) confidence += 10;

  // Check items sum vs total
  if (items.length > 0 && total !== null) {
    const itemsSum = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const difference = Math.abs(itemsSum - total);
    const tolerance = total * 0.15; // 15% tolerance
    if (difference <= tolerance) {
      confidence += 10;
    }
  }

  return {
    storeName,
    storeAddress,
    date: dateResult.date,
    time,
    dateString: dateResult.dateString,
    items,
    subtotal,
    tax,
    discount,
    total,
    paymentMethod,
    rawText,
    confidence: Math.min(confidence, 100),
    chainId: chain.chainId,
    chainName: chain.name,
    chainConfidence: detection.confidence,
    parsingMethod: 'chain',
  };
}

/**
 * Check if chain-specific parsing should be used
 * Returns true if confidence is high enough
 */
export function shouldUseChainParsing(detection: ChainDetectionResult): boolean {
  return detection.chain !== null && detection.confidence >= 70;
}
