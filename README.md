# CestApp

A supermarket receipt scanner app built with React Native and Expo. Scan receipts using your camera, gallery, or PDF files, and automatically extract, organize, and analyze your spending.

## Features

- **Multi-input scanning**: Camera, photo gallery, or PDF file import
- **On-device OCR**: Privacy-first receipt processing using ML Kit
- **Smart categorization**: Keyword-based auto-categorization with user learning
- **Multi-language support**: English and Spanish (auto-detects device language)
- **Spending analytics**: Track spending by category, store, and time period
- **Beautiful UI**: Custom color palette with dark mode support
- **Offline-first**: All data stored locally with SQLite

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React Native + Expo SDK 54 |
| Navigation | Expo Router (file-based) |
| Styling | NativeWind v4 (Tailwind CSS) |
| Database | Drizzle ORM + expo-sqlite |
| State | Zustand v5 |
| OCR | rn-mlkit-ocr |
| i18n | i18next + expo-localization |
| Fonts | Inter (Google Fonts) |

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator
- For physical device testing: Expo Go app or development build

### Installation

```bash
# Clone the repository
git clone https://github.com/jaimebarreto/CestApp.git
cd CestApp

# Install dependencies
npm install

# Start the development server
npx expo start
```

### Development Build

For OCR functionality, you need a development build (ML Kit requires native code):

```bash
# Build for iOS
npx expo run:ios

# Build for Android
npx expo run:android
```

## Project Structure

```
CestApp/
├── app/                          # Expo Router screens
│   ├── _layout.tsx               # Root layout with providers
│   ├── (tabs)/                   # Tab navigation
│   │   ├── index.tsx             # Dashboard
│   │   ├── scan.tsx              # Scan receipt
│   │   ├── history.tsx           # Receipt history
│   │   └── analytics.tsx         # Spending analytics
│   ├── receipt/[id].tsx          # Receipt detail
│   └── settings/                 # Settings screens
├── src/
│   ├── components/ui/            # Reusable UI components
│   ├── db/                       # Database schema and queries
│   ├── i18n/                     # Translations
│   ├── services/                 # Business logic
│   └── store/                    # State management
└── styles/                       # Global styles
```

## Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Cream | `#FFFDE1` | Light background |
| Golden | `#FBE580` | Accent, highlights |
| Fresh Green | `#93BD57` | Primary actions |
| Deep Burgundy | `#980404` | Errors, meat category |

## Database Schema

- **stores**: Store information (name, address, logo)
- **categories**: Item categories with keywords for auto-categorization
- **receipts**: Receipt metadata (store, date, totals, payment method)
- **items**: Individual line items from receipts
- **user_learned_items**: User corrections for category learning

## Auto-Categorization

Items are categorized using a priority system:

1. **User Learning**: Previously corrected items are remembered
2. **Keyword Matching**: Multilingual keywords (EN/ES) match item names
3. **Default**: Falls back to "Other" category

Categories include: Produce, Dairy, Meat, Bakery, Beverages, Frozen, Pantry, Snacks, Household, Personal Care.

## Internationalization

The app supports:
- **English** (default)
- **Spanish**

Language is auto-detected from device settings. All UI text and category keywords support both languages.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- [Expo](https://expo.dev) for the amazing React Native toolchain
- [NativeWind](https://nativewind.dev) for Tailwind CSS in React Native
- [Drizzle ORM](https://orm.drizzle.team) for type-safe database queries
- [ML Kit](https://developers.google.com/ml-kit) for on-device OCR
