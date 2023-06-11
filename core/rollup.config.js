import dts from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';
import terser from '@rollup/plugin-terser';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default [
  {
    input: `src/index.ts`,
    plugins: [esbuild()],
    output: [{ file: 'dist/index.js', format: 'esm', exports: 'named' }],
  },
  {
    input: `src/index.ts`,
    plugins: [
      nodeResolve(),
      commonjs({ include: ['node_modules/**'] }),
      esbuild(),
    ],
    output: [{ file: 'dist/index.bundle.js', format: 'esm', exports: 'named' }],
  },
  {
    input: `src/index.ts`,
    plugins: [
      nodeResolve(),
      commonjs({ include: ['node_modules/**'] }),
      esbuild(),
      terser(),
    ],
    output: [
      { file: 'dist/index.bundle.min.js', format: 'esm', exports: 'named' },
    ],
  },
  {
    input: `src/index.ts`,
    plugins: [dts()],
    output: [
      { file: `dist/index.d.ts`, format: 'es' },
      { file: `dist/index.bundle.d.ts`, format: 'es' },
      { file: `dist/index.bundle.min.d.ts`, format: 'es' },
    ],
  },
  {
    input: `test/test.ts`,
    plugins: [
      nodeResolve(),
      commonjs({ include: ['node_modules/**'] }),
      json(),
      esbuild(),
    ],
    output: [{ file: 'test/dist/test.js', format: 'esm' }],
  },
];
