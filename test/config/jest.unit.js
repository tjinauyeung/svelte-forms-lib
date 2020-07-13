module.exports = {
  ...require('./jest.common'),

  collectCoverageFrom: ['<rootDir>/lib/**/*.js'],

  displayName: 'unit',

  testMatch: ['<rootDir>/test/*.spec.js'],
};
