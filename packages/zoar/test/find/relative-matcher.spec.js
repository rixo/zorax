import { test, describe } from '../index.js'

import matcher from '../../lib/find/relative-matcher.js'

describe('relative-matcher.js')

const sample = [
  '/app/a.md',
  '/app/a.spec.js',
  '/app/b.js',
  '/app/c.js',
  '/app/c.mdx',
  '/app/d.js',
  '/app/node_modules/a.spec.js',
  '/app/node_modules/sub/a.spec.js',
  '/app/node_modules/sub/no2.js',
  '/app/test/a.spec.js',
  '/app/test/aa.spec.js',
  '/app/test/b.spec.js',
  '/app/test/node_modules/a.spec.js',
  '/app/test/sub0/aa.spec.js',
  '/app/test/sub0/sub0-1/a.spec.js',
  '/app/test/sub0/sub0-1/aa.spec.js',
]

const sample_a = [
  '/app/a.md',
  '/app/a.spec.js',
  '/app/node_modules/a.spec.js',
  '/app/node_modules/sub/a.spec.js',
  '/app/test/a.spec.js',
  '/app/test/node_modules/a.spec.js',
  '/app/test/sub0/sub0-1/a.spec.js',
]

const sample_aa = [
  '/app/test/aa.spec.js',
  '/app/test/sub0/aa.spec.js',
  '/app/test/sub0/sub0-1/aa.spec.js',
]

test('matcher is a function', t => {
  t.isFunction(matcher)
})

describe('matcher', () => {
  test('is a function', t => {
    t.isFunction(matcher)
  })

  test('returns a match function', t => {
    const match = matcher()
    t.isFunction(match)
  })

  describe('the match function', () => {
    const macro = (pattern, expected, options, split = false) =>
      Object.assign(
        t => {
          const cwd = '/app'
          const match = matcher({ cwd, pattern, ...options }, split)
          const actual = sample.filter(match)
          t.eq(actual, expected)
        },
        {
          title: pre =>
            [pre, JSON.stringify(pattern)].filter(Boolean).join(': '),
        }
      )

    const macro2 = ({ pattern, cwd = '/app', ...options }, expected) =>
      Object.assign(
        t => {
          const match = matcher({ cwd, pattern, ...options })
          const actual = sample.filter(match)
          t.eq(actual, expected)
        },
        {
          title: pre =>
            [pre, JSON.stringify(pattern)].filter(Boolean).join(': '),
        }
      )

    describe('single string pattern', () => {
      test('empty pattern matches nothing', macro(undefined, []))

      test(macro('a.spec.js', ['/app/a.spec.js']))

      test(macro('./a.spec.js', ['/app/a.spec.js']))

      test(macro('a.*', ['/app/a.md', '/app/a.spec.js']))

      test(macro('**/a.*', sample_a))

      test('basename glob', macro('aa*', []))

      test(macro('**/aa*', sample_aa))

      test(macro('**/aa.spec.js', sample_aa))

      test(
        'absolute filename',
        macro('/app/node_modules/sub/no2.js', ['/app/node_modules/sub/no2.js'])
      )
    })

    describe('multiple patterns array', () => {
      test('empty pattern matches nothing', macro(undefined, []))

      test(macro(['a.spec.js'], ['/app/a.spec.js']))

      test(macro(['./a.spec.js'], ['/app/a.spec.js']))

      test(macro(['a.*'], ['/app/a.md', '/app/a.spec.js']))

      test(macro(['**/a.*'], sample_a))

      test(macro(['aa*'], []))

      test(
        macro(
          ['a.*', '/app/node_modules/sub/no2.js', '**/aa*'],
          [
            '/app/a.md',
            '/app/a.spec.js',
            '/app/node_modules/sub/no2.js',
            '/app/test/aa.spec.js',
            '/app/test/sub0/aa.spec.js',
            '/app/test/sub0/sub0-1/aa.spec.js',
          ]
        )
      )

      test(macro(['**/aa.spec.js'], sample_aa))
    })

    describe('ignore string', () => {
      const _macro = (pattern, expected, options) =>
        macro(pattern, expected, { ignore: './node_modules/**', ...options })

      // ignore ./node_modules/**
      const sample_a = [
        '/app/a.md',
        '/app/a.spec.js',
        // '/app/node_modules/a.spec.js',
        // '/app/node_modules/sub/a.spec.js',
        '/app/test/a.spec.js',
        '/app/test/node_modules/a.spec.js',
        '/app/test/sub0/sub0-1/a.spec.js',
      ]

      // ignore **/node_modules/*
      const sample_a2 = [
        '/app/a.md',
        '/app/a.spec.js',
        // '/app/node_modules/a.spec.js',
        '/app/node_modules/sub/a.spec.js',
        '/app/test/a.spec.js',
        // '/app/test/node_modules/a.spec.js',
        '/app/test/sub0/sub0-1/a.spec.js',
      ]

      test('empty pattern matches nothing', macro(undefined, []))

      test(_macro('a.spec.js', ['/app/a.spec.js']))

      test(_macro('./a.spec.js', ['/app/a.spec.js']))

      test(_macro('a.*', ['/app/a.md', '/app/a.spec.js']))

      test('negated pattern', _macro(['a.*', '!*.md'], ['/app/a.spec.js']))

      test(_macro('**/a.*', sample_a))

      test(
        'ignore **/node_modules/*',
        _macro('**/a.*', sample_a2, {
          ignore: '**/node_modules/*',
        })
      )

      test(
        'negated ignore',
        _macro(
          '**/a.*',
          [
            '/app/a.md',
            '/app/a.spec.js',
            '/app/node_modules/a.spec.js',
            '/app/node_modules/sub/a.spec.js',
            '/app/test/a.spec.js',
            // '/app/test/node_modules/a.spec.js',
            '/app/test/sub0/sub0-1/a.spec.js',
          ],
          {
            ignore: ['**/node_modules/*', '!/app/node_modules/a.spec.js'],
          }
        )
      )

      test('basename glob', _macro('aa*', []))

      test(_macro('**/aa*', sample_aa))

      test(_macro('**/aa.spec.js', sample_aa))

      test(
        'ignored absolute filename',
        _macro('/app/node_modules/sub/no2.js', ['/app/node_modules/sub/no2.js'])
      )

      test(
        'absolute filename',
        _macro('/app/test/sub0/sub0-1/a.spec.js', [
          '/app/test/sub0/sub0-1/a.spec.js',
        ])
      )
    })

    describe('relative pattern object: { pattern, cwd }', () => {
      test(
        macro({ cwd: '/app/test/sub0/sub0-1', pattern: 'a*' }, [
          '/app/test/sub0/sub0-1/a.spec.js',
          '/app/test/sub0/sub0-1/aa.spec.js',
        ])
      )

      test(
        'default cwd',
        macro({ pattern: 'test/*.spec.js' }, [
          '/app/test/a.spec.js',
          '/app/test/aa.spec.js',
          '/app/test/b.spec.js',
        ])
      )

      test(
        'pattern array',
        macro(
          [
            { cwd: '/app/test/sub0/sub0-1', pattern: 'a*' },
            { cwd: '/app/', pattern: '*.md' },
          ],
          [
            '/app/a.md',
            '/app/test/sub0/sub0-1/a.spec.js',
            '/app/test/sub0/sub0-1/aa.spec.js',
          ]
        )
      )

      describe('ignore', () => {
        test(
          'default cwd',
          macro(
            'test/*.spec.js',
            [
              '/app/test/a.spec.js',
              '/app/test/aa.spec.js',
              // '/app/test/b.spec.js',
            ],
            {
              ignore: 'test/b*',
            }
          )
        )

        test(
          'ignore relative pattern object',
          macro(
            { cwd: '/app/test/sub0/sub0-1', pattern: 'a*' },
            [
              '/app/test/sub0/sub0-1/a.spec.js',
              // '/app/test/sub0/sub0-1/aa.spec.js',
            ],
            {
              ignore: { cwd: '/app/test/sub0', pattern: 'sub0-1/aa*' },
            }
          )
        )

        test(
          'ignore array',
          macro(
            '/app/test/*.spec.js',
            [
              // '/app/test/a.spec.js',
              '/app/test/aa.spec.js',
              // '/app/test/b.spec.js',
            ],
            {
              ignore: [
                { cwd: '/app/test', pattern: 'a.*' },
                { cwd: '/app/', pattern: 'test/b.*' },
              ],
            }
          )
        )
      })
    })

    test(
      'filename takes precedence over ignore glob',
      macro(
        [
          'test/*',
          'test/a.spec.js', // ignored
        ],
        [
          '/app/test/a.spec.js', // ignored
          // '/app/test/aa.spec.js',
          '/app/test/b.spec.js',
        ],
        {
          ignore: 'test/a*',
        }
      )
    )

    test(
      'filename takes precedence over ignore filename',
      macro(
        [
          'test/*',
          'test/a.spec.js', // ignored
        ],
        [
          '/app/test/a.spec.js', // ignored
          '/app/test/aa.spec.js',
          '/app/test/b.spec.js',
        ],
        {
          ignore: 'test/a.spec.js',
        }
      )
    )

    test(
      'negated glob in pattern',
      macro(
        [
          'test/*',
          '!test/a.spec.js', // ignored
        ],
        [
          // '/app/test/a.spec.js',
          '/app/test/aa.spec.js',
          '/app/test/b.spec.js',
        ]
      )
    )

    test(
      'negated glob in ignore',
      macro(
        ['test/*'],
        [
          '/app/test/a.spec.js',
          '/app/test/aa.spec.js',
          // '/app/test/b.spec.js',
        ],
        {
          ignore: ['**/*', '!test/a*'],
        }
      )
    )

    test(
      'multiple relative ignores',
      macro2(
        {
          cwd: '/app',
          pattern: ['*', '!*.spec.js', 'test/*'],
          ignore: [
            { pattern: ['b.js', '*.mdx'], cwd: '/app' },
            { pattern: 'b.*', cwd: '/app/test' },
          ],
        },
        [
          '/app/a.md',
          // '/app/a.spec.js',
          // '/app/b.js',
          '/app/c.js',
          // '/app/c.mdx',
          '/app/d.js',
          '/app/test/a.spec.js',
          '/app/test/aa.spec.js',
          // '/app/test/b.spec.js',
        ]
      )
    )

    test(
      'negated glob in multiple ignores',
      macro2(
        {
          cwd: '/app',
          pattern: ['*', '!*.spec.js', 'test/*'],
          ignore: [
            // negated pattern in any unignores for all
            { pattern: ['!**/aa*', 'b.js', '*.mdx'], cwd: '/app' },
            { pattern: 'a*', cwd: '/app/test' },
          ],
        },
        [
          '/app/a.md',
          // '/app/a.spec.js',
          // '/app/b.js',
          '/app/c.js',
          // '/app/c.mdx',
          '/app/d.js',
          // '/app/test/a.spec.js',
          '/app/test/aa.spec.js',
          '/app/test/b.spec.js',
        ]
      )
    )

    describe('split: true', () => {
      test('single filename', t => {
        const cwd = '/app'
        const pattern = 'a.js'
        const actual = matcher({ cwd, pattern }, true)
        t.eq(actual.filenames, ['/app/a.js'])
        t.eq(actual.patterns, [])
      })

      test('absolute filename', t => {
        const cwd = '/app'
        const pattern = '/lib/a.js'
        const actual = matcher({ cwd, pattern }, true)
        t.eq(actual.filenames, ['/lib/a.js'])
        t.eq(actual.patterns, [])
      })

      test('multiple filenames', t => {
        const cwd = '/app'
        const pattern = ['a.js', '/test/b.md']
        const actual = matcher({ cwd, pattern }, true)
        t.eq(actual.filenames, ['/app/a.js', '/test/b.md'])
        t.eq(actual.patterns, [])
      })

      test('mixed filenames & glob', t => {
        const cwd = '/app'
        const pattern = ['a.js', '**/a.*', '/test/b.md']
        const actual = matcher({ cwd, pattern }, true)
        t.eq(actual.filenames, ['/app/a.js', '/test/b.md'])
        t.eq(actual.patterns, ['/app/**/a.*'])
      })

      test('negated pattern', t => {
        const cwd = '/app'
        const pattern = ['a.js', '!*.js', '/test/b.md']
        const actual = matcher({ cwd, pattern }, true)
        t.eq(actual.filenames, ['/app/a.js', '/test/b.md'])
        t.eq(actual.patterns, [])
        t.eq(actual.ignorePatterns, ['/app/*.js'])
      })

      test('ignore pattern', t => {
        const cwd = '/app'
        const pattern = '*.js'
        const ignore = '*.foo.js'
        const actual = matcher({ cwd, pattern, ignore }, true)
        t.eq(actual.filenames, [])
        t.eq(actual.patterns, ['/app/*.js'])
        t.eq(actual.ignorePatterns, ['/app/*.foo.js'])
      })

      test('ignore: mixed patterns & filename', t => {
        const cwd = '/app'
        const pattern = '*.js'
        const ignore = ['foo.md', '*.foo.js']
        const actual = matcher({ cwd, pattern, ignore }, true)
        t.eq(actual.filenames, [])
        t.eq(actual.patterns, ['/app/*.js'])
        t.eq(actual.ignorePatterns, ['/app/foo.md', '/app/*.foo.js'])
      })
    }) // -- split: true
  })
})
