import fs from 'fs';
import log from 'npmlog';
import path from 'path';

import { exec, writeTemplate, TemplateParams } from '../utils';

const logPrefix = 'monorepo';

const writeFiles = async () => {
  const getFilesArr = (defaultTemplateParams: TemplateParams) => {
    const files: Array<{
      template: string;
      dir?: string;
      templateParams?: Partial<TemplateParams>;
    }> = [
      { template: 'fileMock.js', dir: '__mocks__' },
      { template: 'styleMock.js', dir: '__mocks__' },
      { template: 'dot-eslintignore', dir: '.' },
      { template: 'dot-eslintrc.js', dir: '.' },
      { template: 'dot-gitignore.js', dir: '.' },
      { template: 'dot-huskyrc.js', dir: '.' },
      { template: 'dot-prettierrc.js', dir: '.' },
      { template: 'dot-stylelintrc.js', dir: '.' },
      { template: 'commitlint.config.js', dir: 'config' },
      { template: 'eslintrc.base.js', dir: 'config' },
      { template: 'eslintrc.react.js', dir: 'config' },
      { template: 'husky.config.js', dir: 'config' },
      { template: 'jest.config.base.js', dir: 'config' },
      { template: 'lerna.json', dir: '.' },
      { template: 'lint-staged.config.js', dir: 'config' },
      { template: 'prettier.config.js', dir: 'config' },
      { template: 'stylelint.config.js', dir: 'config' },
      { template: 'tsconfig.base.json', dir: 'config' },
      { template: 'tsconfig.react.json', dir: 'config' },
    ];

    return files.map(({ template, dir, templateParams }) => ({
      dir,
      template: path.resolve(__dirname, 'templates', template),
      templateParams: { ...defaultTemplateParams, ...templateParams },
    }));
  };

  try {
    log.info(logPrefix, 'Writing files...');
    await Promise.all(
      getFilesArr({ monorepoName: 'n' }).map((file) => writeTemplate(file))
    );
  } catch (error) {
    log.error(logPrefix, 'Cannot write files.');
    log.error(logPrefix, 'Error message: %j', error.message);
  }
};

const installDependencies = () => {
  try {
    log.info(logPrefix, 'Installing dependencies...');
    return exec(
      [
        'yarn add -DW',
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
        'prettier',
        'stylelint',
        'stylelint-config-prettier',
        'stylelint-prettier',
        'ts-jest',
        'ts-node',
        'typescript',
      ].join(' ')
    );
  } catch (error) {
    log.error(logPrefix, 'Cannot install dependencies.');
    log.error(logPrefix, 'Error message: %j', error.message);
  }
};

const updatePackageJson = () => {
  try {
    log.info(logPrefix, 'Updating package.json...');
    const packageJsonPath = path.resolve(process.cwd(), 'package.json');
    const packageJson = require(packageJsonPath);
    packageJson.private = true;
    packageJson.scripts = {
      ...packageJson.scripts,
      'list-packages': 'lerna ls',
      'list-updates': 'npx ncu && lerna exec -- npx ncu',
      'update-all': 'npx ncu -u && lerna exec -- npx ncu -u',
      reinstall: 'yarn run remove-all-node-modules && yarn',
      'remove-all-node-modules':
        'npx lerna exec -- rm -rf node_modules && rm -rf node_modules && rm -f yarn.lock',
    };
    packageJson.workspaces = ['packages/**/*'];
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  } catch (error) {
    log.error(logPrefix, 'Cannot update package.json.');
    log.error(logPrefix, 'Error message: %j', error.message);
  }
};

export const monorepo = async () => {
  log.info(logPrefix, 'Updating monorepo...');
  await writeFiles();
  await installDependencies();
  updatePackageJson();
};
