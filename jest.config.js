const jestCommon = require('./test/config/jest.common');
const lintProject = require('./test/config/jest.lint');
const unitTestProject = require('./test/config/jest.unit');

module.exports = {
  ...jestCommon,

  projects: [unitTestProject, lintProject],
};
