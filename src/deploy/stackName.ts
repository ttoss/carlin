import { pascalCase } from 'change-case';

import { getCurrentBranch, getEnvironment, getPackageName } from '../utils';

/**
 * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-using-console-create-stack-parameters.html
 */
export const STACK_NAME_MAX_LENGTH = 128;

export const limitStackName = (stackName: string) =>
  `${stackName}`.substring(0, STACK_NAME_MAX_LENGTH);

export const getStackName = async ({
  preDefinedStackName,
}: {
  preDefinedStackName?: string;
} = {}) => {
  const [currentBranch, environment, packageName] = await Promise.all([
    getCurrentBranch(),
    getEnvironment(),
    getPackageName(),
  ]);

  const prefix = (() => {
    switch (environment) {
      case 'Testing':
        return 'Test';
      case 'Development':
        return 'Dev';
      default:
        return '';
    }
  })();

  const stackName = await (async () => {
    if (preDefinedStackName) {
      return preDefinedStackName;
    }

    if (environment === 'Testing') {
      return `${pascalCase(currentBranch)}-${pascalCase(packageName)}`;
    }

    return pascalCase(getPackageName());
  })();

  return limitStackName(`${prefix}${stackName}`);
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
