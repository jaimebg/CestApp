module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  clearMocks: true,
  modulePathIgnorePatterns: ['<rootDir>/.worktrees/', '<rootDir>/node_modules/'],
  testPathIgnorePatterns: ['<rootDir>/.worktrees/'],
};
