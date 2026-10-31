// Turns one recorded capture into a scrubbed chain fixture. It reads captures
// kept outside the repo, so it runs on demand and never as part of `npm test`.
const base = require('./jest.config');

module.exports = {
  ...base,
  testMatch: ['<rootDir>/scripts/fixtures/**/*.fixture.js'],
};
