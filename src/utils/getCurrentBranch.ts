import git from 'simple-git/promise';

export const getCurrentBranch = () =>
  git()
    .branch()
    .then(({ current }) => current);
