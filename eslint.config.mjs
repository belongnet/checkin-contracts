import eslintJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Base JS rules
  eslintJs.configs.recommended,

  // TS rules
  ...tseslint.configs.recommended,

  // Our overrides
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: false, // set to true + tsconfigRootDir if you want full type-aware linting
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // Let Prettier handle all formatting
      ...prettierConfig.rules,

      // Run Prettier as an ESLint rule (so --fix formats your code)
      'prettier/prettier': 'error',

      // Your additional code-style / best-practice rules here:
      'no-unused-vars': 'off', // handled by TS:
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
