
<p>
  <img src="https://svelte-forms-lib-sapper-docs.now.sh/logo.png" width="100px" height="100px" title="Svelte forms lib logo" alt="Svelte forms lib logo" />
</p>

<a href="https://www.npmjs.com/package/svelte-forms-lib">
  <img src="https://img.shields.io/npm/v/svelte-forms-lib.svg" alt="npm version">
</a>
<a href="https://www.npmjs.com/package/svelte-forms-lib">
  <img src="https://img.shields.io/npm/dm/svelte-forms-lib.svg" alt="npm downloads">
</a>
<a href="https://bundlephobia.com/result?p=svelte-forms-lib">
  <img src="https://img.shields.io/bundlephobia/min/svelte-forms-lib.svg" alt="minified size">
</a>
<a href="https://opensource.org/licenses/MIT">
  <img src="https://img.shields.io/npm/l/svelte-forms-lib.svg" alt="license">
</a>

Svelte forms lib is a lightweight library for managing forms in Svelte, with an
<a href="https://github.com/jaredpalmer/formik" target="_blank">Formik</a> like API.

### Installation

You may need to escape the `#` depending on your shell

```sh
npm install --save-dev tastyworks/svelte-forms-lib#<git-commit-hash>
```

or

```sh
npm install --save-dev tastyworks/svelte-forms-lib\#<git-commit-hash>
```

#### Local development

Until your PR is merged to master, you can use npm to link your current project to this repository

```sh
# in the root directory of the target project
npm link <path to svelte-forms-lib>

# example if repository is located in a sibling folder
npm link ../svelte-forms-lib
```

### Release

TBD: determine if semantic-release is worth integrating into CI, (the original repository uses semantic-release for automated package releases)

For now, after your PR is merged to master, use npm to install the dependency with the git commit hash of the commit in master

### Docs

Visit the <a href="https://svelte-forms-lib-sapper-docs.now.sh" target="_blank">documentation
website</a> to learn about the API and see examples.

#### Commit message conventions

This project uses [`semantic-release`](https://github.com/semantic-release/semantic-release)
for versioning, which requires commit messages to adhere to a specific format.

The easiest way to write commit messages which adhere to the format is to use
our npm script:

```bash
npm run commit
```
