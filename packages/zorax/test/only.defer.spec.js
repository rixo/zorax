import { describe, plug } from 'zorax'

import { blackHole } from './util'

import { createHarness } from '@/lib/plug'
import withDefer from '@/lib/defer'
import withOnly from '@/lib/only.defer'
import withGroup from '@/lib/group.defer'
import withMacro from '@/lib/macro'

const withIsFunction = {
  test: t => {
    t.isFunction = (x, msg = 'should be a function') =>
      t.ok(typeof x === 'function', msg)
  },
}

const withShouldRun = {
  test: t => {
    const map = {}

    t.shouldRun = (name, spec) => {
      if (map.hasOwnProperty(name)) {
        throw new Error('Duplicated name: ' + name)
      }
      map[name] = 0
      const macro = (...args) => {
        map[name]++
        if (spec) {
          return spec(...args)
        }
      }
      macro.title = name
      return macro
    }

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

describe(__filename)

const { test } = plug(withIsFunction, withShouldRun)

const createOnlyHarness = ({ group = true, macro = false } = {}) =>
  createHarness([
    withDefer(),
    group && withGroup(),
    withOnly(),
    macro && withMacro(),
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

  test('throws if zorax.defer is after zorax.only.defer', t => {
    t.throws(() => {
      createHarness([withOnly(), withDefer()])
    }, /zorax\.defer/)
  })

  test('throws if zorax.group is after zorax.only.defer', t => {
    t.throws(() => {
      createHarness([withDefer(), withOnly(), withGroup()])
    }, /zorax\.group/)
  })
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
