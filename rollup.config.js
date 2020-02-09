import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import builtins from 'builtin-modules'

import * as fs from 'fs'
import * as path from 'path'

const dev = !!process.env.ROLLUP_WATCH

const findPlugins = {
  name: 'zorax:find-plugins',
  options: options => ({
    ...options,
    input: fs
      .readdirSync('lib')
      .filter(file => file !== 'zorax.js')
      .filter(file => path.extname(file) === '.js')
      .filter(file => file.slice(0, 1) !== '_')
      .map(file => path.join('lib', file)),
  }),
}

const builds = [{ zorax: true }, { zorax: false }]

export default builds.map(({ zorax }) => ({
  input: zorax && 'lib/zorax.js',
  output: [
    {
      format: 'cjs',
      dir: 'dist',
      chunkFileNames: 'internal/[name].js',
      sourcemap: dev,
    },
    {
      format: 'esm',
      dir: 'dist',
      entryFileNames: '[name].mjs',
      chunkFileNames: 'internal/[name].mjs',
      sourcemap: dev,
    },
  ],
  external: [
    ...builtins,
    // NOTE zora needs to be external to share global state
    'zora',
  ],
  plugins: [!zorax && findPlugins, resolve(), commonjs()],
}))
