# Claude Guidelines for CestApp

This document provides instructions for Claude when working on the CestApp project.

## Project Overview

CestApp is a **Spain-focused** supermarket receipt scanner app built with React Native and Expo. It uses on-device ML Kit OCR to extract data from receipts, with **pre-trained chain-specific templates** for major Spanish supermarkets (Mercadona, Carrefour, Lidl, etc.).

**Key Design Decisions:**

- **Spain-only**: Hardcoded EUR currency, DD/MM/YYYY date format, decimal comma
- **Pre-trained templates**: Chain knowledge is static in code, not learned at runtime
- **Tax regions**: IVA (Peninsula/Baleares), IGIC (Canarias), IPSI (Ceuta/Melilla)
- **Language**: English & Spanish UI only

**Current Status:** Production-ready. Core features implemented.

## Key Technologies

| Technology                                       | Version | Purpose                                     |
| ------------------------------------------------ | ------- | ------------------------------------------- |
| React Native                                     | 0.86.2  | Mobile framework (New Architecture enabled) |
| Expo SDK                                         | 57      | Development platform                        |
| Expo Router                                      | 57.0.12 | File-based navigation                       |
| NativeWind                                       | 4.2.1   | Tailwind CSS styling                        |
| Drizzle ORM                                      | 0.45.1  | Type-safe database queries                  |
| expo-sqlite                                      | 57.0.1  | Local SQLite database                       |
| Zustand                                          | 5.0.10  | State management with persistence           |
| i18next                                          | 25.7.4  | Internationalization (EN/ES)                |
| @infinitered/react-native-mlkit-text-recognition | 5.0.1   | On-device ML Kit text recognition (OCR)     |
| pako                                             | 2.1.0   | PDF stream decompression                    |
| React Native Reanimated                          | 4.5.1   | Animations                                  |
| react-native-gifted-charts                       | 1.4.78  | Analytics charts                            |
| sonner-native                                    | 0.26.5  | Toast notifications                         |
| @shopify/flash-list                              | 2.0.2   | High-performance virtualized lists          |

## Code Style Guidelines

### React Native / TypeScript

- Use functional components with hooks
- Use TypeScript strict mode
- Prefer named exports for components
- Use `useTranslation()` hook for all user-facing text
- **No comments** unless JSDoc or absolutely necessary - code should be self-documenting
- **Use direct imports** instead of barrel imports for better tree-shaking:
  ```typescript
  // Good
  import { Button } from '@/src/components/ui/Button';
  // Avoid
  import { Button } from '@/src/components/ui';
  ```
- **Use FlashList** instead of FlatList for virtualized lists
- **Use scoped loggers** instead of `console.log` (see Debug Utilities)

### Styling

- Use NativeWind classes via `className` prop
- Follow the color palette defined in `tailwind.config.js`
- Use `useSafeAreaInsets()` hook for safe area handling (NOT SafeAreaView component)
- Apply `fontFamily` via inline styles for Inter font weights, using the
  `fonts` map in `src/theme/type.ts`:
  - `Inter_300Light`, `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`, `Inter_700Bold`
- **Never use Tailwind weight classes** (`font-semibold`, `font-bold`). They set
  `fontWeight` and leave `fontFamily` unset, which silently renders that text in
  the system font instead of Inter.
- Wrap monetary values in `<Amount>`. Currency is set in IBM Plex Mono, not
  Inter — receipts are printed in mono, and every digit sharing an advance
  width keeps a column of prices aligned. Mono is for currency only: not dates,
  quantities, percentages or chart axes.
- Fonts are declared once in `src/theme/type.ts`. `fontModules` is computed
  from `fonts` and `mono`, so what `useFonts` loads cannot drift from what
  styles reference.
- Route entering animations through `useEntering()` (`src/hooks/useEntering.ts`)
  so they respect the OS "Reduce Motion" setting. Avoid `.springify()` — spring
  overshoot on arriving content is a vestibular trigger.

### Color Palette

| Name                      | Hex     | Usage                      |
| ------------------------- | ------- | -------------------------- |
| Cream                     | #FFFDE1 | Light background           |
| Golden                    | #FBE580 | Accent                     |
| Fresh Green (primary)     | #93BD57 | Primary actions, dark text |
| Deep Green (primary-deep) | #3D6B23 | White text on green        |
| Deep Burgundy             | #980404 | Errors, destructive        |

### Database

- Schema files are in `src/db/schema/`
- Amounts are stored in cents (integer) to avoid floating point issues
- Include `syncId` field for future cloud sync support

### Internationalization

- All UI text must use translation keys
- Translation files: `src/i18n/locales/en.json` and `es.json`
- Category keywords in `src/db/seed.ts` support both EN and ES

## File Structure

```
app/                           # Screens (Expo Router)
  _layout.tsx                  # Root layout with providers
  onboarding.tsx               # First-time user setup
  settings.tsx                 # App settings screen
  (tabs)/                      # Main tab navigation
    _layout.tsx                # Tab bar configuration
    index.tsx                  # Dashboard screen
    scan.tsx                   # Quick scan tab
    history.tsx                # Receipt history list
    analytics.tsx              # Spending analytics
  receipt/
    _layout.tsx                # Receipt detail layout
    [id].tsx                   # Receipt detail screen
  scan/
    _layout.tsx                # Scan flow layout (modal stack)
    zones.tsx                  # Manual zone definition
    review.tsx                 # Parsed receipt, editing & save

src/
  components/
    ui/                        # Reusable UI components
      Amount.tsx               # Monetary value, tabular mono
      Badge.tsx                # Status indicators
      Button.tsx               # Primary action button
      Card.tsx                 # Content container
      ConfirmationModal.tsx    # Delete confirmations
      EmptyState.tsx           # Empty/error states
      Input.tsx                # Text input field
      ModalHeader.tsx          # Shared modal header bar
      Skeleton.tsx             # Loading placeholders
    receipt/                   # Receipt-specific components
      CollapsibleItemList.tsx  # Read-only receipt rows, collapses past 25
      ItemRow.tsx              # Line item display
      ReceiptCard.tsx          # Receipt preview card
      ReceiptCardSkeleton.tsx  # Loading skeleton
      ReceiptSummary.tsx       # Summary stats
    scan/                      # Scan flow components
      DuplicateBanner.tsx      # Duplicate receipt warning
      RefinementBanner.tsx     # LLM refinement status banner
      ScanItemRow.tsx          # Parsed line item on review screen
      types.ts                 # Shared types for review screen components
      modals/                  # Review screen modals
        CategoryPickerModal.tsx # Category selection
        DateEditModal.tsx      # Date & time editing
        ItemEditModal.tsx      # Line item add/edit
        ProposalDiffModal.tsx  # LLM proposal comparison
        ReadingModal.tsx       # Zones over the receipt, OCR text, edit zones
        StoreEditModal.tsx     # Store name editing
        TotalEditModal.tsx     # Total editing
    zones/                     # Zone selection components
      ZoneSelectionCanvas.tsx  # Interactive zone drawing
      ZoneSelectionToolbar.tsx # Zone editing controls
      ZoneTypePicker.tsx       # Zone type selector
    ErrorBoundary.tsx          # React error boundary

  db/
    client.ts                  # Drizzle + expo-sqlite setup (runs migrations)
    provider.tsx               # Database context provider
    seed.ts                    # Category seed data
    migrations/                # Drizzle migrations (npx drizzle-kit generate)
    schema/
      receipts.ts              # Receipt table
      items.ts                 # Line items table
      stores.ts                # Store reference table
      categories.ts            # Item categories table
      userLearnedItems.ts      # User learning table
      storeParsingTemplates.ts # Store parsing templates
      parsingFeedback.ts       # Parsing feedback for learning
    queries/
      receipts.ts              # Receipt CRUD operations
      items.ts                 # Item queries
      stores.ts                # Store queries
      categories.ts            # Category queries
      categorization.ts        # Item categorization & user learning
      analytics.ts             # Analytics aggregations
      storeParsingTemplates.ts # Template queries

  services/
    ocr/
      index.ts                 # ML Kit OCR wrapper
      processCapture.ts        # Capture -> text, geometry and detected zones
      parseCapture.ts          # Processed capture -> parsed receipt
      parser.ts                # Receipt parsing with chain detection
      parseUtils.ts            # Shared price/time parsing helpers
      chainDetector.ts         # Detects chain by NIF/name/fingerprints
      chainParser.ts           # Chain-specific parsing using templates
      templateParser.ts        # Zone-based parsing
    pdf/
      index.ts                 # PDF text extraction
    capture/
      index.ts                 # Camera/Gallery/PDF picker
    storage/
      index.ts                 # File system management
    llm/
      index.ts                 # On-device LLM receipt structuring
      types.ts                 # LLM and backend message types
      merge.ts                 # Combines OCR and LLM readings with voting
      prompt.ts                # Spanish-language system and user prompts
      trigger.ts               # shouldRefine / decideOutcome: apply, propose, or discard
      guards.ts                # Anchors LLM items to OCR; filters hallucinations
      reconcile.ts             # Validates item prices sum to total
      schema.ts                # JSON schema constrained to Spanish units
      appleBackend.ts          # Lazy access to Apple Foundation Models

  store/
    preferences.ts             # Zustand preferences store
    receipts.ts                # Receipts store with caching
    scanDraft.ts               # The receipt being scanned, between tab and review

  navigation/
    receiptFlow.ts             # Leaves the scan flow for the receipt just saved

  hooks/
    useAppColors.ts            # Theme colors hook
    useEntering.ts             # Entering animations that respect Reduce Motion
    useLlmRefinement.ts        # LLM-powered receipt refinement

  theme/
    a11y.ts                    # Tap-target and hit-slop constants
    colors.ts                  # Centralized color definitions
    palette.js                 # Single source of colour, shared with Tailwind
    type.ts                    # Font families and currency treatment

  types/
    index.ts                   # Type exports
    zones.ts                   # Zone type definitions
    receipts.ts                # Receipt types
    items.ts                   # Item types
    categories.ts              # Category types
    stores.ts                  # Store types

  config/
    currency.ts                # EUR currency (Spain-focused)
    spanishChains.ts           # Pre-trained chain templates (Mercadona, Lidl, etc.)
    taxRegions.ts              # IVA/IGIC/IPSI tax definitions
    regionalPresets.ts         # Spain-only regional settings

  i18n/
    index.ts                   # i18next setup
    locales/
      en.json                  # English translations
      es.json                  # Spanish translations

  utils/
    toast.ts                   # Toast notification helper
    debug.ts                   # Scoped debug logging
```

## UI Components

Available in `src/components/ui/`:

| Component           | Props                                                                   | Description             |
| ------------------- | ----------------------------------------------------------------------- | ----------------------- |
| Button              | `variant` (primary, secondary, ghost, destructive), `size` (sm, md, lg) | Primary action button   |
| Card                | `variant` (elevated, outlined, filled), `padding` (sm, md, lg)          | Content container       |
| Input               | `label`, `error`, `leftIcon`, `rightIcon`                               | Text input field        |
| Badge               | `variant` (default, success, warning, error, info), `size` (sm, md)     | Status indicator        |
| Amount              | `size` (sm, base, lg, xl, hero), `weight`                               | Monetary value          |
| CollapsibleItemList | `items`                                                                 | Read-only receipt rows  |
| ModalHeader         | `title`, `onClose`, `closeLabel`, `confirmLabel`, `onConfirm`           | Shared modal header bar |
| Skeleton            | `SkeletonText`, `SkeletonCircle`, `SkeletonCard`                        | Loading placeholders    |
| ConfirmationModal   | `visible`, `title`, `message`, `onConfirm`, `onCancel`                  | Delete confirmation     |
| EmptyState          | `icon`, `title`, `description`, `action`                                | Empty/error states      |
| ErrorBoundary       | `children`, `fallback`, `onError`                                       | React error boundary    |

Use these rather than hand-rolling equivalents — they carry the accessibility
role, label and 44pt minimum target that screens otherwise forget.

## Theme System

`src/theme/palette.js` is the single source of truth for colour. It is plain
CommonJS so `tailwind.config.js` (Node, build time) and `src/theme/colors.ts`
(Metro, runtime) both read it and cannot drift.

Tailwind runs in `darkMode: 'class'`, so `dark:` variants follow the in-app
appearance preference rather than the OS. `app/_layout.tsx` pushes the stored
preference into NativeWind via `colorScheme.set()` — without that sync the
`className` half and the `useAppColors()` half of a screen render different
themes.

**`primary` is a fill, `action` is ink.** `#93BD57` measures 2.11:1 on cream, so
it must never carry text or tint an icon. Use `action` (`text-action
dark:text-action-dark`, or `colors.action`) for anything the user reads or taps.
`src/theme/__tests__/contrast.test.ts` guards the palette's token _values_ (that
`action` clears AA, that `primary` cannot masquerade as it) — it cannot see a
call site pass `colors.primary` as an icon tint, so correct usage is a
convention this file states, not something the test can enforce.

Native chrome — the splash screen, `Alert`, the keyboard's appearance — still
follows the OS rather than the in-app preference, because `app.json` sets
`userInterfaceStyle: "automatic"`. That is a deliberate choice left to the
user; don't change it to "chase" the in-app toggle.

Centralized theme colors in `src/theme/colors.ts`:

```typescript
import { useAppColors } from '@/src/hooks/useAppColors';

function MyComponent() {
  const colors = useAppColors(); // Returns light or dark colors based on colorScheme
  return <View style={{ backgroundColor: colors.background }} />;
}
```

Available color keys: `background`, `surface`, `text`, `textSecondary`,
`textTertiary`, `border`, `primary` (fill only), `primaryDark`, `primaryDeep`,
`action` (interactive ink), `accent` (fill only), `warning`, `error`, `info`

## Debug Utilities

Use scoped loggers instead of `console.log` (logs only in `__DEV__` mode):

```typescript
import { createScopedLogger } from '@/src/utils/debug';

const logger = createScopedLogger('MyComponent');
logger.log('Info message');
logger.warn('Warning message');
logger.error('Error message');
```

## Services

### OCR Service (`src/services/ocr/`)

```typescript
// Main function
recognizeText(imageUri: string, knownDimensions?: { width: number; height: number }): Promise<OcrResult>
```

Shared low-level helpers (`src/services/ocr/parseUtils.ts`), used by both the generic and chain parsers:

```typescript
parsePrice(text: string, options?: { allowBareInteger?: boolean }): number | null
parseTime(text: string): string | null
```

**OCR engine:** Google ML Kit via `@infinitered/react-native-mlkit-text-recognition` (an autolinked Expo module — no config plugin needed). The native library returns frames as `{left, top, right, bottom}`; the `recognizeText()` wrapper in `index.ts` normalizes them to the app's `OcrResult` shape (`boundingBox` `{left, top, width, height}`). The engine is isolated to this one file, so swapping OCR libraries never touches the rest of the app.

**Apple Vision was evaluated and rejected:** iOS-only (no Android), accuracy parity with ML Kit (and ~6× slower), no mature RN/Expo library exposing per-block bounding boxes, and its normalized bottom-left coordinates would break zone alignment. Revisit only if concrete Spanish-receipt failures appear that Vision demonstrably fixes — and then via a custom Expo Swift module wrapping `VNRecognizeTextRequest`, not the hobby-grade community wrappers.

### Chain Detection (`src/services/ocr/chainDetector.ts`)

Identifies Spanish supermarket chains using multiple strategies (in order of reliability):

1. **NIF Matching** (98% confidence): Tax ID like "A46103834" → Mercadona
2. **Name Matching** (90% confidence): "MERCADONA S.A." patterns
3. **Fingerprint Matching** (70-85%): Brand names like "HACENDADO", "DELIPLUS"
4. **Heuristic Matching** (50-65%): Keywords like "CLUB CARREFOUR"

```typescript
detectChain(blocks: TextBlock[]): ChainDetectionResult
detectChainFromText(text: string): ChainDetectionResult
```

### Spanish Chain Templates (`src/config/spanishChains.ts`)

Pre-trained templates for major Spanish supermarkets:

| Chain     | Market Share | NIF       | Key Features                     |
| --------- | ------------ | --------- | -------------------------------- |
| Mercadona | 27.3%        | A46103834 | Columnar layout, unit prices     |
| Carrefour | 9.0%         | A28425270 | Mixed layout, multiple variants  |
| Lidl      | 6.9%         | A60195278 | Compact columnar, DD.MM.YY dates |
| Eroski    | 5.5%         | F20033361 | Includes Caprabo                 |
| Dia       | 4.5%         | A28164754 | ClubDia discounts                |
| Consum    | 3.8%         | F46078986 | Regional (Valencia)              |
| Alcampo   | 3.2%         | A28581882 | Hypermarket format               |
| Aldi      | 2.8%         | B82258301 | German discount style            |
| HiperDino | 2.1%         | A35032517 | Canarias (uses IGIC tax)         |

Each template includes: `namePatterns`, `nifPatterns`, `layout`, `parsing.itemPatterns`, `ocrCorrections`, `fingerprints`

### Scan Flow (`app/(tabs)/scan.tsx` → `app/scan/review.tsx`)

Capturing a receipt reads it on the spot: the scan tab calls `processCapture()`
(OCR or PDF text extraction, then `autoDetectZones`), puts the result in the
`scanDraft` store, and pushes straight to review. There is no preview screen —
there is nothing to decide over a raw capture, so the flow goes to what was read
out of it.

```typescript
processCapture({ uri, isPdf, knownDimensions? }): Promise<CaptureProcessResult>
parseCapture({ lines, blocks, ocrText, dimensions, zones, detectedTotal, options? }): ParsedReceipt | null
```

`parseCapture` picks the most informed route the capture supports: its zones,
else the geometry of its blocks, else its lines alone. Review calls it once on
mount and again whenever zones are redrawn.

Zones live in one space only — the geometry the recognizer reported — and every
surface that draws them (the reading modal, the zone editor canvas) renders the
receipt at that aspect ratio with `contentFit="fill"`. That is what lets a zone
round-trip through the editor without coordinate transforms.

The **ReadingModal**, reached from the "how it was read" row in review, shows
the zones over the receipt plus the recognized text, and is where zones are
redrawn. Redrawn zones go back into the draft; review reads the receipt again
through them, asking first when the user has already corrected fields by hand.
Zone editing is offered for images only: the editor draws over an image, not a
PDF page.

### Receipt Parser (`src/services/ocr/parser.ts`)

Main parsing orchestrator:

1. **Chain Detection**: Tries to identify supermarket chain first
2. **Chain-Specific Parsing**: Uses template if chain detected with high confidence
3. **Generic Fallback**: Standard parsing if chain unknown

Features:

- **Spanish Defaults**: DD/MM/YYYY dates, decimal comma, EUR
- **Item Parsing**: Inline and columnar strategies
- **Unit Detection**: kg, g, l, ml
- **Payment Method**: cash/card/digital detection
- **Confidence Scoring**: Weighted based on extracted fields

```typescript
parseReceipt(lines: string[], options?: ParserOptions): ParsedReceipt
```

### PDF Service (`src/services/pdf/`)

PDF text extraction supporting:

- FlateDecode stream decompression (zlib via pako)
- ToUnicode CMap parsing for character mapping
- Kerning value analysis for word spacing (threshold: -100)
- NUL byte removal and whitespace normalization

```typescript
extractTextFromPdf(uri: string): Promise<PdfExtractionResult>
hasPdfText(uri: string): Promise<boolean>
```

### Capture Service (`src/services/capture/`)

```typescript
captureFromCamera(): Promise<CaptureResult>
selectFromGallery(): Promise<CaptureResult>
selectPdf(): Promise<CaptureResult>
```

### Storage Service (`src/services/storage/`)

```typescript
saveReceiptFile(sourceUri: string, mimeType: string): Promise<string>
deleteReceiptFile(fileUri: string): Promise<void>
getStorageUsed(): Promise<number>
listReceiptFiles(): Promise<string[]>
```

## Database Schema

### Tables

**stores**: Store reference with normalized names for matching
**categories**: 10 default categories with icons, colors, multilingual keywords
**receipts**: Receipt header with store, date, totals, status, file paths
**items**: Line items with quantity, price, unit, category, confidence
**userLearnedItems**: User corrections for auto-categorization learning
**storeParsingTemplates**: Zone templates and fingerprints per store
**parsingFeedback**: User corrections to parsed fields (learning input)

### Migrations

Schema is defined in `src/db/schema/` and applied via Drizzle migrations:

1. Edit the schema files
2. Run `npx drizzle-kit generate` to create a migration in `src/db/migrations/`
3. The app applies pending migrations on startup (`initializeDatabase()` in `src/db/client.ts`)

Migration SQL uses `IF NOT EXISTS` so it is safe on databases created before the
migration system existed; `client.ts` also repairs known legacy columns.

### Key Indexes

- `idx_receipts_date` - Fast date filtering
- `idx_receipts_store` - Store lookups
- `idx_items_receipt` - Item-receipt joins
- `idx_items_category` - Category queries

## Auto-Categorization System

Priority order:

1. `userLearnedItems` table (user corrections - highest confidence)
2. Keyword matching from `categories.keywords` (multilingual EN/ES)
3. Default to "Other" category

Key functions in `src/db/queries/categorization.ts`:

- `normalizeItemName(name)`: Normalizes for matching
- `getCategoryForItem(itemName, storeId?)`: Returns category with confidence
- `recordUserCorrection(itemName, categoryId, storeId?)`: Records learning

## State Management

### Preferences Store (`src/store/preferences.ts`)

```typescript
interface PreferencesState {
  language: 'en' | 'es';
  colorScheme: 'light' | 'dark';
  hasCompletedOnboarding: boolean;

  // Hardcoded Spanish defaults (not configurable)
  // - Currency: EUR
  // - Date format: DMY (DD/MM/YYYY)
  // - Decimal separator: comma (1.234,56)

  // Actions
  setLanguage(lang: string): void;
  setColorScheme(scheme: 'light' | 'dark'): void;
  formatPrice(amount: number | null): string;
}
```

Persisted to AsyncStorage. Language and appearance are the only user-configurable preferences.

### Receipts Store (`src/store/receipts.ts`)

Zustand store with 30-second caching for efficient data fetching:

```typescript
const { receipts, isLoading, fetchReceipts, invalidateCache } = useReceiptsStore();

// Selector hooks for optimized re-renders
const receipts = useReceipts();
const isLoading = useReceiptsLoading();
```

## Testing

Unit tests use Jest (`jest-expo` preset). Parsing services have fixture-based tests in
`src/services/ocr/__tests__/` — extend these when changing parser, chain detector, or
parse helper behavior.

Before committing:

1. Run `npx tsc --noEmit` to check TypeScript
2. Run `npm test` to run the Jest suite
3. Run `expo run:ios` or `expo run:android` (dev build required for ML Kit)
4. Verify dark mode works correctly
5. Test language switching (change device language)
6. Test receipt scanning with both images and PDFs

CI (`.github/workflows/ci.yml`) runs type check, lint, format check, and tests on every push/PR.

## Commit Guidelines

- **Never commit unless explicitly told**: Do not create commits automatically. Wait for the user to explicitly request a commit.
- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`

## Common Pitfalls

1. **SafeAreaView Warning**: Use `useSafeAreaInsets()` hook, not SafeAreaView component
2. **SafeAreaProvider on Android**: Can crash after navigation - ensure proper mounting
3. **Color Contrast**: White text on green needs darker green (#3D6B23)
4. **Font Loading**: Always check `fontsLoaded` before rendering
5. **Database Init**: Wrap app in `DatabaseProvider` for DB access
6. **Translations**: Never hardcode user-facing strings
7. **Dev Build Required**: ML Kit OCR requires native code - Expo Go won't work
8. **PDF Text Extraction**: Some PDFs have no embedded text (scanned images) - falls back to OCR
9. **Kerning in PDFs**: TJ operator kerning values need threshold (-100) to detect word spacing
10. **NUL Bytes**: PDF extracted text may contain NUL bytes - must be cleaned
11. **FlashList v2**: Does not have `estimatedItemSize` prop - removed in v2.0
12. **Index-based stagger on recycled lists**: `delay(index * n)` re-runs every
    time a cell scrolls back into view, and hides deep rows for seconds. Use
    `staggerDelay()` from `useEntering`, which caps it.
13. **React Compiler is on** (`app.json` → `experiments.reactCompiler`): never
    add an `eslint-disable` for a React rule, it opts the whole component out of
    compilation.
14. **Theme Colors**: Use `useAppColors()` hook instead of duplicating colors in components
15. **Debug Logging**: Use `createScopedLogger()` instead of `console.log`
16. **tsconfig `types` Allowlist**: `compilerOptions.types` is an explicit allowlist (`"types": ["jest"]`), so any future `@types/*` package must be added there deliberately

## Development Setup

```bash
# Install dependencies
npm install

# Run iOS (requires Mac + Xcode)
expo run:ios

# Run Android (requires Android Studio)
expo run:android

# Type check
npx tsc --noEmit
```

## Code Quality Scripts

| Script                 | Description                      |
| ---------------------- | -------------------------------- |
| `npm run lint`         | Check for ESLint issues          |
| `npm run lint:fix`     | Auto-fix ESLint issues           |
| `npm run format`       | Format all files with Prettier   |
| `npm run format:check` | Check formatting without changes |
| `npm run check`        | Run both lint and format:check   |
| `npm test`             | Run Jest unit tests              |

### Pre-commit Hook

Husky + lint-staged is configured to automatically run on every commit:

- ESLint --fix on staged `.js/.jsx/.ts/.tsx` files
- Prettier --write on all staged files

This ensures code quality is maintained without manual effort.

### Prettier Configuration

See `.prettierrc`:

- Single quotes
- Semicolons
- 2-space indentation
- 100 char line width
- ES5 trailing commas

**Note**: This app requires a development build due to native modules (ML Kit OCR). Expo Go is not sufficient.

## Spanish Tax Regions (`src/config/taxRegions.ts`)

| Region             | Tax Type | Rates           |
| ------------------ | -------- | --------------- |
| Peninsula/Baleares | IVA      | 4% / 10% / 21%  |
| Canarias           | IGIC     | 0% / 3% / 7%    |
| Ceuta/Melilla      | IPSI     | 0.5% / 4% / 10% |

Detection by postal code prefix, tax keywords (IGIC vs IVA), or store name (HiperDino → Canarias).

## Potential Future Work

- Cloud sync with user accounts
- Receipt export (CSV, PDF reports)
- Budget tracking and alerts
- More chain templates (regional supermarkets)
- Barcode/QR code scanning
- Store loyalty card integration
- Receipt sharing
- Advanced analytics (year-over-year, category trends)
