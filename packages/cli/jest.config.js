module.exports = {
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 50,
      lines: 55,
      statements: 60,
    },
  },
  preset: 'ts-jest',
  setupFiles: ['<rootDir>/setupTests.js'],
};
