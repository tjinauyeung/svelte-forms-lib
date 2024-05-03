import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import svelte from 'rollup-plugin-svelte';
import typescript from '@rollup/plugin-typescript';

/**
 * Jest requires a CommonJs import
 */
import svelteConfig from './svelte.config.js'

export default  {
  input: './lib/index.js',
  output: [
    {
      file: `./build/index.mjs`,
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
