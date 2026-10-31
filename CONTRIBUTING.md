# Contributing to CestApp

CestApp reads supermarket receipts on the phone, without sending them anywhere. It started in
Spain and is opening to other countries one chain at a time. The knowledge of how a chain prints
its receipts lives in code, as a template per chain and country, so the app never asks its users
to teach it anything.

## Ways to help

- **Donate a ticket.** You live somewhere CestApp can't read yet and you have a receipt. No code,
  no build: open a [Donate a ticket](../../issues/new?template=donate-ticket.yml) issue.
- **Write a chain template.** You know a little TypeScript. Pick a donated ticket and write the
  template for its chain. You need Node and the repo, not a phone build.
- **Add a UI language.** Translate the app's text into your language.

## Donating a ticket

Take a flat, well-lit photo with the whole receipt in frame and attach it to a
[Donate a ticket](../../issues/new?template=donate-ticket.yml) issue. Before uploading, cover the
card number digits. The issue is public; by submitting you release the photo under CC0 1.0 so test
data can be derived from it. Photos never enter the repository; the issue is the only place they
live.

## Turning a donation into a fixture

This step needs a development build, so it is normally done by the maintainer. Fixtures carry
the output of the OCR engine the app ships (ML Kit), not a desktop stand-in.

1. Run a development build on the Android emulator (`npx expo run:android`).
2. Add the donated photo to the emulator's gallery and import it from the Scan tab. Development
   builds record every capture to the app's `Documents/bench/`.
3. Pull the captures to a folder **outside** the repo:
   `BENCH_DIR=<folder> scripts/bench/pull.sh android`.
4. Scrub the capture into a fixture:

   ```bash
   BENCH_DIR=<folder> RECORD=<capture id> COUNTRY=PT CHAIN=lidl \
   DONATION=<donation issue url> TOTAL=23.45 [SUBTOTAL=24.10] npm run fixture
   ```

   `TOTAL` (and `SUBTOTAL`, when the receipt prints one) is the figure read off the photo by a
   person. The script removes card numbers, authorization and terminal codes and the time of sale,
   and writes `src/config/countries/<cc>/__tests__/fixtures/<chain>-NN.json`. It refuses a
   `BENCH_DIR` inside the repository.

5. Attach the fixture JSON to the donation issue and label it `fixture-ready`. Don't commit it
   on its own: a fixture tests itself against its chain's template, so without the template CI
   fails. It lands in the same pull request as the template.

## Writing a chain template

Start from a donation issue labelled `fixture-ready`: download its fixture JSON into
`src/config/countries/<cc>/__tests__/fixtures/` (keep its file name). Your pull request adds the
template and that fixture together.

A template is one file: `src/config/countries/<cc>/chains/<chain>.ts`, exporting a
`ChainTemplate` (see `src/config/countries/types.ts` and the Spanish chains in
`src/config/countries/es/chains/` for worked examples). Add it to the country's `index.ts`
chain list.

The fields that matter most:

| Field            | What it holds                                                                |
| ---------------- | ---------------------------------------------------------------------------- |
| `chainId`        | Lowercase id, unique within the country (`lidl`)                             |
| `country`        | The country code (`PT`). Lidl Spain and Lidl Portugal are separate templates |
| `nifPatterns`    | Every tax ID the chain prints. The strongest way the chain is recognised     |
| `namePatterns`   | Regexes for the chain's printed name                                         |
| `fingerprints`   | Own brands and slogans that give the chain away when its name is misread     |
| `layout`         | Columnar or inline, where prices sit, whether there are unit prices          |
| `parsing`        | Item line patterns, date patterns, total/subtotal/tax/discount keywords      |
| `ocrCorrections` | Fixes for the misreadings this chain's typeface causes                       |

**You don't write tests.** Every fixture under `src/config/countries/*/__tests__/fixtures/` tests
itself (`src/config/countries/__tests__/chainFixtures.test.ts`): it must have been produced by the
scrub tool, it must be read as its chain and country, and **its parsed items must add up to the
printed subtotal (or total) within 2%**. That last check is the bar for merging a chain: it is
what lets a maintainer merge a chain without holding the receipt.

## Adding a country

A country is a folder `src/config/countries/<cc>/` with a `country.ts` exporting a
`CountryDefinition` and an `index.ts` exporting it with its chain list (see `pt/` for a country
with no chains yet). The definition holds the currency, decimal and thousands separators, date
order, tax rates, the receipt keywords in the country's language, the shapes of its tax IDs
(`taxIdPatterns`) and other marks that point at it (`signals`). Then:

1. Add the code to `CountryCode` in `src/config/countries/types.ts`.
2. Register the country and its chains in `src/config/countries/index.ts`.
3. If the currency is new, add it to `CURRENCIES` in `src/config/currency.ts`.

Users never pick a country: it is detected from the receipt. Where a receipt carries a fiscal QR
code that can be read offline (Portugal and Austria today), a parser in `src/services/fiscal/`
reads its total, date and tax ID; online-only codes are out of scope.

## Adding a UI language

1. Add `src/i18n/locales/<lang>.json`, translated from `en.json`.
2. Register it in `SUPPORTED_LANGUAGES` in `src/i18n/index.ts`.
3. Add its number format to `getNumberLocale` in `src/config/currency.ts`.

## Before opening a pull request

```bash
npx tsc --noEmit && npm run lint && npm run format:check && npm test
```

CI runs the same checks. Use conventional commit messages (`feat:`, `fix:`, `docs:`).
