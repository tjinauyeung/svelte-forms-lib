const path = require('path');

module.exports = {
  rootDir: path.resolve(__dirname, '../..'),

  roots: ['<rootDir>/lib', '<rootDir>/test', __dirname],

  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
    'jest-watch-select-projects',
  ],
};
