// The reading benchmark replays real captures kept outside the repo, so it runs
// on demand through its own config and never as part of `npm test`.
const base = require('./jest.config');

module.exports = {
  ...base,
  testMatch: ['<rootDir>/scripts/bench/**/*.bench.js'],
};
