module.exports = {
  hooks: {
    'pre-commit': 'npm run format',
    'pre-push': 'npm run test',
    'commit-msg': 'commitlint -E HUSKY_GIT_PARAMS',
  },
};
