/**
 * Receipt Parser Service
 * Smart, self-adapting parser that auto-detects format from receipt content
 * Enhanced with chain-specific templates for Spanish supermarkets
 */

import { type RegionalPreset, SPAIN_PRESET } from '../../config/regionalPresets';
import { detectChainFromLines } from './chainDetector';
import { parseWithChainTemplate, shouldUseChainParsing } from './chainParser';

export interface ParsedItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: 'each' | 'kg' | 'lb' | 'oz' | 'g' | 'l' | 'ml' | null;
  confidence: number;
}

export interface ParsedReceipt {
  storeName: string | null;
  storeAddress: string | null;
  date: Date | null;
  time: string | null;
  dateString: string | null;
  items: ParsedItem[];
  subtotal: number | null;
  tax: number | null;
  discount: number | null;
  total: number | null;
  paymentMethod: 'cash' | 'card' | 'digital' | null;
  rawText: string;
  confidence: number;
  // Chain-specific fields
  chainId?: string | null;
  chainName?: string | null;
  chainConfidence?: number;
  parsingMethod?: 'chain' | 'generic';
}

/**
 * Auto-detected receipt format settings
 */
interface ReceiptFormat {
  decimalSeparator: '.' | ',';
  dateFormat: 'DMY' | 'MDY' | 'YMD';
  isColumnar: boolean;
}

/**
 * Receipt sections extracted from OCR text
 */
interface ReceiptSections {
  header: string[];
  items: string[];
  totals: string[];
  footer: string[];
}

const OCR_CORRECTIONS: [RegExp, string][] = [
  [/[0O](?=\d{2}[,\.]\d{2})/g, '0'],
  [/[Il1](?=\d[,\.]\d{2})/g, '1'],
  [/\$\s+/g, '$'],
  [/€\s+/g, '€'],
  [/\s+,\s+/g, ','],
];

const SKIP_KEYWORDS = [
  'receipt',
  'ticket',
  'recibo',
  'bon',
  'reçu',
  'beleg',
  'store',
  'shop',
  'tienda',
  'magasin',
  'geschäft',
  'phone',
  'telefono',
  'teléfono',
  'tel',
  'address',
  'direccion',
  'dirección',
  'adresse',
  'cashier',
  'cajero',
  'kassier',
  'caissier',
  'terminal',
  'register',
  'caja',
  'member',
  'socio',
  'client',
  'kunde',
  'welcome',
  'bienvenido',
  'willkommen',
  'bienvenue',
  'thank',
  'gracias',
  'danke',
  'merci',
  'documento',
  'operacion',
  'operación',
  'fecha',
  'hora',
  'date',
  'time',
  // Company/legal identifiers
  's.l.',
  's.a.',
  'c.i.f',
  'cif:',
  'n.i.f',
  'nif:',
  'supermercados',
  'hipermercados',
  // Store info
  'centro vend',
  'articulo',
  'artículo',
];

// Patterns that indicate header/metadata lines (not products)
// These should be GENERIC patterns that work across all receipts, not store-specific
const HEADER_PATTERNS = [
  /^\d{4,}-[A-Z]{2}/i, // Store codes like "9232-HD"
  /^[A-Z]{2,4}\d{4,}/i, // Codes like "HD9232"
  /\d{9,}/, // Long numbers (phone, CIF, etc.)
  /^www\./i, // URLs
  /^http/i,
  /@/, // Email
  /c\.?i\.?f\.?:?\s*[A-Z]\d/i, // CIF pattern
  /n\.?i\.?f\.?:?\s*\d/i, // NIF pattern
  /^\d+[.,]\d+\s*x\s*\d+[.,]\d+/i, // Quantity lines like "1,000 x 1,50"
  /^x\s*\d+[.,]\d+/i, // Lines starting with "x 1,50"
  // Generic address patterns (work for any country)
  /^\d{5}\p{L}/u, // 5-digit postal code directly followed by text (no space)
  /^C\/\s*\p{L}/iu, // Street address "C/ ..." (Spanish format)
  /^Calle\s/i, // Street "Calle ..."
  /^Avda\.?\s/i, // Avenue "Avda ..."
  /^Avenida\s/i, // Avenue "Avenida ..."
  /^Plaza\s/i, // Plaza
  /^Pol[íi]gono\s/i, // Industrial area "Polígono ..."
  // Legal entity suffixes (end of line)
  /\bS\.A\.U\.?\s*$/i, // S.A.U.
  /\bS\.L\.U?\.?\s*$/i, // S.L. / S.L.U.
  // Tax IDs anywhere in text
  /\bNIF\s*[A-Z]\d/i, // NIF + letter + digit
  /\bCIF\s*[A-Z]\d/i, // CIF + letter + digit
];

const UNIT_PATTERNS: { pattern: RegExp; unit: ParsedItem['unit'] }[] = [
  { pattern: /(\d+[.,]?\d*)\s*kg/i, unit: 'kg' },
  { pattern: /(\d+[.,]?\d*)\s*lb/i, unit: 'lb' },
  { pattern: /(\d+[.,]?\d*)\s*oz/i, unit: 'oz' },
  { pattern: /(\d+[.,]?\d*)\s*g(?:r)?(?:ams?)?(?!\w)/i, unit: 'g' },
  { pattern: /(\d+[.,]?\d*)\s*l(?:t)?(?:rs?)?(?!\w)/i, unit: 'l' },
  { pattern: /(\d+[.,]?\d*)\s*ml/i, unit: 'ml' },
];

const ADDRESS_PATTERNS = [
  /\d+\s+\w+\s+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|way|ln|lane|calle|avenida|carrera)/i,
  /\w+\s+\d+[,\s]+\d{4,5}/i,
  /\d{4,5}\s+\w+/i,
];

/**
 * Auto-detect the receipt format by analyzing the content
 */
function detectReceiptFormat(lines: string[]): ReceiptFormat {
  const text = lines.join(' ');

  const commaDecimals = (text.match(/\d+,\d{2}(?!\d)/g) || []).length;
  const dotDecimals = (text.match(/\d+\.\d{2}(?!\d)/g) || []).length;

  const decimalSeparator: '.' | ',' = commaDecimals > dotDecimals ? ',' : '.';

  let dateFormat: 'DMY' | 'MDY' | 'YMD' = 'MDY';

  const dateMatch = text.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/);
  if (dateMatch) {
    const first = parseInt(dateMatch[1], 10);
    const second = parseInt(dateMatch[2], 10);
    if (first > 12) {
      dateFormat = 'DMY';
    } else if (second > 12) {
      dateFormat = 'MDY';
    } else {
      const europeanHints = (text.match(/€|iva|artícul|teléfono|compra/gi) || []).length;
      const usHints = (text.match(/\$|tax(?!i)|subtotal/gi) || []).length;
      dateFormat = europeanHints > usHints ? 'DMY' : 'MDY';
    }
  }

  if (/\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b/.test(text)) {
    dateFormat = 'YMD';
  }

  let priceOnlyLines = 0;
  let textWithPriceLines = 0;

  const pricePattern = decimalSeparator === ',' ? /\d+,\d{2}/ : /\d+\.\d{2}/;

  for (const line of lines) {
    const trimmed = line.trim();
    const hasPrice = pricePattern.test(trimmed);
    const isPriceOnly = new RegExp(
      `^\\d+[${decimalSeparator === ',' ? ',' : '\\.'}]\\s*\\d{2}\\s*[A-Za-z]{0,3}$`
    ).test(trimmed);

    if (isPriceOnly) {
      priceOnlyLines++;
    } else if (hasPrice && trimmed.length > 10) {
      textWithPriceLines++;
    }
  }

  const isColumnar = priceOnlyLines > 3 && priceOnlyLines > textWithPriceLines;

  return { decimalSeparator, dateFormat, isColumnar };
}

const TOTAL_KEYWORDS = [
  'total',
  'subtotal',
  'tax',
  'iva',
  'vat',
  'mwst',
  'tva',
  'sum',
  'amount',
  'balance',
  'due',
  'change',
  'cash',
  'card',
  'paid',
  'payment',
  'tender',
  'credit',
  'debit',
  'suma',
  'importe',
  'pago',
  'cambio',
  'efectivo',
  'tarjeta',
  'gesamt',
  'zahlung',
  'betrag',
  'somme',
  'montant',
  'paiement',
];

/**
 * Preprocess OCR text to fix common errors and normalize formatting
 */
export function preprocessText(lines: string[]): string[] {
  return lines
    .map((line) => {
      let processed = line.trim();

      for (const [pattern, replacement] of OCR_CORRECTIONS) {
        processed = processed.replace(pattern, replacement);
      }

      processed = processed.replace(/\s+/g, ' ');

      processed = processed.replace(/\$\s*(\d)/g, '$$$1');

      return processed;
    })
    .filter((line) => line.length > 0);
}

/**
 * Extract sections from receipt text
 * Divides the receipt into header, items, totals, and footer sections
 */
export function extractSections(lines: string[]): ReceiptSections {
  const sections: ReceiptSections = {
    header: [],
    items: [],
    totals: [],
    footer: [],
  };

  let currentSection: keyof ReceiptSections = 'header';
  let foundFirstPrice = false;
  let foundTotals = false;
  let headerLineCount = 0;
  const maxHeaderLines = 8;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    const hasPrice = /\d+[.,]\d{2}/.test(line);

    const isTotalLine = TOTAL_KEYWORDS.some((kw) => lowerLine.includes(kw));

    const isFooterLine =
      /thank\s*you|gracias|have\s*a\s*(nice|good)|buen\s*dia|visit\s*us|www\.|http|survey/i.test(
        lowerLine
      );

    if (!foundFirstPrice && !isTotalLine) {
      headerLineCount++;
      if (hasPrice || headerLineCount > maxHeaderLines) {
        foundFirstPrice = true;
        currentSection = 'items';
        if (hasPrice) {
          sections[currentSection].push(line);
          continue;
        }
      } else {
        sections.header.push(line);
        continue;
      }
    }

    if (isTotalLine && !foundTotals) {
      foundTotals = true;
      currentSection = 'totals';
    }

    if (isFooterLine && foundTotals) {
      currentSection = 'footer';
    }

    sections[currentSection].push(line);
  }

  return sections;
}

/**
 * Parse price from a string
 * Handles formats: $12.34, 12.34, $12,34, 12,34, 12, 34 (with space)
 */
function parsePrice(text: string): number | null {
  let cleaned = text.replace(/[$€£¥]/g, '').trim();

  cleaned = cleaned.replace(/(\d+),\s+(\d{2})/, '$1,$2');
  cleaned = cleaned.replace(/(\d+)\.\s+(\d{2})/, '$1.$2');

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

  const simpleMatch = cleaned.match(/^(\d+)$/);
  if (simpleMatch) {
    return parseInt(simpleMatch[1], 10);
  }

  return null;
}

/**
 * Check if a line looks like a standalone price (European or US format)
 */
function isStandalonePrice(line: string): boolean {
  const cleaned = line.trim();
  return /^\d+[,\.]\s*\d{2}(\s*[A-Za-z]{0,3})?$/.test(cleaned);
}

/**
 * Check if a line looks like a product name (no price, reasonable length)
 */
function isProductLine(line: string): boolean {
  const cleaned = line.trim();
  if (cleaned.length < 3) return false;
  if (/^\d+[,\.]\d{2}$/.test(cleaned)) return false;
  if (/^[\d\s\-\/\.\:]+$/.test(cleaned)) return false;

  const lowerLine = cleaned.toLowerCase();

  // Check skip keywords
  for (const keyword of SKIP_KEYWORDS) {
    if (lowerLine.includes(keyword)) return false;
  }

  // Check header patterns
  for (const pattern of HEADER_PATTERNS) {
    if (pattern.test(cleaned)) return false;
  }

  const skipPatterns = [
    /^total/i,
    /^subtotal/i,
    /^iva/i,
    /^tax/i,
    /^fecha/i,
    /^hora/i,
    /^documento/i,
    /^tarjeta/i,
    /^efectivo/i,
    /^cambio/i,
    /^vuelto/i,
    /^operaci[oó]n/i,
    /^contactless/i,
    /^importe/i,
    /^detalle/i,
    /^pagos?$/i,
    /^venta$/i,
    /^compra$/i,
    /dinosol/i, // Company name
    /hiperdino/i, // Store name
  ];

  for (const pattern of skipPatterns) {
    if (pattern.test(lowerLine)) return false;
  }

  return true;
}

/**
 * Parse items from columnar format (names and prices on separate lines)
 */
function parseColumnarItems(lines: string[]): ParsedItem[] {
  const items: ParsedItem[] = [];
  const productLines: string[] = [];
  const priceLines: number[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (isStandalonePrice(trimmed)) {
      const price = parsePrice(trimmed);
      if (price !== null && price > 0 && price < 10000) {
        priceLines.push(price);
      }
    } else if (isProductLine(trimmed)) {
      productLines.push(trimmed);
    }
  }

  const matchCount = Math.min(productLines.length, priceLines.length);
  for (let i = 0; i < matchCount; i++) {
    let name = productLines[i];
    const totalPrice = priceLines[i];

    let quantity = 1;
    let unitPrice = totalPrice;

    const qtyMatch = name.match(/\s*x\s*(\d+)$/i) || name.match(/^(\d+)\s*x\s*/i);
    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1], 10);
      name = name.replace(qtyMatch[0], '').trim();
      unitPrice = totalPrice / quantity;
    }

    items.push({
      name,
      quantity,
      unitPrice: Math.round(unitPrice * 100) / 100,
      totalPrice,
      unit: quantity > 1 ? 'each' : null,
      confidence: 70,
    });
  }

  return items;
}

/**
 * Parse time from text
 * Returns time in HH:MM format
 */
function parseTime(text: string): string | null {
  const patterns = [
    /(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)/i,
    /(\d{1,2}):(\d{2})(?::\d{2})?(?!\s*(?:am|pm))/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];

      if (match[3]) {
        const isPM = /pm|p\.m\./i.test(match[3]);
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
      }

      if (hours >= 0 && hours < 24 && parseInt(minutes, 10) < 60) {
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
      }
    }
  }

  return null;
}

/**
 * Parse date from text
 * @param text - The text to parse
 * @param formatHint - Optional hint for date format (DMY, MDY, YMD)
 */
function parseDate(
  text: string,
  formatHint?: 'DMY' | 'MDY' | 'YMD'
): { date: Date | null; dateString: string | null } {
  const patterns = [
    { regex: /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/, format: 'DMY' },
    { regex: /\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/, format: 'YMD' },
    { regex: /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})(?!\d)/, format: 'DMY_SHORT' },
    {
      regex: /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+(\d{1,2}),?\s+(\d{4})/i,
      format: 'MDY_NAMED',
    },
    {
      regex: /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+(\d{4})/i,
      format: 'DMY_NAMED',
    },
    {
      regex: /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+(\d{2})(?!\d)/i,
      format: 'DMY_NAMED_SHORT',
    },
    {
      regex:
        /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+(\d{1,2}),?\s+(\d{2})(?!\d)/i,
      format: 'MDY_NAMED_SHORT',
    },
    {
      regex:
        /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?(\d{4})/i,
      format: 'DMY_SPANISH',
    },
    {
      regex: /(\d{1,2})[\/\-](ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\w*[\/\-](\d{4})/i,
      format: 'DMY_SPANISH_SHORT',
    },
    { regex: /\b(\d{2})(\d{2})(\d{4})\b/, format: 'COMPACT' },
  ];

  const monthNames: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };

  const spanishMonths: Record<string, number> = {
    enero: 0,
    febrero: 1,
    marzo: 2,
    abril: 3,
    mayo: 4,
    junio: 5,
    julio: 6,
    agosto: 7,
    septiembre: 8,
    octubre: 9,
    noviembre: 10,
    diciembre: 11,
  };

  const spanishMonthsShort: Record<string, number> = {
    ene: 0,
    feb: 1,
    mar: 2,
    abr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    ago: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dic: 11,
  };

  for (const { regex, format } of patterns) {
    const match = text.match(regex);
    if (match) {
      let year: number, month: number, day: number;

      switch (format) {
        case 'DMY': {
          const first = parseInt(match[1], 10);
          const second = parseInt(match[2], 10);
          year = parseInt(match[3], 10);

          if (first > 12) {
            day = first;
            month = second - 1;
          } else if (second > 12) {
            month = first - 1;
            day = second;
          } else if (formatHint === 'MDY') {
            month = first - 1;
            day = second;
          } else {
            day = first;
            month = second - 1;
          }
          break;
        }
        case 'DMY_SHORT': {
          const first = parseInt(match[1], 10);
          const second = parseInt(match[2], 10);
          year = parseInt(match[3], 10);
          if (year < 100) year += 2000;

          if (first > 12) {
            day = first;
            month = second - 1;
          } else if (second > 12) {
            month = first - 1;
            day = second;
          } else if (formatHint === 'MDY') {
            month = first - 1;
            day = second;
          } else {
            day = first;
            month = second - 1;
          }
          break;
        }
        case 'YMD':
          year = parseInt(match[1], 10);
          month = parseInt(match[2], 10) - 1;
          day = parseInt(match[3], 10);
          break;
        case 'MDY_NAMED':
          month = monthNames[match[1].toLowerCase().slice(0, 3)];
          day = parseInt(match[2], 10);
          year = parseInt(match[3], 10);
          break;
        case 'DMY_NAMED':
          day = parseInt(match[1], 10);
          month = monthNames[match[2].toLowerCase().slice(0, 3)];
          year = parseInt(match[3], 10);
          break;
        case 'DMY_NAMED_SHORT':
          day = parseInt(match[1], 10);
          month = monthNames[match[2].toLowerCase().slice(0, 3)];
          year = parseInt(match[3], 10);
          if (year < 100) year += 2000;
          break;
        case 'MDY_NAMED_SHORT':
          month = monthNames[match[1].toLowerCase().slice(0, 3)];
          day = parseInt(match[2], 10);
          year = parseInt(match[3], 10);
          if (year < 100) year += 2000;
          break;
        case 'DMY_SPANISH':
          day = parseInt(match[1], 10);
          month = spanishMonths[match[2].toLowerCase()];
          year = parseInt(match[3], 10);
          break;
        case 'DMY_SPANISH_SHORT':
          day = parseInt(match[1], 10);
          month = spanishMonthsShort[match[2].toLowerCase().slice(0, 3)];
          year = parseInt(match[3], 10);
          break;
        case 'COMPACT':
          day = parseInt(match[1], 10);
          month = parseInt(match[2], 10) - 1;
          year = parseInt(match[3], 10);
          if (day > 12 && month <= 11) {
            const temp = day;
            day = month + 1;
            month = temp - 1;
          }
          break;
        default:
          continue;
      }

      if (month < 0 || month > 11 || day < 1 || day > 31) continue;

      const date = new Date(year, month, day);
      if (!isNaN(date.getTime()) && date.getFullYear() >= 2000 && date.getFullYear() <= 2100) {
        return { date, dateString: match[0] };
      }
    }
  }

  return { date: null, dateString: null };
}

/**
 * Extract store address from header lines
 */
function extractStoreAddress(headerLines: string[]): string | null {
  for (const line of headerLines) {
    for (const pattern of ADDRESS_PATTERNS) {
      if (pattern.test(line)) {
        return line.trim();
      }
    }
  }
  return null;
}

/**
 * Parse a line item from text
 * @param line - The text line to parse
 * @param decimalSep - The decimal separator to use ('.' or ',')
 */
function parseLineItem(line: string, decimalSep: '.' | ',' = '.'): ParsedItem | null {
  if (line.length < 3) return null;

  const lowerLine = line.toLowerCase();
  for (const keyword of SKIP_KEYWORDS) {
    if (lowerLine.includes(keyword)) return null;
  }
  for (const keyword of TOTAL_KEYWORDS) {
    if (lowerLine.includes(keyword)) return null;
  }
  // Check header patterns
  for (const pattern of HEADER_PATTERNS) {
    if (pattern.test(line)) return null;
  }

  const pricePatterns = [
    /^(.+?)\s+\$\s*(\d+[.,]\d{2})\s*$/,
    /^(.+?)\s+(\d+[.,]\d{2})\s*$/,
    /^(.+?)\s+(\d+[.,]\d{2})\s*[A-Za-z]{0,3}\s*$/,
    /^(.+?)\s*\$\s*(\d+[.,]\d{2})(?:\s|$)/,
    /^(.+?)[\t\s]{2,}(\d+[.,]\d{2})\s*$/,
    /^(.+?)\s*\(\s*\$?\s*(\d+[.,]\d{2})\s*\)\s*$/,
  ];

  let name: string | null = null;
  let totalPrice: number | null = null;

  for (const pattern of pricePatterns) {
    const match = line.match(pattern);
    if (match) {
      name = match[1].trim();
      totalPrice = parsePrice(match[2]);
      if (totalPrice !== null && totalPrice > 0 && name.length > 1) {
        break;
      }
      name = null;
      totalPrice = null;
    }
  }

  if (!name || totalPrice === null || totalPrice <= 0) return null;

  let quantity = 1;
  let unitPrice = totalPrice;
  let unit: ParsedItem['unit'] = null;

  for (const { pattern, unit: unitType } of UNIT_PATTERNS) {
    const unitMatch = name.match(pattern);
    if (unitMatch) {
      const qty = parseFloat(unitMatch[1].replace(',', '.'));
      if (qty > 0) {
        quantity = qty;
        unit = unitType;
        unitPrice = totalPrice / quantity;
        name = name.replace(unitMatch[0], '').trim();
        break;
      }
    }
  }

  if (unit === null) {
    const qtyPrefixMatch = name.match(/^(\d+)\s*[xX×]\s*/);
    if (qtyPrefixMatch) {
      quantity = parseInt(qtyPrefixMatch[1], 10);
      name = name.slice(qtyPrefixMatch[0].length).trim();
      unitPrice = totalPrice / quantity;
      unit = 'each';
    }

    if (unit === null) {
      const qtySuffixMatch = name.match(/\s*[xX×]\s*(\d+)$/);
      if (qtySuffixMatch) {
        quantity = parseInt(qtySuffixMatch[1], 10);
        name = name.slice(0, qtySuffixMatch.index).trim();
        unitPrice = totalPrice / quantity;
        unit = 'each';
      }
    }

    if (unit === null) {
      const qtyStartMatch = name.match(/^(\d+)\s+/);
      if (
        qtyStartMatch &&
        parseInt(qtyStartMatch[1], 10) > 1 &&
        parseInt(qtyStartMatch[1], 10) < 100
      ) {
        quantity = parseInt(qtyStartMatch[1], 10);
        name = name.slice(qtyStartMatch[0].length).trim();
        unitPrice = totalPrice / quantity;
        unit = 'each';
      }
    }
  }

  name = name.replace(/\s+/g, ' ').trim();

  if (name.length < 2 || /^\d+$/.test(name)) return null;

  let confidence = 60;
  if (name.length > 5) confidence += 10;
  if (unit !== null) confidence += 10;
  if (!/[^a-zA-Z0-9\s\-]/.test(name)) confidence += 10;

  return {
    name,
    quantity,
    unitPrice: Math.round(unitPrice * 100) / 100,
    totalPrice,
    unit,
    confidence: Math.min(confidence, 95),
  };
}

/**
 * Extract store name from lines using heuristics (no store-specific patterns)
 * First non-empty line that looks like a business name is typically the store
 */
function extractStoreName(lines: string[]): string | null {
  const headerLines = lines.slice(0, 8);

  const skipPatterns = [
    /^\d+[\s\-\/\.\:]+\d+/,
    /^[\d\s\-\/\.\:]+$/,
    /^\d{4,}/,
    /^(www\.|http|@)/i,
    /^(tel|phone|fax|nif|cif|rfc)/i,
    /^(receipt|ticket|recibo|factura|bon)/i,
    /^\*+$/,
    /^-+$/,
    /^=+$/,
  ];

  for (const line of headerLines) {
    const cleaned = line.trim();

    if (cleaned.length < 3 || cleaned.length > 60) continue;

    let shouldSkip = false;
    for (const pattern of skipPatterns) {
      if (pattern.test(cleaned)) {
        shouldSkip = true;
        break;
      }
    }
    if (shouldSkip) continue;

    if (!/[a-zA-Z]/.test(cleaned)) continue;

    return cleaned;
  }

  return null;
}

/**
 * Extract store name with regional preset awareness
 * First checks for known stores from preset, then falls back to heuristics
 */
function extractStoreNameWithPreset(
  lines: string[],
  preset?: RegionalPreset | null
): string | null {
  const headerLines = lines.slice(0, 10);

  // If preset has common stores, try to match them first
  if (preset?.commonStores) {
    // First pass: look for exact/full matches (most reliable)
    for (const line of headerLines) {
      const cleaned = line.trim().toUpperCase();

      for (const storeName of preset.commonStores) {
        // Check if line contains the full store name
        if (cleaned.includes(storeName)) {
          // Return the matched store name (normalized)
          return storeName.charAt(0) + storeName.slice(1).toLowerCase();
        }
      }
    }

    // Second pass: look for partial matches only for longer store names
    // Sort by length descending to match longer names first
    const sortedStores = [...preset.commonStores].sort((a, b) => b.length - a.length);
    for (const line of headerLines) {
      const cleaned = line.trim().toUpperCase();

      for (const storeName of sortedStores) {
        // Only use partial matching for stores with 6+ characters
        // This prevents "LIDL" from partially matching other things
        if (storeName.length >= 6 && cleaned.includes(storeName.slice(0, 5))) {
          return storeName.charAt(0) + storeName.slice(1).toLowerCase();
        }
      }
    }
  }

  // Fall back to heuristic extraction
  return extractStoreName(lines);
}

/**
 * Extract payment method from text
 */
function extractPaymentMethod(text: string): 'cash' | 'card' | 'digital' | null {
  const lowerText = text.toLowerCase();

  if (/\b(cash|efectivo|cambio|vuelto|contado|dinero)\b/.test(lowerText)) {
    return 'cash';
  }
  if (
    /\b(visa|mastercard|master\s*card|credit|debit|card|tarjeta|credito|debito|crédito|débito|amex|american\s*express|discover|chip|swipe|contactless)\b/.test(
      lowerText
    )
  ) {
    return 'card';
  }
  if (
    /\b(apple\s*pay|google\s*pay|paypal|venmo|digital|nfc|tap|wallet|zelle|transfer|transferencia)\b/.test(
      lowerText
    )
  ) {
    return 'digital';
  }

  if (/[X\*]{4,}\d{4}/.test(text)) {
    return 'card';
  }

  return null;
}

/**
 * Extract totals from lines
 * @param lines - The lines to search for totals
 * @param decimalSep - The decimal separator to use ('.' or ',')
 */
function extractTotals(
  lines: string[],
  decimalSep: '.' | ',' = '.'
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    let price = parsePrice(line);

    if (price === null && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (isStandalonePrice(nextLine)) {
        price = parsePrice(nextLine);
      }
    }

    if (price !== null && price > 0) {
      if (/\b(subtotal|sub-total|sub\s+total)\b/.test(lowerLine)) {
        subtotal = price;
      } else if (/\b(tax|iva|impuesto|i\.v\.a)\b/.test(lowerLine)) {
        tax = price;
      } else if (
        /\b(discount|descuento|savings|ahorro|promo|oferta|off|-\s*[$€])/i.test(lowerLine)
      ) {
        discount = price;
      } else if (
        /\b(total|grand\s+total|amount\s+due|balance|total\s+(compra|a\s+pagar))\b/i.test(
          lowerLine
        ) &&
        !lowerLine.includes('sub') &&
        !lowerLine.includes('artícul')
      ) {
        if (total === null || price > total) {
          total = price;
        }
      }
    }
  }

  if (total === null) {
    for (const line of lines) {
      if (isStandalonePrice(line)) {
        const price = parsePrice(line);
        if (price !== null && price > 10 && (total === null || price > total)) {
          total = price;
        }
      }
    }
  }

  return { subtotal, tax, discount, total };
}

/**
 * Parser options - user preferences that serve as hints for parsing
 */
export interface ParserOptions {
  preferredDateFormat?: 'DMY' | 'MDY' | 'YMD';
  preferredDecimalSeparator?: '.' | ',';
  regionalPreset?: RegionalPreset;
}

/**
 * Validation result for a parsed receipt
 */
export interface ReceiptValidation {
  isValid: boolean;
  itemsSumMatchesTotal: boolean;
  itemsSum: number;
  difference: number;
  differencePercent: number;
  suggestedTotal: number | null;
  warnings: string[];
  confidence: number;
}

/**
 * Validate a parsed receipt
 * Checks if items sum matches total and provides confidence scoring
 */
export function validateReceipt(receipt: ParsedReceipt): ReceiptValidation {
  const warnings: string[] = [];
  let isValid = true;

  // Calculate items sum
  const itemsSum = receipt.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const roundedItemsSum = Math.round(itemsSum * 100) / 100;

  // Check if items sum matches total
  let itemsSumMatchesTotal = false;
  let difference = 0;
  let differencePercent = 0;

  if (receipt.total !== null && receipt.items.length > 0) {
    difference = Math.abs(roundedItemsSum - receipt.total);
    differencePercent = receipt.total > 0 ? (difference / receipt.total) * 100 : 0;

    // Consider a match if within 5% (accounts for tax, discounts, rounding)
    if (differencePercent <= 5) {
      itemsSumMatchesTotal = true;
    } else if (differencePercent <= 15) {
      // Partial match - might be missing items or tax
      warnings.push(
        `Items sum (${roundedItemsSum.toFixed(2)}) differs from total (${receipt.total.toFixed(2)}) by ${differencePercent.toFixed(1)}%`
      );
    } else {
      // Significant mismatch
      warnings.push(
        `Items sum (${roundedItemsSum.toFixed(2)}) significantly differs from total (${receipt.total.toFixed(2)})`
      );
      isValid = false;
    }
  }

  // Check for missing critical fields
  if (!receipt.storeName) {
    warnings.push('Store name not detected');
  }

  if (!receipt.date) {
    warnings.push('Date not detected');
  }

  if (receipt.items.length === 0) {
    warnings.push('No items detected');
    isValid = false;
  }

  if (receipt.total === null) {
    warnings.push('Total not detected');
  }

  // Check for items with suspiciously high prices
  const highPriceItems = receipt.items.filter((item) => item.totalPrice > 200);
  if (highPriceItems.length > 0) {
    warnings.push(`${highPriceItems.length} item(s) with price > 200`);
  }

  // Check for duplicate items (same name and price)
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const item of receipt.items) {
    const key = `${item.name.toLowerCase()}:${item.totalPrice}`;
    if (seen.has(key)) {
      duplicates.push(item.name);
    }
    seen.add(key);
  }
  if (duplicates.length > 0) {
    warnings.push(`Possible duplicates: ${duplicates.slice(0, 3).join(', ')}`);
  }

  // Calculate validation confidence
  let confidence = 50;
  if (itemsSumMatchesTotal) confidence += 30;
  if (receipt.storeName) confidence += 5;
  if (receipt.date) confidence += 5;
  if (receipt.items.length > 0) confidence += 5;
  if (receipt.total !== null) confidence += 5;
  if (warnings.length === 0) confidence += 10;
  confidence -= warnings.length * 5;

  // Suggest total if items sum doesn't match
  const suggestedTotal = !itemsSumMatchesTotal && receipt.items.length > 0 ? roundedItemsSum : null;

  return {
    isValid,
    itemsSumMatchesTotal,
    itemsSum: roundedItemsSum,
    difference,
    differencePercent,
    suggestedTotal,
    warnings,
    confidence: Math.max(0, Math.min(100, confidence)),
  };
}

/**
 * Apply regional preset keywords to improve total/tax detection
 */
function extractTotalsWithPreset(
  lines: string[],
  decimalSep: '.' | ',',
  preset?: RegionalPreset
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

  const keywords = preset?.keywords || {
    total: TOTAL_KEYWORDS,
    subtotal: ['subtotal', 'sub-total', 'sub total', 'base'],
    tax: ['tax', 'iva', 'impuesto', 'vat', 'mwst'],
    discount: ['discount', 'descuento', 'ahorro', 'savings'],
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();
    const lowerLine = line.toLowerCase();

    let price = parsePrice(line);

    // Check next line for standalone price
    if (price === null && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (isStandalonePrice(nextLine)) {
        price = parsePrice(nextLine);
      }
    }

    if (price !== null && price > 0) {
      // Check for subtotal
      if (keywords.subtotal.some((kw) => upperLine.includes(kw.toUpperCase()))) {
        subtotal = price;
        continue;
      }

      // Check for tax
      if (keywords.tax.some((kw) => upperLine.includes(kw.toUpperCase()))) {
        tax = price;
        continue;
      }

      // Check for discount
      if (keywords.discount.some((kw) => upperLine.includes(kw.toUpperCase()))) {
        discount = price;
        continue;
      }

      // Check for total (must not contain subtotal keywords)
      const isSubtotal = lowerLine.includes('sub');
      const isArticleCount = lowerLine.includes('artícul') || lowerLine.includes('articul');

      if (
        !isSubtotal &&
        !isArticleCount &&
        keywords.total.some((kw) => upperLine.includes(kw.toUpperCase()))
      ) {
        if (total === null || price > total) {
          total = price;
        }
      }
    }
  }

  return { subtotal, tax, discount, total };
}

/**
 * Main parsing function
 * Takes raw OCR lines and returns structured receipt data
 * Uses chain-specific templates when available, falls back to generic parsing
 * Accepts optional user preferences as hints for ambiguous cases
 */
export function parseReceipt(lines: string[], options?: ParserOptions): ParsedReceipt {
  const processedLines = preprocessText(lines);
  const rawText = processedLines.join('\n');

  // Step 1: Try chain-specific parsing first
  const chainDetection = detectChainFromLines(processedLines);

  if (shouldUseChainParsing(chainDetection)) {
    if (__DEV__) {
      console.log(
        '[Parser] Using chain-specific parsing for:',
        chainDetection.chainId,
        'confidence:',
        chainDetection.confidence
      );
    }

    const chainResult = parseWithChainTemplate(processedLines, chainDetection);

    // If chain parsing produced good results, return it
    if (chainResult.items.length > 0 || chainResult.total !== null) {
      if (__DEV__) {
        console.log('[Parser] Chain parsing successful:', {
          chain: chainResult.chainName,
          items: chainResult.items.length,
          total: chainResult.total,
          confidence: chainResult.confidence,
        });
      }
      return chainResult;
    }

    if (__DEV__) {
      console.log('[Parser] Chain parsing produced no results, falling back to generic');
    }
  }

  // Step 2: Fall back to generic parsing
  // Always use Spain preset for Spanish-focused app
  let preset = options?.regionalPreset || SPAIN_PRESET;

  const format = detectReceiptFormat(processedLines);

  // Apply preset defaults if detected
  if (preset) {
    format.decimalSeparator = preset.decimalSeparator;
    format.dateFormat = preset.dateFormat;
    if (__DEV__) {
      console.log(
        '[Parser] Using preset:',
        preset.id,
        '- decimal:',
        format.decimalSeparator,
        '- date:',
        format.dateFormat
      );
    }
  } else {
    if (__DEV__) {
      console.log(
        '[Parser] Auto-detected format - decimal:',
        format.decimalSeparator,
        '- columnar:',
        format.isColumnar
      );
    }
  }

  if (options?.preferredDateFormat) {
    const dateMatch = rawText.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/);
    if (dateMatch) {
      const first = parseInt(dateMatch[1], 10);
      const second = parseInt(dateMatch[2], 10);
      if (first <= 12 && second <= 12) {
        format.dateFormat = options.preferredDateFormat;
      }
    }
  }

  if (options?.preferredDecimalSeparator) {
    const commaDecimals = (rawText.match(/\d+,\d{2}(?!\d)/g) || []).length;
    const dotDecimals = (rawText.match(/\d+\.\d{2}(?!\d)/g) || []).length;
    if (Math.abs(commaDecimals - dotDecimals) < 2) {
      format.decimalSeparator = options.preferredDecimalSeparator;
    }
  }

  const sections = extractSections(processedLines);

  // Extract store name with regional preset awareness
  let storeName = extractStoreNameWithPreset(
    sections.header.length > 0 ? sections.header : processedLines.slice(0, 10),
    preset
  );
  if (!storeName) {
    storeName = extractStoreNameWithPreset(processedLines, preset);
  }

  const storeAddress = extractStoreAddress(
    sections.header.length > 0 ? sections.header : processedLines.slice(0, 10)
  );

  let dateResult = { date: null as Date | null, dateString: null as string | null };
  let time: string | null = null;

  const headerToSearch = sections.header.length > 0 ? sections.header : processedLines.slice(0, 10);
  for (const line of headerToSearch) {
    if (!dateResult.date) {
      dateResult = parseDate(line, format.dateFormat);
    }
    if (!time) {
      time = parseTime(line);
    }
    if (dateResult.date && time) break;
  }

  if (!dateResult.date) {
    for (const line of processedLines) {
      dateResult = parseDate(line, format.dateFormat);
      if (dateResult.date) break;
    }
  }

  if (!time) {
    for (const line of processedLines) {
      time = parseTime(line);
      if (time) break;
    }
  }

  let items: ParsedItem[] = [];

  if (format.isColumnar) {
    items = parseColumnarItems(processedLines);
  }

  if (items.length === 0) {
    const itemsToProcess = sections.items.length > 0 ? sections.items : processedLines;
    for (const line of itemsToProcess) {
      const item = parseLineItem(line, format.decimalSeparator);
      if (item) {
        items.push(item);
      }
    }
  }

  if (items.length === 0) {
    for (const line of processedLines) {
      const item = parseLineItem(line, format.decimalSeparator);
      if (item) {
        items.push(item);
      }
    }
  }

  if (items.length === 0 && !format.isColumnar) {
    items = parseColumnarItems(processedLines);
  }

  // Extract totals using preset-aware function if preset detected
  let totalsToProcess = sections.totals.length > 0 ? sections.totals : processedLines;
  let { subtotal, tax, discount, total } = preset
    ? extractTotalsWithPreset(totalsToProcess, format.decimalSeparator, preset)
    : extractTotals(totalsToProcess, format.decimalSeparator);

  if (total === null) {
    const allTotals = preset
      ? extractTotalsWithPreset(processedLines, format.decimalSeparator, preset)
      : extractTotals(processedLines, format.decimalSeparator);
    subtotal = subtotal || allTotals.subtotal;
    tax = tax || allTotals.tax;
    discount = discount || allTotals.discount;
    total = total || allTotals.total;
  }

  const paymentMethod = extractPaymentMethod(rawText);

  // Quality-based confidence calculation
  let confidence = 30;

  // Store name quality check
  if (storeName) {
    const hasLetters = /[a-zA-Z]{2,}/.test(storeName);
    const reasonableLength = storeName.length >= 3 && storeName.length <= 50;
    const notJustNumbers = !/^\d+$/.test(storeName);
    if (hasLetters && reasonableLength && notJustNumbers) {
      confidence += 10;
    } else {
      confidence += 3; // Found something but it's low quality
    }
  }

  if (storeAddress) confidence += 5;

  // Date quality check
  if (dateResult.date) {
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const isReasonableDate = dateResult.date <= now && dateResult.date >= oneYearAgo;
    confidence += isReasonableDate ? 10 : 3;
  }

  if (time) confidence += 3;

  // Items quality checks
  if (items.length > 0) {
    confidence += 10;

    // Check if item prices are reasonable (between $0.10 and $500)
    const reasonablePrices = items.filter(
      (item) => item.totalPrice >= 0.1 && item.totalPrice <= 500
    );
    const priceQuality = reasonablePrices.length / items.length;
    confidence += Math.round(priceQuality * 10);

    // Check if item names look valid (have letters, reasonable length)
    const validNames = items.filter((item) => {
      const hasLetters = /[a-zA-Z]{2,}/.test(item.name);
      const reasonableLength = item.name.length >= 2 && item.name.length <= 60;
      return hasLetters && reasonableLength;
    });
    const nameQuality = validNames.length / items.length;
    confidence += Math.round(nameQuality * 10);

    // Bonus for having multiple items
    if (items.length >= 3) confidence += 3;
    if (items.length >= 5) confidence += 2;
  }

  // Total quality checks
  if (total !== null) {
    confidence += 5;

    // Check if items sum roughly matches total (within 20%)
    if (items.length > 0) {
      const itemsSum = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const difference = Math.abs(itemsSum - total);
      const tolerance = total * 0.2; // 20% tolerance for tax/discounts
      if (difference <= tolerance) {
        confidence += 10; // Good match
      } else if (difference <= total * 0.5) {
        confidence += 3; // Partial match
      }
      // No bonus if way off
    }
  }

  if (subtotal !== null || tax !== null) confidence += 3;

  // Average with item confidence scores
  if (items.length > 0) {
    const avgItemConfidence = items.reduce((sum, item) => sum + item.confidence, 0) / items.length;
    confidence = Math.round(confidence * 0.7 + avgItemConfidence * 0.3);
  }

  const result: ParsedReceipt = {
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
    // Include chain info if detected (even if we used generic parsing)
    chainId: chainDetection.chainId,
    chainName: chainDetection.chain?.name || null,
    chainConfidence: chainDetection.confidence,
    parsingMethod: 'generic',
  };

  if (__DEV__) {
    console.log('[Parser] Parse result:', {
      storeName,
      itemsCount: items.length,
      total,
      confidence: result.confidence,
      sampleItems: items
        .slice(0, 3)
        .map((i) => ({ name: i.name.substring(0, 25), price: i.totalPrice })),
    });
  }

  return result;
}

// Re-export types and utilities for external use
export type { RegionalPreset };
export {
  SPAIN_PRESET,
  detectRegionFromText,
  matchStoreInPreset,
  getRegionalPreset,
} from '../../config/regionalPresets';

// Re-export chain detection and parsing utilities
export type { ChainDetectionResult } from './chainDetector';
export type { ChainParseResult } from './chainParser';
export { detectChainFromLines, detectChainFromText } from './chainDetector';
export { parseWithChainTemplate, shouldUseChainParsing } from './chainParser';
export { getChainTemplate, getAllTemplates, type ChainTemplate } from '../../config/spanishChains';
export { detectTaxRegion, type TaxRegion, type TaxRegionDetection } from '../../config/taxRegions';
