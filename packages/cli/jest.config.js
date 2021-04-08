module.exports = {
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 25,
      functions: 35,
      lines: 45,
      statements: 50,
    },
  },
  preset: 'ts-jest',
  setupFiles: ['<rootDir>/setupTests.js'],
};
