import type { MlkitText } from '../imageOcr';
import type { OcrBlock } from '../index';

function frame(box: OcrBlock['boundingBox']) {
  return {
    left: box.left,
    top: box.top,
    right: box.left + box.width,
    bottom: box.top + box.height,
  };
}

/** Rebuilds the shape ML Kit returns from blocks already in the app's shape. */
export function toMlkitText(blocks: OcrBlock[]): MlkitText {
  return {
    text: blocks.map((block) => block.text).join('\n'),
    blocks: blocks.map((block) => ({
      text: block.text,
      frame: frame(block.boundingBox),
      recognizedLanguages: [],
      lines: block.lines.map((line) => ({
        text: line.text,
        frame: frame(line.boundingBox),
        recognizedLanguages: [],
        elements: [],
      })),
    })),
  };
}
