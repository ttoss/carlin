export const templateName = 'eslintrc.base.js';

export const dir = 'config';

export const content = `
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    // Too slow when using project
    // "project": "./tsconfig.base.json"
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  env: {
    browser: true,
    'jest/globals': true,
  },
  plugins: ['@typescript-eslint', 'jest', 'prettier'],
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
    'plugin:prettier/recommended',
    'prettier/@typescript-eslint',
  ],
  rules: {
    /**
     * Annoying to force return type.
     */
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    /**
     * annoying to force return type.
     */
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    /**
     * TODO: remove some day. ES modules don't import without extensions
     */
    'import/extensions': 'off',
    /**
     * Remove error when importing Yarn Workspace modules.
     */
    'import/no-unresolved': 'off',
    /**
     * Remove error when importing Yarn Workspace modules.
     */
    'import/no-extraneous-dependencies': 'off',
    /**
     * Allow single Named-export.
     */
    'import/prefer-default-export': 'off',
    'no-console': 'off',
  },
  overrides: [
    {
      files: ['**/*.js', '**/*.jsx'],
      rules: {
        '@typescript-eslint': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/camelcase': 'off',
      },
    },
  ],
};
`;
