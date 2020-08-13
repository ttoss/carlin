const fs = require('fs');

/**
 * Commit name has the type(scope): message format. This function returns the
 * length of type(scope).
 */
const getCommitTypeScopeLength = () => {
  const branchName = fs
    .readFileSync(process.env.HUSKY_GIT_PARAMS, 'utf8')
    .trim();
  const [typeScope] = branchName.split(':');
  return typeScope.length;
};

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': () => {
      const headerMaxLength = 72 + getCommitTypeScopeLength();
      return [2, 'always', headerMaxLength];
    },
  },
};
