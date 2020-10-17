import git from 'simple-git';

const branchUndefined = '';

export const getCurrentBranch = async () => {
  try {
    return git()
      .branch()
      .then(({ current }) => current || branchUndefined)
      .catch(() => branchUndefined);
  } catch {
    return branchUndefined;
  }
};
