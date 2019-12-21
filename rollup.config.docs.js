import alias from "rollup-plugin-alias";
import commonjs from "rollup-plugin-commonjs";
import livereload from "rollup-plugin-livereload";
import resolve from "rollup-plugin-node-resolve";
import svelte from "rollup-plugin-svelte";

const path = require("path");

export default {
  input: "docs-src/index.js",
  output: {
    sourcemap: true,
    format: "iife",
    name: "app",
    file: "docs/bundle.js"
  },
  plugins: [
    svelte(),
    resolve(),
    commonjs(),
    alias({
      resolve: [".svelte", "js"],
      entries: [{ find: "svelte-forms-lib", replacement: path.resolve(__dirname + "/build/index") }]
    }),
    livereload("docs")
  ],
  watch: {
    clearScreen: false
  }
};
