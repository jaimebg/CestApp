// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');
const reactCompiler = require('eslint-plugin-react-compiler');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    plugins: {
      'react-compiler': reactCompiler,
    },
    rules: {
      'react-compiler/react-compiler': 'error',
    },
  },
  {
    ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*'],
  },
]);
