module.exports = {
  root: true,

  extends: ['eslint:recommended', 'plugin:unicorn/recommended', 'prettier'],

  rules: {
    'unicorn/no-reduce': ['off'],
  },
};
