module.exports = {
  singleQuote: true,
  trailingComma: 'all',
  overrides: [
    {
      files: ['*.yml', '*.yaml'],
      options: {
        /**
         * This size because some CloudFormation resource name may have a
         * a big name.
         */
        printWidth: 200,
      },
    },
  ],
};
