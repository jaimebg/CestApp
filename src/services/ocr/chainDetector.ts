/**
 * Chain Detector Service
 * Detects Spanish supermarket chain from receipt text/OCR blocks
 *
 * Detection strategies (in order of reliability):
 * 1. NIF/CIF matching (98% confidence)
 * 2. Exact name matching (90% confidence)
 * 3. Fingerprint matching (70%+ confidence)
 * 4. Keyword heuristics (fallback)
 */

import { getAllTemplates, type ChainTemplate, type CountryCode } from '../../config/countries';
import { detectCountry } from './countryDetector';
import { createScopedLogger } from '../../utils/debug';

const logger = createScopedLogger('ChainDetector');

/**
 * Detection result
 */
export interface ChainDetectionResult {
  chain: ChainTemplate | null;
  chainId: string | null;
  confidence: number;
  detectionMethod: 'nif' | 'name' | 'fingerprint' | 'heuristic' | 'none';
  matchedPattern?: string;
  countryCode: CountryCode | null;
}

export interface DetectionOptions {
  /** Templates to choose from; all registered templates when omitted. */
  templates?: ChainTemplate[];
  /** A merchant tax ID read from somewhere more reliable than OCR, such as a fiscal QR. */
  taxIdHint?: string | null;
}

/**
 * OCR Block structure (from ML Kit)
 */
export interface OcrBlock {
  text: string;
  lines?: {
    text: string;
  }[];
}

/**
 * Extract all text from OCR blocks
 */
function extractTextFromBlocks(blocks: OcrBlock[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    if (block.lines) {
      for (const line of block.lines) {
        lines.push(line.text);
      }
    } else if (block.text) {
      lines.push(block.text);
    }
  }

  return lines.join('\n');
}

function normalizeTaxIds(text: string): string {
  return text.toUpperCase().replace(/([A-Z0-9])[.-](?=[A-Z0-9])/g, '$1');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The template whose tax ID is printed in the text, matched as a whole token so
 * a NIF inside a longer number (a barcode, an ATCUD) does not count.
 */
export function findTemplateByTaxId(
  text: string,
  templates: ChainTemplate[] = getAllTemplates()
): ChainTemplate | null {
  const normalized = normalizeTaxIds(text);

  for (const template of templates) {
    for (const nif of template.nifPatterns) {
      const id = normalizeTaxIds(nif);
      if (new RegExp(`(^|[^A-Z0-9])${escapeRegExp(id)}(?![A-Z0-9])`).test(normalized)) {
        return template;
      }
    }
  }

  return null;
}

/**
 * Strategy 1: Detect chain by tax ID (98% confidence)
 */
function detectByNif(
  text: string,
  templates: ChainTemplate[],
  taxIdHint?: string | null
): ChainDetectionResult | null {
  const chain =
    (taxIdHint ? findTemplateByTaxId(taxIdHint, templates) : null) ??
    findTemplateByTaxId(text, templates);
  if (!chain) return null;

  return {
    chain,
    chainId: chain.chainId,
    confidence: 98,
    detectionMethod: 'nif',
    matchedPattern: chain.nifPatterns[0],
    countryCode: chain.country,
  };
}

/**
 * Of several templates that matched equally well, the one from the receipt's
 * country; the first by tier when none is.
 */
function pickByCountry(candidates: ChainTemplate[], text: string): ChainTemplate {
  const countries = new Set(candidates.map((t) => t.country));
  if (countries.size === 1) return candidates[0];

  const country = detectCountry(text).code;
  return candidates.find((t) => t.country === country) ?? candidates[0];
}

/**
 * Strategy 2: Detect chain by exact name matching
 * High confidence (90%)
 */
function detectByName(text: string, templates: ChainTemplate[]): ChainDetectionResult | null {
  const upperText = text.toUpperCase();
  const candidates = templates.filter((template) =>
    template.namePatterns.some((pattern) => pattern.test(upperText))
  );
  if (candidates.length === 0) return null;

  const chain = pickByCountry(candidates, text);
  const pattern = chain.namePatterns.find((p) => p.test(upperText));
  return {
    chain,
    chainId: chain.chainId,
    confidence: 90,
    detectionMethod: 'name',
    matchedPattern: (pattern && upperText.match(pattern)?.[0]) || chain.name,
    countryCode: chain.country,
  };
}

/**
 * Strategy 3: Detect chain by fingerprint patterns
 * Medium confidence (70-85%)
 */
function detectByFingerprint(
  text: string,
  templates: ChainTemplate[]
): ChainDetectionResult | null {
  const upperText = text.toUpperCase();
  const counts = templates.map((template) => ({
    template,
    matched: template.fingerprints.filter((fingerprint) => fingerprint.test(upperText)),
  }));

  const best = Math.max(0, ...counts.map((c) => c.matched.length));
  if (best === 0) return null;

  const leaders = counts.filter((c) => c.matched.length === best);
  const chain = pickByCountry(
    leaders.map((c) => c.template),
    text
  );
  const matched = leaders.find((c) => c.template === chain)!.matched;
  const lastMatched = matched[matched.length - 1];

  return {
    chain,
    chainId: chain.chainId,
    confidence: Math.min(70 + best * 5, 85),
    detectionMethod: 'fingerprint',
    matchedPattern: (lastMatched && upperText.match(lastMatched)?.[0]) || '',
    countryCode: chain.country,
  };
}

/**
 * Strategy 4: Heuristic detection based on keywords
 * Lower confidence (50-65%)
 */
function detectByHeuristic(text: string, templates: ChainTemplate[]): ChainDetectionResult | null {
  const headerText = text.toUpperCase().split('\n').slice(0, 10).join('\n');

  const matches = templates
    .map((template) => ({
      template,
      word: template.name
        .toUpperCase()
        .split(/\s+/)
        .find((w) => w.length >= 4 && headerText.includes(w)),
    }))
    .filter((m): m is { template: ChainTemplate; word: string } => m.word !== undefined);
  if (matches.length === 0) return null;

  const chain = pickByCountry(
    matches.map((m) => m.template),
    text
  );
  return {
    chain,
    chainId: chain.chainId,
    confidence: 60,
    detectionMethod: 'heuristic',
    matchedPattern: matches.find((m) => m.template === chain)!.word,
    countryCode: chain.country,
  };
}

/**
 * A chain recognised only by name belongs to one country's template. When the
 * receipt prints another country's tax ID (Lidl in Portugal, while only Lidl
 * Spain has a template), that template would misread it, so no chain is better.
 */
function fitsPrintedTaxId(detection: ChainDetectionResult, text: string): boolean {
  const country = detectCountry(text);
  return country.method !== 'tax_id' || country.code === detection.countryCode;
}

const NO_CHAIN: ChainDetectionResult = {
  chain: null,
  chainId: null,
  confidence: 0,
  detectionMethod: 'none',
  countryCode: null,
};

/**
 * Main detection function
 * Tries all strategies in order of reliability
 *
 * @param blocks - OCR blocks from ML Kit
 * @returns Detection result with chain template, its country and confidence
 */
export function detectChain(blocks: OcrBlock[], options?: DetectionOptions): ChainDetectionResult {
  const text = extractTextFromBlocks(blocks);
  const templates = options?.templates ?? getAllTemplates();

  if ((!text || text.trim().length === 0) && !options?.taxIdHint) {
    return NO_CHAIN;
  }

  const byTaxId = detectByNif(text, templates, options?.taxIdHint);
  const byName =
    byTaxId ??
    detectByName(text, templates) ??
    detectByFingerprint(text, templates) ??
    detectByHeuristic(text, templates);
  const result = byTaxId ?? (byName && fitsPrintedTaxId(byName, text) ? byName : null);

  if (!result) {
    logger.log('No chain detected');
    return NO_CHAIN;
  }

  logger.log(`Detected by ${result.detectionMethod}:`, result.chainId, result.matchedPattern);
  return result;
}

/**
 * Detect chain from text lines (alternative input)
 */
export function detectChainFromLines(
  lines: string[],
  options?: DetectionOptions
): ChainDetectionResult {
  const blocks: OcrBlock[] = lines.map((text) => ({ text }));
  return detectChain(blocks, options);
}

/**
 * Detect chain from raw text
 */
export function detectChainFromText(
  text: string,
  options?: DetectionOptions
): ChainDetectionResult {
  return detectChainFromLines(text.split('\n'), options);
}

/**
 * Apply chain-specific OCR corrections to text
 */
export function applyChainOcrCorrections(text: string, chain: ChainTemplate): string {
  let corrected = text;

  for (const correction of chain.ocrCorrections) {
    corrected = corrected.replace(correction.pattern, correction.replacement);
  }

  return corrected;
}

/**
 * Apply chain-specific OCR corrections to lines
 */
export function applyChainOcrCorrectionsToLines(lines: string[], chain: ChainTemplate): string[] {
  return lines.map((line) => applyChainOcrCorrections(line, chain));
}
