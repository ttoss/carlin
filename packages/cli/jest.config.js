const config = require('../../config/jest.config.base')(__dirname);

module.exports = { ...config, collectCoverage: false };
