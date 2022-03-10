module.exports = {
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 31,
      functions: 55,
      lines: 60,
      statements: 63,
    },
  },
  preset: 'ts-jest',
  setupFiles: ['<rootDir>/setupTests.js'],
  silent: true,
  timers: 'fake',
};
