import jestCommon from './test/config/jest.common';
import lintProject from './test/config/jest.lint';
import testProject from './test/config/jest.test';

export default {
  ...jestCommon,

  projects: [testProject, lintProject],
};
