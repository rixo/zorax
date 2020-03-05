import { test, describe } from '@@'

import { blackHole, isFunction, isHarness, isTestContext, spy } from '@@/util'

import { createHarness, createHarnessFactory } from '@zorax/plug'
import withMacro from '@/macro'

const createHarnessWithMacro = createHarnessFactory([withMacro()])

const createTestSpy = ({ hook = 'harness' } = {}) => {
  let zTest
  let zSkip
  let zOnly
  const test = spy((...args) => zTest(...args))
  const skip = spy((...args) => zSkip(...args))
  const only = spy((...args) => zOnly(...args))
  return {
    plugin: {
      // NOTE we only want the first wrapped one, for harness... the sub test
      // is never called in this test
      [hook]: spy(z => {
        zTest = z.test
        zSkip = z.skip
        zOnly = z.only
        z.test = test
        z.skip = skip
        z.only = only
      }),
    },
    test,
    skip,
    only,
  }
}

test('exports a function', t => {
  t.ok(typeof withMacro === 'function', 'withMacro is a function')
})

test('does not break createHarness', t => {
  const z = createHarnessWithMacro()
  t.ok(isHarness(z))
})

test('t.test(desc, spec)', t => {
  const z = createHarnessWithMacro()
  const spec = spy()
  t.eq(spec.callCount, 0, 'spec function is not called before')
  z.test('', spec)
  t.eq(spec.callCount, 1, 'spec function has been called')
})

test('t.test(desc, macro, ...data)', async t => {
  const a = {}
  const b = {}
  const z = createHarnessWithMacro()
  const macro = spy((z, ...args) => {
    t.eq(args.length, 2)
    t.is(args[0], a)
    t.is(args[1], b)
  })
  z.test('', macro, a, b)
  await z.report(blackHole)
  t.eq(macro.callCount, 1, 'macro was called')
})

describe('macro.title', () => {
  test('t.test(desc, macro, ...data)', async t => {
    const desc = 'desc'
    const a = { name: 'a' }
    const b = { name: 'b' }
    const testSpy = createTestSpy()
    const z = createHarness([testSpy.plugin, withMacro()])
    t.eq(testSpy.plugin.harness.callCount, 1)

    const macro = spy((z, ...args) => {
      t.test('macro has been called with context and data args', t => {
        t.eq(args.length, 2)
        t.is(args[0], a)
        t.is(args[1], b)
      })
    })

    macro.title = (providedTitle = 'dft', a, b) =>
      `${providedTitle}: ${a.name}-${b.name}`

    await z.test(desc, macro, a, b)

    t.eq(testSpy.plugin.harness.callCount, 1)
    // await z.report(blackHole)
    t.eq(macro.callCount, 1, 'macro was called')
    t.eq(testSpy.test.callCount, 1, 'core test was called')
    t.eq(
      testSpy.test.calls[0][0],
      'desc: a-b',
      'previous test is called with description'
    )
    t.ok(
      isFunction(testSpy.test.calls[0][1]),
      'previous test is called with spec function'
    )
  })

  test('t.test(desc, macro, macro, ...data)', async t => {
    const desc = 'desc'
    const a = { name: 'a' }
    const b = { name: 'b' }
    const testSpy = createTestSpy()
    const z = createHarness([testSpy.plugin, withMacro()])
    t.eq(testSpy.plugin.harness.callCount, 1)

    const macro_a = spy((z, next, ...args) => {
      t.ok(isTestContext(z), 'first macro is passed test context')
      t.is(next, macro_b, 'first macro is passed next macro')
      t.eq(macro_b.callCount, 0, 'macros are called left to right')
      t.eq(args.length, 2, 'first macro is passed all test args')
      t.is(args[0], a)
      t.is(args[1], b)
      return next(z, ...args)
    })

    const macro_b = spy((z, ...args) => {
      t.eq(macro_b.callCount, 1, 'macros are called left to right')
      t.eq(args.length, 2)
      t.is(args[0], a)
      t.is(args[1], b)
    })

    await z.test(desc, macro_a, macro_b, a, b)

    t.eq(macro_a.callCount, 1)
    t.eq(macro_b.callCount, 1)

    t.eq(testSpy.plugin.harness.callCount, 1)
    // await z.report(blackHole)
    t.eq(testSpy.test.callCount, 1, 'core test was called')
    t.is(testSpy.test.calls[0][0], desc, 'core test was passed description')
  })

  test('t.test(macro, ...data)', t => {
    const a = { name: 'a' }
    const b = { name: 'b' }
    const testSpy = createTestSpy()
    const z = createHarness([testSpy.plugin, withMacro()])
    t.eq(testSpy.plugin.harness.callCount, 1)

    const macro = spy((z, ...args) => {
      t.eq(args.length, 2)
      t.is(args[0], a)
      t.is(args[1], b)
    })

    macro.title = (providedTitle = 'dft', a, b) =>
      `${providedTitle}: ${a.name}-${b.name}`

    z.test(macro, a, b)

    t.eq(testSpy.plugin.harness.callCount, 1)
    t.eq(macro.callCount, 1, 'macro was called')
    t.eq(testSpy.test.callCount, 1, 'core test was called')
    t.eq(
      testSpy.test.calls[0][0],
      'dft: a-b',
      'previous test is called with title'
    )
    t.ok(
      isFunction(testSpy.test.calls[0][1]),
      'previous test is called with spec function'
    )
  })

  test('t.skip(desc, macro, ...data)', async t => {
    const desc = 'desc'
    const a = { name: 'a' }
    const b = { name: 'b' }
    const testSpy = createTestSpy()
    const z = createHarness([testSpy.plugin, withMacro()])
    t.eq(testSpy.plugin.harness.callCount, 1)

    const macro = spy((z, ...args) => {
      t.test('macro has been called with context and data args', t => {
        t.eq(args.length, 2)
        t.is(args[0], a)
        t.is(args[1], b)
      })
    })

    macro.title = (providedTitle = 'dft', a, b) =>
      `${providedTitle}: ${a.name}-${b.name}`

    await z.skip(desc, macro, a, b)

    t.eq(testSpy.plugin.harness.callCount, 1)
    // await z.report(blackHole)
    t.eq(macro.callCount, 0, 'macro was not called')
    t.eq(testSpy.test.callCount, 0, 'core test not was called')
    t.eq(testSpy.skip.callCount, 1, 'core skip was called')
    t.eq(
      testSpy.skip.calls[0][0],
      'desc: a-b',
      'previous skip is called with description'
    )
    t.ok(
      isFunction(testSpy.skip.calls[0][1]),
      'previous skip is called with spec function'
    )
  })

  test('t.skip(macro, ...data)', t => {
    const a = { name: 'a' }
    const b = { name: 'b' }
    const testSpy = createTestSpy()
    const z = createHarness([testSpy.plugin, withMacro()])
    t.eq(testSpy.plugin.harness.callCount, 1)

    const macro = spy((z, ...args) => {
      t.eq(args.length, 2)
      t.is(args[0], a)
      t.is(args[1], b)
    })

    macro.title = (providedTitle = 'dft', a, b) =>
      `${providedTitle}: ${a.name}-${b.name}`

    z.skip(macro, a, b)

    t.eq(testSpy.plugin.harness.callCount, 1)
    t.eq(macro.callCount, 0, 'macro was not called')
    t.eq(testSpy.test.callCount, 0, 'core test was not called')
    t.eq(testSpy.skip.callCount, 1, 'core skip was called')
    t.eq(
      testSpy.skip.calls[0][0],
      'dft: a-b',
      'previous skip is called with description'
    )
    t.ok(
      isFunction(testSpy.skip.calls[0][1]),
      'previous skip is called with spec function'
    )
  })

  test('t.only(desc, macro, ...data)', async t => {
    const desc = 'desc'
    const a = { name: 'a' }
    const b = { name: 'b' }
    const testSpy = createTestSpy()
    const z = createHarness([testSpy.plugin, withMacro()])
    t.eq(testSpy.plugin.harness.callCount, 1)

    const macro = spy((z, ...args) => {
      t.test('macro has been called with context and data args', t => {
        t.eq(args.length, 2)
        t.is(args[0], a)
        t.is(args[1], b)
      })
    })

    macro.title = (providedTitle = 'dft', a, b) =>
      `${providedTitle}: ${a.name}-${b.name}`

    z.only(desc, macro, a, b)

    t.eq(testSpy.plugin.harness.callCount, 1)
    t.eq(macro.callCount, 0, 'macro was not called')
    t.eq(testSpy.test.callCount, 0, 'core test not was called')
    t.eq(testSpy.only.callCount, 1, 'core only was called')
    t.eq(
      testSpy.only.calls[0][0],
      'desc: a-b',
      'previous only is called with description'
    )
    t.ok(
      isFunction(testSpy.only.calls[0][1]),
      'previous only is called with spec function'
    )
  })

  test('t.only(macro, ...data)', t => {
    const a = { name: 'a' }
    const b = { name: 'b' }
    const testSpy = createTestSpy()
    const z = createHarness([testSpy.plugin, withMacro()])
    t.eq(testSpy.plugin.harness.callCount, 1)

    const macro = spy((z, ...args) => {
      t.eq(args.length, 2)
      t.is(args[0], a)
      t.is(args[1], b)
    })

    macro.title = (providedTitle = 'dft', a, b) =>
      `${providedTitle}: ${a.name}-${b.name}`

    z.only(macro, a, b)

    t.eq(testSpy.plugin.harness.callCount, 1)
    t.eq(macro.callCount, 0, 'macro was not called')
    t.eq(testSpy.test.callCount, 0, 'core test was not called')
    t.eq(testSpy.only.callCount, 1, 'core only was called')
    t.eq(
      testSpy.only.calls[0][0],
      'dft: a-b',
      'previous only is called with description'
    )
    t.ok(
      isFunction(testSpy.only.calls[0][1]),
      'previous only is called with spec function'
    )
  })

  test('t.test(macro, macro, ...data)', t => {
    const a = { name: 'a' }
    const b = { name: 'b' }
    const testSpy = createTestSpy()

    const macro_a = spy((z, next, ...args) => {
      t.eq(args.length, 2)
      t.is(args[0], a)
      t.is(args[1], b)
      return next(z, ...args)
    })

    macro_a.title = (providedTitle = 'dft', next, ...args) =>
      next.title(providedTitle, ...args)

    const macro_b = spy((z, ...args) => {
      t.eq(args.length, 2)
      t.is(args[0], a)
      t.is(args[1], b)
    })

    macro_b.title = (providedTitle = 'dft', a, b) =>
      `${providedTitle}: ${a.name}-${b.name}`

    const z = createHarness([testSpy.plugin, withMacro()])
    t.eq(testSpy.plugin.harness.callCount, 1)

    z.test(macro_a, macro_b, a, b)

    t.eq(testSpy.plugin.harness.callCount, 1)
    t.eq(macro_a.callCount, 1, 'macro_a was called')
    t.eq(macro_b.callCount, 1, 'macro_b was called')
    t.eq(testSpy.test.callCount, 1, 'core test was called')
    t.eq(
      testSpy.test.calls[0][0],
      'dft: a-b',
      'core test is called with title generated by first (leftmost) macro'
    )
    t.ok(
      isFunction(testSpy.test.calls[0][1]),
      'previous test is called with spec function'
    )
  })

  test('macro with no title and no provided title', async t => {
    const a = {}
    const b = {}
    const macro = spy(z => {
      z.ok(true)
    })
    const testSpy = createTestSpy()
    const z = createHarness([testSpy.plugin, withMacro()])
    z.test(macro, a, b)
    t.eq(macro.callCount, 1)
    t.eq(testSpy.test.callCount, 1, 'core test was called')
    t.eq(
      testSpy.test.calls[0][0],
      undefined,
      'core test has been called with undefined title'
    )
    await z.report(blackHole)
    t.ok(z.pass, 'test passes')
  })

  test('macro.title as string', async t => {
    const testSpy = createTestSpy()
    const z = createHarness([testSpy.plugin, withMacro()])
    const macro = spy(() => {})
    macro.title = 'foo.bar_baz'
    z.test(macro)
    t.eq(macro.callCount, 1)
    t.eq(testSpy.test.callCount, 1, 'core test was called')
    t.eq(
      testSpy.test.calls[0][0],
      'foo.bar_baz',
      'core test has been called with undefined title'
    )
    await z.report(blackHole)
    t.ok(z.pass, 'test passes')
  })
})
