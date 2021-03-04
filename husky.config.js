module.exports = {
  hooks: {
    'pre-commit': 'npm run format',
    'pre-push': 'npm test',
    'commit-msg':
      'commitlint -E HUSKY_GIT_PARAMS --help-url="https://github.com/tjinauyeung/svelte-forms-lib/#commit-message-conventions"',
  },
};
