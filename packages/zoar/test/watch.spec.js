import { describe, test } from './index.js'

import { mergeTargets } from '../lib/watch.js'

const byDir = ({ dir: { length: a } }, { dir: { length: b } }) => a - b

describe('watch.js')

describe('mergeTargets', () => {
  test('merges targets into their deep watching parents', t => {
    const input = {
      cwd: '/app',
      pattern: [
        'README.md',
        'src/foo.spec.js',
        'test/**/*.spec.js',
        'test/foo.js',
        'test/bar/*.test.js',
      ],
    }
    const expected = [
      {
        dir: '/app',
        deep: false,
        filenames: ['README.md'],
        globs: [],
        ignore: [],
      },
      {
        dir: '/app/src',
        deep: false,
        filenames: ['foo.spec.js'],
        globs: [],
        ignore: [],
      },
      {
        dir: '/app/test',
        deep: true,
        filenames: ['foo.js'],
        globs: ['**/*.spec.js'],
        ignore: [],
      },
      {
        dir: '/app/test/bar',
        deep: false,
        filenames: [],
        globs: ['*.test.js'],
        ignore: [],
      },
    ]
    const actual = mergeTargets(input)
    t.eq(actual.sort(byDir), expected)
  })

  test('ignore', t => {
    const input = {
      cwd: '/app',
      pattern: ['test/**/*.spec.js', 'test/foo.js', 'test/bar/*.test.js'],
      ignore: ['test/node_modules/**', 'test/bar/a*.test.js'],
    }
    const expected = [
      {
        dir: '/app/test',
        deep: true,
        filenames: ['foo.js'],
        globs: ['**/*.spec.js'],
        ignore: ['node_modules/**', 'bar/a*.test.js'],
      },
      {
        dir: '/app/test/bar',
        deep: false,
        filenames: [],
        globs: ['*.test.js'],
        ignore: ['a*.test.js'],
      },
    ]
    const actual = mergeTargets(input)
    t.eq(actual.sort(byDir), expected)
  })

  test('outside ignore', t => {
    const input = {
      cwd: '/app/test',
      pattern: ['**/*.spec.js', '../src/**/*.spec.js'],
      ignore: ['node_modules/**', '**/ignore.me'],
    }
    const expected = [
      {
        dir: '/app/src',
        deep: true,
        filenames: [],
        globs: ['**/*.spec.js'],
        ignore: ['**/ignore.me'],
      },
      {
        dir: '/app/test',
        deep: true,
        filenames: [],
        globs: ['**/*.spec.js'],
        ignore: ['node_modules/**', '**/ignore.me'],
      },
    ]
    const actual = mergeTargets(input)
    t.eq(actual.sort(byDir), expected)
  })
})
