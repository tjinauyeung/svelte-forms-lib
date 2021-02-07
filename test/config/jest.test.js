module.exports = {
  ...require('./jest.common'),

  collectCoverageFrom: ['<rootDir>/lib/**/*.js'],

  displayName: 'test',

  moduleFileExtensions: ['js', 'svelte'],

  testMatch: ['<rootDir>/test/*.spec.js'],

  transform: {
    '^.+\\.svelte$': 'svelte-jester',
    /**
     * transform any svelte components in node_modules with svelte-jester
     */
    'node_modules/.+\\.svelte$': ['svelte-jester'],

    '^.+\\.m?(j|t)s$': 'babel-jest',
  },

  setupFilesAfterEnv: ['@testing-library/jest-dom/extend-expect'],
};
