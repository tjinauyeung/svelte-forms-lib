const jestCommon = require('./test/config/jest.common');
const lintProject = require('./test/config/jest.lint');
const testProject = require('./test/config/jest.test');

module.exports = {
  ...jestCommon,

  projects: [testProject, lintProject],
};
