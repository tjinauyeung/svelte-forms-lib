module.exports = {
  root: true,

  ignorePatterns: ['test/**/*.js'],

  extends: ['eslint:recommended', 'plugin:unicorn/recommended', 'prettier'],

  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],

  rules: {
    'unicorn/no-array-reduce': ['off'],
  },
};
