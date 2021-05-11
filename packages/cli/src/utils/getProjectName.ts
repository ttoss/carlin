import { pascalCase } from 'change-case';

import { getEnvVar } from './environmentVariables';
import { getPackageName } from './packageJson';

/**
 * This variable is used to determine the name of the whole project. If the
 * project is a monorepo, the project name is considered as the
 * [scope](https://docs.npmjs.com/cli/v7/using-npm/scope) of the `package.json`
 * name property. If isn't a monorepo, is considered the package name.
 *
 * This variable is used to set some properties on CloudFormation tags and
 * defining the name of some stacks, for instance, the CICD stack.
 */
export const getProjectName = () => {
  if (getEnvVar('PROJECT')) {
    return getEnvVar('PROJECT') as string;
  }

  const name = getPackageName();

  try {
    return pascalCase(name.split(/[@/]/)[1]);
  } catch (err) {
    return pascalCase(name);
  }
};
