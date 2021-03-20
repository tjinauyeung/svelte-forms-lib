import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import svelte from 'rollup-plugin-svelte';
import typescript from '@rollup/plugin-typescript';

/**
 * Jest requires a CommonJs import
 */
const svelteConfig = require('./svelte.config');

export default {
  input: './lib/index.js',
  output: [
    {
      file: `./build/esm/index.js`,
      format: 'esm',
      paths: (id) => id.startsWith('svelte/') && `${id.replace('svelte', '.')}`,
    },
    {
      file: `./build/index.js`,
      format: 'cjs',
      paths: (id) => id.startsWith('svelte/') && `${id.replace('svelte', '.')}`,
    },
  ],
  plugins: [
    typescript(),
    svelte({
      ...svelteConfig,
    }),
    resolve(),
    commonjs(),
  ],
};
