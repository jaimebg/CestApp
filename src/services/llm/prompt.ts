import type { AppleMessage, ChainHint } from './types';

const SYSTEM_PROMPT = [
  'Eres un extractor de datos de tickets de supermercado españoles.',
  'Recibes el texto OCR de un ticket y devuelves sus datos estructurados.',
  'Reglas estrictas:',
  '- Usa unicamente informacion presente en el texto. No inventes productos ni precios.',
  '- Los precios usan coma decimal y estan en euros. Devuelvelos como numeros.',
  '- Ignora lineas de IVA, formas de pago, direcciones, telefonos y publicidad.',
  '- Si un producto ocupa varias lineas, unelas en un solo producto.',
  '- Puedes expandir abreviaturas de marca blanca a su nombre completo.',
].join('\n');

export function buildMessages(lines: string[], hint?: ChainHint): AppleMessage[] {
  const context = hint
    ? `El ticket es de ${hint.chainName}. El formato es ${hint.isColumnar ? 'columnar' : 'en linea'}.`
    : 'La cadena de supermercado es desconocida.';

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `${context}\n\nTexto del ticket:\n${lines.join('\n')}` },
  ];
}
