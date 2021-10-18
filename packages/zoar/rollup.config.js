import * as fs from 'fs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import builtins from 'builtin-modules'
import del from 'rollup-plugin-delete'
import pkg from './package.json'

const external = ['../util.cjs'].concat(
  Object.keys(pkg.dependencies || {}),
  Object.keys(pkg.peerDependencies || {}),
  Object.keys(process.binding('natives'))
)

export default {
  input: ['./lib/zoar.js', './lib/runner.js'],
  output: {
    format: 'cjs',
    dir: 'cjs',
    sourcemap: true,
  },
  external: [
    ...builtins,
    // NOTE zorax needs to be external to share global state
    'zorax',
    'zora',
    ...external,
  ],
  plugins: [
    del({ targets: 'cjs/*' }),
    json(),
    resolve(),
    commonjs(),
    {
      async writeBundle() {
        await fs.promises.writeFile(
          'cjs/package.json',
          '{"type": "commonjs"}',
          'utf8'
        )
      },
    },
  ],
}
