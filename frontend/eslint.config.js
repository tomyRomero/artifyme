const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expo,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    // jest.mock factories are hoisted above the imports, so they load modules with require
    files: ['jest.setup.ts', '**/__tests__/**'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
]);
