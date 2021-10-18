import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import builtins from 'builtin-modules'

export default {
  input: 'plug.js',
  output: {
    format: 'cjs',
    file: 'plug.cjs.js',
    sourcemap: true,
  },
  external: [
    ...builtins,
    // NOTE zora needs to be external to share global state
    'zora',
  ],
  plugins: [resolve(), commonjs()],
}
