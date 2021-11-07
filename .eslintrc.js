module.exports = {
  root: true,

  ignorePatterns: ['test/**/*.js'],

  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:unicorn/recommended',
    'prettier',
  ],

  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],

  rules: {
    'unicorn/no-array-reduce': ['off'],
  },
};
