import path from 'path';

export default {
  rootDir: path.resolve(__dirname, '../..'),

  roots: ['<rootDir>/lib', '<rootDir>/test', __dirname],

  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
    'jest-watch-select-projects',
  ],
};
