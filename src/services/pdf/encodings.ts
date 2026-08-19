/**
 * Single-byte text encodings a PDF font can declare.
 *
 * A simple font with an /Encoding but no /ToUnicode map has to be decoded
 * through the table its encoding names. Carrefour's receipts do exactly this:
 * the text font is MacRomanEncoding with no CMap, so reading its bytes as
 * latin-1 silently dropped every accent and mangled the feminine ordinal.
 *
 * Only the high half is tabulated; 0x00-0x7F is ASCII in both encodings. A NUL
 * entry marks a code the encoding leaves undefined.
 */

const MAC_ROMAN_HIGH =
  'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔ\u0000ÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ';

const WIN_ANSI_HIGH =
  '€\u0000‚ƒ„…†‡ˆ‰Š‹Œ\u0000Ž\u0000\u0000‘’“”•–—˜™š›œ\u0000žŸ ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ';

const TABLES: Record<string, string> = {
  MacRomanEncoding: MAC_ROMAN_HIGH,
  WinAnsiEncoding: WIN_ANSI_HIGH,
};

export type EncodingTable = Map<number, string>;

const CACHE = new Map<string, EncodingTable>();

/**
 * Build the code -> character table for a named PDF encoding, or undefined when
 * the name is not one this module knows.
 */
export function encodingTable(name: string): EncodingTable | undefined {
  const cached = CACHE.get(name);
  if (cached) return cached;

  const high = TABLES[name];
  if (!high) return undefined;

  const table: EncodingTable = new Map();
  for (let i = 0; i < high.length; i++) {
    const char = high[i];
    if (char !== '\u0000') table.set(0x80 + i, char);
  }

  CACHE.set(name, table);
  return table;
}
