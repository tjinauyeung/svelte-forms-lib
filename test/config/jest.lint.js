export default {
  ...import('./jest.common'),

  displayName: 'lint',

  runner: 'jest-runner-eslint',

  testMatch: ['<rootDir>/lib/**/*.js'],
};
