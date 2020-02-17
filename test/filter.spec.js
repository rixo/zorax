import { test, describe } from '@@'
import { arrayReporter, noop } from '@@/util'

import { createHarness } from '@/plug'
import withDefer from '@/defer'
import withFilter from '@/filter'
import withGroup from '@/defer.group'
import withOnly from '@/defer.only'

describe('zorax.filter', () => {
  test('is a function', t => {
    t.isFunction(withFilter)
  })

  test('returns a zorax.filter plugin', t => {
    const plugin = withFilter()
    t.ok(plugin && plugin.name === 'zorax.filter', 'returns a plugin')
  })

  test('adds a filter method to the harness', t => {
    const z = createHarness([withFilter()])
    t.isFunction(z.filter)
  })
})

describe('filter', () => {
  const formatMessage = msg => [msg.offset, msg.data.description, msg.data.pass]

  const formatExpected = ([offset, desc, pass = true]) => [offset, desc, pass]

  const macroCustomHarness = async (
    t,
    createHarness,
    filter,
    run,
    expected
  ) => {
    const z = createHarness()

    z.filter(filter)

    const zz = (await run(z, t)) || z

    const { reporter, messages } = arrayReporter()

    await zz.report(reporter)

    if (expected) {
      const actual = messages.map(formatMessage)
      t.eq(actual, expected.map(formatExpected))
    }
  }

  const macro = (t, filter, run, expected) =>
    macroCustomHarness(
      t,
      () => createHarness([withFilter()]),
      filter,
      run,
      expected
    )

  macroCustomHarness.title = macro.title = (title, filter) =>
    title || String(filter)

  test(
    'match is case insensitive',
    macro,
    'foo',
    z => {
      z.test('Foo', noop)
    },
    [[0, 'Foo']]
  )

  test(
    macro,
    null,
    z => {
      z.test('foo', noop)
    },
    [[0, 'foo']]
  )

  test(
    macro,
    'foo',
    z => {
      z.test('foo', noop)
    },
    [[0, 'foo']]
  )

  test(
    'partial string match',
    macro,
    'foo',
    z => {
      z.test('foot', noop)
    },
    [[0, 'foot']]
  )

  test(
    'no match',
    macro,
    'bar',
    z => {
      z.test('foo', noop)
    },
    []
  )

  test(
    'nested tests',
    macro,
    'foo',
    z => {
      z.test('foo', z => {
        z.test('foo > sub match', noop)

        z.test('match > no match', noop)
      })
      z.test('main no match', z => {
        z.test('no match sub', noop)
      })
      z.test('other foot match', noop)
    },
    [
      [1, 'foo > sub match'],
      [1, 'match > no match'],
      [0, 'foo'],
      [0, 'other foot match'],
    ]
  )

  test(
    'failing tests',
    macro,
    'foo',
    z => {
      z.test('failing foo', z => {
        z.fail('bim')
      })
      z.test('failing no match', z => {
        z.fail('bam')
      })
    },
    [
      [1, 'bim', false],
      [0, 'failing foo', false],
    ]
  )

  test(
    'multiple filters',
    macro,
    ['foo', 'bar'],
    z => {
      z.test('foo', z => {
        z.test('fsub', noop)
      })
      z.test('bar', z => {
        z.test('bsub', noop)
      })
      z.test('baz', z => {
        z.test('bbsub', noop)
      })
    },
    [
      [1, 'fsub'],
      [0, 'foo'],
      [1, 'bsub'],
      [0, 'bar'],
    ]
  )

  test(
    'negated patterns',
    macro,
    ['foo', '-foot'],
    z => {
      z.test('foo', z => {
        z.test('fsub', noop)
        z.test('sub foot', noop)
      })
      z.test('foob', z => {
        z.test('bsub', noop)
      })
      z.test('foo foot', z => {
        z.test('ffsub', noop)
      })
    },
    [
      [1, 'fsub'],
      [1, 'sub foot'],
      [0, 'foo'],
      [1, 'bsub'],
      [0, 'foob'],
    ]
  )

  describe('+pattern, -pattern', () => {
    const tests = z => {
      z.test('foo', z => {
        z.test('fsub', noop)
        z.test('sub foot', noop)
      })
      z.test('foob', z => {
        z.test('bsub', noop)
      })
      z.test('foo foot', z => {
        z.test('ffsub', noop)
      })
    }

    test(macro, ['+foo'], tests, [
      [1, 'fsub'],
      [1, 'sub foot'],
      [0, 'foo'],
      [1, 'bsub'],
      [0, 'foob'],
      [1, 'ffsub'],
      [0, 'foo foot'],
    ])

    test(macro, ['+foo', '+oob'], tests, [
      [1, 'bsub'],
      [0, 'foob'],
    ])

    test(macro, ['foo', '+oob'], tests, [
      [1, 'bsub'],
      [0, 'foob'],
    ])

    test(macro, ['foo', '-oob'], tests, [
      [1, 'fsub'],
      [1, 'sub foot'],
      [0, 'foo'],
      [1, 'ffsub'],
      [0, 'foo foot'],
    ])

    test(macro, ['+foo', '-oob'], tests, [
      [1, 'fsub'],
      [1, 'sub foot'],
      [0, 'foo'],
      [1, 'ffsub'],
      [0, 'foo foot'],
    ])
  })

  describe('interop: defer.group', () => {
    test(
      'no filter',
      macroCustomHarness,
      () => createHarness([withDefer(), withGroup(), withFilter()]),
      null,
      z => {
        z.test('foo', z => {
          z.test('fsub', noop)
          z.test('sub foot', noop)
        })
        z.group('main', () => {
          z.test('foob', z => {
            z.test('bsub', noop)
          })
          z.test('foo foot', z => {
            z.test('ffsub', noop)
          })
        })
      },
      [
        [1, 'fsub'],
        [1, 'sub foot'],
        [0, 'foo'],
        [2, 'bsub'],
        [1, 'foob'],
        [2, 'ffsub'],
        [1, 'foo foot'],
        [0, 'main'],
      ]
    )

    test(
      'negated patterns',
      macroCustomHarness,
      () => createHarness([withDefer(), withGroup(), withFilter()]),
      ['foo', '-foot'],
      z => {
        z.test('foo', z => {
          z.test('fsub', noop)
          z.test('sub foot', noop)
        })
        z.group('main', () => {
          z.test('foob', z => {
            z.test('bsub', noop)
          })
          z.test('foo foot', z => {
            z.test('ffsub', noop)
          })
        })
      },
      [
        [1, 'fsub'],
        [1, 'sub foot'],
        [0, 'foo'],
        [2, 'bsub'],
        [1, 'foob'],
        [0, 'main'],
      ]
    )
  })

  test(
    'interop: defer.group > defer.only',
    macroCustomHarness,
    () =>
      createHarness({ only: true }, [
        withDefer(),
        withGroup(),
        withOnly(),
        withFilter(),
      ]),
    ['foo'],
    z => {
      z.test('foo', z => {
        z.test('fsub', noop)
        z.test('sub foot', noop)
      })
      z.group('main', () => {
        z.only('foob', z => {
          z.test('bsub', noop)
        })
        z.test('foo foot', z => {
          z.test.only('ffsub', noop)
        })
      })
    },
    [
      [2, 'bsub'],
      [1, 'foob'],
      [0, 'main'],
    ]
  )
})
