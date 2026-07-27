# On-Device LLM Receipt Structuring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir una capa opcional de LLM on-device que reestructure el texto OCR de un ticket cuando el parser determinista falla, aplicándose automáticamente solo si el resultado cuadra aritméticamente.

**Architecture:** Capa nueva y aislada en `src/services/llm/`, compuesta casi enteramente de funciones puras testeables sin dispositivo. Un único fichero (`appleBackend.ts`) toca la librería nativa. El pipeline OCR actual no se modifica: la refinación entra por un hook nuevo en la pantalla de revisión que actualiza el estado `parsedData` ya existente.

**Tech Stack:** TypeScript strict, React Native 0.83.4, Expo SDK 55, `@react-native-ai/apple` v0.12.0 (Apple Foundation Models, iOS 26+), Jest con preset `jest-expo`, Drizzle ORM.

## Global Constraints

- **Spec de referencia:** `docs/superpowers/specs/2026-07-27-llm-ondevice-receipt-structuring-design.md`. Ante cualquier duda, manda el spec.
- **No modificar** `parseReceipt()`, `parseWithTemplate()`, `parseWithSpatialCorrelation()` ni `validateReceipt()`.
- **No modificar** ningún test existente en `src/services/ocr/__tests__/`. Si uno falla, el cambio está mal.
- **Tests device-free:** el CI corre en `ubuntu-latest`. Todo test debe pasar con el módulo nativo mockeado.
- **`jest.config.js` usa `testMatch: ['**/**tests**/**/\*.test.ts']`** — extensión `.ts`, nunca `.tsx`. No hay librería de testing de componentes en el proyecto y este plan no añade ninguna.
- **Imports en tests: relativos** (`../merge`), como en `src/services/ocr/__tests__/`. En código de app: alias `@/`.
- **Sin comentarios** salvo JSDoc, según `CLAUDE.md`.
- **Logging:** `createScopedLogger('Llm')` de `@/src/utils/debug`. Nunca `console.log`.
- **i18n obligatorio:** todo texto visible en `src/i18n/locales/en.json` y `es.json`. Cero strings hardcodeados.
- **Tolerancia de reconciliación:** `max(0,02 €, 0,5%)`. Valor exacto, no aproximar.
- **Timeout del LLM:** 15000 ms.
- **Prettier:** comillas simples, punto y coma, 2 espacios, ancho 100, comas finales ES5.
- **React Compiler:** `eslint.config.js` activa `react-compiler/react-compiler: 'error'`. No mutes
  refs durante el render; hazlo dentro de un `useEffect`.
- **Firmas ya verificadas** (no hace falta comprobarlas): `Button` de `src/components/ui/Button.tsx`
  acepta `children`, y el store se exporta como `usePreferencesStore`.
- **Commits:** conventional commits (`feat:`, `fix:`, `test:`, `chore:`).

**Requisito del spec que queda obsoleto:** el spec pide "una sesión por refinado, liberada en el
cleanup del hook". Eso venía de la API `AppleLLMSession` de `react-native-apple-llm`. La librería
elegida expone `generateText()` **sin estado**: no hay objeto sesión que crear ni liberar, y por
tanto no hay contaminación posible entre tickets. El requisito se cumple por construcción y no
genera ninguna tarea.

**Desviación conocida respecto al spec:** el spec declara `structureReceipt(): Promise<Partial<ParsedReceipt> | null>`. Este plan usa un tipo propio `LlmReceipt` porque el LLM devuelve la fecha como string `DD/MM/YYYY`, no como `Date`, y mezclar ambos en un `Partial<ParsedReceipt>` sería ambiguo. El comportamiento y las garantías son los del spec.

---

### Task 1: Backend nativo y detección de disponibilidad

**Files:**

- Create: `src/services/llm/appleBackend.ts`
- Create: `src/services/llm/types.ts`
- Create: `src/services/llm/__tests__/appleBackend.test.ts`
- Modify: `package.json` (dependencia nueva)

**Interfaces:**

- Consumes: nada.
- Produces:
  - `types.ts` → `interface LlmReceipt { storeName: string | null; date: string | null; time: string | null; total: number | null; items: ParsedItem[] }` y `type ChainHint = { chainId: string; chainName: string; isColumnar: boolean }`
  - `appleBackend.ts` → `isBackendAvailable(): boolean` y `generateStructured(messages: AppleMessage[], schema: object): Promise<unknown>`

- [ ] **Step 1: Instalar la dependencia**

```bash
npm install @react-native-ai/apple@0.12.0 --legacy-peer-deps
```

Esperado: se añade a `dependencies` en `package.json`. No ejecutes `expo prebuild` todavía; la parte nativa se prueba en la Task 12.

- [ ] **Step 2: Crear los tipos compartidos**

Crea `src/services/llm/types.ts`:

```ts
import type { ParsedItem } from '../ocr/parser';

export interface LlmReceipt {
  storeName: string | null;
  date: string | null;
  time: string | null;
  total: number | null;
  items: ParsedItem[];
}

export type ChainHint = {
  chainId: string;
  chainName: string;
  isColumnar: boolean;
};

export interface AppleMessage {
  role: 'system' | 'user';
  content: string;
}
```

- [ ] **Step 3: Escribir el test que falla**

Crea `src/services/llm/__tests__/appleBackend.test.ts`:

```ts
import { AppleFoundationModels } from '@react-native-ai/apple';
import { isBackendAvailable, generateStructured } from '../appleBackend';

jest.mock('@react-native-ai/apple', () => ({
  AppleFoundationModels: {
    isAvailable: jest.fn(),
    generateText: jest.fn(),
  },
}));

const mockModule = AppleFoundationModels as jest.Mocked<typeof AppleFoundationModels>;

describe('isBackendAvailable', () => {
  it('returns true when the native module reports availability', () => {
    mockModule.isAvailable.mockReturnValue(true);
    expect(isBackendAvailable()).toBe(true);
  });

  it('returns false when the native module reports unavailability', () => {
    mockModule.isAvailable.mockReturnValue(false);
    expect(isBackendAvailable()).toBe(false);
  });

  it('returns false when the native module throws', () => {
    mockModule.isAvailable.mockImplementation(() => {
      throw new Error('module missing');
    });
    expect(isBackendAvailable()).toBe(false);
  });
});

describe('generateStructured', () => {
  it('returns the parsed JSON from the first text part', async () => {
    mockModule.generateText.mockResolvedValue([{ type: 'text', text: '{"items":[]}' }]);
    const result = await generateStructured([{ role: 'user', content: 'hi' }], { type: 'object' });
    expect(result).toEqual({ items: [] });
  });

  it('returns null when there is no text part', async () => {
    mockModule.generateText.mockResolvedValue([]);
    const result = await generateStructured([{ role: 'user', content: 'hi' }], { type: 'object' });
    expect(result).toBeNull();
  });

  it('returns null when the text is not valid JSON', async () => {
    mockModule.generateText.mockResolvedValue([{ type: 'text', text: 'lo siento, no puedo' }]);
    const result = await generateStructured([{ role: 'user', content: 'hi' }], { type: 'object' });
    expect(result).toBeNull();
  });

  it('returns null when the native call rejects', async () => {
    mockModule.generateText.mockRejectedValue(new Error('modelUnavailable'));
    const result = await generateStructured([{ role: 'user', content: 'hi' }], { type: 'object' });
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 4: Ejecutar el test para verificar que falla**

Run: `npx jest src/services/llm/__tests__/appleBackend.test.ts`
Expected: FAIL — `Cannot find module '../appleBackend'`

- [ ] **Step 5: Implementar el backend**

Crea `src/services/llm/appleBackend.ts`:

```ts
import { AppleFoundationModels } from '@react-native-ai/apple';
import { createScopedLogger } from '../../utils/debug';
import type { AppleMessage } from './types';

const logger = createScopedLogger('LlmBackend');

export function isBackendAvailable(): boolean {
  try {
    return AppleFoundationModels.isAvailable();
  } catch (error) {
    logger.warn('Availability check failed:', error);
    return false;
  }
}

export async function generateStructured(
  messages: AppleMessage[],
  schema: object
): Promise<unknown> {
  try {
    const parts = await AppleFoundationModels.generateText(messages, {
      schema,
      temperature: 0,
    });
    const textPart = parts.find((part) => part.type === 'text');
    if (!textPart || !('text' in textPart)) return null;
    return JSON.parse(textPart.text);
  } catch (error) {
    logger.warn('Generation failed:', error);
    return null;
  }
}
```

- [ ] **Step 6: Ejecutar los tests**

Run: `npx jest src/services/llm/__tests__/appleBackend.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 7: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/services/llm/
git commit -m "feat: add Apple Foundation Models backend wrapper"
```

---

### Task 2: Reconciliación aritmética

**Files:**

- Create: `src/services/llm/reconcile.ts`
- Create: `src/services/llm/__tests__/reconcile.test.ts`

**Interfaces:**

- Consumes: `ParsedItem` de `src/services/ocr/parser`.
- Produces: `reconciles(items: ParsedItem[], discount: number | null, total: number | null): boolean`

- [ ] **Step 1: Escribir el test que falla**

Crea `src/services/llm/__tests__/reconcile.test.ts`:

```ts
import { reconciles } from '../reconcile';
import type { ParsedItem } from '../../ocr/parser';

function item(totalPrice: number): ParsedItem {
  return { name: 'X', quantity: 1, unitPrice: totalPrice, totalPrice, unit: null, confidence: 80 };
}

describe('reconciles', () => {
  it('accepts an exact match', () => {
    expect(reconciles([item(1.1), item(0.85)], null, 1.95)).toBe(true);
  });

  it('subtracts the discount before comparing', () => {
    expect(reconciles([item(10), item(5)], 3, 12)).toBe(true);
  });

  it('rejects a mismatch that the 5% legacy tolerance would have accepted', () => {
    expect(reconciles([item(77)], null, 80)).toBe(false);
  });

  it('accepts rounding noise within 2 cents', () => {
    expect(reconciles([item(1.005), item(0.99)], null, 2.0)).toBe(true);
  });

  it('uses the 0.5% floor on large totals', () => {
    expect(reconciles([item(1000)], null, 1004)).toBe(true);
    expect(reconciles([item(1000)], null, 1006)).toBe(false);
  });

  it('rejects when the total is null', () => {
    expect(reconciles([item(1.1)], null, null)).toBe(false);
  });

  it('rejects when there are no items', () => {
    expect(reconciles([], null, 5)).toBe(false);
  });

  it('rejects an empty item list even when the total is zero', () => {
    expect(reconciles([], null, 0)).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `npx jest src/services/llm/__tests__/reconcile.test.ts`
Expected: FAIL — `Cannot find module '../reconcile'`

- [ ] **Step 3: Implementar**

Crea `src/services/llm/reconcile.ts`:

```ts
import type { ParsedItem } from '../ocr/parser';

const ABSOLUTE_TOLERANCE = 0.02;
const RELATIVE_TOLERANCE = 0.005;

/**
 * Checks whether the item prices add up to the printed total, discounts included.
 * Deliberately stricter than validateReceipt: only an exact match authorises
 * applying an LLM result without user confirmation.
 */
export function reconciles(
  items: ParsedItem[],
  discount: number | null,
  total: number | null
): boolean {
  if (total === null || items.length === 0) return false;

  const sum = items.reduce((acc, current) => acc + current.totalPrice, 0);
  const expected = sum - (discount ?? 0);
  const tolerance = Math.max(ABSOLUTE_TOLERANCE, Math.abs(total) * RELATIVE_TOLERANCE);

  return Math.abs(expected - total) <= tolerance;
}
```

- [ ] **Step 4: Ejecutar los tests**

Run: `npx jest src/services/llm/__tests__/reconcile.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/llm/reconcile.ts src/services/llm/__tests__/reconcile.test.ts
git commit -m "feat: add strict arithmetic reconciliation for LLM results"
```

---

### Task 3: Guardas anti-alucinación

**Files:**

- Create: `src/services/llm/guards.ts`
- Create: `src/services/llm/__tests__/guards.test.ts`

**Interfaces:**

- Consumes: `ParsedItem` de `src/services/ocr/parser`, `parsePrice` de `src/services/ocr/parseUtils`.
- Produces:
  - `normalizeForAnchor(text: string): string`
  - `findSourceLine(price: number, lines: string[]): string | null`
  - `isAnchoredToSource(name: string, sourceLine: string): boolean`
  - `filterHallucinatedItems(items: ParsedItem[], lines: string[]): ParsedItem[]`

- [ ] **Step 1: Escribir el test que falla**

Crea `src/services/llm/__tests__/guards.test.ts`:

```ts
import {
  normalizeForAnchor,
  findSourceLine,
  isAnchoredToSource,
  filterHallucinatedItems,
} from '../guards';
import type { ParsedItem } from '../../ocr/parser';

const LINES = [
  'MERCADONA, S.A.',
  '1 HAC LECHE SEMI 1L 0,98',
  '2 PAN INTEGRAL 1,20 2,40',
  'TOTAL (€) 3,38',
];

function item(name: string, totalPrice: number): ParsedItem {
  return { name, quantity: 1, unitPrice: totalPrice, totalPrice, unit: null, confidence: 80 };
}

describe('normalizeForAnchor', () => {
  it('uppercases, strips accents and punctuation', () => {
    expect(normalizeForAnchor('Leche semidesnatada, 1L.')).toBe('LECHE SEMIDESNATADA 1L');
    expect(normalizeForAnchor('JAMÓN Ibérico')).toBe('JAMON IBERICO');
  });
});

describe('findSourceLine', () => {
  it('finds the line containing the price', () => {
    expect(findSourceLine(0.98, LINES)).toBe('1 HAC LECHE SEMI 1L 0,98');
  });

  it('matches the line total, not the unit price', () => {
    expect(findSourceLine(2.4, LINES)).toBe('2 PAN INTEGRAL 1,20 2,40');
  });

  it('returns null when the price is absent from the receipt', () => {
    expect(findSourceLine(9.99, LINES)).toBeNull();
  });
});

describe('isAnchoredToSource', () => {
  it('accepts a legitimately expanded name', () => {
    expect(isAnchoredToSource('Leche semidesnatada', '1 HAC LECHE SEMI 1L 0,98')).toBe(true);
  });

  it('accepts a verbatim name', () => {
    expect(isAnchoredToSource('PAN INTEGRAL', '2 PAN INTEGRAL 1,20 2,40')).toBe(true);
  });

  it('rejects a name sharing no token with its line', () => {
    expect(isAnchoredToSource('Detergente', '1 HAC LECHE SEMI 1L 0,98')).toBe(false);
  });

  it('ignores tokens shorter than three characters', () => {
    expect(isAnchoredToSource('1L de algo', '1 HAC LECHE SEMI 1L 0,98')).toBe(false);
  });
});

describe('filterHallucinatedItems', () => {
  it('keeps items anchored to the source text', () => {
    const kept = filterHallucinatedItems(
      [item('Leche semidesnatada', 0.98), item('Pan integral', 2.4)],
      LINES
    );
    expect(kept).toHaveLength(2);
  });

  it('drops an item whose price is absent from the receipt', () => {
    const kept = filterHallucinatedItems([item('Aceite de oliva', 9.99)], LINES);
    expect(kept).toHaveLength(0);
  });

  it('drops an invented item that reuses a real price', () => {
    const kept = filterHallucinatedItems([item('Detergente', 0.98)], LINES);
    expect(kept).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `npx jest src/services/llm/__tests__/guards.test.ts`
Expected: FAIL — `Cannot find module '../guards'`

- [ ] **Step 3: Implementar**

Crea `src/services/llm/guards.ts`:

```ts
import type { ParsedItem } from '../ocr/parser';
import { parsePrice } from '../ocr/parseUtils';

const PRICE_TOKEN = /\d+[.,]\d{2}/g;
const PRICE_EPSILON = 0.005;
const MIN_TOKEN_LENGTH = 3;

const SUMMARY_TOKENS = [
  'TOTAL',
  'SUBTOTAL',
  'IMPORTE',
  'PAGAR',
  'PAGADO',
  'PAGO',
  'CONTADO',
  'ENTREGA',
  'ENTREGADO',
  'IVA',
  'IGIC',
  'IPSI',
  'CUOTA',
  'IMPONIBLE',
  'BASE',
  'RECARGO',
  'EFECTIVO',
  'TARJETA',
  'VISA',
  'CAMBIO',
  'DEVOLUCION',
  'ABONO',
  'DESCUENTO',
  'DTO',
];

const SUMMARY_LEAD_TOKENS = 2;

/**
 * A receipt's summary lines are never line items, whatever tokens they share with
 * a product name. Without this, an invented item named "Total compra" priced at the
 * printed total anchors to the TOTAL line and then reconciles tautologically — the
 * item sum and the total are the same number by construction.
 *
 * Only the opening tokens are inspected. Summary lines lead with their keyword
 * ("IMPORTE 3,38", "SU CAMBIO 0,00") while product lines lead with a quantity or a
 * brand, so "2 FAGE TOTAL 2% 2,15" — a real yogurt sold in Spain — stays a product.
 */
function isSummaryLine(line: string): boolean {
  const lead = normalizeForAnchor(line).split(' ').slice(0, SUMMARY_LEAD_TOKENS);
  return lead.some((token) => SUMMARY_TOKENS.includes(token));
}

const COMBINING_MARK_START = 0x0300;
const COMBINING_MARK_END = 0x036f;

/**
 * Strips diacritics without embedding literal combining characters in source,
 * which are invisible and easy to corrupt when the file is edited.
 */
function stripDiacritics(text: string): string {
  return Array.from(text.normalize('NFD'))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code < COMBINING_MARK_START || code > COMBINING_MARK_END;
    })
    .join('');
}

export function normalizeForAnchor(text: string): string {
  return stripDiacritics(text)
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lineContainsPrice(line: string, price: number): boolean {
  const matches = line.match(PRICE_TOKEN) || [];
  return matches.some((match) => {
    const parsed = parsePrice(match);
    return parsed !== null && Math.abs(parsed - price) < PRICE_EPSILON;
  });
}

/**
 * Returns the first OCR line that contains the given price, or null when no line does.
 */
export function findSourceLine(price: number, lines: string[]): string | null {
  return lines.find((line) => lineContainsPrice(line, price)) ?? null;
}

/**
 * Anchors an item name to its source line by shared tokens rather than substring,
 * so the model may expand abbreviations without being able to invent a product.
 *
 * The prefix test runs in one direction only. A legitimate expansion always grows
 * the receipt's abbreviation into a longer word (SEMI to SEMIDESNATADA), so the
 * item name token must start with the line token. Allowing the reverse would let
 * an invented short name anchor to an unrelated longer word, such as SAL to SALSA.
 */
export type AnchorStrength = 'exact' | 'prefix' | 'none';

/**
 * Grades how firmly an item name is anchored to its source line. An exact shared
 * token is stronger evidence than a prefix expansion, and filterHallucinatedItems
 * uses that ranking to hand out lines in the right order.
 */
export function anchorStrength(name: string, sourceLine: string): AnchorStrength {
  const lineTokens = [...new Set(normalizeForAnchor(sourceLine).split(' '))].filter(
    (token) => token.length >= MIN_TOKEN_LENGTH
  );
  const nameTokens = normalizeForAnchor(name)
    .split(' ')
    .filter((token) => token.length >= MIN_TOKEN_LENGTH);

  let strength: AnchorStrength = 'none';

  for (const token of nameTokens) {
    for (const lineToken of lineTokens) {
      if (token === lineToken) return 'exact';
      if (token.startsWith(lineToken)) strength = 'prefix';
    }
  }

  return strength;
}

export function isAnchoredToSource(name: string, sourceLine: string): boolean {
  return anchorStrength(name, sourceLine) !== 'none';
}

/**
 * Each surviving item claims a distinct source line. Spanish receipts routinely
 * repeat round prices, so matching every item against the first line carrying its
 * price would misattribute the second product and drop it as if it were invented.
 *
 * Exact token matches claim their lines before prefix matches do. Greedy first-fit
 * in item order can otherwise starve a real product: with lines SAL and SALSA BRAVA
 * at the same price, "Salsa brava" would claim the SAL line by prefix and leave
 * "Sal" with nowhere to anchor, dropping a genuine item.
 */
export function filterHallucinatedItems(items: ParsedItem[], lines: string[]): ParsedItem[] {
  const claimedLine = new Map<number, number>();

  const claimAll = (strength: AnchorStrength) => {
    items.forEach((current, itemIndex) => {
      if (claimedLine.has(itemIndex)) return;
      const taken = new Set(claimedLine.values());
      const lineIndex = lines.findIndex(
        (line, position) =>
          !taken.has(position) &&
          !isSummaryLine(line) &&
          lineContainsPrice(line, current.totalPrice) &&
          anchorStrength(current.name, line) === strength
      );
      if (lineIndex !== -1) claimedLine.set(itemIndex, lineIndex);
    });
  };

  claimAll('exact');
  claimAll('prefix');

  return items.filter((_, itemIndex) => claimedLine.has(itemIndex));
}
```

- [ ] **Step 4: Ejecutar los tests**

Run: `npx jest src/services/llm/__tests__/guards.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/llm/guards.ts src/services/llm/__tests__/guards.test.ts
git commit -m "feat: add anti-hallucination guards for LLM items"
```

---

### Task 4: Esquema y saneado de la salida

**Files:**

- Create: `src/services/llm/schema.ts`
- Create: `src/services/llm/__tests__/schema.test.ts`

**Interfaces:**

- Consumes: `LlmReceipt` de `./types`, `ParsedItem` de `src/services/ocr/parser`.
- Produces: `RECEIPT_SCHEMA: object` y `sanitizeLlmReceipt(raw: unknown): LlmReceipt | null`

- [ ] **Step 1: Escribir el test que falla**

Crea `src/services/llm/__tests__/schema.test.ts`:

```ts
import { sanitizeLlmReceipt, RECEIPT_SCHEMA } from '../schema';

describe('RECEIPT_SCHEMA', () => {
  it('declares items as an array of objects', () => {
    const items = (RECEIPT_SCHEMA as any).properties.items;
    expect(items.type).toBe('array');
    expect(items.items.type).toBe('object');
  });

  it('constrains unit to the ParsedItem union', () => {
    const unit = (RECEIPT_SCHEMA as any).properties.items.items.properties.unit;
    expect(unit.enum).toEqual(['each', 'kg', 'g', 'l', 'ml']);
  });
});

describe('sanitizeLlmReceipt', () => {
  it('returns null for non-objects', () => {
    expect(sanitizeLlmReceipt(null)).toBeNull();
    expect(sanitizeLlmReceipt('nope')).toBeNull();
    expect(sanitizeLlmReceipt(42)).toBeNull();
  });

  it('returns null when items is missing or not an array', () => {
    expect(sanitizeLlmReceipt({})).toBeNull();
    expect(sanitizeLlmReceipt({ items: 'x' })).toBeNull();
  });

  it('maps a well-formed payload', () => {
    const result = sanitizeLlmReceipt({
      storeName: 'Mercadona',
      date: '10/03/2026',
      time: '18:45',
      total: 3.38,
      items: [{ name: 'Leche', quantity: 1, unitPrice: 0.98, totalPrice: 0.98, unit: 'each' }],
    });
    expect(result).toEqual({
      storeName: 'Mercadona',
      date: '10/03/2026',
      time: '18:45',
      total: 3.38,
      items: [
        {
          name: 'Leche',
          quantity: 1,
          unitPrice: 0.98,
          totalPrice: 0.98,
          unit: 'each',
          confidence: 70,
        },
      ],
    });
  });

  it('drops items without a usable name or price', () => {
    const result = sanitizeLlmReceipt({
      items: [
        { name: '', totalPrice: 1 },
        { name: 'Pan', totalPrice: 'mucho' },
        { name: 'Leche', totalPrice: 0.98 },
      ],
    });
    expect(result?.items).toHaveLength(1);
    expect(result?.items[0].name).toBe('Leche');
  });

  it('defaults missing optional item fields', () => {
    const result = sanitizeLlmReceipt({ items: [{ name: 'Leche', totalPrice: 0.98 }] });
    expect(result?.items[0]).toEqual({
      name: 'Leche',
      quantity: 1,
      unitPrice: 0.98,
      totalPrice: 0.98,
      unit: null,
      confidence: 70,
    });
  });

  it('rejects an out-of-union unit', () => {
    const result = sanitizeLlmReceipt({
      items: [{ name: 'Leche', totalPrice: 0.98, unit: 'litros' }],
    });
    expect(result?.items[0].unit).toBeNull();
  });

  it('nulls absent header fields', () => {
    const result = sanitizeLlmReceipt({ items: [{ name: 'Leche', totalPrice: 0.98 }] });
    expect(result?.storeName).toBeNull();
    expect(result?.date).toBeNull();
    expect(result?.time).toBeNull();
    expect(result?.total).toBeNull();
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `npx jest src/services/llm/__tests__/schema.test.ts`
Expected: FAIL — `Cannot find module '../schema'`

- [ ] **Step 3: Implementar**

Crea `src/services/llm/schema.ts`:

```ts
import type { ParsedItem } from '../ocr/parser';
import type { LlmReceipt } from './types';

/**
 * Deliberately a subset of ParsedItem['unit']: 'lb' and 'oz' are omitted because
 * CestApp is Spain-only and imperial units never appear on a Spanish receipt.
 * Offering them to the model would only invite wrong answers.
 */
const UNITS: ParsedItem['unit'][] = ['each', 'kg', 'g', 'l', 'ml'];
const LLM_ITEM_CONFIDENCE = 70;

export const RECEIPT_SCHEMA = {
  type: 'object',
  properties: {
    storeName: { type: 'string', description: 'Nombre del supermercado' },
    date: { type: 'string', description: 'Fecha en formato DD/MM/YYYY' },
    time: { type: 'string', description: 'Hora en formato HH:MM' },
    total: { type: 'number', description: 'Importe total pagado en euros' },
    items: {
      type: 'array',
      description: 'Productos comprados, uno por linea del ticket',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nombre del producto' },
          quantity: { type: 'number', description: 'Unidades o peso' },
          unitPrice: { type: 'number', description: 'Precio por unidad en euros' },
          totalPrice: { type: 'number', description: 'Precio total de la linea en euros' },
          unit: { type: 'string', enum: ['each', 'kg', 'g', 'l', 'ml'] },
        },
        required: ['name', 'totalPrice'],
      },
    },
  },
  required: ['items'],
};

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asUnit(value: unknown): ParsedItem['unit'] {
  return UNITS.includes(value as ParsedItem['unit']) ? (value as ParsedItem['unit']) : null;
}

function sanitizeItem(raw: unknown): ParsedItem | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const record = raw as Record<string, unknown>;

  const name = asString(record.name);
  const totalPrice = asNumber(record.totalPrice);
  if (name === null || totalPrice === null || totalPrice < 0) return null;

  const declaredQuantity = asNumber(record.quantity);
  const quantity = declaredQuantity !== null && declaredQuantity > 0 ? declaredQuantity : 1;
  const unitPrice = asNumber(record.unitPrice) ?? totalPrice / quantity;

  return {
    name,
    quantity,
    unitPrice,
    totalPrice,
    unit: asUnit(record.unit),
    confidence: LLM_ITEM_CONFIDENCE,
  };
}

/**
 * Converts the raw model output into a typed LlmReceipt, discarding anything
 * malformed. Returns null when the payload is unusable as a whole.
 */
export function sanitizeLlmReceipt(raw: unknown): LlmReceipt | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const record = raw as Record<string, unknown>;

  if (!Array.isArray(record.items)) return null;

  const items = record.items
    .map(sanitizeItem)
    .filter((current): current is ParsedItem => current !== null);

  return {
    storeName: asString(record.storeName),
    date: asString(record.date),
    time: asString(record.time),
    total: asNumber(record.total),
    items,
  };
}
```

- [ ] **Step 4: Ejecutar los tests**

Run: `npx jest src/services/llm/__tests__/schema.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/llm/schema.ts src/services/llm/__tests__/schema.test.ts
git commit -m "feat: add LLM receipt schema and output sanitizer"
```

---

### Task 5: Voto del total y fusión

**Files:**

- Create: `src/services/llm/merge.ts`
- Create: `src/services/llm/__tests__/merge.test.ts`

**Interfaces:**

- Consumes: `reconciles` de `./reconcile`, `filterHallucinatedItems` de `./guards`, `LlmReceipt` de `./types`, `ParsedReceipt`/`ParsedItem` de `src/services/ocr/parser`.
- Produces:
  - `voteTotal(parserTotal: number | null, detectedTotal: number | null, llmTotal: number | null): number | null`
  - `type MergeOutcome = 'auto' | 'proposal' | 'none'`
  - `interface MergeResult { merged: ParsedReceipt; outcome: MergeOutcome }`
  - `mergeParsedReceipts(deterministic: ParsedReceipt, llm: LlmReceipt, lines: string[], detectedTotal: number | null): MergeResult`

- [ ] **Step 1: Escribir el test que falla**

Crea `src/services/llm/__tests__/merge.test.ts`:

```ts
import { voteTotal, mergeParsedReceipts } from '../merge';
import type { ParsedReceipt, ParsedItem } from '../../ocr/parser';
import type { LlmReceipt } from '../types';

const LINES = ['1 HAC LECHE SEMI 1L 0,98', '2 PAN INTEGRAL 1,20 2,40', 'TOTAL (€) 3,38'];

function item(name: string, totalPrice: number): ParsedItem {
  return { name, quantity: 1, unitPrice: totalPrice, totalPrice, unit: null, confidence: 80 };
}

function deterministic(overrides: Partial<ParsedReceipt> = {}): ParsedReceipt {
  return {
    storeName: 'Mercadona',
    storeAddress: null,
    date: new Date('2026-03-10'),
    time: '18:45',
    dateString: '10/03/2026',
    items: [],
    subtotal: null,
    tax: null,
    discount: null,
    total: 3.38,
    paymentMethod: 'card',
    rawText: LINES.join('\n'),
    confidence: 40,
    chainId: 'mercadona',
    chainName: 'Mercadona',
    chainConfidence: 98,
    parsingMethod: 'chain',
    ...overrides,
  };
}

function llm(overrides: Partial<LlmReceipt> = {}): LlmReceipt {
  return {
    storeName: 'Mercadona S.A.',
    date: '10/03/2026',
    time: '18:45',
    total: 3.38,
    items: [item('Leche semidesnatada', 0.98), item('Pan integral', 2.4)],
    ...overrides,
  };
}

describe('voteTotal', () => {
  it('returns the majority value with three sources', () => {
    expect(voteTotal(3.38, 3.38, 9.99)).toBe(3.38);
    expect(voteTotal(9.99, 3.38, 3.38)).toBe(3.38);
  });

  it('keeps the parser total when three sources disagree', () => {
    expect(voteTotal(1, 2, 3)).toBe(1);
  });

  it('keeps the parser total when detectedTotal is null', () => {
    expect(voteTotal(3.38, null, 9.99)).toBe(3.38);
  });

  it('fills the gap from the LLM when the parser has no total', () => {
    expect(voteTotal(null, null, 3.38)).toBe(3.38);
  });

  it('returns null when no source has a total', () => {
    expect(voteTotal(null, null, null)).toBeNull();
  });
});

describe('mergeParsedReceipts', () => {
  it('applies LLM items automatically when they reconcile', () => {
    const result = mergeParsedReceipts(deterministic(), llm(), LINES, null);
    expect(result.outcome).toBe('auto');
    expect(result.merged.items).toHaveLength(2);
  });

  it('never overrides chain identity', () => {
    const result = mergeParsedReceipts(deterministic(), llm(), LINES, null);
    expect(result.merged.chainId).toBe('mercadona');
    expect(result.merged.chainName).toBe('Mercadona');
    expect(result.merged.parsingMethod).toBe('chain');
  });

  it('keeps the deterministic store name when present', () => {
    const result = mergeParsedReceipts(deterministic(), llm(), LINES, null);
    expect(result.merged.storeName).toBe('Mercadona');
  });

  it('fills the store name only when the deterministic one is null', () => {
    const result = mergeParsedReceipts(deterministic({ storeName: null }), llm(), LINES, null);
    expect(result.merged.storeName).toBe('Mercadona S.A.');
  });

  it('never takes rawText or paymentMethod from the LLM', () => {
    const result = mergeParsedReceipts(deterministic(), llm(), LINES, null);
    expect(result.merged.rawText).toBe(LINES.join('\n'));
    expect(result.merged.paymentMethod).toBe('card');
  });

  it('downgrades to a proposal when items do not reconcile', () => {
    const result = mergeParsedReceipts(
      deterministic(),
      llm({ items: [item('Leche semidesnatada', 0.98)] }),
      LINES,
      null
    );
    expect(result.outcome).toBe('proposal');
  });

  it('drops hallucinated items before reconciling', () => {
    const result = mergeParsedReceipts(
      deterministic(),
      llm({ items: [...llm().items, item('Caviar', 500)] }),
      LINES,
      null
    );
    expect(result.merged.items.every((current) => current.name !== 'Caviar')).toBe(true);
  });

  it('returns none when the LLM produced no usable items', () => {
    const result = mergeParsedReceipts(deterministic(), llm({ items: [] }), LINES, null);
    expect(result.outcome).toBe('none');
    expect(result.merged).toEqual(deterministic());
  });

  it('never auto-applies when the merged total is null', () => {
    const result = mergeParsedReceipts(
      deterministic({ total: null }),
      llm({ total: null }),
      LINES,
      null
    );
    expect(result.outcome).not.toBe('auto');
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `npx jest src/services/llm/__tests__/merge.test.ts`
Expected: FAIL — `Cannot find module '../merge'`

- [ ] **Step 3: Implementar**

Crea `src/services/llm/merge.ts`:

```ts
import type { ParsedReceipt } from '../ocr/parser';
import { filterHallucinatedItems } from './guards';
import { reconciles } from './reconcile';
import type { LlmReceipt } from './types';

const VOTE_EPSILON = 0.01;

export type MergeOutcome = 'auto' | 'proposal' | 'none';

export interface MergeResult {
  merged: ParsedReceipt;
  outcome: MergeOutcome;
}

function agree(a: number | null, b: number | null): boolean {
  return a !== null && b !== null && Math.abs(a - b) <= VOTE_EPSILON;
}

/**
 * The schema constrains the model to DD/MM/YYYY, so anything else is discarded
 * rather than guessed at. Both date fields move together: filling dateString alone
 * would leave the screen, which reads date, with nothing.
 */
function parseLlmDate(value: string | null): Date | null {
  if (value === null) return null;

  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match === null) return null;

  const [, day, month, year] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));

  const rolledOver =
    parsed.getDate() !== Number(day) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getFullYear() !== Number(year);

  return rolledOver ? null : parsed;
}

/**
 * Resolves the total across the three independent readings.
 * With fewer than three sources there is no majority, so the parser wins
 * unless it has nothing to offer.
 */
export function voteTotal(
  parserTotal: number | null,
  detectedTotal: number | null,
  llmTotal: number | null
): number | null {
  if (parserTotal === null) return detectedTotal ?? llmTotal;

  if (detectedTotal !== null && llmTotal !== null) {
    if (agree(detectedTotal, llmTotal) && !agree(parserTotal, detectedTotal)) {
      return detectedTotal;
    }
  }

  return parserTotal;
}

export function mergeParsedReceipts(
  deterministic: ParsedReceipt,
  llm: LlmReceipt,
  lines: string[],
  detectedTotal: number | null
): MergeResult {
  const items = filterHallucinatedItems(llm.items, lines);

  if (items.length === 0) {
    return { merged: deterministic, outcome: 'none' };
  }

  const total = voteTotal(deterministic.total, detectedTotal, llm.total);

  const llmDate = deterministic.date === null ? parseLlmDate(llm.date) : null;

  const merged: ParsedReceipt = {
    ...deterministic,
    storeName: deterministic.storeName ?? llm.storeName,
    date: deterministic.date ?? llmDate,
    dateString: llmDate !== null ? llm.date : deterministic.dateString,
    time: deterministic.time ?? llm.time,
    items,
    total,
  };

  const losesItems = items.length < deterministic.items.length;
  const outcome: MergeOutcome =
    reconciles(items, merged.discount, total) && !losesItems ? 'auto' : 'proposal';

  return { merged, outcome };
}
```

- [ ] **Step 4: Ejecutar los tests**

Run: `npx jest src/services/llm/__tests__/merge.test.ts`
Expected: PASS, 15 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/llm/merge.ts src/services/llm/__tests__/merge.test.ts
git commit -m "feat: add total voting and LLM merge policy"
```

---

### Task 6: Prompt y orquestación con timeout

**Files:**

- Create: `src/services/llm/prompt.ts`
- Create: `src/services/llm/index.ts`
- Create: `src/services/llm/__tests__/index.test.ts`

**Interfaces:**

- Consumes: todo lo anterior.
- Produces:
  - `buildMessages(lines: string[], hint?: ChainHint): AppleMessage[]`
  - `isLlmAvailable(): boolean`
  - `structureReceipt(lines: string[], hint?: ChainHint): Promise<LlmReceipt | null>`

- [ ] **Step 1: Escribir el test que falla**

Crea `src/services/llm/__tests__/index.test.ts`:

```ts
import { structureReceipt, isLlmAvailable } from '../index';
import * as backend from '../appleBackend';

jest.mock('../appleBackend');

const mockBackend = backend as jest.Mocked<typeof backend>;
const LINES = ['1 LECHE 0,98', 'TOTAL 0,98'];

describe('isLlmAvailable', () => {
  it('delegates to the backend', () => {
    mockBackend.isBackendAvailable.mockReturnValue(true);
    expect(isLlmAvailable()).toBe(true);
  });
});

describe('structureReceipt', () => {
  beforeEach(() => {
    mockBackend.isBackendAvailable.mockReturnValue(true);
  });

  it('returns null without calling the backend when unavailable', async () => {
    mockBackend.isBackendAvailable.mockReturnValue(false);
    const result = await structureReceipt(LINES);
    expect(result).toBeNull();
    expect(mockBackend.generateStructured).not.toHaveBeenCalled();
  });

  it('returns a sanitized receipt on a well-formed response', async () => {
    mockBackend.generateStructured.mockResolvedValue({
      total: 0.98,
      items: [{ name: 'Leche', totalPrice: 0.98 }],
    });
    const result = await structureReceipt(LINES);
    expect(result?.items).toHaveLength(1);
    expect(result?.total).toBe(0.98);
  });

  it('returns null on a malformed response', async () => {
    mockBackend.generateStructured.mockResolvedValue({ nonsense: true });
    expect(await structureReceipt(LINES)).toBeNull();
  });

  it('returns null when the backend resolves null', async () => {
    mockBackend.generateStructured.mockResolvedValue(null);
    expect(await structureReceipt(LINES)).toBeNull();
  });

  it('returns null when the backend rejects', async () => {
    mockBackend.generateStructured.mockRejectedValue(new Error('boom'));
    expect(await structureReceipt(LINES)).toBeNull();
  });

  it('returns null when the backend never resolves', async () => {
    jest.useFakeTimers();
    mockBackend.generateStructured.mockReturnValue(new Promise(() => {}));

    const pending = structureReceipt(LINES);
    jest.advanceTimersByTime(15000);

    expect(await pending).toBeNull();
    jest.useRealTimers();
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `npx jest src/services/llm/__tests__/index.test.ts`
Expected: FAIL — `Cannot find module '../index'`

- [ ] **Step 3: Implementar el prompt**

Crea `src/services/llm/prompt.ts`:

```ts
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
```

- [ ] **Step 4: Implementar la orquestación**

Crea `src/services/llm/index.ts`:

```ts
import { createScopedLogger } from '../../utils/debug';
import { generateStructured, isBackendAvailable } from './appleBackend';
import { buildMessages } from './prompt';
import { RECEIPT_SCHEMA, sanitizeLlmReceipt } from './schema';
import type { ChainHint, LlmReceipt } from './types';

const logger = createScopedLogger('Llm');
const TIMEOUT_MS = 15000;

export type { ChainHint, LlmReceipt } from './types';
export { mergeParsedReceipts, voteTotal } from './merge';
export type { MergeOutcome, MergeResult } from './merge';

export function isLlmAvailable(): boolean {
  return isBackendAvailable();
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      logger.warn('Generation timed out');
      resolve(null);
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        logger.warn('Generation rejected:', error);
        resolve(null);
      });
  });
}

/**
 * Structures raw OCR lines with the on-device model.
 * Never throws: returns null whenever the result cannot be trusted.
 */
export async function structureReceipt(
  lines: string[],
  hint?: ChainHint
): Promise<LlmReceipt | null> {
  if (!isBackendAvailable()) return null;

  const raw = await withTimeout(
    generateStructured(buildMessages(lines, hint), RECEIPT_SCHEMA),
    TIMEOUT_MS
  );

  if (raw === null) return null;

  const sanitized = sanitizeLlmReceipt(raw);
  if (sanitized === null) {
    logger.warn('Model output failed sanitization');
  }
  return sanitized;
}
```

- [ ] **Step 5: Ejecutar los tests**

Run: `npx jest src/services/llm/`
Expected: PASS, todos los ficheros de la capa.

- [ ] **Step 6: Verificar tipos y formato**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/services/llm/
git commit -m "feat: add LLM orchestration with timeout and prompt builder"
```

---

### Task 7: Disparo y decisión de refinado

**Files:**

- Create: `src/services/llm/trigger.ts`
- Create: `src/services/llm/__tests__/trigger.test.ts`

**Interfaces:**

- Consumes: `validateReceipt` de `src/services/ocr/parser`, `MergeOutcome` de `./merge`.
- Produces:
  - `shouldRefine(receipt: ParsedReceipt): boolean`
  - `type RefinementDecision = 'apply' | 'propose' | 'discard'`
  - `decideOutcome(outcome: MergeOutcome, hasUserEdited: boolean): RefinementDecision`

- [ ] **Step 1: Escribir el test que falla**

Crea `src/services/llm/__tests__/trigger.test.ts`:

```ts
import { shouldRefine, decideOutcome } from '../trigger';
import type { ParsedReceipt } from '../../ocr/parser';

function receipt(overrides: Partial<ParsedReceipt> = {}): ParsedReceipt {
  return {
    storeName: 'Mercadona',
    storeAddress: null,
    date: new Date('2026-03-10'),
    time: '18:45',
    dateString: '10/03/2026',
    items: [
      { name: 'Leche', quantity: 1, unitPrice: 0.98, totalPrice: 0.98, unit: null, confidence: 80 },
    ],
    subtotal: null,
    tax: null,
    discount: null,
    total: 0.98,
    paymentMethod: 'card',
    rawText: '',
    confidence: 85,
    ...overrides,
  };
}

describe('shouldRefine', () => {
  it('does not fire on a clean, confident parse', () => {
    expect(shouldRefine(receipt())).toBe(false);
  });

  it('fires when there are no items', () => {
    expect(shouldRefine(receipt({ items: [] }))).toBe(true);
  });

  it('fires when the items sum does not match the total', () => {
    expect(shouldRefine(receipt({ total: 50 }))).toBe(true);
  });

  it('fires on low confidence even when the sum matches', () => {
    expect(shouldRefine(receipt({ confidence: 55 }))).toBe(true);
  });
});

describe('decideOutcome', () => {
  it('applies an auto outcome when the user has not edited', () => {
    expect(decideOutcome('auto', false)).toBe('apply');
  });

  it('degrades an auto outcome to a proposal once the user has edited', () => {
    expect(decideOutcome('auto', true)).toBe('propose');
  });

  it('keeps a proposal as a proposal', () => {
    expect(decideOutcome('proposal', false)).toBe('propose');
    expect(decideOutcome('proposal', true)).toBe('propose');
  });

  it('discards a none outcome', () => {
    expect(decideOutcome('none', false)).toBe('discard');
    expect(decideOutcome('none', true)).toBe('discard');
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `npx jest src/services/llm/__tests__/trigger.test.ts`
Expected: FAIL — `Cannot find module '../trigger'`

- [ ] **Step 3: Implementar**

Crea `src/services/llm/trigger.ts`:

```ts
import { validateReceipt, type ParsedReceipt } from '../ocr/parser';
import type { MergeOutcome } from './merge';

const MIN_CONFIDENCE = 70;

export type RefinementDecision = 'apply' | 'propose' | 'discard';

/**
 * Deliberately generous: a false positive only costs battery, whereas the
 * strictness that protects the data lives in mergeParsedReceipts.
 */
export function shouldRefine(receipt: ParsedReceipt): boolean {
  if (receipt.items.length === 0) return true;
  if (receipt.confidence < MIN_CONFIDENCE) return true;
  return !validateReceipt(receipt).itemsSumMatchesTotal;
}

/**
 * The user's own edits always win: once they have touched the receipt,
 * nothing is applied without their confirmation.
 */
export function decideOutcome(outcome: MergeOutcome, hasUserEdited: boolean): RefinementDecision {
  if (outcome === 'none') return 'discard';
  if (outcome === 'auto' && !hasUserEdited) return 'apply';
  return 'propose';
}
```

- [ ] **Step 4: Ejecutar los tests**

Run: `npx jest src/services/llm/__tests__/trigger.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/llm/trigger.ts src/services/llm/__tests__/trigger.test.ts
git commit -m "feat: add refinement trigger and outcome decision"
```

---

### Task 8: Preferencia de usuario

**Files:**

- Modify: `src/store/preferences.ts`
- Modify: `app/settings.tsx`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/es.json`

**Interfaces:**

- Consumes: `isLlmAvailable()` de `@/src/services/llm`.
- Produces: `llmRefinementEnabled: boolean` y `setLlmRefinementEnabled(enabled: boolean): void` en el store de preferencias.

- [ ] **Step 1: Añadir el campo al store**

En `src/store/preferences.ts`, dentro de `interface PreferencesState`, añade tras `hasCompletedOnboarding`:

```ts
llmRefinementEnabled: boolean;
```

y en el bloque de acciones, tras `setColorScheme`:

```ts
  setLlmRefinementEnabled: (enabled: boolean) => void;
```

- [ ] **Step 2: Implementar el valor por defecto y la acción**

En el objeto que crea el store, añade el estado inicial `llmRefinementEnabled: true` junto a `hasCompletedOnboarding`, y la acción:

```ts
      setLlmRefinementEnabled: (enabled: boolean) => set({ llmRefinementEnabled: enabled }),
```

- [ ] **Step 3: Añadir las traducciones**

En `src/i18n/locales/en.json`, dentro del objeto `settings`:

```json
"llmRefinement": "Smart reading",
"llmRefinementDescription": "Use on-device AI to improve receipts the scanner reads poorly. Nothing leaves your phone."
```

En `src/i18n/locales/es.json`, en el mismo sitio:

```json
"llmRefinement": "Lectura inteligente",
"llmRefinementDescription": "Usa IA en el dispositivo para mejorar los tickets que el escáner lee mal. Nada sale de tu móvil."
```

- [ ] **Step 4: Añadir el toggle a la pantalla de ajustes**

`app/settings.tsx` no usa `Switch` todavía: la sección de apariencia (líneas ~186-220) usa un
control segmentado de `Pressable`. Para un booleano, `Switch` es el control idiomático, así que se
introduce aquí. Añade a los imports de `react-native` el símbolo `Switch`, y añade:

```ts
import { isLlmAvailable } from '@/src/services/llm';
```

En el cuerpo del componente, junto al resto de lecturas del store:

```tsx
const llmRefinementEnabled = usePreferencesStore((state) => state.llmRefinementEnabled);
const setLlmRefinementEnabled = usePreferencesStore((state) => state.setLlmRefinementEnabled);
const llmSupported = isLlmAvailable();
```

Y en el JSX, justo después del bloque cerrado de "Appearance":

```tsx
{
  llmSupported && (
    <View className="mb-3 flex-row items-center justify-between">
      <View className="flex-1 pr-3">
        <Text style={{ color: colors.text, fontFamily: 'Inter_500Medium', fontSize: 15 }}>
          {t('settings.llmRefinement')}
        </Text>
        <Text
          className="mt-1"
          style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 13 }}
        >
          {t('settings.llmRefinementDescription')}
        </Text>
      </View>
      <Switch
        value={llmRefinementEnabled}
        onValueChange={setLlmRefinementEnabled}
        trackColor={{ true: colors.primary, false: colors.border }}
        accessibilityLabel={t('settings.llmRefinement')}
      />
    </View>
  );
}
```

- [ ] **Step 5: Verificar**

Run: `npx tsc --noEmit && npm test`
Expected: sin errores, todos los tests pasan.

- [ ] **Step 6: Commit**

```bash
git add src/store/preferences.ts app/settings.tsx src/i18n/locales/
git commit -m "feat: add smart reading preference toggle"
```

---

### Task 9: Hook de refinado

**Files:**

- Create: `src/hooks/useLlmRefinement.ts`

**Interfaces:**

- Consumes: `structureReceipt`, `isLlmAvailable`, `mergeParsedReceipts` de `@/src/services/llm`; `shouldRefine`, `decideOutcome` de `@/src/services/llm/trigger`; `usePreferencesStore`.
- Produces:

```ts
type RefinementStatus = 'idle' | 'running' | 'applied' | 'proposed';

interface LlmRefinement {
  status: RefinementStatus;
  proposal: ParsedReceipt | null;
  acceptProposal: () => void;
  dismissProposal: () => void;
  undoApplied: () => void;
}

useLlmRefinement(params: {
  initial: ParsedReceipt | null;
  lines: string[];
  detectedTotal: number | null;
  hasUserEdited: boolean;
  onApply: (receipt: ParsedReceipt) => void;
}): LlmRefinement
```

El hook es glue deliberadamente fino: toda la lógica decidible vive en las funciones puras ya testeadas de las Tasks 2-7. No se testea unitariamente porque el proyecto no tiene librería de testing de componentes; se cubre en la checklist manual de la Task 12.

- [ ] **Step 1: Implementar el hook**

Crea `src/hooks/useLlmRefinement.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { isLlmAvailable, mergeParsedReceipts, structureReceipt } from '@/src/services/llm';
import { decideOutcome, shouldRefine } from '@/src/services/llm/trigger';
import type { ParsedReceipt } from '@/src/services/ocr/parser';
import { usePreferencesStore } from '@/src/store/preferences';
import { createScopedLogger } from '@/src/utils/debug';

const logger = createScopedLogger('LlmRefinement');

export type RefinementStatus = 'idle' | 'running' | 'applied' | 'proposed';

export interface LlmRefinement {
  status: RefinementStatus;
  proposal: ParsedReceipt | null;
  acceptProposal: () => void;
  dismissProposal: () => void;
  undoApplied: () => void;
}

interface Params {
  initial: ParsedReceipt | null;
  lines: string[];
  detectedTotal: number | null;
  hasUserEdited: boolean;
  onApply: (receipt: ParsedReceipt) => void;
}

export function useLlmRefinement({
  initial,
  lines,
  detectedTotal,
  hasUserEdited,
  onApply,
}: Params): LlmRefinement {
  const enabled = usePreferencesStore((state) => state.llmRefinementEnabled);
  const [status, setStatus] = useState<RefinementStatus>('idle');
  const [proposal, setProposal] = useState<ParsedReceipt | null>(null);

  const hasRun = useRef(false);
  const editedRef = useRef(hasUserEdited);

  useEffect(() => {
    editedRef.current = hasUserEdited;
  }, [hasUserEdited]);

  useEffect(() => {
    if (hasRun.current) return;
    if (!enabled || !initial || !isLlmAvailable()) return;
    if (!shouldRefine(initial)) return;

    hasRun.current = true;
    let ignored = false;
    setStatus('running');

    const hint = initial.chainId
      ? { chainId: initial.chainId, chainName: initial.chainName || '', isColumnar: true }
      : undefined;

    structureReceipt(lines, hint)
      .then((llmResult) => {
        if (ignored) return;
        if (!llmResult) {
          setStatus('idle');
          return;
        }

        const { merged, outcome } = mergeParsedReceipts(initial, llmResult, lines, detectedTotal);
        const decision = decideOutcome(outcome, editedRef.current);
        logger.log('Refinement decision:', decision);

        if (decision === 'apply') {
          onApply(merged);
          setStatus('applied');
        } else if (decision === 'propose') {
          setProposal(merged);
          setStatus('proposed');
        } else {
          setStatus('idle');
        }
      })
      .catch((error) => {
        logger.warn('Refinement failed:', error);
        if (!ignored) setStatus('idle');
      });

    return () => {
      ignored = true;
    };
  }, [enabled, initial, lines, detectedTotal, onApply]);

  const acceptProposal = useCallback(() => {
    if (!proposal) return;
    onApply(proposal);
    setProposal(null);
    setStatus('applied');
  }, [proposal, onApply]);

  const dismissProposal = useCallback(() => {
    setProposal(null);
    setStatus('idle');
  }, []);

  const undoApplied = useCallback(() => {
    if (initial) onApply(initial);
    setStatus('idle');
  }, [initial, onApply]);

  return { status, proposal, acceptProposal, dismissProposal, undoApplied };
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useLlmRefinement.ts
git commit -m "feat: add LLM refinement hook"
```

---

### Task 10: Integración en la pantalla de revisión

**Files:**

- Create: `src/components/scan/RefinementBanner.tsx`
- Modify: `app/scan/review.tsx`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/es.json`

**Interfaces:**

- Consumes: `useLlmRefinement` y su tipo `RefinementStatus`.
- Produces: componente `RefinementBanner`.

- [ ] **Step 1: Añadir las traducciones**

En `src/i18n/locales/en.json`, dentro del objeto `scan`:

```json
"refinementRunning": "Improving reading…",
"refinementApplied": "Reading improved",
"refinementUndo": "Undo",
"refinementProposed": "Another reading is possible",
"refinementCompare": "Compare",
"refinementAccept": "Use it",
"refinementDismiss": "Dismiss"
```

En `src/i18n/locales/es.json`:

```json
"refinementRunning": "Mejorando la lectura…",
"refinementApplied": "Lectura mejorada",
"refinementUndo": "Deshacer",
"refinementProposed": "Hay otra lectura posible",
"refinementCompare": "Comparar",
"refinementAccept": "Usarla",
"refinementDismiss": "Descartar"
```

- [ ] **Step 2: Crear el banner**

Crea `src/components/scan/RefinementBanner.tsx`:

```tsx
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '@/src/hooks/useAppColors';
import type { RefinementStatus } from '@/src/hooks/useLlmRefinement';

interface Props {
  status: RefinementStatus;
  onUndo: () => void;
  onAccept: () => void;
  onDismiss: () => void;
}

export function RefinementBanner({ status, onUndo, onAccept, onDismiss }: Props) {
  const { t } = useTranslation();
  const colors = useAppColors();

  if (status === 'idle') return null;

  if (status === 'running') {
    return (
      <View className="flex-row items-center gap-2 px-4 py-2">
        <ActivityIndicator size="small" color={colors.textSecondary} />
        <Text
          className="text-sm"
          style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
        >
          {t('scan.refinementRunning')}
        </Text>
      </View>
    );
  }

  const isApplied = status === 'applied';

  return (
    <View
      className="mx-4 my-2 flex-row items-center justify-between rounded-xl px-3 py-2"
      style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }}
    >
      <View className="flex-1 flex-row items-center gap-2">
        <Ionicons
          name={isApplied ? 'sparkles' : 'git-compare-outline'}
          size={16}
          color={colors.primary}
        />
        <Text className="text-sm" style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}>
          {isApplied ? t('scan.refinementApplied') : t('scan.refinementProposed')}
        </Text>
      </View>

      {isApplied ? (
        <Pressable onPress={onUndo} hitSlop={8}>
          <Text
            className="text-sm"
            style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}
          >
            {t('scan.refinementUndo')}
          </Text>
        </Pressable>
      ) : (
        <View className="flex-row gap-3">
          <Pressable onPress={onDismiss} hitSlop={8}>
            <Text
              className="text-sm"
              style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}
            >
              {t('scan.refinementDismiss')}
            </Text>
          </Pressable>
          <Pressable onPress={onAccept} hitSlop={8}>
            <Text
              className="text-sm"
              style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}
            >
              {t('scan.refinementAccept')}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 3: Rastrear la edición del usuario en review.tsx**

En `app/scan/review.tsx`, junto a la declaración de `parsedData`, añade:

```tsx
const [hasUserEdited, setHasUserEdited] = useState(false);
```

Añade `setHasUserEdited(true)` inmediatamente después de **estos ocho** `setParsedData(...)`, que
son los que responden a una acción del usuario. Las líneas son las del fichero antes de tus cambios,
así que trabaja de abajo arriba para que no se desplacen:

| Línea | Función                     | Acción del usuario                            |
| ----- | --------------------------- | --------------------------------------------- |
| 671   | `handleDeleteTemplate`      | Borra la plantilla y fuerza reparseo genérico |
| 627   | guardado de `ItemEditModal` | Añade un item                                 |
| 622   | guardado de `ItemEditModal` | Edita un item existente                       |
| 580   | `setTotalToItemsSum`        | Iguala el total a la suma                     |
| 571   | `saveTotalEdit`             | Edita el total                                |
| 555   | `saveDateEdit`              | Edita fecha y hora                            |
| 535   | `saveStoreEdit`             | Edita el nombre de la tienda                  |
| 522   | `handleRemoveItem`          | Borra un item                                 |

**No** lo añadas en las líneas 316 ni 358: son aplicaciones automáticas de plantilla, no ediciones
del usuario.

- [ ] **Step 4: Conectar el hook**

En `app/scan/review.tsx`, importa:

```tsx
import { useLlmRefinement } from '@/src/hooks/useLlmRefinement';
import { RefinementBanner } from '@/src/components/scan/RefinementBanner';
```

y tras la declaración de `hasUserEdited`:

```tsx
const applyRefinement = useCallback((receipt: ParsedReceipt) => {
  setParsedData(receipt);
}, []);

const refinement = useLlmRefinement({
  initial: initialParsedData,
  lines,
  detectedTotal,
  hasUserEdited,
  onApply: applyRefinement,
});
```

- [ ] **Step 5: Renderizar el banner**

Justo encima de la lista de items en el JSX de `review.tsx`:

```tsx
<RefinementBanner
  status={refinement.status}
  onUndo={refinement.undoApplied}
  onAccept={refinement.acceptProposal}
  onDismiss={refinement.dismissProposal}
/>
```

- [ ] **Step 6: Verificar**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: sin errores; los tests de `src/services/ocr/__tests__/` siguen pasando sin cambios.

- [ ] **Step 7: Commit**

```bash
git add app/scan/review.tsx src/components/scan/RefinementBanner.tsx src/i18n/locales/
git commit -m "feat: wire LLM refinement into the review screen"
```

---

### Task 11: Modal de comparación

**Files:**

- Create: `src/components/scan/modals/ProposalDiffModal.tsx`
- Modify: `src/components/scan/RefinementBanner.tsx`
- Modify: `app/scan/review.tsx`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/es.json`

**Interfaces:**

- Consumes: `ParsedReceipt` de `@/src/services/ocr/parser`, `formatPrice` de `usePreferencesStore`.
- Produces: componente `ProposalDiffModal`.

Sin esta pantalla el usuario no puede juzgar una propuesta, y todo el criterio de aceptación del
spec descansa en que el juez sea él cuando la aritmética no puede serlo. El banner por sí solo
pediría aceptar a ciegas.

- [ ] **Step 1: Añadir las traducciones**

En `src/i18n/locales/en.json`, dentro del objeto `scan`:

```json
"refinementCompareTitle": "Compare readings",
"refinementCurrent": "Current",
"refinementProposedReading": "Proposed",
"refinementItemsCount_one": "{{count}} item",
"refinementItemsCount_other": "{{count}} items"
```

En `src/i18n/locales/es.json`:

```json
"refinementCompareTitle": "Comparar lecturas",
"refinementCurrent": "Actual",
"refinementProposedReading": "Propuesta",
"refinementItemsCount_one": "{{count}} producto",
"refinementItemsCount_other": "{{count}} productos"
```

- [ ] **Step 2: Crear el modal**

Crea `src/components/scan/modals/ProposalDiffModal.tsx`:

```tsx
import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppColors } from '@/src/hooks/useAppColors';
import { usePreferencesStore } from '@/src/store/preferences';
import { Button } from '@/src/components/ui/Button';
import type { ParsedReceipt } from '@/src/services/ocr/parser';

interface Props {
  visible: boolean;
  current: ParsedReceipt | null;
  proposed: ParsedReceipt | null;
  onAccept: () => void;
  onDismiss: () => void;
}

function Column({ receipt, title }: { receipt: ParsedReceipt; title: string }) {
  const { t } = useTranslation();
  const colors = useAppColors();
  const formatPrice = usePreferencesStore((state) => state.formatPrice);

  return (
    <View className="flex-1">
      <Text
        className="mb-2"
        style={{ color: colors.textSecondary, fontFamily: 'Inter_600SemiBold', fontSize: 12 }}
      >
        {title}
      </Text>
      <Text
        className="mb-2"
        style={{ color: colors.text, fontFamily: 'Inter_500Medium', fontSize: 13 }}
      >
        {t('scan.refinementItemsCount', { count: receipt.items.length })}
      </Text>
      {receipt.items.map((item, index) => (
        <View key={`${item.name}-${index}`} className="mb-1 flex-row justify-between gap-2">
          <Text
            className="flex-1"
            numberOfLines={1}
            style={{ color: colors.text, fontFamily: 'Inter_400Regular', fontSize: 12 }}
          >
            {item.name}
          </Text>
          <Text style={{ color: colors.text, fontFamily: 'Inter_500Medium', fontSize: 12 }}>
            {formatPrice(item.totalPrice)}
          </Text>
        </View>
      ))}
      <View className="mt-2 border-t pt-2" style={{ borderColor: colors.border }}>
        <Text style={{ color: colors.text, fontFamily: 'Inter_700Bold', fontSize: 13 }}>
          {formatPrice(receipt.total)}
        </Text>
      </View>
    </View>
  );
}

export function ProposalDiffModal({ visible, current, proposed, onAccept, onDismiss }: Props) {
  const { t } = useTranslation();
  const colors = useAppColors();
  const insets = useSafeAreaInsets();

  if (!current || !proposed) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View className="flex-1 justify-end" style={{ backgroundColor: '#00000080' }}>
        <View
          className="rounded-t-3xl px-4 pt-4"
          style={{ backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }}
        >
          <Text
            className="mb-4"
            style={{ color: colors.text, fontFamily: 'Inter_600SemiBold', fontSize: 17 }}
          >
            {t('scan.refinementCompareTitle')}
          </Text>

          <ScrollView className="max-h-96">
            <View className="flex-row gap-4">
              <Column receipt={current} title={t('scan.refinementCurrent')} />
              <Column receipt={proposed} title={t('scan.refinementProposedReading')} />
            </View>
          </ScrollView>

          <View className="mt-4 flex-row gap-3">
            <View className="flex-1">
              <Button variant="ghost" onPress={onDismiss}>
                {t('scan.refinementDismiss')}
              </Button>
            </View>
            <View className="flex-1">
              <Button variant="primary" onPress={onAccept}>
                {t('scan.refinementAccept')}
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

La firma de `Button` ya está verificada: acepta `children`, tal y como se usa arriba.

- [ ] **Step 3: Cambiar el banner para abrir el modal**

En `src/components/scan/RefinementBanner.tsx`, sustituye la prop `onAccept` por `onCompare` en el
caso de propuesta, de modo que el botón principal pase a ser "Comparar":

```tsx
interface Props {
  status: RefinementStatus;
  onUndo: () => void;
  onCompare: () => void;
  onDismiss: () => void;
}
```

y en el bloque de propuesta cambia el `Pressable` de aceptar por:

```tsx
<Pressable onPress={onCompare} hitSlop={8}>
  <Text className="text-sm" style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>
    {t('scan.refinementCompare')}
  </Text>
</Pressable>
```

- [ ] **Step 4: Conectar en review.tsx**

Importa el modal y añade el estado de visibilidad:

```tsx
import { ProposalDiffModal } from '@/src/components/scan/modals/ProposalDiffModal';
```

```tsx
const [showDiffModal, setShowDiffModal] = useState(false);
```

Cambia la prop del banner a `onCompare={() => setShowDiffModal(true)}` y renderiza el modal junto al
resto de modales de la pantalla:

```tsx
<ProposalDiffModal
  visible={showDiffModal}
  current={parsedData}
  proposed={refinement.proposal}
  onAccept={() => {
    refinement.acceptProposal();
    setShowDiffModal(false);
  }}
  onDismiss={() => {
    refinement.dismissProposal();
    setShowDiffModal(false);
  }}
/>
```

- [ ] **Step 5: Verificar**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/components/scan/ app/scan/review.tsx src/i18n/locales/
git commit -m "feat: add reading comparison modal for LLM proposals"
```

---

### Task 12: Registro en parsingFeedback y verificación en dispositivo

**Files:**

- Modify: `src/db/schema/parsingFeedback.ts`
- Create: `src/db/queries/parsingFeedback.ts`
- Modify: `src/hooks/useLlmRefinement.ts`

**Interfaces:**

- Consumes: tabla `parsingFeedback`.
- Produces: `recordLlmFeedback(params: { accepted: boolean; ocrContext: string; originalValue: string; correctedValue: string; originalConfidence: number }): Promise<void>`

- [ ] **Step 1: Ampliar el tipo de feedback**

En `src/db/schema/parsingFeedback.ts`, añade dos miembros a `FeedbackFieldType`:

```ts
  | 'llm_accepted'
  | 'llm_rejected';
```

No hace falta migración: `fieldType` es una columna `text` tipada solo en TypeScript.

- [ ] **Step 2: Crear la query**

Crea `src/db/queries/parsingFeedback.ts`:

```ts
import { db } from '../client';
import { parsingFeedback } from '../schema';

export async function recordLlmFeedback(params: {
  accepted: boolean;
  ocrContext: string;
  originalValue: string;
  correctedValue: string;
  originalConfidence: number;
}): Promise<void> {
  await db.insert(parsingFeedback).values({
    fieldType: params.accepted ? 'llm_accepted' : 'llm_rejected',
    ocrContext: params.ocrContext,
    originalValue: params.originalValue,
    correctedValue: params.correctedValue,
    originalConfidence: params.originalConfidence,
  });
}
```

- [ ] **Step 3: Registrar desde el hook**

En `src/hooks/useLlmRefinement.ts` importa:

```ts
import { recordLlmFeedback } from '@/src/db/queries/parsingFeedback';
```

Añade este helper dentro del hook, antes de `acceptProposal`:

```ts
const logFeedback = useCallback(
  (accepted: boolean, candidate: ParsedReceipt) => {
    if (!initial) return;
    recordLlmFeedback({
      accepted,
      ocrContext: initial.rawText,
      originalValue: JSON.stringify(initial.items),
      correctedValue: JSON.stringify(candidate.items),
      originalConfidence: initial.confidence,
    }).catch((error) => logger.warn('Feedback failed:', error));
  },
  [initial]
);
```

Y reemplaza los dos callbacks existentes por:

```ts
const acceptProposal = useCallback(() => {
  if (!proposal) return;
  logFeedback(true, proposal);
  onApply(proposal);
  setProposal(null);
  setStatus('applied');
}, [proposal, onApply, logFeedback]);

const dismissProposal = useCallback(() => {
  if (proposal) logFeedback(false, proposal);
  setProposal(null);
  setStatus('idle');
}, [proposal, logFeedback]);
```

El `.catch` no es opcional: un fallo al escribir feedback nunca debe romper la interacción del
usuario.

- [ ] **Step 4: Verificación completa en CI**

Run: `npx tsc --noEmit && npm run lint && npm run format:check && npm test`
Expected: todo en verde.

- [ ] **Step 5: Compilar el dev build**

```bash
npx expo prebuild --clean
npx expo run:ios
```

Expected: compila. `@react-native-ai/apple` entra por autolinking; no necesita config plugin.

- [ ] **Step 6: Checklist manual en dispositivo**

Verifica y anota el resultado de cada punto:

- [ ] iPhone con Apple Intelligence: escanea un ticket que hoy se parsea mal. El banner aparece; si el resultado cuadra se aplica solo, si no aparece como propuesta.
- [ ] Deshacer restaura exactamente la lectura original.
- [ ] Edita un item mientras corre el refinado: no se sobrescribe tu edición, aparece como propuesta.
- [ ] Un ticket de Mercadona limpio y cuadrado **no** dispara el refinado (comprobable por los logs de `LlmRefinement`).
- [ ] iPhone con iOS 26 sin Apple Intelligence: la app funciona igual que antes y el toggle no aparece en ajustes.
- [ ] Android: no-op absoluto, sin errores en consola.
- [ ] Modo oscuro: el banner se lee correctamente.
- [ ] Cambia el idioma del dispositivo a inglés: todos los textos del banner traducidos.

- [ ] **Step 7: Commit**

```bash
git add src/db/schema/parsingFeedback.ts src/db/queries/parsingFeedback.ts src/hooks/useLlmRefinement.ts
git commit -m "feat: record LLM refinement feedback for future evaluation"
```

---

## Criterios de terminado

1. En un dispositivo sin soporte, la app se comporta igual que antes y ningún test existente cambió.
2. Un resultado del LLM que no reconcilia nunca se aplica sin confirmación del usuario.
3. Una edición del usuario nunca es sobrescrita por el refinado.
4. Un item cuyo precio no aparece en el texto OCR, o cuyo nombre no se ancla a su línea origen, nunca llega a guardarse.
5. `npx tsc --noEmit`, `npm run lint`, `npm run format:check` y `npm test` en verde.
6. Checklist manual de la Task 12 completada.
