const path = require('path');

module.exports = {
  ...require('./jest.common'),

  displayName: 'lint',

  runner: 'jest-runner-eslint',

  testMatch: ['<rootDir>/lib/**/*.js'],
};
