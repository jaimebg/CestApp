/**
 * Receipt Parser Service
 * Smart, self-adapting parser that auto-detects format from receipt content
 */

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

// ============================================================================
// CONSTANTS (minimal - universal patterns, not country-specific)
// ============================================================================

// Common OCR error corrections
const OCR_CORRECTIONS: [RegExp, string][] = [
  [/[0O](?=\d{2}[,\.]\d{2})/g, '0'], // O followed by price -> 0
  [/[Il1](?=\d[,\.]\d{2})/g, '1'],   // I/l before price -> 1
  [/\$\s+/g, '$'],                    // Remove space after $
  [/€\s+/g, '€'],                     // Remove space after €
  [/\s+,\s+/g, ','],                  // Fix spaced commas
];

// Keywords to skip when parsing items (multi-language)
const SKIP_KEYWORDS = [
  'receipt', 'ticket', 'recibo', 'bon', 'reçu', 'beleg',
  'store', 'shop', 'tienda', 'magasin', 'geschäft',
  'phone', 'telefono', 'teléfono', 'tel',
  'address', 'direccion', 'dirección', 'adresse',
  'cashier', 'cajero', 'kassier', 'caissier',
  'terminal', 'register', 'caja',
  'member', 'socio', 'client', 'kunde',
  'welcome', 'bienvenido', 'willkommen', 'bienvenue',
  'thank', 'gracias', 'danke', 'merci',
  'documento', 'operacion', 'operación',
  'fecha', 'hora', 'date', 'time',
];

// Unit patterns for weighted/measured items
const UNIT_PATTERNS: { pattern: RegExp; unit: ParsedItem['unit'] }[] = [
  { pattern: /(\d+[.,]?\d*)\s*kg/i, unit: 'kg' },
  { pattern: /(\d+[.,]?\d*)\s*lb/i, unit: 'lb' },
  { pattern: /(\d+[.,]?\d*)\s*oz/i, unit: 'oz' },
  { pattern: /(\d+[.,]?\d*)\s*g(?:r)?(?:ams?)?(?!\w)/i, unit: 'g' },
  { pattern: /(\d+[.,]?\d*)\s*l(?:t)?(?:rs?)?(?!\w)/i, unit: 'l' },
  { pattern: /(\d+[.,]?\d*)\s*ml/i, unit: 'ml' },
];

// Address patterns (general, not country-specific)
const ADDRESS_PATTERNS = [
  /\d+\s+\w+\s+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|way|ln|lane|calle|avenida|carrera)/i,
  /\w+\s+\d+[,\s]+\d{4,5}/i, // Street number, postal code
  /\d{4,5}\s+\w+/i,         // Postal code city
];

// ============================================================================
// FORMAT AUTO-DETECTION
// ============================================================================

/**
 * Auto-detect the receipt format by analyzing the content
 */
function detectReceiptFormat(lines: string[]): ReceiptFormat {
  const text = lines.join(' ');

  // Count decimal separators to determine number format
  const commaDecimals = (text.match(/\d+,\d{2}(?!\d)/g) || []).length;
  const dotDecimals = (text.match(/\d+\.\d{2}(?!\d)/g) || []).length;

  // Detect decimal separator (European uses comma, US uses dot)
  const decimalSeparator: '.' | ',' = commaDecimals > dotDecimals ? ',' : '.';

  // Detect date format by looking for date patterns
  // European: DD/MM/YYYY, US: MM/DD/YYYY
  let dateFormat: 'DMY' | 'MDY' | 'YMD' = 'MDY'; // default US

  // Look for dates and check if first number > 12 (must be day)
  const dateMatch = text.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/);
  if (dateMatch) {
    const first = parseInt(dateMatch[1], 10);
    const second = parseInt(dateMatch[2], 10);
    if (first > 12) {
      dateFormat = 'DMY'; // First number > 12, must be day
    } else if (second > 12) {
      dateFormat = 'MDY'; // Second number > 12, must be day, so first is month
    } else {
      // Both could be day or month - use locale hints
      // European indicators: €, comma decimals, European words
      const europeanHints = (text.match(/€|iva|artícul|teléfono|compra/gi) || []).length;
      const usHints = (text.match(/\$|tax(?!i)|subtotal/gi) || []).length;
      dateFormat = europeanHints > usHints ? 'DMY' : 'MDY';
    }
  }

  // Check for ISO format YYYY-MM-DD
  if (/\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b/.test(text)) {
    dateFormat = 'YMD';
  }

  // Detect columnar format: items and prices on separate lines
  // Count lines that are ONLY prices vs lines with text+price
  let priceOnlyLines = 0;
  let textWithPriceLines = 0;

  const pricePattern = decimalSeparator === ','
    ? /\d+,\d{2}/
    : /\d+\.\d{2}/;

  for (const line of lines) {
    const trimmed = line.trim();
    const hasPrice = pricePattern.test(trimmed);
    const isPriceOnly = new RegExp(`^\\d+[${decimalSeparator === ',' ? ',' : '\\.'}]\\s*\\d{2}\\s*[A-Za-z]{0,3}$`).test(trimmed);

    if (isPriceOnly) {
      priceOnlyLines++;
    } else if (hasPrice && trimmed.length > 10) {
      textWithPriceLines++;
    }
  }

  // If most prices are on their own lines, it's columnar
  const isColumnar = priceOnlyLines > 3 && priceOnlyLines > textWithPriceLines;

  console.log('=== FORMAT DETECTION ===');
  console.log('Decimal separator:', decimalSeparator, `(comma: ${commaDecimals}, dot: ${dotDecimals})`);
  console.log('Date format:', dateFormat);
  console.log('Layout:', isColumnar ? 'COLUMNAR' : 'INLINE', `(priceOnly: ${priceOnlyLines}, textWithPrice: ${textWithPriceLines})`);
  console.log('========================');

  return { decimalSeparator, dateFormat, isColumnar };
}

// ============================================================================
// CONSTANTS (minimal - avoid country-specific patterns)
// ============================================================================

// Keywords that indicate totals section (multi-language)
const TOTAL_KEYWORDS = [
  'total', 'subtotal', 'tax', 'iva', 'vat', 'mwst', 'tva',
  'sum', 'amount', 'balance', 'due', 'change', 'cash', 'card',
  'paid', 'payment', 'tender', 'credit', 'debit',
  // Common in various languages
  'suma', 'importe', 'pago', 'cambio', 'efectivo', 'tarjeta',
  'gesamt', 'zahlung', 'betrag',
  'somme', 'montant', 'paiement',
];

// Keywords to skip when parsing items (multi-language)
const SKIP_PATTERNS = [
  /receipt|ticket|recibo|bon|reçu|beleg/i,
  /store|shop|tienda|magasin|geschäft/i,
  /phone|tel[eéè]?f?o?n?o?/i,
  /address|direcci[oó]n|adresse/i,
  /date|fecha|datum|data/i,
  /time|hora|zeit|heure/i,
  /cashier|cajero|kassier|caissier/i,
  /terminal|register|caja/i,
  /member|socio|client|kunde/i,
  /welcome|bienvenido|willkommen|bienvenue/i,
  /thank|gracia|danke|merci/i,
  /^#?\d+$/, // Just numbers
  /^\d+[\/\-\.]\d+[\/\-\.]\d+/, // Dates at start
  /^\d+:\d+/, // Times at start
  /^[A-Z]{2,3}[\s\-]?\d+/, // Codes like "TX-123"
];

// ============================================================================
// TEXT PREPROCESSING
// ============================================================================

/**
 * Preprocess OCR text to fix common errors and normalize formatting
 */
export function preprocessText(lines: string[]): string[] {
  return lines
    .map(line => {
      let processed = line.trim();

      // Apply OCR corrections
      for (const [pattern, replacement] of OCR_CORRECTIONS) {
        processed = processed.replace(pattern, replacement);
      }

      // Normalize whitespace
      processed = processed.replace(/\s+/g, ' ');

      // Fix common OCR issues with currency
      processed = processed.replace(/\$\s*(\d)/g, '$$$1'); // Ensure $ is adjacent to number

      return processed;
    })
    .filter(line => line.length > 0);
}

// ============================================================================
// SECTION EXTRACTION
// ============================================================================

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
  const maxHeaderLines = 8; // Allow up to 8 lines for header

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    // More flexible price detection
    const hasPrice = /\d+[.,]\d{2}/.test(line);

    // Check if this is a totals line
    const isTotalLine = TOTAL_KEYWORDS.some(kw => lowerLine.includes(kw));

    // Check for footer indicators
    const isFooterLine = /thank\s*you|gracias|have\s*a\s*(nice|good)|buen\s*dia|visit\s*us|www\.|http|survey/i.test(lowerLine);

    // Determine section transitions
    if (!foundFirstPrice && !isTotalLine) {
      headerLineCount++;
      // Move to items section if we see a price or exceed max header lines
      if (hasPrice || headerLineCount > maxHeaderLines) {
        foundFirstPrice = true;
        currentSection = 'items';
        // If this line has a price, it's an item, not header
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

    // Add line to current section
    sections[currentSection].push(line);
  }

  return sections;
}

// ============================================================================
// PARSING HELPERS
// ============================================================================

/**
 * Parse price from a string
 * Handles formats: $12.34, 12.34, $12,34, 12,34, 12, 34 (with space)
 */
function parsePrice(text: string): number | null {
  // Remove currency symbols and extra whitespace
  let cleaned = text.replace(/[$€£¥]/g, '').trim();

  // Handle European format with space before decimals: "3, 14" -> "3,14"
  cleaned = cleaned.replace(/(\d+),\s+(\d{2})/, '$1,$2');
  // Handle space in number: "19. 10" -> "19.10"
  cleaned = cleaned.replace(/(\d+)\.\s+(\d{2})/, '$1.$2');

  // Try different number formats
  const patterns = [
    /^(\d+),(\d{2})$/, // European: 12,34 (comma decimal)
    /^(\d+)\.(\d{2})$/, // US: 12.34 (dot decimal)
    /(\d+),(\d{2})\s*[A-Za-z]*$/, // 12,34 EUR
    /(\d+)\.(\d{2})\s*[A-Za-z]*$/, // 12.34 USD
    /^(\d+),(\d{2})/, // European at start
    /^(\d+)\.(\d{2})/, // US at start
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return parseFloat(`${match[1]}.${match[2]}`);
    }
  }

  // Try parsing as simple integer (for currencies without decimals like JPY)
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
  // Match: "2,35", "19.10", "3,14", "0,01", "3, 14", "19, 10", "19.10 ER" etc.
  return /^\d+[,\.]\s*\d{2}(\s*[A-Za-z]{0,3})?$/.test(cleaned);
}

/**
 * Check if a line looks like a product name (no price, reasonable length)
 */
function isProductLine(line: string): boolean {
  const cleaned = line.trim();
  // Must have some text, not just numbers, not a price, not too short
  if (cleaned.length < 3) return false;
  if (/^\d+[,\.]\d{2}$/.test(cleaned)) return false; // It's a price
  if (/^[\d\s\-\/\.\:]+$/.test(cleaned)) return false; // Only numbers/punctuation

  // Skip known non-product lines
  const lowerLine = cleaned.toLowerCase();
  const skipPatterns = [
    /^total/i, /^subtotal/i, /^iva/i, /^tax/i,
    /^fecha/i, /^hora/i, /^documento/i, /^telefono/i,
    /^c\.i\.f/i, /^cif/i, /^nif/i,
    /^tarjeta/i, /^efectivo/i, /^cambio/i, /^vuelto/i,
    /^operaci[oó]n/i, /^contactless/i, /^importe/i,
    /^centro\s+vend/i, /^art[ií]cul/i, /^detalle/i,
    /^pagos?$/i, /^venta$/i, /^compra$/i,
  ];

  for (const pattern of skipPatterns) {
    if (pattern.test(lowerLine)) return false;
  }

  // Looks like a product name
  return true;
}

/**
 * Parse items from columnar format (names and prices on separate lines)
 */
function parseColumnarItems(lines: string[]): ParsedItem[] {
  const items: ParsedItem[] = [];
  const productLines: string[] = [];
  const priceLines: number[] = [];

  // First pass: separate product lines from price lines
  for (const line of lines) {
    const trimmed = line.trim();

    // Check if it's a standalone price
    if (isStandalonePrice(trimmed)) {
      const price = parsePrice(trimmed);
      if (price !== null && price > 0 && price < 10000) {
        priceLines.push(price);
      }
    }
    // Check if it's a product line
    else if (isProductLine(trimmed)) {
      productLines.push(trimmed);
    }
  }

  console.log('Columnar parsing - Products found:', productLines.length);
  console.log('Columnar parsing - Prices found:', priceLines.length);

  // Match products with prices (in order)
  const matchCount = Math.min(productLines.length, priceLines.length);
  for (let i = 0; i < matchCount; i++) {
    let name = productLines[i];
    const totalPrice = priceLines[i];

    // Try to extract quantity from name (e.g., "PRODUCT x 2" or "2 x PRODUCT")
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
  // Common time patterns
  const patterns = [
    // 12-hour format: 2:30 PM, 2:30PM, 02:30 PM
    /(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)/i,
    // 24-hour format: 14:30, 14:30:00
    /(\d{1,2}):(\d{2})(?::\d{2})?(?!\s*(?:am|pm))/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];

      // Handle 12-hour format
      if (match[3]) {
        const isPM = /pm|p\.m\./i.test(match[3]);
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
      }

      // Validate hours and minutes
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
function parseDate(text: string, formatHint?: 'DMY' | 'MDY' | 'YMD'): { date: Date | null; dateString: string | null } {
  // Common date patterns (ordered by specificity)
  const patterns = [
    // DD/MM/YYYY (European format - most common in Spain) - check first!
    { regex: /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/, format: 'DMY' },
    // YYYY/MM/DD or YYYY-MM-DD (ISO format)
    { regex: /\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/, format: 'YMD' },
    // DD/MM/YY or DD-MM-YY (2-digit year)
    { regex: /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})(?!\d)/, format: 'DMY_SHORT' },
    // Month DD, YYYY (English)
    { regex: /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+(\d{1,2}),?\s+(\d{4})/i, format: 'MDY_NAMED' },
    // DD Month YYYY (English)
    { regex: /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+(\d{4})/i, format: 'DMY_NAMED' },
    // DD Month YY (English short year)
    { regex: /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+(\d{2})(?!\d)/i, format: 'DMY_NAMED_SHORT' },
    // Month DD YY (English short year)
    { regex: /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+(\d{1,2}),?\s+(\d{2})(?!\d)/i, format: 'MDY_NAMED_SHORT' },
    // Spanish: DD de Mes de YYYY
    { regex: /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?(\d{4})/i, format: 'DMY_SPANISH' },
    // Spanish: DD/Mes/YYYY (abbreviated)
    { regex: /(\d{1,2})[\/\-](ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\w*[\/\-](\d{4})/i, format: 'DMY_SPANISH_SHORT' },
    // Compact: DDMMYYYY or MMDDYYYY (8 digits)
    { regex: /\b(\d{2})(\d{2})(\d{4})\b/, format: 'COMPACT' },
  ];

  const monthNames: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  const spanishMonths: Record<string, number> = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
  };

  const spanishMonthsShort: Record<string, number> = {
    ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
    jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
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

          // Use format hint to disambiguate when both values could be day or month
          if (first > 12) {
            // First must be day (European format)
            day = first;
            month = second - 1;
          } else if (second > 12) {
            // Second must be day, so first is month (US format)
            month = first - 1;
            day = second;
          } else if (formatHint === 'MDY') {
            // Format hint says MDY
            month = first - 1;
            day = second;
          } else {
            // Default to DMY (European) or use hint
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

          // Use format hint for disambiguation
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
          // Try as DDMMYYYY first
          day = parseInt(match[1], 10);
          month = parseInt(match[2], 10) - 1;
          year = parseInt(match[3], 10);
          // If day > 12, try MMDDYYYY
          if (day > 12 && month <= 11) {
            const temp = day;
            day = month + 1;
            month = temp - 1;
          }
          break;
        default:
          continue;
      }

      // Validate date ranges
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
  // Skip lines that are too short or contain skip keywords
  if (line.length < 3) return null;

  const lowerLine = line.toLowerCase();
  for (const keyword of SKIP_KEYWORDS) {
    if (lowerLine.includes(keyword)) return null;
  }
  for (const keyword of TOTAL_KEYWORDS) {
    if (lowerLine.includes(keyword)) return null;
  }

  // Try multiple price patterns (in order of preference)
  const pricePatterns = [
    // Price at end with $ sign: "Item Name $12.34"
    /^(.+?)\s+\$\s*(\d+[.,]\d{2})\s*$/,
    // Price at end without $ sign: "Item Name 12.34"
    /^(.+?)\s+(\d+[.,]\d{2})\s*$/,
    // Price at end with currency after: "Item Name 12.34 USD"
    /^(.+?)\s+(\d+[.,]\d{2})\s*[A-Za-z]{0,3}\s*$/,
    // Price anywhere with $ sign: capture last occurrence
    /^(.+?)\s*\$\s*(\d+[.,]\d{2})(?:\s|$)/,
    // Tab or multiple spaces separating name and price
    /^(.+?)[\t\s]{2,}(\d+[.,]\d{2})\s*$/,
    // Price with parentheses: "Item Name (12.34)"
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
      // Reset if invalid
      name = null;
      totalPrice = null;
    }
  }

  if (!name || totalPrice === null || totalPrice <= 0) return null;

  // Try to extract quantity and unit
  let quantity = 1;
  let unitPrice = totalPrice;
  let unit: ParsedItem['unit'] = null;

  // Check for unit-based items (weighted items like "1.5 kg", "2.3 lb")
  for (const { pattern, unit: unitType } of UNIT_PATTERNS) {
    const unitMatch = name.match(pattern);
    if (unitMatch) {
      const qty = parseFloat(unitMatch[1].replace(',', '.'));
      if (qty > 0) {
        quantity = qty;
        unit = unitType;
        unitPrice = totalPrice / quantity;
        // Remove the unit portion from name
        name = name.replace(unitMatch[0], '').trim();
        break;
      }
    }
  }

  // If no unit found, try to extract count quantity
  if (unit === null) {
    // Pattern: "2 x Item Name" or "2x Item"
    const qtyPrefixMatch = name.match(/^(\d+)\s*[xX×]\s*/);
    if (qtyPrefixMatch) {
      quantity = parseInt(qtyPrefixMatch[1], 10);
      name = name.slice(qtyPrefixMatch[0].length).trim();
      unitPrice = totalPrice / quantity;
      unit = 'each';
    }

    // Pattern: "Item Name x2" or "Item x 2"
    if (unit === null) {
      const qtySuffixMatch = name.match(/\s*[xX×]\s*(\d+)$/);
      if (qtySuffixMatch) {
        quantity = parseInt(qtySuffixMatch[1], 10);
        name = name.slice(0, qtySuffixMatch.index).trim();
        unitPrice = totalPrice / quantity;
        unit = 'each';
      }
    }

    // Pattern: "2 Item Name" at start (only if > 1)
    if (unit === null) {
      const qtyStartMatch = name.match(/^(\d+)\s+/);
      if (qtyStartMatch && parseInt(qtyStartMatch[1], 10) > 1 && parseInt(qtyStartMatch[1], 10) < 100) {
        quantity = parseInt(qtyStartMatch[1], 10);
        name = name.slice(qtyStartMatch[0].length).trim();
        unitPrice = totalPrice / quantity;
        unit = 'each';
      }
    }
  }

  // Clean up name
  name = name.replace(/\s+/g, ' ').trim();

  // Skip if name is too short or just numbers
  if (name.length < 2 || /^\d+$/.test(name)) return null;

  // Calculate confidence based on parsing quality
  let confidence = 60;
  if (name.length > 5) confidence += 10;
  if (unit !== null) confidence += 10;
  if (!/[^a-zA-Z0-9\s\-]/.test(name)) confidence += 10; // Clean name without weird chars

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

  // Skip patterns - lines that are NOT store names
  const skipPatterns = [
    /^\d+[\s\-\/\.\:]+\d+/,         // Date/time patterns
    /^[\d\s\-\/\.\:]+$/,            // Just numbers/punctuation
    /^\d{4,}/,                       // Long number sequences (IDs)
    /^(www\.|http|@)/i,             // URLs/emails
    /^(tel|phone|fax|nif|cif|rfc)/i, // ID/phone labels
    /^(receipt|ticket|recibo|factura|bon)/i, // Document type
    /^\*+$/,                         // Separator lines
    /^-+$/,                          // Dash separator
    /^=+$/,                          // Equals separator
  ];

  for (const line of headerLines) {
    const cleaned = line.trim();

    // Skip empty or very short lines
    if (cleaned.length < 3 || cleaned.length > 60) continue;

    // Skip lines matching skip patterns
    let shouldSkip = false;
    for (const pattern of skipPatterns) {
      if (pattern.test(cleaned)) {
        shouldSkip = true;
        break;
      }
    }
    if (shouldSkip) continue;

    // A store name should have at least some letters
    if (!/[a-zA-Z]/.test(cleaned)) continue;

    // This line looks like a store name
    return cleaned;
  }

  return null;
}

/**
 * Extract payment method from text
 */
function extractPaymentMethod(text: string): 'cash' | 'card' | 'digital' | null {
  const lowerText = text.toLowerCase();

  // Check for cash first
  if (/\b(cash|efectivo|cambio|vuelto|contado|dinero)\b/.test(lowerText)) {
    return 'cash';
  }
  // Check for card payments
  if (/\b(visa|mastercard|master\s*card|credit|debit|card|tarjeta|credito|debito|crédito|débito|amex|american\s*express|discover|chip|swipe|contactless)\b/.test(lowerText)) {
    return 'card';
  }
  // Check for digital payments
  if (/\b(apple\s*pay|google\s*pay|paypal|venmo|digital|nfc|tap|wallet|zelle|transfer|transferencia)\b/.test(lowerText)) {
    return 'digital';
  }

  // Check for card number patterns (masked like XXXX1234 or ****1234)
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
function extractTotals(lines: string[], decimalSep: '.' | ',' = '.'): {
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

    // Try to find price in this line
    let price = parsePrice(line);

    // If line has a label but no price, check the next line for price
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
      } else if (/\b(discount|descuento|savings|ahorro|promo|oferta|off|-\s*[$€])/i.test(lowerLine)) {
        discount = price;
      } else if (/\b(total|grand\s+total|amount\s+due|balance|total\s+(compra|a\s+pagar))\b/i.test(lowerLine) && !lowerLine.includes('sub') && !lowerLine.includes('artícul')) {
        // Make sure we get the largest "total" value (likely the final total)
        if (total === null || price > total) {
          total = price;
        }
      }
    }
  }

  // If no total found, look for standalone large price that could be total
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
}

/**
 * Main parsing function
 * Takes raw OCR lines and returns structured receipt data
 * Uses auto-detection to adapt to any receipt format
 * Accepts optional user preferences as hints for ambiguous cases
 */
export function parseReceipt(lines: string[], options?: ParserOptions): ParsedReceipt {
  // Preprocess text to fix OCR errors
  const processedLines = preprocessText(lines);
  const rawText = processedLines.join('\n');

  // Auto-detect receipt format (decimal separator, date format, layout)
  const format = detectReceiptFormat(processedLines);

  // Override with user preferences if provided (as fallback hints)
  if (options?.preferredDateFormat) {
    // Only override if auto-detection wasn't definitive
    // (when neither number in date is > 12)
    const dateMatch = rawText.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/);
    if (dateMatch) {
      const first = parseInt(dateMatch[1], 10);
      const second = parseInt(dateMatch[2], 10);
      // If both could be day or month, use user preference
      if (first <= 12 && second <= 12) {
        format.dateFormat = options.preferredDateFormat;
        console.log('Using user preference for date format:', options.preferredDateFormat);
      }
    }
  }

  if (options?.preferredDecimalSeparator) {
    // Only override if auto-detection wasn't clear
    const commaDecimals = (rawText.match(/\d+,\d{2}(?!\d)/g) || []).length;
    const dotDecimals = (rawText.match(/\d+\.\d{2}(?!\d)/g) || []).length;
    // If counts are similar, use user preference
    if (Math.abs(commaDecimals - dotDecimals) < 2) {
      format.decimalSeparator = options.preferredDecimalSeparator;
      console.log('Using user preference for decimal separator:', options.preferredDecimalSeparator);
    }
  }

  // Debug logging
  console.log('=== OCR PARSING DEBUG ===');
  console.log('Raw lines received:', lines.length);
  console.log('Detected format:', format);
  console.log('--- RAW TEXT ---');
  lines.forEach((line, i) => console.log(`[${i}] ${line}`));
  console.log('========================');

  // Extract sections
  const sections = extractSections(processedLines);

  // Extract store name from header (try header first, then all lines)
  let storeName = extractStoreName(sections.header.length > 0 ? sections.header : processedLines.slice(0, 10));
  if (!storeName) {
    storeName = extractStoreName(processedLines);
  }

  // Extract store address from header
  const storeAddress = extractStoreAddress(sections.header.length > 0 ? sections.header : processedLines.slice(0, 10));

  // Find date and time - search all lines if not found in header
  let dateResult = { date: null as Date | null, dateString: null as string | null };
  let time: string | null = null;

  // First try header
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

  // If date not found, search all lines
  if (!dateResult.date) {
    for (const line of processedLines) {
      dateResult = parseDate(line, format.dateFormat);
      if (dateResult.date) break;
    }
  }

  // If time not found, search all lines
  if (!time) {
    for (const line of processedLines) {
      time = parseTime(line);
      if (time) break;
    }
  }

  // Parse items - strategy depends on detected format
  let items: ParsedItem[] = [];

  // If columnar format detected, try columnar parsing first
  if (format.isColumnar) {
    console.log('Using columnar format parsing (auto-detected)...');
    items = parseColumnarItems(processedLines);
  }

  // If no items from columnar or not columnar, try inline parsing
  if (items.length === 0) {
    const itemsToProcess = sections.items.length > 0 ? sections.items : processedLines;
    for (const line of itemsToProcess) {
      const item = parseLineItem(line, format.decimalSeparator);
      if (item) {
        items.push(item);
      }
    }
  }

  // If still no items from sections, try parsing ALL lines
  if (items.length === 0) {
    for (const line of processedLines) {
      const item = parseLineItem(line, format.decimalSeparator);
      if (item) {
        items.push(item);
      }
    }
  }

  // Last resort: try columnar format if not already tried
  if (items.length === 0 && !format.isColumnar) {
    console.log('Trying columnar format as fallback...');
    items = parseColumnarItems(processedLines);
  }

  // Extract totals - try sections first, then all lines
  let totalsToProcess = sections.totals.length > 0 ? sections.totals : processedLines;
  let { subtotal, tax, discount, total } = extractTotals(totalsToProcess, format.decimalSeparator);

  // If no total found, search all lines
  if (total === null) {
    const allTotals = extractTotals(processedLines, format.decimalSeparator);
    subtotal = subtotal || allTotals.subtotal;
    tax = tax || allTotals.tax;
    discount = discount || allTotals.discount;
    total = total || allTotals.total;
  }

  // Extract payment method - search all text
  const paymentMethod = extractPaymentMethod(rawText);

  // Calculate confidence based on what we found
  let confidence = 40;
  if (storeName) confidence += 10;
  if (storeAddress) confidence += 5;
  if (dateResult.date) confidence += 10;
  if (time) confidence += 5;
  if (items.length > 0) confidence += 15;
  if (items.length > 3) confidence += 5;
  if (total !== null) confidence += 10;
  if (subtotal !== null || tax !== null) confidence += 5;

  // Average item confidence affects overall confidence
  if (items.length > 0) {
    const avgItemConfidence = items.reduce((sum, item) => sum + item.confidence, 0) / items.length;
    confidence = Math.round((confidence + avgItemConfidence) / 2);
  }

  const result = {
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
  };

  // Debug logging - parsing results
  console.log('=== PARSING RESULTS ===');
  console.log('Store:', storeName);
  console.log('Address:', storeAddress);
  console.log('Date:', dateResult.date, '| String:', dateResult.dateString);
  console.log('Time:', time);
  console.log('Items found:', items.length);
  items.forEach((item, i) => console.log(`  [${i}] ${item.name} - ${item.totalPrice} (qty: ${item.quantity})`));
  console.log('Subtotal:', subtotal);
  console.log('Tax:', tax);
  console.log('Discount:', discount);
  console.log('Total:', total);
  console.log('Payment:', paymentMethod);
  console.log('Confidence:', result.confidence);
  console.log('=======================');

  return result;
}
