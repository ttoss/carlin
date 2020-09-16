import git from 'simple-git';

export const getCurrentBranch = () =>
  git()
    .branch()
    .then(({ current }) => current || 'branch_undefined');
