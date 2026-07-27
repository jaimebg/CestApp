# LLM on-device para estructurar tickets

Fecha: 2026-07-27
Estado: aprobado, pendiente de plan de implementación

## Problema

El parser determinista se pierde estructurando tickets cuyo texto OCR **es correcto**. El fallo está
en la lógica de segmentación (separar nombre / cantidad / precio, alinear columnas), no en la
lectura. La categorización de items también falla, pero es secundaria.

Un LLM pequeño on-device es adecuado precisamente para esa tarea: reestructurar texto ya extraído.

## Decisiones

1. **El LLM es una capa aditiva, nunca el camino principal.** El pipeline actual sigue siendo el
   único que corre siempre. El LLM solo interviene cuando el determinista falla, y su resultado se
   somete a validación externa antes de aplicarse.

2. **Librería: `@react-native-ai/apple` v0.12.0** (Callstack). Se evaluó y descartó
   `react-native-apple-llm` v1.0.16: su conversor de esquemas no soporta arrays
   (`ios/AppleLLMModule.swift:194`, `// TODO: handle array?`), y un ticket es una lista de items.
   `@react-native-ai/apple` implementa JSON Schema completo (`arrayOf:`, `required`, `enum`,
   `anyOf`), lanza errores tipados en vez de `try!`, es TurboModule (Nueva Arquitectura, ya activa
   en el proyecto), peer `react-native >=0.76` frente a nuestro 0.83.4, y tiene 75.370
   descargas/mes frente a 1.707.

3. **iOS-first.** Apple Foundation Models requiere iOS 26 y un dispositivo con Apple Intelligence.
   En Android, Gemini Nano cubre una lista muy corta de dispositivos y no expone salida estructurada
   equivalente: queda fuera de alcance. En cualquier dispositivo no soportado la feature es un no-op
   completo.

4. **El juez de aceptación es asimétrico.** Ver "Criterio de aceptación".

5. **Se descarta `react-native-executorch`**: implica empaquetar o descargar cientos de MB de modelo,
   desproporcionado para esta app.

## Alcance

Dentro:

- Reestructuración de items, total, tienda, fecha y hora cuando el parser determinista falla.
- Aplicación automática solo bajo reconciliación aritmética exacta; propuesta al usuario en el resto.
- Registro de aceptaciones y descartes en `parsingFeedback`.

Fuera:

- Android / Gemini Nano.
- Categorización de items por LLM (el problema secundario; se aborda por separado si procede).
- Backend en la nube. La costura queda preparada para ello, pero no se implementa.
- Sustituir o modificar `parseReceipt()`, `parseWithTemplate()` o `parseWithSpatialCorrelation()`.

## Criterio de aceptación

`validateReceipt()` (`src/services/ocr/parser.ts:1007`) **no sirve** como juez: compara con 5% de
tolerancia y no resta `receipt.discount`, solo ensancha el margen hasta que quepa
(ver el comentario en la línea 1024). Consecuencias medidas:

- Un ticket con descuento (ClubDia, promociones Carrefour) parseado perfectamente se marca como
  "no cuadra".
- En un ticket de 80 €, el 5% son 4 € de holgura: se puede perder un item de 3 € y "cuadrar".

Por tanto el desajuste **no es evidencia de nada**. El ajuste exacto sí lo es. Se define en
`merge.ts` una ecuación propia, independiente de `validateReceipt`, que no se modifica:

```
reconcilia  ⟺  |Σ items − descuento − total| ≤ max(0,02 €, 0,5%)
```

- **Reconcilia exacto y no pierde items** → se aplica automáticamente.
- **Cualquier otro caso** → nunca se aplica solo; se ofrece como propuesta y decide el usuario.

La segunda condición existe porque cuadrar la suma no siempre prueba nada. Un item inventado cuyo
precio sea el total hace que "la suma de los items iguala el total" sea la misma cifra comparada
consigo misma: reconcilia siempre, por construcción. Excluir del anclaje las líneas de resumen
(`TOTAL`, `IMPORTE`, `ENTREGADO`…) ayuda, pero una lista de palabras clave nunca estará completa. Por
eso la regla de respaldo no depende de vocabulario: **un auto-aplicado nunca puede devolver menos
items de los que encontró el parser determinista.** Si los reduce, por bien que cuadre, es propuesta.

Peor caso de un modelo que alucine: un ticket idéntico al que se habría guardado hoy.

## Arquitectura

```
src/services/llm/
  index.ts          API pública: isLlmAvailable(), structureReceipt()
  appleBackend.ts   Único fichero que importa @react-native-ai/apple
  prompt.ts         Construcción del prompt
  schema.ts         RECEIPT_SCHEMA + saneado de la salida a Partial<ParsedReceipt>
  merge.ts          Reconciliación, guardas anti-alucinación y política de fusión
  __tests__/        Tests unitarios, todos device-free
```

`appleBackend.ts` cumple el mismo papel que `src/services/ocr/index.ts`: aísla el motor para que
cambiarlo no toque el resto de la app.

### API pública

```ts
type ChainHint = { chainId: string; chainName: string; isColumnar: boolean };

isLlmAvailable(): boolean
structureReceipt(lines: string[], hint?: ChainHint): Promise<Partial<ParsedReceipt> | null>
```

`hint` se construye a partir de la detección de cadena que ya hace `detectChainFromLines()` y del
`layout` de la plantilla en `src/config/spanishChains.ts`. Sirve para que `prompt.ts` pueda decir al
modelo qué cadena es y si el formato es columnar. Es opcional: si no hay cadena detectada, se omite.

`structureReceipt` nunca lanza. Devuelve `null` ante cualquier problema. Devuelve `Partial` a
propósito: informa solo de lo que ha leído; `merge.ts` decide qué entra.

### Esquema de salida

```ts
const RECEIPT_SCHEMA = {
  type: 'object',
  properties: {
    storeName: { type: 'string' },
    date: { type: 'string', description: 'DD/MM/YYYY' },
    time: { type: 'string', description: 'HH:MM' },
    total: { type: 'number' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          quantity: { type: 'number' },
          unitPrice: { type: 'number' },
          totalPrice: { type: 'number' },
          unit: { type: 'string', enum: ['each', 'kg', 'g', 'l', 'ml'] },
        },
        required: ['name', 'totalPrice'],
      },
    },
  },
  required: ['items'],
};
```

El `enum` de `unit` mapea al union type de `ParsedItem` y se aplica durante la generación, no
después: el modelo no puede devolver otro valor.

### Llamada

Se usa el TurboModule crudo, no el provider del Vercel AI SDK: no necesitamos streaming, chat ni
tools, y añadir el paquete `ai` sería peso sin función.

```ts
import { AppleFoundationModels } from '@react-native-ai/apple';

AppleFoundationModels.isAvailable(); // boolean, síncrono
AppleFoundationModels.generateText(messages, { schema: RECEIPT_SCHEMA, temperature: 0 });
```

`temperature: 0` porque esto es extracción, no redacción.

## Integración

En `app/scan/review.tsx` los tres caminos de parseo (`parseWithTemplate`,
`parseWithSpatialCorrelation`, `parseReceipt`) convergen en un único `result` dentro del `useMemo`
de `initialParsedData`. Ese `useMemo` es **síncrono** y el LLM es asíncrono, así que la refinación
no puede vivir ahí.

Se añade un hook:

```ts
useLlmRefinement(initialParsedData, lines, hasUserEdited)
  → { status, proposal, accept, reject, undo }
```

que actualiza el estado `parsedData` ya existente. El `useMemo` no se toca, los tres caminos de
parseo no se tocan, `parseReceipt()` no se toca. La superficie de cambio en `review.tsx` es el hook
más un banner.

### Disparo

Solo si el resultado determinista presenta problema: cero items, o
`validateReceipt(result).itemsSumMatchesTotal === false`, o `result.confidence < 70` (el campo de
`ParsedReceipt`, no el de `ReceiptValidation`). Un ticket de Mercadona detectado por NIF con la suma
cuadrada nunca invoca el modelo. El disparo es deliberadamente generoso porque equivocarse ahí solo
cuesta batería; la estrictez está en la aplicación, no en el disparo.

### Sesión

Una sesión por refinado, liberada en el cleanup del hook. Nada de sesión global: el contexto de un
ticket no debe contaminar el siguiente.

## Fusión

| Campo                                   | Política                                                                                      |
| --------------------------------------- | --------------------------------------------------------------------------------------------- |
| `chainId`, `chainName`, `parsingMethod` | Siempre determinista. La detección por NIF da 98% de confianza.                               |
| `storeName`                             | Determinista si no es `null`; el LLM solo rellena hueco. Respeta el fix del commit `ac52bdb`. |
| `date`, `time`                          | Determinista si no es `null`; el LLM solo rellena hueco.                                      |
| `items`                                 | Único campo sustituible en bloque, y solo si reconcilia exacto.                               |
| `total`                                 | Voto entre parser, `detectedTotal` de `autoZoneDetector` y LLM. Ver reglas abajo.             |
| `subtotal`, `tax`, `discount`           | Solo rellenar huecos, nunca sustituir.                                                        |
| `paymentMethod`, `rawText`              | Nunca del LLM.                                                                                |
| `confidence`                            | Recalculado tras la fusión.                                                                   |

### Voto del total

`detectedTotal` puede ser `null`, así que el voto no siempre tiene tres fuentes:

- **Tres fuentes disponibles**: gana el valor que repitan al menos dos (comparando con tolerancia de
  0,01 €). Sin mayoría, se mantiene el del parser.
- **Dos fuentes** (`detectedTotal` es `null`): no hay voto posible. Se mantiene el del parser, salvo
  que el parser no tenga total, en cuyo caso entra el del LLM como relleno de hueco.
- **`total` del parser es `null`**: el del LLM rellena el hueco directamente.

Si tras la fusión el total sigue siendo `null`, el resultado no puede reconciliar y por tanto nunca
se aplica automáticamente: solo puede llegar al usuario como propuesta.

### Guardas anti-alucinación

Antes de evaluar la aritmética, cada item devuelto pasa dos filtros, ambos funciones puras sobre el
texto OCR original:

1. **El precio debe existir en el texto.** `totalPrice` debe aparecer como número en alguna línea de
   `lines`, aceptando coma o punto decimal. La línea que lo contiene es la _línea origen_ del item.
2. **El nombre debe anclarse a su línea origen.** Se exige que el nombre del item y su línea origen
   compartan al menos un token de 3 o más caracteres, comparando en forma normalizada (mayúsculas,
   sin acentos, sin signos de puntuación). El prefijo se comprueba **en una sola dirección**: el
   token del nombre debe empezar por el token de la línea. Una expansión legítima siempre alarga la
   abreviatura del ticket (`SEMI` → `SEMIDESNATADA`); permitir la dirección contraria dejaría que un
   nombre corto inventado se anclase a una palabra larga sin relación, como `SAL` a `SALSA`.

3. **Cada item se queda con una línea origen distinta.** Los tickets españoles repiten precios
   redondos con frecuencia (1,00 €, 0,50 €), así que anclar cada item a la primera línea que lleve
   su precio haría que dos productos distintos al mismo precio compitieran por la misma línea: el
   segundo no compartiría token y se descartaría como si fuera inventado. Las líneas ya reclamadas
   se excluyen de la búsqueda del siguiente item.

   El reparto va en dos pasadas: primero reclaman línea los items con coincidencia **exacta** de
   token, y solo después los que dependen de un prefijo. Sin ese orden, el reparto por orden de
   llegada puede dejar sin línea a un producto real: con `SAL` y `SALSA BRAVA` al mismo precio,
   "Salsa brava" reclamaría la línea de `SAL` por prefijo y "Sal" se quedaría sin ancla.

La segunda guarda está formulada por tokens y no por subcadena a propósito. Queremos que el modelo
expanda abreviaturas de marca blanca (`HAC LECHE SEMI 1L` → `Leche semidesnatada`), porque eso es
justo lo que mejora la categorización posterior. Una guarda por subcadena exacta rechazaría
precisamente esas mejoras. El anclaje por token permite reescribir el nombre pero no inventarlo de
la nada.

Un modelo pequeño que se despiste inventa productos plausibles de supermercado, que son los más
difíciles de detectar a ojo. Estas guardas los cortan sin depender del juicio del modelo.

## Errores

`structureReceipt()` nunca lanza. Devuelve `null` ante:

- Dispositivo no soportado (no llega ni a llamar).
- `modelUnavailable`, `generationError`, `invalidSchema`.
- Guardrails de Apple. Un ticket es contenido inocuo, pero los rechazos existen.
- Salida que no supera el saneado o las guardas.

**Timeout de 15 s.** `generateText` no expone cancelación en el módulo nativo (solo los streams la
tienen). El timeout por tanto no cancela: deja de esperar, marca el estado y descarta el resultado
tardío mediante un flag de ignorado. Sin esto, una llamada colgada dejaría la pantalla de revisión
en un limbo permanente.

## Condición de carrera

El refinado tarda segundos y el usuario está editando la pantalla de revisión mientras tanto.

**Si el usuario ha editado cualquier cosa desde que arrancó el refinado, no se aplica nada
automáticamente**; como mucho se degrada a propuesta. El trabajo del usuario siempre gana. De ahí el
parámetro `hasUserEdited` del hook.

## UX

- **Mientras corre**: indicador discreto en la cabecera de items. Nada bloqueante; la pantalla sigue
  siendo usable y editable.
- **Sin mejora**: silencio total. Nada de "la IA no encontró mejoras": es ruido que entrena al
  usuario a ignorar la interfaz.
- **Aplicado** (reconcilia exacto): badge descartable "Lectura mejorada" con acción **Deshacer**,
  que restaura `initialParsedData`.
- **Propuesta** (no reconcilia): banner "Hay otra lectura posible — Comparar" que abre un diff. El
  usuario acepta o descarta. Nunca cambia solo.

Todos los textos en `src/i18n/locales/en.json` y `es.json`. Ningún string hardcodeado.

**Toggle en settings**: por defecto activado, oculto por completo en dispositivos sin soporte.

## Corpus

Cada aceptación o descarte de una propuesta se registra en la tabla `parsingFeedback` ya existente,
con el texto OCR y ambas lecturas. Sin trabajo adicional, esto acumula el set de evaluación
etiquetado que hoy no existe.

## Testing

`jest.config.js` usa `testMatch: ['**/__tests__/**/*.test.ts']` y el CI corre en `ubuntu-latest`, así
que todo lo testeable debe ser device-free. En `src/services/llm/__tests__/`, con
`jest.mock('@react-native-ai/apple')`:

- `reconciles()`: descuento restado, redondeo de productos por peso, ticket de 0,00 €, límites exactos
  de la tolerancia.
- Guardas anti-alucinación: item inventado, precio inventado, diferencias de acentos y mayúsculas y
  —el caso que más importa— un nombre legítimamente expandido (`HAC LECHE SEMI 1L` →
  `Leche semidesnatada`), que **no** debe rechazarse.
- `mergeParsedReceipts()`: la tabla de políticas de arriba traducida a tabla de tests.
- Voto del total: mayoría a tres, empate, `detectedTotal` nulo, total del parser nulo.
- `structureReceipt()` completo contra el módulo mockeado: salida bien formada, salida basura,
  promesa que nunca resuelve, módulo que lanza.

**No testeable en CI**: la llamada nativa real y la calidad del modelo. Requiere prueba manual en
dispositivo. Checklist: iPhone con Apple Intelligence, iPhone con iOS 26 sin Apple Intelligence, iOS
anterior a 26, y Android (no-op absoluto).

**Test de regresión principal**: con el LLM no disponible, la app debe comportarse exactamente igual
que hoy. Los tests de `src/services/ocr/__tests__/` no se modifican y deben seguir pasando. Si hay
que cambiar alguno, el diseño se ha roto.

## Riesgos asumidos

- **Cobertura de dispositivos.** Solo iPhone 15 Pro en adelante con iOS 26. Es una minoría de la base
  de usuarios y el techo de valor de la feature. Aceptado: la feature es puramente aditiva.
- **Sin corpus previo.** No se puede saber de antemano si el modelo mejora el parsing. Mitigado por el
  criterio de aceptación aritmético y por la acumulación en `parsingFeedback`.
- **Dependencias transitivas.** `@react-native-ai/apple` arrastra `zod@^4.2.1` y `@ai-sdk/provider`.
  Aunque no se importe el camino del AI SDK, el tree-shaking de Metro es limitado: asumir que zod
  entra en el bundle.
- **Pérdida de granularidad en disponibilidad.** `isAvailable()` devuelve un `boolean` y no distingue
  "dispositivo incapaz" de "Apple Intelligence desactivado". No se podrá guiar al usuario a Ajustes.
  Apple sí expone el motivo; el wrapper lo colapsa. Contribuible aguas arriba si molesta.
- **Dev build obligatorio.** Ya lo es por ML Kit, así que no añade fricción nueva.

## Criterios de terminado

1. En un dispositivo sin soporte, la app se comporta byte a byte como antes y ningún test existente
   cambia.
2. Un resultado del LLM que no reconcilia nunca se aplica sin confirmación del usuario.
3. Una edición del usuario nunca es sobrescrita por el refinado.
4. Un item cuyo nombre o precio no aparece en el texto OCR nunca llega a guardarse.
5. `npx tsc --noEmit`, `npm run lint`, `npm run format:check` y `npm test` en verde.
