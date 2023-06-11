import dts from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';
import terser from '@rollup/plugin-terser';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
  {
    input: `src/index.ts`,
    plugins: [esbuild()],
    output: [
      {
        file: 'dist/index.js',
        format: 'esm',
        exports: 'named',
      },
    ],
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
      {
        file: 'dist/index.iife.js',
        format: 'iife',
        exports: 'named',
      },
    ],
  },
  {
    input: `src/index.ts`,
    plugins: [dts()],
    output: {
      file: `dist/index.d.ts`,
      format: 'es',
    },
  },
];
