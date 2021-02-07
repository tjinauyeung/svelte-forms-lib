module.exports = {
  env: {
    test: {
      presets: [['@babel/preset-env', {targets: {node: 'current'}}]],
      plugins: [
        // required for svelte-jsx and svelte-fragment-component
        [
          '@babel/plugin-transform-react-jsx',
          {runtime: 'automatic', importSource: 'svelte-jsx'},
        ],
      ],
    },
  },
};
