module.exports = {
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 32,
      functions: 54,
      lines: 59,
      statements: 62,
    },
  },
  preset: 'ts-jest',
  setupFiles: ['<rootDir>/setupTests.js'],
  silent: true,
};
