import { test, describe } from '../index.js'

import * as path from 'path'
import { fileURLToPath } from 'url'

import find from '../../lib/find.js'
import { mergeInputs } from '../../lib/find/find.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test('is a function', t => {
  t.isFunction(find)
})

describe('mergeInputs', () => {
  test('is a function', t => {
    t.isFunction(mergeInputs)
  })

  test('cli files override .rc, ignore are merged', t => {
    const actual = mergeInputs(
      { files: '**/*.spec.js', cwd: '/app', ignore: './node_modules' }, // .rc
      { files: '*.spec.js', cwd: '/app/test', ignore: 'broken.spec.js' } // cli
    )
    const expected = {
      files: {
        cwd: '/app/test',
        pattern: '*.spec.js',
        ignore: [
          { pattern: './node_modules', cwd: '/app' },
          { pattern: 'broken.spec.js', cwd: '/app/test' },
        ],
      },
    }
    t.eq(actual, expected)
  })

  test('multiple files', t => {
    const actual = mergeInputs(
      // .rc
      { files: '**/*.spec.js', cwd: '/app', ignore: './node_modules' },
      // cli
      {
        files: ['*.spec.js', '!a.spec.js'],
        cwd: '/app/test',
        ignore: 'broken.spec.js',
      }
    )
    const expected = {
      files: {
        cwd: '/app/test',
        pattern: ['*.spec.js', '!a.spec.js'],
        ignore: [
          { pattern: './node_modules', cwd: '/app' },
          { pattern: 'broken.spec.js', cwd: '/app/test' },
        ],
      },
    }
    t.eq(actual, expected)
  })

  test('multiple ignores', t => {
    const actual = mergeInputs(
      // .rc
      {
        files: '**/*.spec.js',
        cwd: '/app',
        ignore: ['./node_modules', '**/.git'],
      },
      // cli
      {
        files: ['*.spec.js', '!a.spec.js'],
        cwd: '/app/test',
        ignore: 'broken.spec.js',
      }
    )
    const expected = {
      files: {
        cwd: '/app/test',
        pattern: ['*.spec.js', '!a.spec.js'],
        ignore: [
          { pattern: ['./node_modules', '**/.git'], cwd: '/app' },
          { pattern: 'broken.spec.js', cwd: '/app/test' },
        ],
      },
    }
    t.eq(actual, expected)
  })

  test('simplifies ignores', t => {
    const actual = mergeInputs(
      // .rc
      {
        cwd: '/app',
        ignore: ['./node_modules', '**/.git'],
      },
      // cli
      {
        files: '*.spec.js',
        cwd: '/app',
        ignore: 'broken.test.js',
      }
    )
    const expected = {
      files: {
        cwd: '/app',
        pattern: '*.spec.js',
        ignore: [
          {
            cwd: '/app',
            pattern: ['./node_modules', '**/.git', 'broken.test.js'],
          },
        ],
      },
    }
    t.eq(actual, expected)
  })

  test('dedups ignore patterns', t => {
    const actual = mergeInputs(
      // .rc
      {
        cwd: '/app',
        ignore: ['./node_modules', '**/.git'],
      },
      // cli
      {
        files: '*.spec.js',
        cwd: '/app',
        ignore: ['./node_modules', 'broken.test.js'],
      }
    )
    const expected = {
      files: {
        cwd: '/app',
        pattern: '*.spec.js',
        ignore: [
          {
            cwd: '/app',
            pattern: ['./node_modules', '**/.git', 'broken.test.js'],
          },
        ],
      },
    }
    t.eq(actual, expected)
  })

  test('flattens single ignore pattern', t => {
    const actual = mergeInputs(
      // cli
      {
        files: '*.spec.js',
        cwd: '/app',
        ignore: ['broken.test.js'],
      }
    )
    const expected = {
      files: {
        cwd: '/app',
        pattern: '*.spec.js',
        ignore: [
          {
            cwd: '/app',
            pattern: 'broken.test.js',
          },
        ],
      },
    }
    t.eq(actual, expected)
  })

  describe('watch', () => {
    test('only rc (no watch)', t => {
      const actual = mergeInputs(
        { cwd: '/app', watch: '**/*.js' }, // .rc
        { cwd: '/app/test' } // cli
      )
      const expected = {}
      t.eq(actual, expected)
    })

    test('only cli', t => {
      const actual = mergeInputs(
        { cwd: '/app/test', watch: '**/*.js' } // cli
      )
      const expected = {
        watch: {
          cwd: '/app/test',
          pattern: [
            {
              cwd: '/app/test',
              pattern: '**/*.js',
            },
          ],
        },
      }
      t.eq(actual, expected)
    })

    test('using rc defaults', t => {
      const actual = mergeInputs(
        { cwd: '/app', watch: '**/*.js' }, // .rc
        { cwd: '/app/test', watch: true } // cli
      )
      const expected = {
        watch: {
          cwd: '/app/test',
          pattern: [
            {
              cwd: '/app',
              pattern: '**/*.js',
            },
          ],
        },
      }
      t.eq(actual, expected)
    })

    test('adding to rc default', t => {
      const actual = mergeInputs(
        { cwd: '/app', watch: '**/*.js' }, // .rc
        { cwd: '/app/test', watch: '*.spec.js' } // cli
      )
      const expected = {
        watch: {
          cwd: '/app/test',
          pattern: [
            {
              cwd: '/app',
              pattern: '**/*.js',
            },
            {
              cwd: '/app/test',
              pattern: '*.spec.js',
            },
          ],
        },
      }
      t.eq(actual, expected)
    })

    test.todo('ignore')
  })
})

describe('find', () => {
  const abs = (arg = '') =>
    Array.isArray(arg) ? arg.map(abs) : path.resolve(__dirname, 'sample', arg)
  const cwd = abs()

  const sample = [
    'app/a.md',
    'app/a.spec.js',
    'app/node_modules/a.spec.js',
    'app/node_modules/sub/a.spec.js',
    'app/node_modules/sub/no2.js',
    'app/test/a.spec.js',
    'app/test/aa.spec.js',
    'app/test/b.spec.js',
    'app/test/node_modules/a.spec.js',
    'app/test/sub0/aa.spec.js',
    'app/test/sub0/sub0-1/a.spec.js',
    'app/test/sub0/sub0-1/aa.spec.js',
  ]

  test('find all files', async t => {
    const actual = await find({ cwd, pattern: '**' })
    t.eq(actual.sort(), sample.map(abs))
  })

  test('single filename', async t => {
    const actual = await find({
      cwd,
      pattern: 'app/a.md',
    })
    const expected = abs([`app/a.md`])
    t.eq(actual.sort(), expected)
  })

  test('multiple filename', async t => {
    const actual = await find({
      cwd,
      pattern: ['app/a.md', 'app/a.spec.js'],
    })
    const expected = abs(['app/a.md', 'app/a.spec.js'])
    t.eq(actual.sort(), expected)
  })

  test('missing file', async t => {
    try {
      await find({
        cwd,
        pattern: ['app/a.mdx', 'app/a.spec.js'],
      })
      t.fail('should have been rejected')
    } catch (err) {
      t.ok(/File not found/.test(err))
    }
  })

  test('glob', async t => {
    const actual = await find({
      cwd: abs('app/test'),
      pattern: ['a.*', 'b.*'],
    })
    const expected = abs(['app/test/a.spec.js', 'app/test/b.spec.js'])
    t.eq(actual.sort(), expected)
  })

  test('negated glob', async t => {
    const actual = await find({
      cwd: abs('app/test'),
      pattern: ['*.spec.js', '!aa.*'],
    })
    const expected = abs(['app/test/a.spec.js', 'app/test/b.spec.js'])
    t.eq(actual.sort(), expected)
  })

  test('deep glob', async t => {
    const actual = await find({
      cwd: abs('app'),
      pattern: '**/{aa,b}.*',
    })
    const expected = abs([
      'app/test/aa.spec.js',
      'app/test/b.spec.js',
      'app/test/sub0/aa.spec.js',
      'app/test/sub0/sub0-1/aa.spec.js',
    ])
    t.eq(actual.sort(), expected)
  })

  // test('mixed filenames and globs', async t => {
  //   const actual = await find({
  //     cwd: abs('app/test'),
  //     pattern: ['**/a.*', '../a.md', '!./sub0/sub0-1/a.spec.js'],
  //   })
  //   const expected = abs([
  //     'app/a.md',
  //     'app/test/a.spec.js',
  //     'app/test/node_modules/a.spec.js',
  //     // 'app/test/sub0/sub0-1/a.spec.js',
  //   ])
  //   t.eq(actual.sort(), expected)
  // })
})
