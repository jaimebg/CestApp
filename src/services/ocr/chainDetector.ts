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

import {
  ChainTemplate,
  CHAIN_TEMPLATES,
  NIF_TO_CHAIN,
  getAllTemplates,
} from '../../config/spanishChains';
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

/**
 * Strategy 1: Detect chain by NIF/CIF
 * Most reliable method (98% confidence)
 * Handles both formats: A12345678 and A-12345678 (with hyphen)
 */
function detectByNif(text: string): ChainDetectionResult | null {
  // NIF patterns: Letter + optional hyphen + 8 digits, or 8 digits + letter
  const nifPatterns = [
    /\b([A-Z]-?\d{8})\b/gi, // A12345678 or A-12345678
    /\b(\d{8}[A-Z])\b/gi, // 12345678A
    /NIF[:\s]*([A-Z]-?\d{8})/gi, // NIF: A12345678 or A-12345678
    /CIF[:\s]*([A-Z]-?\d{8})/gi, // CIF: A12345678
    /N\.?I\.?F\.?[:\s]*([A-Z]-?\d{8})/gi,
    /C\.?I\.?F\.?[:\s]*([A-Z]-?\d{8})/gi,
  ];

  for (const pattern of nifPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const nif = match[1].toUpperCase();
      // Try both with and without hyphen
      const nifWithHyphen = nif.includes('-') ? nif : `${nif[0]}-${nif.slice(1)}`;
      const nifWithoutHyphen = nif.replace('-', '');

      const chainId =
        NIF_TO_CHAIN[nif] || NIF_TO_CHAIN[nifWithHyphen] || NIF_TO_CHAIN[nifWithoutHyphen];

      if (chainId) {
        const chain = CHAIN_TEMPLATES[chainId];
        return {
          chain,
          chainId,
          confidence: 98,
          detectionMethod: 'nif',
          matchedPattern: nif,
        };
      }
    }
  }

  return null;
}

/**
 * Strategy 2: Detect chain by exact name matching
 * High confidence (90%)
 */
function detectByName(text: string): ChainDetectionResult | null {
  const upperText = text.toUpperCase();
  const templates = getAllTemplates();

  // Check each template's name patterns
  for (const template of templates) {
    for (const pattern of template.namePatterns) {
      if (pattern.test(upperText)) {
        const match = upperText.match(pattern);
        return {
          chain: template,
          chainId: template.chainId,
          confidence: 90,
          detectionMethod: 'name',
          matchedPattern: match?.[0] || template.name,
        };
      }
    }
  }

  return null;
}

/**
 * Strategy 3: Detect chain by fingerprint patterns
 * Medium confidence (70-85%)
 */
function detectByFingerprint(text: string): ChainDetectionResult | null {
  const upperText = text.toUpperCase();
  const templates = getAllTemplates();

  let bestMatch: ChainDetectionResult | null = null;
  let maxMatches = 0;

  for (const template of templates) {
    let matchCount = 0;
    let lastMatchedPattern = '';

    for (const fingerprint of template.fingerprints) {
      if (fingerprint.test(upperText)) {
        matchCount++;
        const match = upperText.match(fingerprint);
        lastMatchedPattern = match?.[0] || '';
      }
    }

    if (matchCount > maxMatches) {
      maxMatches = matchCount;
      // Confidence scales with number of fingerprints matched
      const confidence = Math.min(70 + matchCount * 5, 85);
      bestMatch = {
        chain: template,
        chainId: template.chainId,
        confidence,
        detectionMethod: 'fingerprint',
        matchedPattern: lastMatchedPattern,
      };
    }
  }

  return bestMatch;
}

/**
 * Strategy 4: Heuristic detection based on keywords
 * Lower confidence (50-65%)
 */
function detectByHeuristic(text: string): ChainDetectionResult | null {
  const upperText = text.toUpperCase();

  // Common store name keywords to look for in header
  const headerText = upperText.split('\n').slice(0, 10).join('\n');

  const templates = getAllTemplates();

  for (const template of templates) {
    // Check if any part of the store name appears
    const nameWords = template.name.toUpperCase().split(/\s+/);
    for (const word of nameWords) {
      if (word.length >= 4 && headerText.includes(word)) {
        return {
          chain: template,
          chainId: template.chainId,
          confidence: 60,
          detectionMethod: 'heuristic',
          matchedPattern: word,
        };
      }
    }
  }

  return null;
}

/**
 * Main detection function
 * Tries all strategies in order of reliability
 *
 * @param blocks - OCR blocks from ML Kit
 * @returns Detection result with chain template and confidence
 */
export function detectChain(blocks: OcrBlock[]): ChainDetectionResult {
  const text = extractTextFromBlocks(blocks);

  if (!text || text.trim().length === 0) {
    return {
      chain: null,
      chainId: null,
      confidence: 0,
      detectionMethod: 'none',
    };
  }

  // Strategy 1: NIF/CIF matching (98% confidence)
  const nifResult = detectByNif(text);
  if (nifResult) {
    logger.log('Detected by NIF:', nifResult.chainId, nifResult.matchedPattern);
    return nifResult;
  }

  // Strategy 2: Exact name matching (90% confidence)
  const nameResult = detectByName(text);
  if (nameResult) {
    logger.log('Detected by name:', nameResult.chainId, nameResult.matchedPattern);
    return nameResult;
  }

  // Strategy 3: Fingerprint matching (70-85% confidence)
  const fingerprintResult = detectByFingerprint(text);
  if (fingerprintResult) {
    logger.log(
      'Detected by fingerprint:',
      fingerprintResult.chainId,
      fingerprintResult.matchedPattern
    );
    return fingerprintResult;
  }

  // Strategy 4: Heuristic detection (50-65% confidence)
  const heuristicResult = detectByHeuristic(text);
  if (heuristicResult) {
    logger.log('Detected by heuristic:', heuristicResult.chainId, heuristicResult.matchedPattern);
    return heuristicResult;
  }

  // No chain detected
  logger.log('No chain detected');
  return {
    chain: null,
    chainId: null,
    confidence: 0,
    detectionMethod: 'none',
  };
}

/**
 * Detect chain from text lines (alternative input)
 */
export function detectChainFromLines(lines: string[]): ChainDetectionResult {
  const blocks: OcrBlock[] = lines.map((text) => ({ text }));
  return detectChain(blocks);
}

/**
 * Detect chain from raw text
 */
export function detectChainFromText(text: string): ChainDetectionResult {
  const lines = text.split('\n');
  return detectChainFromLines(lines);
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
