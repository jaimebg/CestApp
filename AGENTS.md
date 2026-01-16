# Agent Guidelines for CestApp

This document provides instructions for AI coding agents working on the CestApp project.

## Project Overview

CestApp is a supermarket receipt scanner app built with React Native and Expo. It uses on-device ML Kit OCR to extract data from receipts, parse items/totals, and categorize items automatically with user learning capabilities.

**Current Status:** Production-ready with ~9,600+ lines of TypeScript across 54 files. All core features implemented (Phases 1-10 complete).

## Key Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.81.5 | Mobile framework (New Architecture enabled) |
| Expo SDK | 54 | Development platform |
| Expo Router | 6.0.21 | File-based navigation |
| NativeWind | 4.2.1 | Tailwind CSS styling |
| Drizzle ORM | 0.45.1 | Type-safe database queries |
| expo-sqlite | 16.0.10 | Local SQLite database |
| Zustand | 5.0.10 | State management with persistence |
| i18next | 25.7.4 | Internationalization (EN/ES) |
| rn-mlkit-ocr | 0.3.0 | On-device text recognition |
| pako | 2.1.0 | PDF stream decompression |
| React Native Reanimated | 4.1.1 | Animations |
| react-native-gifted-charts | 1.4.70 | Analytics charts |
| sonner-native | 0.23.0 | Toast notifications |

## Code Style Guidelines

### React Native / TypeScript

- Use functional components with hooks
- Use TypeScript strict mode
- Prefer named exports for components
- Use `useTranslation()` hook for all user-facing text

### Styling

- Use NativeWind classes via `className` prop
- Follow the color palette defined in `tailwind.config.js`
- Use `useSafeAreaInsets()` hook for safe area handling (NOT SafeAreaView component)
- Apply `fontFamily` via inline styles for Inter font weights:
  - `Inter_300Light`, `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`, `Inter_700Bold`

### Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| Cream | #FFFDE1 | Light background |
| Golden | #FBE580 | Accent |
| Fresh Green (primary) | #93BD57 | Primary actions, dark text |
| Deep Green (primary-deep) | #3D6B23 | White text on green |
| Deep Burgundy | #980404 | Errors, destructive |

### Database

- Schema files are in `src/db/schema/`
- Use Drizzle ORM query syntax
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
    review.tsx                 # OCR review & save

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
    queries/
      receipts.ts              # Receipt CRUD operations
      items.ts                 # Item queries
      stores.ts                # Store queries
      categories.ts            # Category queries
      analytics.ts             # Analytics aggregations

  services/
    ocr/
      index.ts                 # ML Kit OCR wrapper
      parser.ts                # Receipt parsing (1,086 lines)
    pdf/
      index.ts                 # PDF text extraction (648 lines)
    capture/
      index.ts                 # Camera/Gallery/PDF picker
    storage/
      index.ts                 # File system management

  store/
    preferences.ts             # Zustand preferences store

  config/
    currency.ts                # 140+ currency definitions

  i18n/
    index.ts                   # i18next setup
    locales/
      en.json                  # English translations
      es.json                  # Spanish translations

  utils/
    toast.ts                   # Toast notification helper
```

## UI Components

Available in `src/components/ui/`:

| Component | Props | Description |
|-----------|-------|-------------|
| Button | `variant` (primary, secondary, ghost, destructive), `size` (sm, md, lg) | Primary action button |
| Card | `variant` (elevated, outlined, filled), `padding` (sm, md, lg) | Content container |
| Input | `label`, `error`, `leftIcon`, `rightIcon` | Text input field |
| Badge | `variant` (default, success, warning, error, info), `size` (sm, md, lg) | Status indicator |
| Skeleton | `SkeletonText`, `SkeletonCircle`, `SkeletonCard` | Loading placeholders |
| AnimatedList | `entering`, `layout` | Animated list items |
| ConfirmationModal | `visible`, `title`, `message`, `onConfirm`, `onCancel` | Delete confirmation |
| EmptyState | `icon`, `title`, `description`, `action` | Empty/error states |

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

### Receipt Parser (`src/services/ocr/parser.ts`)

Sophisticated 1,086-line parser that handles:

- **Format Detection**: Auto-detects decimal separator (./,), date format, layout type
- **Store Extraction**: Heuristic-based store name detection
- **Date/Time Parsing**: 10+ date format patterns (DD/MM/YYYY, MM/DD/YYYY, etc.)
- **Item Parsing**: Two strategies - inline ("Item $12.34") and columnar (price on separate line)
- **Unit Detection**: kg, lb, oz, g, l, ml
- **Payment Method**: cash/card/digital detection
- **Confidence Scoring**: Weighted based on extracted fields

```typescript
parseReceipt(lines: string[], options?: ParserOptions): ParsedReceipt
```

### PDF Service (`src/services/pdf/`)

648-line PDF text extraction supporting:

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

Zustand store in `src/store/preferences.ts`:

```typescript
interface PreferencesState {
  language: 'en' | 'es'
  currencyCode: string
  currency: Currency
  dateFormat: 'DMY' | 'MDY' | 'YMD'
  decimalSeparator: '.' | ','
  hasCompletedOnboarding: boolean

  // Actions
  setLanguage(lang: string): void
  setCurrency(code: string): void
  formatPrice(cents: number): string
}
```

Persisted to AsyncStorage. Auto-detects device locale on first launch.

## Implementation Progress

- [x] Phase 1: Foundation Setup
- [x] Phase 2: UI Component Library
- [x] Phase 3: Database Layer
- [x] Phase 3.5: Internationalization
- [x] Phase 4: Input & Capture
- [x] Phase 5: OCR Integration
- [x] Phase 6: Receipt Parsing
- [x] Phase 7: Review & Save Flow
- [x] Phase 8: Receipt Management
- [x] Phase 9: Analytics Dashboard
- [x] Phase 10: Polish & Animations

## Testing

Before committing:
1. Run `npx tsc --noEmit` to check TypeScript
2. Run `expo run:ios` or `expo run:android` (dev build required for ML Kit)
3. Verify dark mode works correctly
4. Test language switching (change device language)
5. Test receipt scanning with both images and PDFs

## Commit Guidelines

- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`
- Commit after each visually testable change
- Include co-author line for AI-assisted commits:
  ```
  Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
  ```

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

# Lint
npm run lint
```

**Note**: This app requires a development build due to native modules (ML Kit OCR). Expo Go is not sufficient.

## Potential Future Work

- Cloud sync with user accounts
- Receipt export (CSV, PDF reports)
- Budget tracking and alerts
- More languages support
- Barcode/QR code scanning
- Store loyalty card integration
- Receipt sharing
- Advanced analytics (year-over-year, category trends)
