import { jestConfig } from '@ttoss/config';

const config = jestConfig({
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 31,
      functions: 55,
      lines: 60,
      statements: 63,
    },
  },
  setupFiles: ['<rootDir>/setupTests.js'],
});

export default config;
