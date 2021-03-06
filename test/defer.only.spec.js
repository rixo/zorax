import { describe, plug } from '@@'

import { blackHole, arrayReporter } from '@@/util'

import { createHarness } from '@zorax/plug'
import withDefer from '@/defer'
import withOnly from '@/defer.only'
import withGroup from '@/defer.group'
import withMacro from '@/macro'

const withIsFunction = {
  test: t => {
    t.isFunction = (x, msg = 'should be a function') =>
      t.ok(typeof x === 'function', msg)
  },
}

const withShouldRun = {
  test: t => {
    const map = {}

    let expectedRuns = 0
    let actualRuns = 0

    const shouldRun = (name, spec) => {
      if (map.hasOwnProperty(name)) {
        throw new Error('Duplicated name: ' + name)
      }
      map[name] = 0
      const macro = (...args) => {
        map[name]++
        actualRuns++
        if (spec) {
          return spec(...args)
        }
      }
      macro.title = name
      return macro
    }

    Object.defineProperty(t, 'shouldRun', {
      get() {
        expectedRuns++
        return shouldRun
      },
    })

    const notMap = {}

    t.shouldNotRun = name => {
      if (notMap.hasOwnProperty(name)) {
        throw new Error('Duplicated name: ' + name)
      }
      notMap[name] = 0
      const macro = () => {
        notMap[name]++
        // t.fail(`${name} should not run`.trim())
      }
      macro.title = name
      return macro
    }

    t.flush = () => {
      t.collect({
        pass: actualRuns === expectedRuns,
        actual: actualRuns,
        expected: expectedRuns,
        description: `expects ${expectedRuns} runs`,
        operator: 'equal',
      })

      Object.entries(map).forEach(([name, calls]) => {
        t.collect({
          pass: calls === 1,
          actual: calls,
          expected: 1,
          description: `${name} should run once`,
          operator: 'equal',
        })
      })

      Object.entries(notMap).forEach(([name, calls]) => {
        t.collect({
          pass: calls === 0,
          actual: calls,
          expected: 0,
          description: `${name} should not run`,
          operator: 'equal',
        })
      })
    }
  },
}

const { test } = plug(withIsFunction, withShouldRun)

const createOnlyHarness = ({ only = true, group = true, macro = false } = {}) =>
  createHarness({ only }, [
    macro && withMacro(),
    withDefer(),
    group && withGroup(),
    withOnly(),
  ])

test('adds harness.only', t => {
  const z = createOnlyHarness({ group: false })
  t.isFunction(z.only)
})

describe('dependencies', () => {
  test('throws if zorax.defer is missing', t => {
    t.throws(() => {
      createHarness([withOnly()])
    }, /zorax\.defer/)
  })

  test('throws if zorax.defer is after zorax.defer.only', t => {
    t.throws(() => {
      createHarness([withOnly(), withDefer()])
    }, /zorax\.defer/)
  })

  test('throws if zorax.group is after zorax.defer.only', t => {
    t.throws(() => {
      createHarness([withDefer(), withOnly(), withGroup()])
    }, /zorax\.defer\.group/)
  })
})

describe('`only` harness option', () => {
  test('t.only throws when only option is not set', t => {
    const z = createOnlyHarness({ group: true, macro: true, only: false })
    t.throws(() => {
      z.only('bim', () => {})
    }, /only flag/)
  })

  test('only option can be changed on the fly', t => {
    const z = createOnlyHarness({ group: true, macro: true, only: true })
    t.doesNotThrow(() => {
      z.only('bim', () => {})
    }, /only flag/)
    z.options.only = false // <- <- <-
    t.throws(() => {
      z.only('bim', () => {})
    }, /only flag/)
  })
})

test('throws if only is called out of sync', async t => {
  const z = createOnlyHarness()
  let complete = false

  z.test('main', () => {
    t.throws(() => {
      complete = true
      z.only('throws', () => {})
    }, /\bsynchronously\b/)
  })

  await z.report(blackHole)

  t.ok(complete, 'test completed')
})

test('throws if only is called on sub test', async t => {
  const z = createOnlyHarness()
  let complete = false

  z.test('main', z => {
    t.throws(() => {
      complete = true
      z.only('throws', () => {})
    }, /\broot tests\b/)
  })

  await z.report(blackHole)

  t.ok(complete, 'test completed')
})

describe('interop: defer.group', () => {
  const formatMessage = ({ offset, data: { description, pass } }) => ({
    offset,
    description,
    pass,
  })

  const macro = async (t, run, expected) => {
    const z = await run()

    const { reporter, messages } = arrayReporter()

    await z.report(reporter)

    t.ok(z.pass)

    t.eq(messages.map(formatMessage), expected)
  }

  test(
    'harness',
    macro,
    () => {
      const z = createOnlyHarness({ group: true })

      z.group('group', () => {
        z.test('test', z => {
          z.fail('should not run')
        })
        z.only('only', z => {
          z.ok(true)
        })
      })

      return z
    },
    [
      { offset: 2, description: 'should be truthy', pass: true },
      { offset: 1, description: 'only', pass: true },
      { offset: 0, description: 'group', pass: true },
    ]
  )

  test(
    'proxy',
    macro,
    () => {
      const z = createOnlyHarness({ group: true })

      const zz = z.plug({
        test(t) {
          const { test } = t
          t.test = (...args) => test(...args)
        },
      })

      zz.group('group', () => {
        zz.test('test', zz => {
          zz.fail('should not run')
        })
        zz.only('only', zz => {
          zz.ok(true)
        })
        zz.group('sub group', () => {
          zz.test('sub group test', zz => {
            zz.fail('should not run')
          })
          zz.only('sub group only', zz => {
            zz.ok(true)
          })
        })
      })

      return z
    },
    [
      { offset: 2, description: 'should be truthy', pass: true },
      { offset: 1, description: 'only', pass: true },

      { offset: 3, description: 'should be truthy', pass: true },
      { offset: 2, description: 'sub group only', pass: true },
      { offset: 1, description: 'sub group', pass: true },

      { offset: 0, description: 'group', pass: true },
    ]
  )

  test(
    'regress: empties sub groups',
    macro,
    () => {
      const z = createOnlyHarness({ group: true, macro: true })

      const zz = z.plug({
        test(t) {
          const { test } = t
          t.test = (...args) => test(...args)
        },
      })

      zz.group('group', () => {
        zz.group('inner group', () => {
          zz.test('test', zz => {
            zz.fail('should not run')
          })
        })
      })

      zz.only('only', zz => {
        zz.ok(true, 'ook!')
      })

      return z
    },
    [
      { offset: 1, description: 'ook!', pass: true },
      { offset: 0, description: 'only', pass: true },
    ]
  )

  test(
    'interop: macro',
    macro,
    () => {
      const z = createOnlyHarness({ group: true, macro: true })

      const zz = z.plug({
        test(t) {
          const { test } = t
          t.test = (...args) => test(...args)
        },
      })

      const macro = async (t, actual, expected) => {
        t.eq(actual, expected)
      }

      macro.title = (title = '', actual, expected) =>
        `${title} ${actual} == ${expected}`.trim()

      const shouldNotRun = zz => {
        zz.fail('should not run')
      }

      zz.test('top level test before', shouldNotRun)

      zz.group('group', () => {
        zz.test('test before', shouldNotRun)

        zz.only(macro, 42, 42)

        zz.group('sub group with only', () => {
          zz.test('sub group test', shouldNotRun)
          zz.only('sub group only', zz => {
            zz.ok(true, 'sub group only ok')
          })
        })

        zz.group('emptied sub group', () => {
          zz.test('skip test', shouldNotRun)
        })
      })

      zz.test('top level test after', shouldNotRun)

      zz.group('emptied group', () => {
        zz.test('skip test', shouldNotRun)
      })

      return z
    },
    [
      { offset: 2, description: 'should be equivalent', pass: true },
      { offset: 1, description: '42 == 42', pass: true },

      { offset: 3, description: 'sub group only ok', pass: true },
      { offset: 2, description: 'sub group only', pass: true },
      { offset: 1, description: 'sub group with only', pass: true },

      { offset: 0, description: 'group', pass: true },
    ]
  )
})

describe('group.only / skip', () => {
  const formatMessage = ({ offset, data: { description, pass, skip } }) => ({
    offset,
    description,
    pass,
    skip,
  })

  const macro = async (t, run, expected) => {
    const z = createOnlyHarness({ group: true, macro: true })

    await run(z, t)

    const { reporter, messages } = arrayReporter()

    await z.report(reporter)

    t.ok(z.pass)

    t.flush()

    if (expected) {
      t.eq(
        messages.map(formatMessage),
        expected.map(x => ({
          pass: true,
          skip: false,
          offset: x[0],
          description: x[1],
          ...x[2],
        }))
      )
    }
  }

  test(
    'group.only',
    macro,
    (z, t) => {
      z.test(t.shouldNotRun('top level before'))

      z.group.only('group.only', () => {
        z.test(t.shouldRun('group.only > test 1'))
        z.test(t.shouldRun('group.only > test 2'))
        z.skip(t.shouldNotRun('group.only > skip'))
        z.group('group.only > group', () => {
          z.test(t.shouldRun('group.only > group > test 1'))
          z.test(t.shouldRun('group.only > group > test 2'))
          z.skip(t.shouldNotRun('group.only > group > skip'))
        })
      })

      z.group('other group', () => {
        z.test(t.shouldNotRun('other group > test'))
      })

      z.only(t.shouldRun('only test'))
    },
    [
      [1, 'group.only > test 1'],
      [1, 'group.only > test 2'],
      [1, 'group.only > skip', { skip: true }],
      [2, 'group.only > group > test 1'],
      [2, 'group.only > group > test 2'],
      [2, 'group.only > group > skip', { skip: true }],
      [1, 'group.only > group'],
      [0, 'group.only'],
      [0, 'only test'],
    ]
  )

  const macro_top_level_only = (t, title) =>
    macro(
      t,
      (z, t) => {
        z.test(t.shouldNotRun('top level before'))

        z.group('top group')

        z.group.only(title)

        z.group('group.only', () => {
          z.test(t.shouldRun('group.only > test 1'))
          z.test(t.shouldRun('group.only > test 2'))
          z.skip(t.shouldNotRun('group.only > skip'))
          z.group('group.only > group', () => {
            z.test(t.shouldRun('group.only > group > test 1'))
            z.test(t.shouldRun('group.only > group > test 2'))
            z.skip(t.shouldNotRun('group.only > group > skip'))
          })
        })

        z.group('other group', () => {
          z.test(t.shouldRun('other group > test'))
        })

        z.only(t.shouldRun('only test'))

        z.group('next top level group')

        z.test(t.shouldNotRun('next top level group > test'))
      },
      [
        [2, 'group.only > test 1'],
        [2, 'group.only > test 2'],
        [2, 'group.only > skip', { skip: true }],
        [3, 'group.only > group > test 1'],
        [3, 'group.only > group > test 2'],
        [3, 'group.only > group > skip', { skip: true }],
        [2, 'group.only > group'],
        [1, 'group.only'],
        [2, 'other group > test'],
        [1, 'other group'],
        [1, 'only test'],
        [0, title ? title : 'top group <<< ONLY'],
      ]
    )

  test('group.only()', macro_top_level_only)
  test('group.only("foo")', macro_top_level_only, 'foo')

  test(
    'group.skip',
    macro,
    (z, t) => {
      z.test(t.shouldRun('top level before'))

      z.group.skip('group.only', () => {
        z.test(t.shouldNotRun('group.only > test 1'))
        z.test(
          t.shouldNotRun('group.only > test 2', z => {
            z.fail('not here')
          })
        )
        z.skip(t.shouldNotRun('group.only > skip'))
        z.group('group.only > group', () => {
          z.test(t.shouldNotRun('group.only > group > test 1'))
          z.test(t.shouldNotRun('group.only > group > test 2'))
          z.skip(t.shouldNotRun('group.only > group > skip'))
        })
      })

      z.group('other group', () => {
        z.test(t.shouldRun('other group > test'))
        z.group.skip('other group > group.skip', () => {
          z.test(t.shouldNotRun('other group > group.skip > test'))
          z.only(t.shouldNotRun('other group > group.skip > only'))
        })
      })

      z.test(t.shouldRun('test after'))
    },
    [
      [0, 'top level before'],
      [0, 'group.only', { skip: true }],
      [1, 'other group > test'],
      [1, 'other group > group.skip', { skip: true }],
      [0, 'other group'],
      [0, 'test after'],
    ]
  )

  test(
    'group.skip(() => {...})',
    macro,
    (z, t) => {
      z.test(t.shouldRun('top level before'))

      z.group.skip(() => {
        z.test(t.shouldNotRun('group.only > test 1'))
        z.test(
          t.shouldNotRun('group.only > test 2', z => {
            z.fail('not here')
          })
        )
        z.skip(t.shouldNotRun('group.only > skip'))
        z.group('group.only > group', () => {
          z.test(t.shouldNotRun('group.only > group > test 1'))
          z.test(t.shouldNotRun('group.only > group > test 2'))
          z.skip(t.shouldNotRun('group.only > group > skip'))
        })
      })

      z.group('other group', () => {
        z.test(t.shouldRun('other group > test'))
        z.group.skip(() => {
          z.test(t.shouldNotRun('other group > group.skip > test'))
          z.only(t.shouldNotRun('other group > group.skip > only'))
        })
      })

      z.test(t.shouldRun('test after'))
    },
    [
      [0, 'top level before'],
      [1, 'other group > test'],
      [0, 'other group'],
      [0, 'test after'],
    ]
  )

  test(
    'group.skip > only',
    macro,
    (z, t) => {
      z.group.skip('group.skip', () => {
        z.only(t.shouldNotRun('group.skip > only'))
        z.test(t.shouldNotRun('group.skip > test'))
      })
      z.test(t.shouldRun('passing test'))
      z.test(t.shouldRun('failing test'))
    },
    [
      [0, 'group.skip', { skip: true }],
      [0, 'passing test'],
      [0, 'failing test'],
    ]
  )
})

describe("harness.test.only('', spec)", () => {
  test('runs all test when no only', async t => {
    const z = createOnlyHarness({ group: true, macro: true })

    let done = false

    z.test(t.shouldRun('before'))

    z.group('g1', () => {
      z.group('g2', () => {
        z.test(t.shouldRun('0 before'))
        z.test('0 main', z => {
          z.test('1 sub', z => {
            z.test('2 sub', () => {
              done = true
            })
          })
        })
        z.test(t.shouldRun('0 after'))
      })
    })

    z.test(t.shouldRun('after'))

    t.falsy(done, 'only test has not run before report')

    await z.report(blackHole)

    t.flush()
    t.ok(done, 'done')
  })

  test('skips top level tests', async t => {
    let done = false
    const z = createOnlyHarness({ group: false, macro: true })

    z.test(t.shouldNotRun('before'))

    z.only(
      t.shouldRun('only', z => {
        z.test(
          t.shouldRun('sub 1 in only', z => {
            z.test(
              t.shouldRun('sub 2 in only', () => {
                done = true
              })
            )
          })
        )
      })
    )

    z.test(t.shouldNotRun('after'))

    z.only(t.shouldRun('other only'))

    await z.report(blackHole)

    t.flush()
    t.ok(done, 'done')
  })

  test('skips tests in groups', async t => {
    const z = createOnlyHarness({ group: true, macro: true })

    let done = false

    z.test(t.shouldNotRun('before'))

    z.group('g1', () => {
      z.group('g2', () => {
        z.test(t.shouldNotRun('sub before'))
        z.only(
          t.shouldRun('only', () => {
            done = true
          })
        )
        z.test(t.shouldNotRun('sub after'))
      })
    })

    z.test(t.shouldNotRun('after'))

    t.falsy(done, 'only test has not run before report')

    await z.report(blackHole)

    t.flush()
    t.ok(done, 'only test has run')
  })
})
