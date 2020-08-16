import { paramCase } from 'change-case';
import deepMerge from 'deepmerge';
import fs from 'fs';
import log from 'npmlog';
import path from 'path';

import { exec, writeFileTemplates } from '../utils';

import {
  monorepoTemplates,
  packageJsonProperties,
  packagesWillBeInstalled,
} from './getConfigs';

const logPrefix = 'monorepo';

const writeMonorepoTemplates = async () => {
  try {
    log.info(logPrefix, 'Writing files...');
    await writeFileTemplates(monorepoTemplates);
  } catch (error) {
    log.error(logPrefix, 'Cannot write files.');
    log.error(logPrefix, 'Error message: %j', error.message);
  }
};

const installDependencies = async () => {
  try {
    log.info(logPrefix, 'Installing dependencies...');
    await exec(['yarn add -DW', ...packagesWillBeInstalled].join(' '));
  } catch (error) {
    log.error(logPrefix, 'Cannot install dependencies.');
    log.error(logPrefix, 'Error message: %j', error.message);
  }
};

const updatePackageJson = ({ name }: { name?: string }) => {
  try {
    log.info(logPrefix, 'Updating package.json...');
    const packageJsonPath = path.resolve(process.cwd(), 'package.json');
    const packageJson = fs.existsSync(packageJsonPath)
      ? // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require, import/no-dynamic-require
        require(packageJsonPath)
      : {};
    const newPackageJsonProperties = {
      ...packageJsonProperties,
      name: name ? paramCase(name) : packageJson.name || '',
    };
    const newPackageJson = deepMerge(packageJson, newPackageJsonProperties);
    newPackageJson.workspaces = [...new Set(newPackageJson.workspaces)];
    fs.writeFileSync(packageJsonPath, JSON.stringify(newPackageJson, null, 2));
  } catch (error) {
    log.error(logPrefix, 'Cannot update package.json.');
    log.error(logPrefix, 'Error message: %j', error.message);
  }
};

export const monorepo = async ({
  name,
  skipInstall,
  update,
}: {
  name?: string;
  skipInstall?: boolean;
  update?: boolean;
}) => {
  if (update) {
    log.info(logPrefix, 'Updating monorepo...');
  } else {
    if (!name) {
      throw new Error('"name" is not defined.');
    }
    log.info(logPrefix, 'Creating monorepo...');
    await fs.promises.mkdir(name);
    process.chdir(path.resolve(process.cwd(), name));
    await fs.promises.mkdir('packages');
    await exec('npm init -y');
  }
  await writeMonorepoTemplates();
  if (!skipInstall) {
    await installDependencies();
  }
  updatePackageJson({ name });
};
