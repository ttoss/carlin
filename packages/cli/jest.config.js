module.exports = {
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 28,
      functions: 37,
      lines: 50,
      statements: 53,
    },
  },
  preset: 'ts-jest',
  setupFiles: ['<rootDir>/setupTests.js'],
  silent: true,
};
