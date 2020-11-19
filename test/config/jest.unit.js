module.exports = {
  ...require('./jest.common'),

  collectCoverageFrom: ['<rootDir>/lib/**/*.js'],

  displayName: 'unit',

  testMatch: ['<rootDir>/test/*.spec.js'],

  transform: {
    '^.+\\.svelte$': 'jest-transform-svelte',
    '^.+\\.js$': 'babel-jest',
  },
};
