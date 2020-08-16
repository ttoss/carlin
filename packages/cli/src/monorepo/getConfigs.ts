/**
 * Exported to be added to documentation.
 */

import { templates } from './templates';

export const monorepoTemplates = templates.map(({ content, ...rest }) => ({
  ...rest,
  content: content.trim(),
}));

export const packagesWillBeInstalled = [
  '@commitlint/cli',
  '@commitlint/config-conventional',
  '@typescript-eslint/eslint-plugin',
  '@typescript-eslint/parser',
  'eslint',
  'eslint-config-airbnb',
  'eslint-config-airbnb-base',
  'eslint-config-prettier',
  'eslint-config-react-app',
  'eslint-plugin-flowtype',
  'eslint-plugin-import',
  'eslint-plugin-jest',
  'eslint-plugin-jest-dom',
  'eslint-plugin-jsx-a11y',
  'eslint-plugin-prettier',
  'eslint-plugin-react',
  'eslint-plugin-react-hooks',
  'eslint-plugin-relay',
  'husky',
  'imagemin-lint-staged',
  'jest',
  'jest-emotion',
  'lerna',
  'lint-staged',
  'npm-check-updates',
  'pepe-cli',
  'prettier',
  'stylelint',
  'stylelint-config-prettier',
  'stylelint-prettier',
  'ts-jest',
  'ts-node',
  'typescript',
];

export const packageJsonProperties = {
  name: '<name>',
  private: true,
  scripts: {
    'list-packages': 'lerna ls',
    'list-updates': 'npx ncu && lerna exec -- npx ncu',
    reinstall: 'yarn run remove-all-node-modules && yarn',
    'remove-all-node-modules':
      'npx lerna exec -- rm -rf node_modules && rm -rf node_modules && rm -f yarn.lock',
    'update-all': 'npx ncu -u && lerna exec -- npx ncu -u',
    version: 'lerna version',
  },
  workspaces: ['packages/**/*'],
};
