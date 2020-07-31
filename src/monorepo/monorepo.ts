import fs from 'fs';
import log from 'npmlog';
import path from 'path';

import { exec } from '../utils';

import { writeTemplate, TemplateParams } from './templates/template';

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
    ];

    return files.map((f) => ({
      ...f,
      templateParams: { ...defaultTemplateParams, ...f.templateParams },
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
    packageJson.workspaces = ['packages/*'];
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
