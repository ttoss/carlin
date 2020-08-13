import fs from 'fs';
import log from 'npmlog';
import path from 'path';

import { exec, writeTemplate, TemplateParams } from '../utils';

const logPrefix = 'monorepo';

const writeFiles = async () => {
  const getFilesArr = (defaultTemplateParams: TemplateParams = {}) => {
    const files: Array<{
      templateName: string;
      writeDir: string;
      templateParams?: Partial<TemplateParams>;
    }> = [
      { templateName: 'fileMock.js', writeDir: '__mocks__' },
      { templateName: 'styleMock.js', writeDir: '__mocks__' },
      { templateName: 'dot-eslintignore', writeDir: '.' },
      { templateName: 'dot-eslintrc.js', writeDir: '.' },
      { templateName: 'dot-gitignore', writeDir: '.' },
      { templateName: 'dot-huskyrc.js', writeDir: '.' },
      { templateName: 'dot-prettierrc.js', writeDir: '.' },
      { templateName: 'dot-stylelintrc.js', writeDir: '.' },
      { templateName: 'commitlint.config.js', writeDir: 'config' },
      { templateName: 'eslintrc.base.js', writeDir: 'config' },
      { templateName: 'eslintrc.react.js', writeDir: 'config' },
      { templateName: 'husky.config.js', writeDir: 'config' },
      { templateName: 'jest.config.base.js', writeDir: 'config' },
      { templateName: 'lerna.json', writeDir: '.' },
      { templateName: 'lint-staged.config.js', writeDir: 'config' },
      { templateName: 'prettier.config.js', writeDir: 'config' },
      { templateName: 'stylelint.config.js', writeDir: 'config' },
      { templateName: 'tsconfig.base.json', writeDir: 'config' },
      { templateName: 'tsconfig.react.json', writeDir: 'config' },
    ];

    return files.map(({ templateName, writeDir, templateParams }) => ({
      templateName,
      writeDir,
      templateDir: path.resolve(__dirname, 'templates'),
      templateParams: { ...defaultTemplateParams, ...templateParams },
    }));
  };

  try {
    log.info(logPrefix, 'Writing files...');
    await Promise.all(getFilesArr().map((file) => writeTemplate(file)));
    /**
     * Create "packages" folder.
     */
    await fs.promises.mkdir('packages');
  } catch (error) {
    log.error(logPrefix, 'Cannot write files.');
    log.error(logPrefix, 'Error message: %j', error.message);
  }
};

const installDependencies = async () => {
  try {
    log.info(logPrefix, 'Installing dependencies...');
    await exec(
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
        'pepe-cli',
        'prettier',
        'stylelint',
        'stylelint-config-prettier',
        'stylelint-prettier',
        'ts-jest',
        'ts-node',
        'typescript',
      ].join(' '),
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require, import/no-dynamic-require
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
