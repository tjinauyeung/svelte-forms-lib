module.exports = {
  root: true,

  ignorePatterns: ['test/**/*.js'],

  extends: ['eslint:recommended', 'plugin:unicorn/recommended', 'prettier'],

  rules: {
    'unicorn/no-reduce': ['off'],
  },

  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
};
