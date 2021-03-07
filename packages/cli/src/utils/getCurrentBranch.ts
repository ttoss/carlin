import git from 'simple-git';

export const BRANCH_UNDEFINED = '';

/**
 * Git current branch is used to determine the name of the stack when deploying
 * resources. If we provide a `BRANCH` or `BRANCH_NAME` through `process.env`,
 * these values will be used instead of Git current branch. Example:
 *
 * ```
 * BRANCH=branch-name carlin deploy
 * BRANCH_NAME=branch-name carlin deploy
 * ```
 */
export const getCurrentBranch = async () => {
  try {
    const env = process.env.BRANCH || process.env.BRANCH_NAME;

    if (env) {
      return env;
    }

    const { current } = await git().branch();

    return current || BRANCH_UNDEFINED;
  } catch (err) {
    return BRANCH_UNDEFINED;
  }
};
