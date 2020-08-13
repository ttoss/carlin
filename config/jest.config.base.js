module.exports = (rootDir, type) => {
  const base = {
    collectCoverage: true,
    coverageThreshold: {
      global: {
        /**
         * https://stackoverflow.com/a/35035060/8786986
         *
         * "Somewhere where the code can take more than one route, ie it branches.
         * A couple of examples of branching statements are if/else and switch
         * statements.
         *
         * Branch coverage tracks which of those branches have been executed so
         * you can ensure all routes are tested properly.""
         *
         */
        branches: 50,
        functions: 50,
        /**
         * https://github.com/gotwarlost/istanbul/issues/639#issuecomment-225632261
         *
         * "if you have a line of code that says var x= 10; console.log(x)
         * that's one line and 2 statements.
         *
         * Of the two statement coverage is more accurate"
         */
        statements: 50,
      },
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    moduleNameMapper: {
      '.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': `${__dirname}/../__mocks__/fileMock.js`,
      '.(css|less|scss)$': `${__dirname}/../__mocks__/styleMock.js`,
    },
    preset: 'ts-jest',
    rootDir,
    snapshotSerializers: ['jest-emotion'],
    testRegex: 'src/.*.(test|spec).tsx?$',
  };

  if (type === 'e2e') {
    const { moduleFileExtensions, moduleNameMapper, preset } = base;
    return {
      moduleFileExtensions,
      moduleNameMapper,
      preset,
      rootDir,
      testRegex: 'e2e/.*.e2e.(spec|test).tsx?$',
    };
  }

  return base;
};
