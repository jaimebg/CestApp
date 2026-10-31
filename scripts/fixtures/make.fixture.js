// Scrubs one recorded capture into a chain fixture.
//
//   BENCH_DIR=<folder outside the repo> RECORD=<capture id> COUNTRY=PT CHAIN=lidl \
//   DONATION=<donation issue url> TOTAL=23.45 [SUBTOTAL=24.10] npm run fixture
//
// Writes src/config/countries/<country>/__tests__/fixtures/<chain>-NN.json.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { test, expect } = require('@jest/globals');
const { fixtureFromRecord } = require('../../src/services/bench/fixture');

const BENCH_DIR = process.env.BENCH_DIR;
const RECORD = process.env.RECORD;
const COUNTRY = process.env.COUNTRY;
const CHAIN = process.env.CHAIN;
const DONATION = process.env.DONATION;
const TOTAL = process.env.TOTAL;
const SUBTOTAL = process.env.SUBTOTAL;

function required(value, name) {
  if (!value)
    throw new Error(`${name} is required. See the header of scripts/fixtures/make.fixture.js.`);
  return value;
}

// The repository is public, and raw captures carry card digits, addresses and times.
function refuseFolderInsideRepo(dir) {
  const repo = execSync('git rev-parse --show-toplevel').toString().trim();
  const resolved = path.resolve(dir);
  if (resolved === repo || resolved.startsWith(`${repo}${path.sep}`)) {
    throw new Error(
      'BENCH_DIR is inside the repository, which is public. Use a folder outside it.'
    );
  }
}

test('makes a chain fixture', () => {
  const benchDir = required(BENCH_DIR, 'BENCH_DIR');
  refuseFolderInsideRepo(benchDir);

  const country = required(COUNTRY, 'COUNTRY').toUpperCase();
  const chainId = required(CHAIN, 'CHAIN').toLowerCase();
  const record = JSON.parse(
    fs.readFileSync(path.join(benchDir, 'captures', `${required(RECORD, 'RECORD')}.json`), 'utf8')
  );

  const fixture = fixtureFromRecord(record, {
    country,
    chainId,
    donation: required(DONATION, 'DONATION'),
    printed: {
      subtotal: SUBTOTAL ? Number(SUBTOTAL) : null,
      total: Number(required(TOTAL, 'TOTAL')),
    },
  });

  const dir = path.join(
    process.cwd(),
    'src/config/countries',
    country.toLowerCase(),
    '__tests__/fixtures'
  );
  fs.mkdirSync(dir, { recursive: true });
  let n = 1;
  while (fs.existsSync(path.join(dir, `${chainId}-${String(n).padStart(2, '0')}.json`))) n++;
  const file = path.join(dir, `${chainId}-${String(n).padStart(2, '0')}.json`);
  fs.writeFileSync(file, `${JSON.stringify(fixture, null, 2)}\n`);

  process.stdout.write(`Wrote ${path.relative(process.cwd(), file)}\n`);
  expect(fs.existsSync(file)).toBe(true);
});
