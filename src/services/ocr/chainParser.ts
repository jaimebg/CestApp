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
 * Handles Mercadona format: "QTY PRODUCT_NAME [P.UNIT] TOTAL"
 * Handles Lidl format: "PRODUCT_NAME  price x qty  TOTAL"
 * And weighted products in 2 lines: "1 PLATANO" + "1,102 kg 1,85 €/kg 2,04"
 */
const SKIP_KEYWORDS = [
  // Totals and taxes
  'total',
  'subtotal',
  'iva',
  'igic',
  'ipsi',
  'importe',
  'base imponible',
  'cuota',
  'exento',
  // Payment
  'tarjeta',
  'efectivo',
  'cambio',
  'cambio recibido',
  'venta visa',
  'sale debit',
  'contactless',
  'firma no necesaria',
  'tarjeta pass',
  'entregado',
  'venta',
  // Receipt metadata
  'fecha',
  'hora',
  'nif',
  'cif',
  'ticket',
  'factura',
  'simplificada',
  'descripcion',
  'descripción',
  'p. unit',
  'tipo base cuota',
  'art. total a pagar',
  // Store info
  'comerciante',
  'minorista',
  'teléfono',
  'telefono',
  'gracias',
  'devoluciones',
  'atención al cliente',
  'atencion al cliente',
  'recibo para el cliente',
  'codigo de barras',
  'código de barras',
  'le atendio',
  // Chain-specific
  'mercadona',
  'lidl supermercados',
  'www.lidl',
  'carrefour',
  'centros comerciales',
  'supermercados champion',
  'socio club',
  'ventajas obtenidas',
  'acumulado club',
  'total ventajas',
  'saldo acumulado',
  'www.pass.carrefour',
];

// Lidl weight line pattern: "0,656 kg x 2,65   EUR/kg" (weight line AFTER item)
const LIDL_WEIGHT_PATTERN =
  /^\s*(\d+[,\.]\d{3})\s*(kg|g|l|ml)\s*x\s*(\d+[,\.]\d{2})\s*EUR\/(kg|g|l|ml)$/i;

// Mercadona weight continuation pattern: "1,102 kg 1,85 €/kg 2,04"
const MERCADONA_WEIGHT_PATTERN =
  /^\s*(\d+[,\.]\d{3})\s*(kg|g|l|ml)\s+(\d+[,\.]\d{2})\s*€?\/(kg|g|l|ml)\s+(\d+[,\.]\d{2})$/i;

// Product line without price (weighted product first line): "1 PLATANO"
const PRODUCT_ONLY_PATTERN = /^(\d+)\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]+)$/;

function parseItemsWithPatterns(
  lines: string[],
  itemPatterns: ItemPattern[],
  chain: ChainTemplate
): ParsedItem[] {
  const items: ParsedItem[] = [];

  // Track pending weighted product for Lidl (weight line appears AFTER the item)
  let lastItemForWeight: { name: string; price: number; index: number } | null = null;

  // Track pending weighted product name (for Mercadona where qty+name comes first)
  let pendingWeightedProduct: { name: string; quantity: number; lineIndex: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length < 3) continue;

    // Skip non-item lines
    const lowerLine = line.toLowerCase();
    if (SKIP_KEYWORDS.some((kw) => lowerLine.includes(kw))) {
      continue;
    }

    // Skip lines that look like addresses or header info
    if (/^C\/\s/i.test(line) || /^\d{5}\s/.test(line) || /^OP:\s/i.test(line)) {
      continue;
    }

    // Skip Lidl Plus discount lines - handled in totals
    if (/^Dto\.?\s*Lidl\s*Plus/i.test(line) || /^Descuento\s*\d+%/i.test(line)) {
      continue;
    }

    // Skip Carrefour discount lines - handled in totals
    if (/^DESCUENTO\s+EN\s+2[ªaA]\s+UNIDAD/i.test(line)) {
      continue;
    }

    // Skip Carrefour multi-unit continuation lines (e.g., "2 x ( 0,97 )")
    if (/^\d+\s*[xX×]\s*\(\s*\d+[,\.]\d{2}\s*\)/.test(line)) {
      continue;
    }

    // Skip card payment info lines
    if (/^\d{6,}X+\d{4}/i.test(line) || /^A\d{10,}/i.test(line) || /^\d{4}\s+\d{6}/i.test(line)) {
      continue;
    }

    const lidlWeightMatch = line.match(LIDL_WEIGHT_PATTERN);

    if (lidlWeightMatch && lastItemForWeight && chain.chainId === 'lidl') {
      // Update the last item with weight info
      const weight = parseFloat(lidlWeightMatch[1].replace(',', '.'));
      const unit = lidlWeightMatch[2].toLowerCase() as ParsedItem['unit'];
      const pricePerUnit = parsePrice(lidlWeightMatch[3]);

      // Find and update the last item
      const lastItem = items[items.length - 1];
      if (lastItem && lastItem.name === lastItemForWeight.name) {
        lastItem.quantity = weight;
        lastItem.unit = unit;
        lastItem.unitPrice = pricePerUnit || lastItem.totalPrice / weight;
      }
      lastItemForWeight = null;
      continue;
    }

    // Check for Mercadona weighted product continuation: "1,102 kg 1,85 €/kg 2,04"
    const mercadonaWeightMatch = line.match(MERCADONA_WEIGHT_PATTERN);

    if (mercadonaWeightMatch && pendingWeightedProduct) {
      const quantity = parseFloat(mercadonaWeightMatch[1].replace(',', '.'));
      const unit = mercadonaWeightMatch[2].toLowerCase() as ParsedItem['unit'];
      const unitPrice = parsePrice(mercadonaWeightMatch[3]);
      const totalPrice = parsePrice(mercadonaWeightMatch[5]);

      if (totalPrice && totalPrice > 0) {
        items.push({
          name: pendingWeightedProduct.name,
          quantity,
          unitPrice: unitPrice || totalPrice / quantity,
          totalPrice,
          unit,
          confidence: 85,
        });
        pendingWeightedProduct = null;
        continue;
      }
    }

    // Check for product line without price (weighted product first line): "1 PLATANO"
    const productOnlyMatch = line.match(PRODUCT_ONLY_PATTERN);
    if (productOnlyMatch && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (MERCADONA_WEIGHT_PATTERN.test(nextLine)) {
        pendingWeightedProduct = {
          name: productOnlyMatch[2].trim(),
          quantity: parseInt(productOnlyMatch[1], 10),
          lineIndex: i,
        };
        continue;
      }
    }

    // Reset pending if we moved past it
    if (pendingWeightedProduct && i > pendingWeightedProduct.lineIndex + 1) {
      pendingWeightedProduct = null;
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

          // Skip if name looks like a header/footer element
          if (/^(visa|mastercard|debit|importe|arc|aut|aid|n\.c|imp\.)/i.test(name)) {
            continue;
          }

          // Skip names that are just "kg" or similar units
          if (/^(kg|g|l|ml|EUR)$/i.test(name)) {
            continue;
          }

          const item: ParsedItem = {
            name,
            quantity: quantity || 1,
            unitPrice: unitPrice ? Math.round(unitPrice * 100) / 100 : totalPrice,
            totalPrice: Math.round(totalPrice * 100) / 100,
            unit,
            confidence: 85,
          };

          items.push(item);

          // For Lidl: track last item in case next line has weight info
          if (chain.chainId === 'lidl' && !unit) {
            if (i + 1 < lines.length && LIDL_WEIGHT_PATTERN.test(lines[i + 1].trim())) {
              lastItemForWeight = { name, price: totalPrice, index: items.length - 1 };
            }
          }

          break;
        }
      }
    }
  }

  return items;
}

interface DiscountPattern {
  pattern: RegExp;
  accumulate: boolean;
}

const CHAIN_DISCOUNT_PATTERNS: Record<string, DiscountPattern[]> = {
  carrefour: [
    {
      pattern: /DESCUENTO\s+EN\s+2[ªaA]\s+UNIDAD\s+[A-Z]{0,2}\d{0,2}\s*(-?\d+[,\.]\d{2})/i,
      accumulate: true,
    },
    { pattern: /DESCUENTOS:\s*(\d+[,\.]\d{2})/i, accumulate: false },
  ],
  lidl: [
    { pattern: /Dto\.?\s*Lidl\s*Plus\s+(-?\d+[,\.]\d{2})/i, accumulate: true },
    { pattern: /Descuento\s*\d+%\s+(-?\d+[,\.]\d{2})/i, accumulate: true },
    { pattern: /(\d+[,\.]\d{2})\s*EUR\s*en\s*esta\s*compra/i, accumulate: false },
  ],
};

function extractChainDiscount(
  line: string,
  chainId: string,
  currentTotal: number
): { value: number; shouldContinue: boolean } | null {
  const patterns = CHAIN_DISCOUNT_PATTERNS[chainId];
  if (!patterns) return null;

  for (const { pattern, accumulate } of patterns) {
    const match = line.match(pattern);
    if (!match) continue;

    const value = parsePrice(match[1]);
    if (value === null) return null;

    const absValue = Math.abs(value);
    const newTotal = accumulate ? currentTotal + absValue : Math.max(absValue, currentTotal);
    return { value: newTotal, shouldContinue: true };
  }

  return null;
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

  let totalAccumulatedDiscount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();

    // Handle chain-specific discount patterns
    const discountResult = extractChainDiscount(line, chain.chainId, totalAccumulatedDiscount);
    if (discountResult) {
      totalAccumulatedDiscount = discountResult.value;
      if (discountResult.shouldContinue) continue;
    }

    // Extract price from line
    let price = parsePrice(line);

    // Try to extract price after keywords like "TOTAL (€)"
    const priceAfterKeyword = line.match(/(?:TOTAL|IMPORTE)\s*\(?\s*€?\s*\)?\s*(\d+[,\.]\d{2})/i);
    if (priceAfterKeyword) {
      price = parsePrice(priceAfterKeyword[1]);
    }

    // Check next line for standalone price
    if (price === null && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (/^\d+[,\.]\d{2}$/.test(nextLine)) {
        price = parsePrice(nextLine);
      }
    }

    if (price !== null && price > 0) {
      // Check for subtotal
      if (subtotalKeywords.some((kw) => upperLine.includes(kw))) {
        subtotal = price;
        continue;
      }

      // Check for tax (but not if it's the totals line)
      const isTaxLine = taxKeywords.some((kw) => upperLine.includes(kw));
      const isTotalLine = totalKeywords.some((kw) => upperLine.includes(kw));
      if (isTaxLine && !isTotalLine && !upperLine.includes('TOTAL') && price < 50) {
        tax = price;
        continue;
      }

      // Check for discount (chains without specific patterns)
      const hasChainPatterns = chain.chainId in CHAIN_DISCOUNT_PATTERNS;
      if (!hasChainPatterns && discountKeywords.some((kw) => upperLine.includes(kw))) {
        discount = price;
        continue;
      }

      // Check for total (must not be subtotal)
      const isSubtotal = upperLine.includes('SUB');
      const isTarjetaLine = upperLine.includes('TARJETA');
      const isEntregadoLine = upperLine.includes('ENTREGADO');
      if (!isSubtotal && !isEntregadoLine && (isTotalLine || isTarjetaLine)) {
        if (total === null || price >= total) {
          total = price;
        }
      }
    }
  }

  // Set accumulated discount for chains with line-item discounts
  if (chain.chainId in CHAIN_DISCOUNT_PATTERNS && totalAccumulatedDiscount > 0) {
    discount = totalAccumulatedDiscount;
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
