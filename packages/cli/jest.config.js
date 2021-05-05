module.exports = {
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 31,
      functions: 51,
      lines: 57,
      statements: 60,
    },
  },
  preset: 'ts-jest',
  setupFiles: ['<rootDir>/setupTests.js'],
  silent: true,
};
