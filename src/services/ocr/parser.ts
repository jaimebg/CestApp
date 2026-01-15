/**
 * Receipt Parser Service
 * Parses raw OCR text into structured receipt data
 */

export interface ParsedItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  confidence: number;
}

export interface ParsedReceipt {
  storeName: string | null;
  storeAddress: string | null;
  date: Date | null;
  dateString: string | null;
  items: ParsedItem[];
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  paymentMethod: 'cash' | 'card' | 'digital' | null;
  rawText: string;
  confidence: number;
}

// Common store name patterns (can be expanded)
const STORE_PATTERNS = [
  /walmart/i,
  /target/i,
  /costco/i,
  /kroger/i,
  /safeway/i,
  /whole\s*foods/i,
  /trader\s*joe'?s/i,
  /aldi/i,
  /publix/i,
  /h-?e-?b/i,
  /cvs/i,
  /walgreens/i,
  /7-?eleven/i,
  // Spanish stores
  /soriana/i,
  /oxxo/i,
  /chedraui/i,
  /bodega\s*aurrera/i,
  /superama/i,
  /la\s*comer/i,
  /comercial\s*mexicana/i,
];

// Keywords that indicate end of items section
const TOTAL_KEYWORDS = [
  'subtotal', 'sub-total', 'sub total',
  'total', 'grand total', 'amount due', 'balance due',
  'tax', 'iva', 'impuesto',
  'cash', 'credit', 'debit', 'card', 'visa', 'mastercard',
  'change', 'cambio',
  'thank you', 'gracias',
];

// Keywords to skip (not items)
const SKIP_KEYWORDS = [
  'receipt', 'recibo', 'ticket',
  'store', 'tienda', 'sucursal',
  'phone', 'tel', 'telefono',
  'address', 'direccion',
  'date', 'fecha', 'hora', 'time',
  'cashier', 'cajero',
  'terminal', 'register',
  'member', 'socio', 'cliente',
  'welcome', 'bienvenido',
];

/**
 * Parse price from a string
 * Handles formats: $12.34, 12.34, $12,34, 12,34
 */
function parsePrice(text: string): number | null {
  // Remove currency symbols and whitespace
  const cleaned = text.replace(/[$€£¥]/g, '').trim();

  // Try different number formats
  const patterns = [
    /(\d+)[.,](\d{2})$/, // 12.34 or 12,34 at end
    /(\d+)[.,](\d{2})\s*[A-Za-z]*$/, // 12.34 USD
    /^(\d+)[.,](\d{2})/, // 12.34 at start
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return parseFloat(`${match[1]}.${match[2]}`);
    }
  }

  // Try parsing as simple number
  const simpleMatch = cleaned.match(/(\d+)/);
  if (simpleMatch) {
    return parseInt(simpleMatch[1], 10);
  }

  return null;
}

/**
 * Parse date from text
 */
function parseDate(text: string): { date: Date | null; dateString: string | null } {
  // Common date patterns
  const patterns = [
    // MM/DD/YYYY or MM-DD-YYYY
    { regex: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, format: 'MDY' },
    // DD/MM/YYYY or DD-MM-YYYY
    { regex: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})(?!\d)/, format: 'DMY' },
    // YYYY/MM/DD or YYYY-MM-DD
    { regex: /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/, format: 'YMD' },
    // Month DD, YYYY
    { regex: /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{1,2}),?\s+(\d{4})/i, format: 'MDY_NAMED' },
    // DD Month YYYY
    { regex: /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{4})/i, format: 'DMY_NAMED' },
  ];

  const monthNames: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  for (const { regex, format } of patterns) {
    const match = text.match(regex);
    if (match) {
      let year: number, month: number, day: number;

      switch (format) {
        case 'MDY':
          month = parseInt(match[1], 10) - 1;
          day = parseInt(match[2], 10);
          year = parseInt(match[3], 10);
          break;
        case 'DMY':
          day = parseInt(match[1], 10);
          month = parseInt(match[2], 10) - 1;
          year = parseInt(match[3], 10);
          if (year < 100) year += 2000;
          break;
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
        default:
          continue;
      }

      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return { date, dateString: match[0] };
      }
    }
  }

  return { date: null, dateString: null };
}

/**
 * Parse a line item from text
 */
function parseLineItem(line: string): ParsedItem | null {
  // Skip lines that are too short or contain skip keywords
  if (line.length < 3) return null;

  const lowerLine = line.toLowerCase();
  for (const keyword of SKIP_KEYWORDS) {
    if (lowerLine.includes(keyword)) return null;
  }
  for (const keyword of TOTAL_KEYWORDS) {
    if (lowerLine.includes(keyword)) return null;
  }

  // Try to extract price (usually at the end)
  const priceMatch = line.match(/\$?\s*(\d+[.,]\d{2})\s*$/);
  if (!priceMatch) return null;

  const totalPrice = parsePrice(priceMatch[1]);
  if (totalPrice === null || totalPrice <= 0) return null;

  // Extract item name (everything before the price)
  let name = line.slice(0, priceMatch.index).trim();

  // Try to extract quantity (at the start or embedded)
  let quantity = 1;
  let unitPrice = totalPrice;

  // Pattern: "2 x Item Name" or "2x Item"
  const qtyPrefixMatch = name.match(/^(\d+)\s*[xX×]\s*/);
  if (qtyPrefixMatch) {
    quantity = parseInt(qtyPrefixMatch[1], 10);
    name = name.slice(qtyPrefixMatch[0].length).trim();
    unitPrice = totalPrice / quantity;
  }

  // Pattern: "Item Name x2" or "Item x 2"
  const qtySuffixMatch = name.match(/\s*[xX×]\s*(\d+)$/);
  if (qtySuffixMatch) {
    quantity = parseInt(qtySuffixMatch[1], 10);
    name = name.slice(0, qtySuffixMatch.index).trim();
    unitPrice = totalPrice / quantity;
  }

  // Pattern: "2 Item Name" at start (only if > 1)
  const qtyStartMatch = name.match(/^(\d+)\s+/);
  if (qtyStartMatch && parseInt(qtyStartMatch[1], 10) > 1 && parseInt(qtyStartMatch[1], 10) < 100) {
    quantity = parseInt(qtyStartMatch[1], 10);
    name = name.slice(qtyStartMatch[0].length).trim();
    unitPrice = totalPrice / quantity;
  }

  // Clean up name
  name = name.replace(/\s+/g, ' ').trim();

  // Skip if name is too short or just numbers
  if (name.length < 2 || /^\d+$/.test(name)) return null;

  return {
    name,
    quantity,
    unitPrice: Math.round(unitPrice * 100) / 100,
    totalPrice,
    confidence: 70,
  };
}

/**
 * Extract store name from lines
 */
function extractStoreName(lines: string[]): string | null {
  // Check first few lines for known store patterns
  const headerLines = lines.slice(0, 5);

  for (const line of headerLines) {
    for (const pattern of STORE_PATTERNS) {
      if (pattern.test(line)) {
        return line.trim();
      }
    }
  }

  // If no known store, use first non-empty line that looks like a name
  for (const line of headerLines) {
    const cleaned = line.trim();
    if (
      cleaned.length > 2 &&
      cleaned.length < 50 &&
      !/^\d+$/.test(cleaned) &&
      !/^[\d\s\-\/\.]+$/.test(cleaned)
    ) {
      return cleaned;
    }
  }

  return null;
}

/**
 * Extract payment method from text
 */
function extractPaymentMethod(text: string): 'cash' | 'card' | 'digital' | null {
  const lowerText = text.toLowerCase();

  if (/\b(cash|efectivo|cambio)\b/.test(lowerText)) {
    return 'cash';
  }
  if (/\b(visa|mastercard|credit|debit|card|tarjeta|credito|debito)\b/.test(lowerText)) {
    return 'card';
  }
  if (/\b(apple\s*pay|google\s*pay|paypal|venmo|digital)\b/.test(lowerText)) {
    return 'digital';
  }

  return null;
}

/**
 * Extract totals from lines
 */
function extractTotals(lines: string[]): {
  subtotal: number | null;
  tax: number | null;
  total: number | null;
} {
  let subtotal: number | null = null;
  let tax: number | null = null;
  let total: number | null = null;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    const price = parsePrice(line);

    if (price !== null) {
      if (/\b(subtotal|sub-total|sub\s+total)\b/.test(lowerLine)) {
        subtotal = price;
      } else if (/\b(tax|iva|impuesto|i\.v\.a)\b/.test(lowerLine)) {
        tax = price;
      } else if (/\b(total|grand\s+total|amount\s+due|balance)\b/.test(lowerLine) && !lowerLine.includes('sub')) {
        total = price;
      }
    }
  }

  return { subtotal, tax, total };
}

/**
 * Main parsing function
 * Takes raw OCR lines and returns structured receipt data
 */
export function parseReceipt(lines: string[]): ParsedReceipt {
  const rawText = lines.join('\n');

  // Extract store name from header
  const storeName = extractStoreName(lines);

  // Find date
  let dateResult = { date: null as Date | null, dateString: null as string | null };
  for (const line of lines.slice(0, 10)) {
    dateResult = parseDate(line);
    if (dateResult.date) break;
  }

  // Parse items - look for lines with prices
  const items: ParsedItem[] = [];
  let inItemsSection = false;
  let passedHeader = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    // Skip header lines (store name, address, date)
    if (!passedHeader && i < 5) {
      if (parsePrice(line) !== null) {
        passedHeader = true;
      } else {
        continue;
      }
    }

    // Check if we've reached totals section
    const isTotalLine = TOTAL_KEYWORDS.some(kw => lowerLine.includes(kw));
    if (isTotalLine) {
      inItemsSection = false;
    }

    // Try to parse as item
    const item = parseLineItem(line);
    if (item) {
      items.push(item);
      inItemsSection = true;
    }
  }

  // Extract totals
  const { subtotal, tax, total } = extractTotals(lines);

  // Extract payment method
  const paymentMethod = extractPaymentMethod(rawText);

  // Calculate confidence based on what we found
  let confidence = 50;
  if (storeName) confidence += 10;
  if (dateResult.date) confidence += 10;
  if (items.length > 0) confidence += 15;
  if (total !== null) confidence += 15;

  return {
    storeName,
    storeAddress: null,
    date: dateResult.date,
    dateString: dateResult.dateString,
    items,
    subtotal,
    tax,
    total,
    paymentMethod,
    rawText,
    confidence: Math.min(confidence, 100),
  };
}
