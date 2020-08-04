import fs from 'fs';
import path from 'path';

const readPackageJson = () =>
  JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'package.json')).toString()
  );

const getPackageJsonProperty = ({
  env,
  property,
}: {
  env?: string;
  property: string;
}) => {
  if (env && process.env[env]) {
    return process.env[env];
  }
  try {
    return readPackageJson()[property];
  } catch {
    return '';
  }
};

export const getPackageName = (): string =>
  getPackageJsonProperty({ env: 'PACKAGE_NAME', property: 'name' });

export const getPackageVersion = (): string =>
  getPackageJsonProperty({ env: 'PACKAGE_VERSION', property: 'version' });
