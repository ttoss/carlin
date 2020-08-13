const path = require('path');

module.exports = {
  plugins: ['react-hooks', 'relay', 'jest-dom'],
  extends: ['airbnb', 'react-app', path.resolve(__dirname, 'eslintrc.base.js')],
  rules: {
    'no-console': 'error',
    'react/jsx-props-no-spreading': 'off',
    'react/jsx-filename-extension': [
      'warn',
      {
        extensions: ['.jsx', '.tsx'],
      },
    ], // also want to use with ".tsx"
    'react/prop-types': 'off', // Is this incompatible with TS props type?
    'react/jsx-wrap-multilines': 'off', // This rule conflicts with prettier/prettier
    'react/require-default-props': 'off', // Problems with function components
    'react-hooks/rules-of-hooks': 'error',
    'relay/graphql-syntax': 'error',
    'relay/compat-uses-vars': 'warn',
    'relay/graphql-naming': 'error',
    'relay/generated-flow-types': 'off',
    'relay/no-future-added-value': 'warn',
    'relay/unused-fields': 'warn',
  },
};
