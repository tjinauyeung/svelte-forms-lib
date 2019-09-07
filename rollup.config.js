import typescript from "rollup-plugin-typescript";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import pkg from "./package.json";

export default {
  input: "./src/index.ts",
  output: [
    {
      file: pkg.main,
      format: "umd",
      name: "index",
      sourcemap: true
    }
  ],
  plugins: [
    typescript(),
    resolve({
      browser: true,
      dedupe: importee =>
        importee === "svelte" || importee.startsWith("svelte/")
    }),
    commonjs()
  ]
};
