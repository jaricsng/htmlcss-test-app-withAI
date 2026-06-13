import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // Ignored paths
  {
    ignores: ['dist/**', 'coverage/**'],
  },

  // Source files
  {
    files: ['src/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Downgrade to warn — the routes use 'as any' for raw DB rows; acceptable short-term
      '@typescript-eslint/no-explicit-any': 'warn',
      // Allow unused vars that start with _ (convention for intentionally unused params)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Empty catch blocks are intentional in several grader try/catch blocks
      '@typescript-eslint/no-empty-object-type': 'error',
      'no-console': ['warn', { allow: ['log', 'warn', 'error'] }],
    },
  },

  // Test files — relax rules that are too strict for test helpers
  {
    files: ['src/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  }
);
