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

| Technology                 | Version | Purpose                                     |
| -------------------------- | ------- | ------------------------------------------- |
| React Native               | 0.81.5  | Mobile framework (New Architecture enabled) |
| Expo SDK                   | 54      | Development platform                        |
| Expo Router                | 6.0.21  | File-based navigation                       |
| NativeWind                 | 4.2.1   | Tailwind CSS styling                        |
| Drizzle ORM                | 0.45.1  | Type-safe database queries                  |
| expo-sqlite                | 16.0.10 | Local SQLite database                       |
| Zustand                    | 5.0.10  | State management with persistence           |
| i18next                    | 25.7.4  | Internationalization (EN/ES)                |
| rn-mlkit-ocr               | 0.3.0   | On-device text recognition                  |
| pako                       | 2.1.0   | PDF stream decompression                    |
| React Native Reanimated    | 4.1.1   | Animations                                  |
| react-native-gifted-charts | 1.4.70  | Analytics charts                            |
| sonner-native              | 0.23.0  | Toast notifications                         |
| @shopify/flash-list        | 2.0.2   | High-performance virtualized lists          |

## Code Style Guidelines

### React Native / TypeScript

- Use functional components with hooks
- Use TypeScript strict mode
- Prefer named exports for components
- Use `useTranslation()` hook for all user-facing text
- **No comments** unless JSDoc or absolutely necessary - code should be self-documenting
- **Never create new .md files** unless explicitly asked
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
- Apply `fontFamily` via inline styles for Inter font weights:
  - `Inter_300Light`, `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`, `Inter_700Bold`

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
    preview.tsx                # Image/PDF preview
    zones.tsx                  # Manual zone definition
    review.tsx                 # OCR review & save
    _components/modals/        # Extracted modal components
      CategoryPickerModal.tsx  # Category selection
      CurrencyPickerModal.tsx  # Currency selection
      ZonesPreviewModal.tsx    # Zones preview

src/
  components/
    ui/                        # Reusable UI components
      Button.tsx               # Primary button
      Card.tsx                 # Card wrapper
      Input.tsx                # Text input
      Badge.tsx                # Status badges
      Skeleton.tsx             # Loading placeholders
      AnimatedList.tsx         # Animated list items
      ConfirmationModal.tsx    # Delete confirmations
      EmptyState.tsx           # Empty/error states
    receipt/                   # Receipt-specific components
      ReceiptCard.tsx          # Receipt preview card
      ReceiptCardSkeleton.tsx  # Loading skeleton
      ReceiptSummary.tsx       # Summary stats
      ItemRow.tsx              # Line item display
    settings/
      CurrencySelector.tsx     # Currency picker
    ErrorBoundary.tsx          # React error boundary

  db/
    client.ts                  # Drizzle + expo-sqlite setup
    provider.tsx               # Database context provider
    seed.ts                    # Category seed data
    schema/
      receipts.ts              # Receipt table
      items.ts                 # Line items table
      stores.ts                # Store reference table
      categories.ts            # Item categories table
      userLearnedItems.ts      # User learning table
      storeParsingTemplates.ts # Store parsing templates
    queries/
      receipts.ts              # Receipt CRUD operations
      items.ts                 # Item queries
      stores.ts                # Store queries
      categories.ts            # Category queries
      analytics.ts             # Analytics aggregations
      storeParsingTemplates.ts # Template queries

  services/
    ocr/
      index.ts                 # ML Kit OCR wrapper
      parser.ts                # Receipt parsing with chain detection
      chainDetector.ts         # Detects chain by NIF/name/fingerprints
      chainParser.ts           # Chain-specific parsing using templates
      templateParser.ts        # Zone-based parsing
    pdf/
      index.ts                 # PDF text extraction
    capture/
      index.ts                 # Camera/Gallery/PDF picker
    storage/
      index.ts                 # File system management

  store/
    preferences.ts             # Zustand preferences store
    receipts.ts                # Receipts store with caching

  hooks/
    useAppColors.ts            # Theme colors hook

  theme/
    colors.ts                  # Centralized color definitions

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

| Component         | Props                                                                   | Description           |
| ----------------- | ----------------------------------------------------------------------- | --------------------- |
| Button            | `variant` (primary, secondary, ghost, destructive), `size` (sm, md, lg) | Primary action button |
| Card              | `variant` (elevated, outlined, filled), `padding` (sm, md, lg)          | Content container     |
| Input             | `label`, `error`, `leftIcon`, `rightIcon`                               | Text input field      |
| Badge             | `variant` (default, success, warning, error, info), `size` (sm, md, lg) | Status indicator      |
| Skeleton          | `SkeletonText`, `SkeletonCircle`, `SkeletonCard`                        | Loading placeholders  |
| AnimatedList      | `entering`, `layout`                                                    | Animated list items   |
| ConfirmationModal | `visible`, `title`, `message`, `onConfirm`, `onCancel`                  | Delete confirmation   |
| EmptyState        | `icon`, `title`, `description`, `action`                                | Empty/error states    |
| ErrorBoundary     | `children`, `fallback`, `onError`                                       | React error boundary  |

## Theme System

Centralized theme colors in `src/theme/colors.ts`:

```typescript
import { useAppColors } from '@/src/hooks/useAppColors';

function MyComponent() {
  const colors = useAppColors(); // Returns light or dark colors based on colorScheme
  return <View style={{ backgroundColor: colors.background }} />;
}
```

Available color keys: `background`, `surface`, `text`, `textSecondary`, `border`, `primary`, `primaryDark`, `primaryDeep`, `accent`, `error`

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
recognizeText(imageUri: string): Promise<OcrResult>

// Helper functions
preprocessOcrText(text: string): string[]
findPriceLines(lines: string[]): string[]
findTotalLine(lines: string[]): string | null
findDateLine(lines: string[]): string | null
```

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

Key functions in `src/db/seed.ts`:

- `normalizeItemName(name)`: Normalizes for matching
- `getCategoryForItem(itemName, storeId?)`: Returns category with confidence
- `recordUserCorrection(itemName, categoryId, storeId?)`: Records learning

## State Management

### Preferences Store (`src/store/preferences.ts`)

```typescript
interface PreferencesState {
  language: 'en' | 'es'; // Only setting user can change
  hasCompletedOnboarding: boolean;

  // Hardcoded Spanish defaults (not configurable)
  // - Currency: EUR
  // - Date format: DMY (DD/MM/YYYY)
  // - Decimal separator: comma (1.234,56)

  // Actions
  setLanguage(lang: string): void;
  formatPrice(cents: number): string;
}
```

Persisted to AsyncStorage. Language is the only user-configurable preference.

### Receipts Store (`src/store/receipts.ts`)

Zustand store with 30-second caching for efficient data fetching:

```typescript
const { receipts, isLoading, fetchReceipts, invalidateCache } = useReceiptsStore();

// Selector hooks for optimized re-renders
const receipts = useReceipts();
const isLoading = useReceiptsLoading();
```

## Testing

Before committing:

1. Run `npx tsc --noEmit` to check TypeScript
2. Run `expo run:ios` or `expo run:android` (dev build required for ML Kit)
3. Verify dark mode works correctly
4. Test language switching (change device language)
5. Test receipt scanning with both images and PDFs

## Commit Guidelines

- **Never commit unless explicitly told**: Do not create commits automatically. Wait for the user to explicitly request a commit.
- **Before committing**: When the user asks to commit, spawn the `code-simplifier:code-simplifier` agent to review and simplify recently modified code before creating the commit.
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
12. **Theme Colors**: Use `useAppColors()` hook instead of duplicating colors in components
13. **Debug Logging**: Use `createScopedLogger()` instead of `console.log`

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
