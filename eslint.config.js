// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');
const reactCompiler = require('eslint-plugin-react-compiler');

const RESTRICTED_APPLE_LLM_IMPORT = {
  name: '@react-native-ai/apple',
  message:
    'This package resolves its TurboModule with getEnforcing at module scope, which throws ' +
    'wherever the native module is absent (every Android device, and any iOS build without ' +
    'the pod). Import it only through src/services/llm/appleBackend.ts, which resolves it ' +
    'lazily behind a Platform check.',
};

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    plugins: {
      'react-compiler': reactCompiler,
    },
    rules: {
      'react-compiler/react-compiler': 'error',
      'no-restricted-imports': ['error', { paths: [RESTRICTED_APPLE_LLM_IMPORT] }],
      // Enabled by eslint-config-expo 57 (eslint-plugin-react-hooks v7.1.1),
      // flagged pre-existing intentional patterns on upgrade:
      // - set-state-in-effect: deferred one-shot init and async data loading
      //   in effects used across the app (see settings.tsx, useLlmRefinement.ts)
      // - immutability: false positives on Reanimated shared value writes
      //   (AnimatedList.tsx) - .value assignment is the only API
      // Re-enable after migrating those patterns (e.g. to a caching data layer).
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
    },
  },
  {
    files: ['src/services/llm/appleBackend.ts', '**/__tests__/**', '**/__mocks__/**'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*'],
  },
]);
