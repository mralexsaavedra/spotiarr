const { resolve } = require('node:path');

const project = resolve(process.cwd(), 'tsconfig.json');

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parserOptions: {
    project: true,
  },
  plugins: ['@typescript-eslint', 'react', 'import'],
  parser: '@typescript-eslint/parser',
  overrides: [
    {
      files: ['*.ts?(x)'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:prettier/recommended',
      ],
      parserOptions: {
        project,
      },
    },
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  ignorePatterns: ['node_modules', 'dist', '*.js'],
  rules: {
    'import/no-extraneous-dependencies': 'error',
    'react-hooks/exhaustive-deps': [
      'error',
      {
        additionalHooks: '(useAnimatedStyle|useDerivedValue|useAnimatedProps)',
      },
    ],
    'no-console': 'off',
    'no-var': 'error',
    '@typescript-eslint/consistent-type-exports': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-empty-interface': [
      'error',
      {
        allowSingleExtends: true,
      },
    ],
    "react/react-in-jsx-scope": "off",
    'react/jsx-sort-props': [
      'error',
      {
        callbacksLast: true,
        shorthandLast: true,
        multiline: 'last',
        reservedFirst: true,
      },
    ],
    // Removed unsupported React Native rules
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'default',
        format: ['camelCase'],
      },
      {
        selector: 'import',
        format: ['PascalCase', 'camelCase'],
      },
      // PascalCase for Classes, Interfaces, Types, ...
      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
      {
        selector: 'enumMember',
        format: ['UPPER_CASE'],
      },
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
      },
      {
        selector: 'parameter',
        format: ['camelCase', 'PascalCase'],
      },
      // camelCase | snake_case | PascalCase for regular properties
      {
        selector: 'property',
        format: ['camelCase', 'snake_case', 'PascalCase'],
      },
      // properties with single or double leading-underscores will be camelCase (__html, _id, ...)
      {
        selector: 'property',
        format: ['camelCase'],
        prefix: ['__', '_'],
        filter: {
          regex: '^_+',
          match: true,
        },
      },
    ],
  },
};
