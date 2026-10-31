/**
 * Removes what identifies a person from a recorded reading before it becomes a
 * public test fixture: card numbers, authorization and terminal codes, and the
 * time of the sale. Structure and geometry stay, so the parser sees what it
 * would have seen. Runs in Node (fixture tooling and tests), never on device.
 */

import type { MlkitText } from '../ocr/imageOcr';

export const SCRUB_VERSION = 'cestapp-scrub/1';

const CARD_RUN = /\d(?:[ -]?\d){12,18}/g;
const MASKED_CARD_END = /([*Xx•.·]{4,}[\s-]*)(\d{4})\b/g;
const CODE_KEYWORD =
  /(^|[^\p{L}\p{N}])(N\.?\s?AUT|N\.?\s?OPER|AUTORIZACI[OÓ]N|AUTORIZ|AUTH|AUT|TERMINAL|TERM|TPV|COMERCIO|MERCHANT|AID|ARC|NRC|OPERACI[OÓ]N|TRANSACCI[OÓ]N|TRANS|REF|SESI[OÓ]N)(?![\p{L}\p{N}])[.:]?/iu;
const TIME = /\b([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?\b/g;
const TIME_H = /\b([01]?\d|2[0-3])[hH][0-5]\d\b/g;
const ENDS_WITH_KEYWORD = new RegExp(`${CODE_KEYWORD.source}\\s*$`, 'iu');

function passesLuhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

function maskAlphanumerics(text: string): string {
  return text.replace(/[\p{L}\p{N}]/gu, '*');
}

export function scrubLine(text: string): string {
  let line = text.replace(CARD_RUN, (run) =>
    passesLuhn(run.replace(/\D/g, '')) ? run.replace(/\d/g, '*') : run
  );

  line = line.replace(
    MASKED_CARD_END,
    (_, mask: string, digits: string) => mask.replace(/[^\s-]/g, '*') + '*'.repeat(digits.length)
  );

  const keyword = CODE_KEYWORD.exec(line);
  if (keyword) {
    const end = keyword.index + keyword[0].length;
    line = line.slice(0, end) + maskAlphanumerics(line.slice(end));
  }

  return line
    .replace(TIME, (_, _hour: string, seconds?: string) => (seconds ? '12:00:00' : '12:00'))
    .replace(TIME_H, '12h00');
}

type RawLine = MlkitText['blocks'][number]['lines'][number];

function maskLine(line: RawLine): RawLine {
  return {
    ...line,
    text: maskAlphanumerics(line.text),
    elements: line.elements.map((element) => ({
      ...element,
      text: maskAlphanumerics(element.text),
    })),
  };
}

function scrubElements(line: RawLine, text: string): RawLine['elements'] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === line.elements.length) {
    return line.elements.map((element, i) => ({ ...element, text: words[i] }));
  }

  const keywordAt = line.elements.findIndex((element) => CODE_KEYWORD.test(element.text));
  return line.elements.map((element, i) => ({
    ...element,
    text:
      keywordAt >= 0 && i > keywordAt
        ? maskAlphanumerics(element.text)
        : scrubLine(element.text).replace(/\d/g, '*'),
  }));
}

function scrubOwnLine(line: RawLine): RawLine {
  const text = scrubLine(line.text);
  return text === line.text ? line : { ...line, text, elements: scrubElements(line, text) };
}

/**
 * ML Kit often puts a code in its own block beside its label ("AUT:" | "0A12B3"),
 * so a line ending in a code keyword also masks lines to its right on the same row.
 */
function maskCodesBesideKeywords(lines: RawLine[]): Set<RawLine> {
  const labels = lines.filter((line) => ENDS_WITH_KEYWORD.test(line.text));
  return new Set(
    lines.filter(
      (line) =>
        !labels.includes(line) &&
        labels.some((label) => {
          const middle = (line.frame.top + line.frame.bottom) / 2;
          return (
            middle >= label.frame.top &&
            middle <= label.frame.bottom &&
            line.frame.left >= label.frame.right
          );
        })
    )
  );
}

export function scrubRaw(raw: MlkitText): MlkitText {
  const besideKeywords = maskCodesBesideKeywords(raw.blocks.flatMap((block) => block.lines));

  const blocks = raw.blocks.map((block) => {
    const lines = block.lines.map((line) =>
      besideKeywords.has(line) ? maskLine(line) : scrubOwnLine(line)
    );
    return { ...block, lines, text: lines.map((line) => line.text).join('\n') };
  });

  return { ...raw, blocks, text: blocks.map((block) => block.text).join('\n') };
}
