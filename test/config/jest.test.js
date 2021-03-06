module.exports = {
  ...require('./jest.common'),

  collectCoverageFrom: ['<rootDir>/lib/**/*.js'],

  displayName: 'test',

  moduleFileExtensions: ['js', 'svelte'],

  moduleNameMapper: {
    '^lib/(.*)': '<rootDir>/lib/$1',
  },

  testMatch: ['<rootDir>/test/specs/**/*.spec.js'],

  transform: {
    '^.+\\.svelte$': ['svelte-jester', {preprocess: true}],
    /**
     * transform any svelte components in node_modules with svelte-jester
     */
    'node_modules/.+\\.svelte$': ['svelte-jester'],

    '^.+\\.m?(j|t)s$': 'babel-jest',
  },

  setupFilesAfterEnv: ['@testing-library/jest-dom/extend-expect'],
};
