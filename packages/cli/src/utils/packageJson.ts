import * as findUp from 'find-up';
import fs from 'fs';

const readPackageJson = () => {
  const packageJsonDir = findUp.sync('package.json');

  if (!packageJsonDir) {
    return {};
  }

  return JSON.parse(fs.readFileSync(packageJsonDir).toString());
};

const getPackageJsonProperty = ({
  env,
  property,
}: {
  env?: string;
  property: string;
}) => {
  try {
    if (env && process.env[env]) {
      return process.env[env] as string;
    }

    return readPackageJson()[property];
  } catch {
    return '';
  }
};

export const getPackageName = (): string =>
  getPackageJsonProperty({ env: 'PACKAGE_NAME', property: 'name' });

export const getPackageVersion = (): string =>
  getPackageJsonProperty({ env: 'PACKAGE_VERSION', property: 'version' });
