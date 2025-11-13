import eslintJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import unused from 'eslint-plugin-unused-imports';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Ignore paths (flat config way)
  {
    ignores: [
      'node_modules/**',
      'lib/**',
      'cache/**',
      'scripts/testnet-deployment/**',
      'scripts/mocks/**',
      'test/v1/**',
    ],
  },

  // Base + TS
  eslintJs.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    plugins: {
      import: importPlugin,
      'unused-imports': unused,
      prettier: prettierPlugin,
    },
    rules: {
      // Prettier: turn off conflicting formatting rules + enforce via plugin
      ...prettierConfig.rules,
      'prettier/prettier': 'error',

      // Your rules (kept)
      'comma-spacing': ['error', { before: false, after: true }],
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',

      // Import hygiene
      'import/order': [
        'error',
        {
          groups: ['external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],
      'sort-imports': ['error', { ignoreDeclarationSort: true, ignoreCase: true }],

      // 🔥 Auto-remove unused imports, and keep function signatures tidy
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];
