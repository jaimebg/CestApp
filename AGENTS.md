# Agent Guidelines for CestApp

This document provides instructions for AI coding agents working on the CestApp project.

## Project Overview

CestApp is a supermarket receipt scanner app built with React Native and Expo. It uses on-device OCR to extract data from receipts and categorize items automatically.

## Key Technologies

- **React Native + Expo SDK 54**: Mobile framework
- **Expo Router**: File-based navigation in `app/` directory
- **NativeWind v4**: Tailwind CSS styling - use `className` props
- **Drizzle ORM + expo-sqlite**: Type-safe database queries
- **Zustand v5**: State management
- **i18next**: Internationalization (EN/ES supported)

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

### Color Contrast

- Be careful with text color contrast on colored backgrounds
- Use `primary-deep` (#3D6B23) for white text on green backgrounds
- Use `primary` (#93BD57) for dark text on light backgrounds

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
app/                    # Screens (Expo Router)
  (tabs)/              # Tab navigation screens
  receipt/             # Receipt detail screens
  settings/            # Settings screens
src/
  components/ui/       # Reusable UI components
  db/                  # Database (Drizzle schema, queries)
  i18n/                # Translations
  services/            # Business logic
  store/               # Zustand state stores
```

## UI Components

Available components in `src/components/ui/`:

- **Button**: `variant` (primary, secondary, ghost, destructive), `size` (sm, md, lg)
- **Card**: `variant` (elevated, outlined, filled), `padding` (sm, md, lg)
- **Input**: `label`, `error`, `leftIcon`, `rightIcon`
- **Badge**: `variant` (default, success, warning, error, info), `size` (sm, md, lg)
- **Skeleton**: Animated loading placeholders

## Auto-Categorization System

Priority order:
1. `userLearnedItems` table (user corrections)
2. Keyword matching from `categories.keywords`
3. Default to "Other" category

Key functions in `src/db/seed.ts`:
- `normalizeItemName(name)`: Normalizes for matching
- `getCategoryForItem(itemName, storeId?)`: Returns category with confidence
- `recordUserCorrection(itemName, categoryId, storeId?)`: Records learning

## Implementation Plan

See `IMPLEMENTATION_PLAN.md` for the full roadmap. Current progress:
- [x] Phase 1: Foundation Setup
- [x] Phase 2: UI Component Library
- [x] Phase 3: Database Layer
- [x] Phase 3.5: Internationalization
- [ ] Phase 4: Input & Capture
- [ ] Phase 5: OCR Integration
- [ ] Phase 6: Receipt Parsing
- [ ] Phase 7: Review & Save Flow
- [ ] Phase 8: Receipt Management
- [ ] Phase 9: Analytics
- [ ] Phase 10: Polish & Animations

## Testing

Before committing:
1. Run `npx tsc --noEmit` to check TypeScript
2. Test on iOS simulator or device
3. Verify dark mode works correctly
4. Test language switching (change device language)

## Commit Guidelines

- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`
- Commit after each visually testable change
- Include co-author line for AI-assisted commits:
  ```
  Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
  ```

## Common Pitfalls

1. **SafeAreaView Warning**: Use `useSafeAreaInsets()` hook, not SafeAreaView
2. **Color Contrast**: White text on green needs darker green (#3D6B23)
3. **Font Loading**: Always check `fontsLoaded` before rendering
4. **Database Init**: Wrap app in `DatabaseProvider` for DB access
5. **Translations**: Never hardcode user-facing strings

## Next Steps (Phase 4)

The next phase involves:
1. Implementing camera capture with `expo-image-picker`
2. Gallery image selection
3. PDF picker with `expo-document-picker`
4. Image preview screen
5. Local file storage service
