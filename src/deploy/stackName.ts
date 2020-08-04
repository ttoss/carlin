import { paramCase, pascalCase } from 'change-case';

import { getCurrentBranch, getEnvironment, getPackageName } from '../utils';

let preDefinedStackName: string = '';

export const setPreDefinedStackName = (name: string) => {
  preDefinedStackName = name;
};

/**
 * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-using-console-create-stack-parameters.html
 */
export const STACK_NAME_MAX_LENGTH = 128;

export const limitStackName = (stackName: string) =>
  `${stackName}`.substring(0, STACK_NAME_MAX_LENGTH);

export const getStackName = async () => {
  if (preDefinedStackName) {
    return preDefinedStackName;
  }

  const [currentBranch, environment, packageName] = await Promise.all([
    getCurrentBranch(),
    getEnvironment(),
    getPackageName(),
  ]);

  const name = (() => {
    if (!packageName) {
      return `Stack-${Math.round(Math.random() * 100000)}`;
    }

    if (environment) {
      return `${pascalCase(packageName)}-${pascalCase(environment)}`;
    }

    if (currentBranch) {
      return `${pascalCase(packageName)}-${paramCase(currentBranch)}`;
    }

    return pascalCase(packageName);
  })();

  return limitStackName(name);
};

export const getAssetStackName = (stackName: string) => {
  const postfix = '-Assets';
  return limitStackName(
    `${stackName.substring(
      0,
      STACK_NAME_MAX_LENGTH - postfix.length
    )}${postfix}`
  );
};
