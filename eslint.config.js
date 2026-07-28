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
