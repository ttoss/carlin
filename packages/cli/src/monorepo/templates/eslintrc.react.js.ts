export const templateName = 'eslintrc.react.js';

export const dir = 'config';

export const content = `
const path = require('path');

module.exports = {
  plugins: ['react-hooks', 'relay', 'jest-dom'],
  extends: ['airbnb', 'react-app', path.resolve(__dirname, 'eslintrc.base.js')],
  rules: {
    'no-console': 'error',
    /**
     * Also want to use with ".tsx".
     */
    'react/jsx-filename-extension': [
      'warn',
      {
        extensions: ['.jsx', '.tsx'],
      },
    ],
    'react/jsx-props-no-spreading': 'off',
    /**
     * This rule conflicts with prettier/prettier.
     */
    'react/jsx-wrap-multilines': 'off',
    /**
     * Is this incompatible with TS props type?
     */
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    /**
     * Problems with function components.
     */
    'react/require-default-props': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'relay/graphql-syntax': 'error',
    'relay/compat-uses-vars': 'warn',
    'relay/graphql-naming': 'error',
    'relay/generated-flow-types': 'off',
    'relay/no-future-added-value': 'warn',
    'relay/unused-fields': 'warn',
  },
};
`;
