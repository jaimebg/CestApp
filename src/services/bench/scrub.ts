/**
 * Removes what identifies a person from a recorded reading before it becomes a
 * public test fixture: card numbers, authorization and terminal codes, and the
 * time of the sale. Structure and geometry stay, so the parser sees what it
 * would have seen. Runs in Node (fixture tooling and tests), never on device.
 */

import type { MlkitText } from '../ocr/imageOcr';

export const SCRUB_VERSION = 'cestapp-scrub/1';

const CARD_RUN = /\d(?:[ -]?\d){12,18}/g;
const MASKED_CARD_END = /([*Xx•]{4,}[\s-]*)(\d{4})\b/g;
const CODE_KEYWORD =
  /(^|[^\p{L}\p{N}])(N\.?\s?AUT|N\.?\s?OPER|AUTORIZACI[OÓ]N|AUTORIZ|AUTH|AUT|TERMINAL|TERM|TPV|COMERCIO|MERCHANT|AID|ARC|NRC|OPERACI[OÓ]N|TRANSACCI[OÓ]N|TRANS|REF|SESI[OÓ]N)(?![\p{L}\p{N}])[.:]?/iu;
const TIME = /\b([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?\b/g;

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
    (_, mask: string, digits: string) => mask + '*'.repeat(digits.length)
  );

  const keyword = CODE_KEYWORD.exec(line);
  if (keyword) {
    const end = keyword.index + keyword[0].length;
    line = line.slice(0, end) + maskAlphanumerics(line.slice(end));
  }

  return line.replace(TIME, (_, _hour: string, seconds?: string) =>
    seconds ? '12:00:00' : '12:00'
  );
}

export function scrubRaw(raw: MlkitText): MlkitText {
  const blocks = raw.blocks.map((block) => {
    const lines = block.lines.map((line) => {
      const text = scrubLine(line.text);
      if (text === line.text) return line;

      const words = text.split(/\s+/).filter(Boolean);
      const elements =
        words.length === line.elements.length
          ? line.elements.map((element, i) => ({ ...element, text: words[i] }))
          : line.elements.map((element) => ({
              ...element,
              text: element.text.replace(/\d/g, '*'),
            }));
      return { ...line, text, elements };
    });
    return { ...block, lines, text: lines.map((line) => line.text).join('\n') };
  });

  return { ...raw, blocks, text: blocks.map((block) => block.text).join('\n') };
}
