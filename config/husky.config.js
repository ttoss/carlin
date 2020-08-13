module.exports = {
  hooks: {
    'commit-msg':
      'commitlint -E HUSKY_GIT_PARAMS --config config/commitlint.config.js',
    'pre-commit': 'lint-staged --config config/lint-staged.config.js',
  },
};
