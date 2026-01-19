/**
 * Store Fingerprinting System
 * Identifies stores by receipt characteristics
 */

import type { OcrBlock } from './index';
import { analyzeLayout, extractOcrElements } from './spatialCorrelator';
import { createScopedLogger } from '../../utils/debug';

const logger = createScopedLogger('StoreFingerprint');

/**
 * Store fingerprint for identifying receipt patterns
 */
export interface StoreFingerprint {
  layoutType: 'columnar' | 'inline' | 'mixed';
  pricePosition: 'left' | 'right' | 'mixed';
  headerPatterns: string[];
  footerPatterns: string[];
  dateFormat: 'DMY' | 'MDY' | 'YMD' | null;
  datePosition: 'header' | 'footer' | 'middle' | null;
  typicalWidth: number;
  avgLineCount: number;
  avgItemsPerReceipt: number;
  decimalSeparator: '.' | ',' | null;
  currencySymbol: string | null;
  knownKeywords: string[];
  confidence: number;
}

/**
 * Fingerprint comparison result
 */
export interface FingerprintMatch {
  storeId: number;
  storeName: string;
  matchScore: number;
  matchedPatterns: string[];
}

/**
 * Detect store fingerprint from OCR blocks
 */
export function detectStoreFingerprint(
  blocks: OcrBlock[],
  imageDimensions: { width: number; height: number },
  options?: {
    lines?: string[];
    storeName?: string;
  }
): StoreFingerprint {
  logger.log('Detecting store fingerprint');

  // Get layout analysis
  const elements = extractOcrElements(blocks, imageDimensions);
  const layout = analyzeLayout(elements);

  // Determine layout type
  const layoutType = layout.isColumnar ? 'columnar' : 'inline';

  // Determine price position
  const pricePosition =
    layout.priceColumnX !== null ? (layout.priceColumnX > 0.6 ? 'right' : 'left') : 'right'; // Default to right

  // Extract header patterns (first few lines)
  const headerPatterns = extractHeaderPatterns(blocks, imageDimensions);

  // Extract footer patterns (last few lines)
  const footerPatterns = extractFooterPatterns(blocks, imageDimensions);

  // Detect date format and position
  const dateInfo = detectDateInfo(blocks, imageDimensions);

  // Calculate typical width (characters per line)
  const typicalWidth = calculateTypicalWidth(blocks);

  // Get average line count
  const avgLineCount = blocks.reduce((sum, b) => sum + b.lines.length, 0);

  // Detect decimal separator
  const decimalSeparator = detectDecimalSeparator(blocks);

  // Detect currency symbol
  const currencySymbol = detectCurrencySymbol(blocks);

  // Extract known keywords
  const knownKeywords = extractKnownKeywords(blocks);

  // Calculate fingerprint confidence
  const confidence = calculateFingerprintConfidence({
    headerPatterns,
    footerPatterns,
    layoutType,
    decimalSeparator,
  });

  return {
    layoutType,
    pricePosition,
    headerPatterns,
    footerPatterns,
    dateFormat: dateInfo.format,
    datePosition: dateInfo.position,
    typicalWidth,
    avgLineCount,
    avgItemsPerReceipt: 0, // Will be updated over time
    decimalSeparator,
    currencySymbol,
    knownKeywords,
    confidence,
  };
}

/**
 * Extract header patterns from first few blocks
 */
function extractHeaderPatterns(
  blocks: OcrBlock[],
  imageDimensions: { width: number; height: number }
): string[] {
  const patterns: string[] = [];
  const headerThreshold = 0.15; // Top 15% of image

  for (const block of blocks) {
    const normalizedY = block.boundingBox.top / imageDimensions.height;
    if (normalizedY > headerThreshold) continue;

    for (const line of block.lines) {
      const text = line.text.trim();
      if (text.length < 3) continue;

      // Create pattern from text
      const pattern = createPattern(text);
      if (pattern && !patterns.includes(pattern)) {
        patterns.push(pattern);
      }
    }
  }

  return patterns.slice(0, 5); // Keep top 5 patterns
}

/**
 * Extract footer patterns from last few blocks
 */
function extractFooterPatterns(
  blocks: OcrBlock[],
  imageDimensions: { width: number; height: number }
): string[] {
  const patterns: string[] = [];
  const footerThreshold = 0.85; // Bottom 15% of image

  for (const block of blocks) {
    const normalizedY = block.boundingBox.top / imageDimensions.height;
    if (normalizedY < footerThreshold) continue;

    for (const line of block.lines) {
      const text = line.text.trim();
      if (text.length < 3) continue;

      const pattern = createPattern(text);
      if (pattern && !patterns.includes(pattern)) {
        patterns.push(pattern);
      }
    }
  }

  return patterns.slice(0, 5);
}

/**
 * Create a pattern from text for matching
 * Replaces specific values with pattern markers
 */
function createPattern(text: string): string | null {
  let pattern = text.toUpperCase();

  // Skip if too short or just numbers
  if (pattern.length < 4) return null;
  if (/^\d+$/.test(pattern)) return null;

  // Replace specific patterns with markers
  // Dates: DD/MM/YYYY -> <DATE>
  pattern = pattern.replace(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g, '<DATE>');

  // Times: HH:MM -> <TIME>
  pattern = pattern.replace(/\d{1,2}:\d{2}(:\d{2})?/g, '<TIME>');

  // Phone numbers: (XXX) XXX-XXXX or similar -> <PHONE>
  pattern = pattern.replace(/\(?\d{3}\)?[\s\-\.]\d{3}[\s\-\.]\d{4}/g, '<PHONE>');
  pattern = pattern.replace(/\d{9,}/g, '<PHONE>');

  // Prices: XX.XX or XX,XX -> <PRICE>
  pattern = pattern.replace(/\d+[.,]\d{2}/g, '<PRICE>');

  // NIF/CIF: Spanish tax IDs
  pattern = pattern.replace(/[A-Z]?\d{7,8}[A-Z]?/g, '<TAXID>');

  // Generic numbers -> <NUM>
  pattern = pattern.replace(/\d+/g, '<NUM>');

  // If pattern is still meaningful (has letters), return it
  if (/[A-Z]{2,}/.test(pattern)) {
    return pattern;
  }

  return null;
}

/**
 * Detect date format and position in receipt
 */
function detectDateInfo(
  blocks: OcrBlock[],
  imageDimensions: { width: number; height: number }
): { format: 'DMY' | 'MDY' | 'YMD' | null; position: 'header' | 'footer' | 'middle' | null } {
  const datePattern = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/;

  for (const block of blocks) {
    for (const line of block.lines) {
      const match = line.text.match(datePattern);
      if (match) {
        const first = parseInt(match[1], 10);
        const second = parseInt(match[2], 10);

        // Determine format
        let format: 'DMY' | 'MDY' | 'YMD' = 'DMY';
        if (first > 12) {
          format = 'DMY';
        } else if (second > 12) {
          format = 'MDY';
        }

        // Determine position
        const normalizedY = line.boundingBox.top / imageDimensions.height;
        let position: 'header' | 'footer' | 'middle' = 'middle';
        if (normalizedY < 0.2) {
          position = 'header';
        } else if (normalizedY > 0.8) {
          position = 'footer';
        }

        return { format, position };
      }
    }
  }

  return { format: null, position: null };
}

/**
 * Calculate typical line width in characters
 */
function calculateTypicalWidth(blocks: OcrBlock[]): number {
  const lengths: number[] = [];

  for (const block of blocks) {
    for (const line of block.lines) {
      const text = line.text.trim();
      if (text.length > 5) {
        lengths.push(text.length);
      }
    }
  }

  if (lengths.length === 0) return 40; // Default

  // Calculate median
  lengths.sort((a, b) => a - b);
  const mid = Math.floor(lengths.length / 2);
  return lengths.length % 2 === 0
    ? Math.round((lengths[mid - 1] + lengths[mid]) / 2)
    : lengths[mid];
}

/**
 * Detect decimal separator from receipt
 */
function detectDecimalSeparator(blocks: OcrBlock[]): '.' | ',' | null {
  let commaCount = 0;
  let dotCount = 0;

  for (const block of blocks) {
    const text = block.text;
    commaCount += (text.match(/\d+,\d{2}(?!\d)/g) || []).length;
    dotCount += (text.match(/\d+\.\d{2}(?!\d)/g) || []).length;
  }

  if (commaCount > dotCount) return ',';
  if (dotCount > commaCount) return '.';
  return null;
}

/**
 * Detect currency symbol from receipt
 */
function detectCurrencySymbol(blocks: OcrBlock[]): string | null {
  const symbols: Record<string, number> = {};

  for (const block of blocks) {
    const text = block.text;

    // Check for common currency symbols
    const euroMatches = text.match(/€/g);
    if (euroMatches) symbols['€'] = (symbols['€'] || 0) + euroMatches.length;

    const dollarMatches = text.match(/\$/g);
    if (dollarMatches) symbols['$'] = (symbols['$'] || 0) + dollarMatches.length;

    const poundMatches = text.match(/£/g);
    if (poundMatches) symbols['£'] = (symbols['£'] || 0) + poundMatches.length;

    // Check for EUR/USD text
    const eurMatches = text.match(/\bEUR\b/gi);
    if (eurMatches) symbols['€'] = (symbols['€'] || 0) + eurMatches.length;

    const usdMatches = text.match(/\bUSD\b/gi);
    if (usdMatches) symbols['$'] = (symbols['$'] || 0) + usdMatches.length;
  }

  // Find most common symbol
  let maxSymbol: string | null = null;
  let maxCount = 0;

  for (const [symbol, count] of Object.entries(symbols)) {
    if (count > maxCount) {
      maxCount = count;
      maxSymbol = symbol;
    }
  }

  return maxSymbol;
}

/**
 * Extract known keywords that appear in the receipt
 */
function extractKnownKeywords(blocks: OcrBlock[]): string[] {
  const keywords: Set<string> = new Set();

  // Keywords to look for (store-specific terms)
  const searchKeywords = [
    // Spanish supermarkets
    'MERCADONA',
    'CARREFOUR',
    'LIDL',
    'ALDI',
    'DIA',
    'EROSKI',
    'ALCAMPO',
    'HIPERCOR',
    'CONSUM',
    'AHORRAMAS',
    'CAPRABO',
    // Common terms
    'SUPERMERCADO',
    'HIPERMERCADO',
    'AUTOSERVICIO',
    // Tax-related
    'IVA',
    'N.I.F',
    'C.I.F',
    // Payment
    'EFECTIVO',
    'TARJETA',
    'VISA',
    'MASTERCARD',
    'CONTACTLESS',
  ];

  for (const block of blocks) {
    const upperText = block.text.toUpperCase();

    for (const keyword of searchKeywords) {
      if (upperText.includes(keyword)) {
        keywords.add(keyword);
      }
    }
  }

  return Array.from(keywords);
}

/**
 * Calculate fingerprint confidence
 */
function calculateFingerprintConfidence(data: {
  headerPatterns: string[];
  footerPatterns: string[];
  layoutType: string;
  decimalSeparator: string | null;
}): number {
  let confidence = 50;

  if (data.headerPatterns.length >= 2) confidence += 15;
  if (data.footerPatterns.length >= 1) confidence += 10;
  if (data.layoutType !== 'mixed') confidence += 10;
  if (data.decimalSeparator) confidence += 10;

  return Math.min(100, confidence);
}

/**
 * Compare two fingerprints and return match score
 */
export function compareFingerpints(fp1: StoreFingerprint, fp2: StoreFingerprint): number {
  let score = 0;
  const maxScore = 100;

  // Layout type match (20 points)
  if (fp1.layoutType === fp2.layoutType) score += 20;

  // Price position match (15 points)
  if (fp1.pricePosition === fp2.pricePosition) score += 15;

  // Decimal separator match (10 points)
  if (fp1.decimalSeparator === fp2.decimalSeparator) score += 10;

  // Currency symbol match (10 points)
  if (fp1.currencySymbol === fp2.currencySymbol) score += 10;

  // Date format match (5 points)
  if (fp1.dateFormat === fp2.dateFormat) score += 5;

  // Header patterns match (20 points max)
  const headerMatches = countPatternMatches(fp1.headerPatterns, fp2.headerPatterns);
  score += Math.min(20, headerMatches * 5);

  // Keywords match (20 points max)
  const keywordMatches = countArrayIntersection(fp1.knownKeywords, fp2.knownKeywords);
  score += Math.min(20, keywordMatches * 4);

  return Math.round((score / maxScore) * 100);
}

/**
 * Count how many patterns match between two arrays
 */
function countPatternMatches(patterns1: string[], patterns2: string[]): number {
  let matches = 0;

  for (const p1 of patterns1) {
    for (const p2 of patterns2) {
      if (p1 === p2 || p1.includes(p2) || p2.includes(p1)) {
        matches++;
        break;
      }
    }
  }

  return matches;
}

/**
 * Count intersection of two string arrays
 */
function countArrayIntersection(arr1: string[], arr2: string[]): number {
  const set1 = new Set(arr1.map((s) => s.toUpperCase()));
  return arr2.filter((s) => set1.has(s.toUpperCase())).length;
}

/**
 * Match a fingerprint against stored templates
 * Returns best matches sorted by score
 */
export function matchFingerprintToTemplates(
  fingerprint: StoreFingerprint,
  templates: {
    storeId: number;
    storeName: string;
    fingerprint: StoreFingerprint;
  }[]
): FingerprintMatch[] {
  const matches: FingerprintMatch[] = [];

  for (const template of templates) {
    const matchScore = compareFingerpints(fingerprint, template.fingerprint);

    if (matchScore >= 40) {
      // Only include reasonable matches
      matches.push({
        storeId: template.storeId,
        storeName: template.storeName,
        matchScore,
        matchedPatterns: findMatchedPatterns(fingerprint, template.fingerprint),
      });
    }
  }

  // Sort by match score descending
  matches.sort((a, b) => b.matchScore - a.matchScore);

  return matches;
}

/**
 * Find which patterns matched between two fingerprints
 */
function findMatchedPatterns(fp1: StoreFingerprint, fp2: StoreFingerprint): string[] {
  const matched: string[] = [];

  // Check header patterns
  for (const p1 of fp1.headerPatterns) {
    if (fp2.headerPatterns.some((p2) => p1 === p2 || p1.includes(p2) || p2.includes(p1))) {
      matched.push(`header:${p1}`);
    }
  }

  // Check keywords
  const keywords1 = new Set(fp1.knownKeywords.map((k) => k.toUpperCase()));
  for (const k of fp2.knownKeywords) {
    if (keywords1.has(k.toUpperCase())) {
      matched.push(`keyword:${k}`);
    }
  }

  return matched;
}
