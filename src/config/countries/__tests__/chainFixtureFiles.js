// Reads every chain fixture under src/config/countries/<cc>/__tests__/fixtures/.
// Plain JS because the TS project has no Node types (tsconfig `types` is ["jest"]).
const fs = require('fs');
const path = require('path');

const COUNTRIES_DIR = path.join(process.cwd(), 'src', 'config', 'countries');

/** @returns {{ name: string, fixture: unknown }[]} */
function chainFixtureFiles() {
  return fs
    .readdirSync(COUNTRIES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== '__tests__')
    .flatMap((country) => {
      const dir = path.join(COUNTRIES_DIR, country.name, '__tests__', 'fixtures');
      if (!fs.existsSync(dir)) return [];
      return fs
        .readdirSync(dir)
        .filter((file) => file.endsWith('.json'))
        .map((file) => ({
          name: `${country.name}/${file}`,
          fixture: JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')),
        }));
    });
}

module.exports = { chainFixtureFiles };
