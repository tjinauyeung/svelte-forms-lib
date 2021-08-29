module.exports = {
  root: true,

  ignorePatterns: ['test/**/*.js'],

  extends: ['eslint:recommended', 'plugin:unicorn/recommended', 'prettier'],

  rules: {
    'unicorn/no-reduce': ['off'],
  },
};
