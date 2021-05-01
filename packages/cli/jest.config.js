module.exports = {
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  preset: 'ts-jest',
  setupFiles: ['<rootDir>/setupTests.js'],
  silent: true,
};
