<p align="center">
  <img src="assets/images/cestapp-logo.png" alt="CestApp Logo" width="120" height="120" />
</p>

<h1 align="center">CestApp</h1>

<p align="center">
  <strong>Receipt scanner that respects your privacy.</strong>
</p>

<p align="center">
  Scan receipts. Track spending. Keep your data local.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

---

> **🚧 Under Construction**
> CestApp is in active development. Core features work, but expect rough edges. Contributions welcome!

---

## Why CestApp?

- **100% on-device** — ML Kit OCR runs locally. No cloud uploads.
- **Any format** — Camera, gallery, or PDF.
- **Smart categories** — Auto-sorts items. Learns from your corrections.
- **Multi-language** — English & Spanish with regional format detection.

## Features

**Capture**: Camera scanning, gallery import, PDF parsing via ML Kit OCR.

**Organize**: 10 built-in categories, auto-categorization, user learning, store detection.

**Analyze**: Monthly trends, category breakdowns, store comparisons, top items.

**Privacy**: Offline-first, local SQLite, no tracking, no ads.

**Details**: Dark mode, 140+ currencies, flexible date formats, smooth animations.

## Installation

```bash
git clone https://github.com/jaimebarreto/CestApp.git
cd CestApp
npm install

# Dev build required (ML Kit needs native code)
npx expo run:ios     # or
npx expo run:android
```

> Expo Go won't work. You need a development build.

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React Native 0.81 + Expo SDK 54 |
| Navigation | Expo Router |
| Styling | NativeWind v4 |
| Database | Drizzle ORM + expo-sqlite |
| State | Zustand v5 |
| OCR | rn-mlkit-ocr |
| PDF | Custom parser + pako |
| i18n | i18next |
| Animations | Reanimated v4 |
| Charts | react-native-gifted-charts |

## Project Structure

```
app/           # Screens (Expo Router)
src/
  components/  # UI components
  db/          # Schema & queries
  services/    # OCR, PDF, capture, storage
  store/       # Zustand state
  i18n/        # Translations
```

## How It Works

1. **Detect** — Auto-detects decimal separators, date formats, receipt layout
2. **Extract** — ML Kit for images, custom parser for PDFs
3. **Categorize** — User corrections → keyword matching → default

Learning is store-aware: same item can have different categories at different stores.

## Contributing

1. Fork → branch → commit → PR
2. TypeScript strict mode
3. NativeWind for styling
4. `useTranslation()` for all text
5. Test iOS + Android + dark mode

## Roadmap

- Cloud sync
- Export (CSV, PDF)
- Budget alerts
- More languages
- Better OCR parsing
- Widgets

## License

MIT — see [LICENSE](LICENSE)

---

<p align="center">
  Made with care by <a href="https://github.com/jaimebg">JBGSoft - Jaime Barreto 🧡</a>
</p>
