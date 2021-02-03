import { paramCase, pascalCase } from 'change-case';

import { getCurrentBranch, getEnvironment, getPackageName } from '../utils';

let preDefinedStackName = '';

/**
 * Used by CLI set stack name when it is defined.
 */
export const setPreDefinedStackName = (name: string) => {
  preDefinedStackName = name;
};

/**
 * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-limits.html
 */
export const STACK_NAME_MAX_LENGTH = 128;

export const limitStackName = (stackName: string) =>
  `${stackName}`.substring(0, STACK_NAME_MAX_LENGTH);

/**
 * If stack name isn't previously defined, the name will be created accordingly
 * with the following rules:
 *
 * 1. The name has to parts.
 *
 * 1. The first part is defined by the package.json name, if it is defined.
 * Else, it'll be a random name starting with the string "Stack-", , e.g. **Stack-96830**.
 *
 * 1. The second part will be defined by, whichever is defined first:
 *  1. environment;
 *  1. branch name in param-case;
 *  1. `undefined`.
 *
 * Example:
 *
 * | Case | Package Name | Environment | Branch Name | `--stack-name` | Stack Name |
 * | ---- | ------------ | ----------- | ----------  | -------------- | ---------- |
 * | #1 | @package/name | prod | main | MyStackName | **MyStackName** |
 * | #2 | @package/name | prod | main | | **PackageName-prod** |
 * | #3 | @package/name | | main | | **PackageName-main** |
 * | #4 | @package/name | | | | **PackageName** |
 * | #5 | | prod | main | | **Stack-96820-prod** |
 * | #6 | | | main | | **Stack-96820-main** |
 * | #7 | | | | | **Stack-96820** |
 *
 * CAUTION!!!
 *
 * This method is a BREAKING CHANGE for **carlin**, I hope we never have to
 * change this algorithm, ever. Stack name is how we track the stacks on AWS.
 * Suppose we change this algorithm. If we perform an update or destroy
 * operation, **carlin** will create another stack or do nothing because the
 * old stack won't be found due to stack name changing.
 *
 */
export const getStackName = async () => {
  if (preDefinedStackName) {
    return preDefinedStackName;
  }

  const [currentBranch, environment, packageName] = await Promise.all([
    getCurrentBranch(),
    getEnvironment(),
    getPackageName(),
  ]);

  const firstName = packageName
    ? pascalCase(packageName)
    : `Stack-${Math.round(Math.random() * 100000)}`;

  const secondName = (() => {
    if (environment) {
      return environment;
    }

    if (currentBranch) {
      return paramCase(currentBranch);
    }

    return undefined;
  })();

  const name = [firstName, secondName].filter((word) => !!word).join('-');

  return limitStackName(name);
};
