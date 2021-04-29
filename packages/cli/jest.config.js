module.exports = {
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 28,
      functions: 40,
      lines: 53,
      statements: 56,
    },
  },
  preset: 'ts-jest',
  setupFiles: ['<rootDir>/setupTests.js'],
  silent: true,
};
