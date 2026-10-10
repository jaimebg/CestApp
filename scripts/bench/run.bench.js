// Replays the captures in $BENCH_DIR/captures through the reading pipeline and
// scores them against $BENCH_DIR/truth. Run with `BENCH_DIR=<folder> npm run bench`.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { jest, test } = require('@jest/globals');
const { runBench } = require('../../src/services/bench/runBench');

const benchDir = process.env.BENCH_DIR;

function readJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => ({ name, text: fs.readFileSync(path.join(dir, name), 'utf8') }));
}

// The repository is public, and receipts carry card digits, addresses and times.
function refuseFolderInsideRepo(dir) {
  const repo = execSync('git rev-parse --show-toplevel').toString().trim();
  const resolved = path.resolve(dir);
  if (resolved === repo || resolved.startsWith(`${repo}${path.sep}`)) {
    throw new Error(
      'BENCH_DIR is inside the repository, which is public. Use a folder outside it.'
    );
  }
}

function commit() {
  const sha = execSync('git rev-parse --short HEAD').toString().trim();
  const dirty = execSync('git status --porcelain').toString().trim().length > 0;
  return dirty ? `${sha}-dirty` : sha;
}

test('reading benchmark', () => {
  if (!benchDir) throw new Error('Set BENCH_DIR to the local benchmark folder');
  refuseFolderInsideRepo(benchDir);

  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});

  const reportsDir = path.join(benchDir, 'reports');
  const io = {
    captureFiles: () => readJsonFiles(path.join(benchDir, 'captures')),
    truthFiles: () => readJsonFiles(path.join(benchDir, 'truth')),
    previousReport: () => {
      const latest = readJsonFiles(reportsDir).at(-1);
      return latest ? JSON.parse(latest.text) : null;
    },
    saveReport: (fileName, report) => {
      fs.mkdirSync(reportsDir, { recursive: true });
      fs.writeFileSync(path.join(reportsDir, fileName), JSON.stringify(report, null, 2));
    },
  };

  const run = runBench(io, { createdAt: new Date(), commit: commit() });
  process.stdout.write(`\n${run.text}\n\nSaved ${path.join(reportsDir, run.fileName)}\n`);
}, 120000);
