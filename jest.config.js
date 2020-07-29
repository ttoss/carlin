module.exports = {
  collectCoverage: true,
  // coverageThreshold: {
  //   global: {
  //     /**
  //      * https://stackoverflow.com/a/35035060/8786986
  //      *
  //      * "Somewhere where the code can take more than one route, ie it branches.
  //      * A couple of examples of branching statements are if/else and switch
  //      * statements.
  //      *
  //      * Branch coverage tracks which of those branches have been executed so
  //      * you can ensure all routes are tested properly.""
  //      *
  //      */
  //     branches: 25,
  //     functions: 25,
  //     /**
  //      * https://github.com/gotwarlost/istanbul/issues/639#issuecomment-225632261
  //      *
  //      * "if you have a line of code that says var x= 10; console.log(x)
  //      * that's one line and 2 statements.
  //      *
  //      * Of the two statement coverage is more accurate"
  //      */
  //     statements: 25,
  //   },
  // },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': `${__dirname}/../__mocks__/fileMock.js`,
    '\\.(css|less|scss)$': `${__dirname}/../__mocks__/styleMock.js`,
  },
  preset: 'ts-jest',
  testRegex: 'src/.*\\.(test|spec)\\.tsx?$',
};
