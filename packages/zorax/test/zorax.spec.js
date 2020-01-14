/* eslint-disable import/namespace */

import { createHarness as createZoraHarness } from 'zora'
import {
  blackHole,
  describe,
  isFunction,
  isHarness,
  isHarnessFactory,
  isTestContext,
  spy,
} from './util'

/* eslint-disable no-duplicate-imports, import/no-duplicates */
import * as zorax from '../lib/zorax'
import { createHarness, createHarnessFactory } from '../lib/zorax'
/* eslint-enable no-duplicate-imports, import/no-duplicates */

// disable zora auto start
createZoraHarness()

const test = describe('zorax')

test("exports * from 'zora'", t => {
  t.ok(zorax.createHarness, 'has createHarness')
  t.ok(zorax.test, 'is a harness')
  t.ok(zorax.ok, 'is a test context (assertions)')
})

// NOTE zorax should not be implementing zora-macro
//
// because:
//
// - zorax has not a vocation of being opinionated (as opposed to zoar)
//
// - on the contrary, it must remain as lightweight as possible, in order to
//   support every scenari with best perf (including low feature setups)
//
// - people may not want macro behaviour in their tests
//
// - plugins would work with zorax but not zora
//
// but: isn't there an interest to have this behaviour "core", for
// plugins to be able to rely on it?
//
// not really... plugins can pretty easily implement the pattern,
// since they control a stage of the test function
//
test('extra test arguments are not passed down to test handler', async t => {
  const z = createHarness()

  const a = {}
  const b = {}
  const c = {}

  const runDeep = spy()

  const run = spy((...args) => {
    const [z] = args
    z.test('', runDeep, a, b, c)
  })

  const run2 = spy()

  z.test('', run, a, b, c)
  z.test('', [], run2, a, b, c)

  await z.report(blackHole)

  // run: test without hooks
  t.eq(run.callCount, 1, 'run has been called')
  t.eq(run.calls[0].length, 1, 'extra args are ignored in test without hooks')
  t.ok(
    run.calls[0] && isTestContext(run.calls[0][0]),
    1,
    'only arg passed to run of spec without hooks is the test context'
  )
  // run2: test with hooks
  t.eq(run2.callCount, 1, 'run2 has been called')
  t.eq(run2.calls[0].length, 1, 'extra args are ignored in test with hooks')
  t.ok(
    run2.calls[0] && isTestContext(run2.calls[0][0]),
    1,
    'only arg passed to run of spec without hooks is the test context'
  )
  // runDeep: nested test
  t.eq(runDeep.callCount, 1, 'runDeep has been called')
  t.eq(runDeep.calls[0].length, 1, 'extra args are ignored in nested test')
  t.ok(
    runDeep.calls[0] && isTestContext(runDeep.calls[0][0]),
    1,
    'only arg passed to run of spec of sub test is the test context'
  )
})

describe('createHarness', () => {
  test("import { createHarness } from 'zorax'", t => {
    t.ok(createHarness, 'is exported')
    t.ok(typeof createHarness === 'function', 'is a function')
    t.ok(isHarnessFactory(createHarness))
  })

  test('createHarness(opts)', t => {
    const opts = {}

    t.test('returns a harness', t => {
      const z = createHarness(opts)
      t.ok(isHarness(z), 'returns a harness')
    })

    t.test('after test(desc, run)', async t => {
      const z = createHarness(opts)
      const run = spy()
      t.eq(run.callCount, 0, 'run is not called')
      z.test('my test', run)
      await z.report(blackHole)
      t.eq(run.callCount, 1, 'run has been called')
    })

    t.test('after test(desc, decorators, run)', async t => {
      const z = createHarness(opts)
      const run = spy()
      t.eq(run.callCount, 0, 'run is not called')
      const decorators = [spy(), spy()]
      z.test('my test', decorators, run)
      await z.report(blackHole)
      t.eq(run.callCount, 1, 'run has been called')
      t.ok(
        decorators.every(fn => fn.callCount === 1),
        'all decorators have been called'
      )
    })
  })

  test('createHarness(opts, [...plugins])', t => {
    const opts = {}
    let zz

    const plugins = [
      spy((z, options) => {
        zz = z
        // t.eq(run.callCount, 0, 'hooks are called before run')
        t.is(options, opts, 'decorator is passed harness options')
        t.eq(
          plugins[1].callCount,
          plugins[0].callCount - 1,
          'hooks are called left to right'
        )
      }),
      spy(() => {
        t.eq(
          plugins[1].callCount,
          plugins[0].callCount,
          'hooks are called left to right'
        )
      }),
    ]

    const run = spy(z => {
      t.is(z, zz, 'run is called with same context as hooks')
    })

    const z = createHarness(opts, plugins) // <- <- <-

    t.ok(isHarness(z), 'returns a harness')

    t.eq(run.callCount, 0, 'run is not called')

    t.test('hooks are called once initially on harness', t => {
      plugins.forEach((pg, i) => {
        t.test(`hook #${i}`, t => {
          t.eq(pg.callCount, 1, 'has been called in createHarness')
          t.is(pg.calls[0][0], z, 'hook has been called with harness')
          t.is(pg.calls[0][1], opts, 'hook has been called with options')
        })
      })
    })

    t.test('after test', async t => {
      const testHooks = [spy(), spy()]
      const run2 = spy()

      z.test('my test', run)
      z.test('my test', testHooks, run2)

      await z.report(blackHole)

      t.eq(run.callCount, 1, 'run has been called')
      t.eq(run2.callCount, 1, 'run2 has been called')

      plugins.forEach((hook, i) => {
        t.eq(
          hook.callCount,
          3,
          `harness hook #${i} have been called in each test`
        )
      })
      testHooks.forEach((hook, i) => {
        t.eq(hook.callCount, 1, `test hook #${i} has been called`)
      })
    })
  })

  test('createHarness([...plugins]): options argument is optional', async t => {
    const harnessPlugins = [spy(), spy()]
    const testPlugins = [spy(), spy()]
    const run = spy()

    const z = createHarness(harnessPlugins) // <- <- <-

    harnessPlugins.forEach((hook, i) => {
      t.eq(hook.callCount, 1, `hook ${i} has been called in createHarness`)
    })

    z.test('', testPlugins, run) // <- <- <-

    await z.report(blackHole)

    t.eq(run.callCount, 1, 'run has been called in test')

    harnessPlugins.forEach((hook, i) => {
      t.eq(hook.callCount, 2, `harness hook ${i} has been called in test`)
    })
    testPlugins.forEach((hook, i) => {
      t.eq(hook.callCount, 1, `test hook ${i} has been called in test`)
    })
  })

  test('createHarness({ plugins: [...plugins] })', async t => {
    const p1 = { test: spy() }
    const p2 = { test: spy() }
    const plugins = [p1, p2]
    const z = createHarness({ plugins })
    t.eq(p1.test.callCount, 1, 'plugin #1 has been applied to harness')
    t.eq(p2.test.callCount, 1, 'plugin #2 has been applied to harness')
    t.ok(isHarness(z))
    z.test('', () => {})
    await z.report()
    t.eq(p1.test.callCount, 2, 'plugin #1 has been applied to test context')
    t.eq(p2.test.callCount, 2, 'plugin #2 has been applied to test context')
  })
})

describe('createHarnessFactory', () => {
  test('createHarnessFactory()', async t => {
    const createHarness = createHarnessFactory()

    t.ok(isHarnessFactory(createHarness), 'creates a harness factory')

    t.test('the created harness is hookable', t => {
      const harnessPlugin = spy()
      const testPlugin = spy()
      const run = spy()

      const z = createHarness([harnessPlugin])

      t.eq(harnessPlugin.callCount, 1, 'harness hook called in createHarness')

      z.test('', [testPlugin], run)

      t.eq(harnessPlugin.callCount, 2, 'harness hook called in test')
      t.eq(testPlugin.callCount, 1, 'harness hook called in test')
    })
  })

  test('createHarnessFactory({ hooks })', t => {
    const factoryPg = spy()
    const harnessPg = spy()
    const testPg = spy()

    const createHarness = createHarnessFactory({ plugins: [factoryPg] })

    t.eq(
      factoryPg.callCount,
      0,
      'factory hook is not called in createHarnessFactory'
    )
    t.eq(
      harnessPg.callCount,
      0,
      'harness hook is not called in createHarnessFactory'
    )
    t.eq(testPg.callCount, 0, 'test hook is not called in createHarnessFactory')

    const z = createHarness([harnessPg])

    t.eq(factoryPg.callCount, 1, 'factory hook is called in createHarness')
    t.eq(harnessPg.callCount, 1, 'harness hook is called in createHarness')
    t.eq(testPg.callCount, 0, 'test hook is not called in createHarness')

    z.test('', [testPg])

    t.eq(factoryPg.callCount, 2, 'factory hook is called again in test')
    t.eq(harnessPg.callCount, 2, 'harness hook is called again in test')
    t.eq(testPg.callCount, 1, 'test hook is called in test')
  })

  test('createHarnessFactory({ createHarness })', t => {
    let extraHook1Calls = 0
    const pg1 = spy(() => {
      t.eq(
        pg2.callCount,
        pg1.callCount - 1 - extraHook1Calls,
        'hook1 is called before hook2'
      )
    })
    const pg2 = spy(() => {
      t.eq(
        pg1.callCount - extraHook1Calls,
        pg2.callCount,
        'hook2 is called after hook2'
      )
    })

    const createHarness0 = spy(createHarness)

    const createHarness1 = spy(
      createHarnessFactory({
        createHarness: createHarness0,
        plugins: [pg1],
      })
    )

    const createHarness2 = createHarnessFactory({
      createHarness: createHarness1,
      plugins: [pg2],
    })

    createHarness1()
    // parent createHarness
    t.eq(createHarness1.callCount, 1, 'createHarness1 has been called')
    t.eq(createHarness0.callCount, 1, 'createHarness0 called in createHarness1')
    // plugins
    t.eq(pg1.callCount, 1, 'hook1 called in createHarness1')
    extraHook1Calls++

    createHarness2()
    // parent createHarness
    t.eq(createHarness1.callCount, 2, 'createHarness1 has been called')
    t.eq(createHarness0.callCount, 2, 'createHarness0 called in createHarness1')
    // plugins
    t.eq(pg1.callCount, 2, 'hook1 called in createHarness2')
    t.eq(pg2.callCount, 1, 'hook1 called in createHarness2')
  })
})

describe('test', () => {
  test('test(desc, decorators, run)', t => {
    const opts = {}
    let zz

    const run = spy((z, aa, bb) => {
      t.is(z, zz, 'run is called with the same test context as decorators')
      t.test('extra test arguments are ignored', t => {
        t.is(aa, undefined)
        t.is(bb, undefined)
      })
    })

    const decorators = [
      spy((z, options) => {
        zz = z
        t.eq(run.callCount, 0, 'decorators are called before run')
        t.is(options, opts, 'decorator is passed harness options')
        t.eq(decorators[1].callCount, 0, 'decorators are called left to right')
      }),
      spy(() => {
        t.eq(decorators[0].callCount, 1, 'decorators are called left to right')
      }),
    ]

    const z = createHarness(opts)

    z.test('desc', [...decorators], run, 42, 'foo') // <- <- <-

    t.eq(run.callCount, 1, 'run is called')

    t.ok(
      decorators.every(fn => fn.callCount === 1),
      'all decorators are called'
    )
  })
})

describe('nested test context', () => {
  test('have hooks support', async t => {
    const z = createHarness()

    const run3 = spy()

    const run2 = spy(z => {
      z.test('', [], run3)
    })

    const run = spy(z => {
      z.test('', [], run2)
    })

    z.test('', [], run)

    await z.report(blackHole)

    t.ok(z.pass, 'tests pass')
    t.ok(run.callCount, 1, 'level 0 run has been called')
    t.ok(run2.callCount, 1, 'level 1 run has been called')
    t.ok(run3.callCount, 1, 'level 2 run has been called')
  })

  test('hooks are called', async t => {
    const z = createHarness()

    const dd = [spy(), spy()]
    const dd2 = [spy()]

    const run2 = spy()

    const run = spy(t => {
      t.test('', dd2, run2)
    })

    t.ok(
      dd.every(d => d.callCount === 0),
      'hooks are not called before test run'
    )

    z.test('', dd, run)

    await z.report(blackHole)

    t.ok(z.pass, 'tests pass')

    t.eq(run.callCount, 1, 'level 0 run has been called')
    t.ok(
      dd.every(d => d.callCount === 1),
      'level 0 hooks are called when test run'
    )

    t.eq(run2.callCount, 1, 'level 1 run has been called')
    t.ok(
      dd2.every(d => d.callCount === 1),
      'level 1 hooks are called when test run'
    )
  })
})

test('the hooks argument is filtered out of the args passed down the hooks -> run pipeline', async t => {
  const desc = 'foo'
  const a = {}
  const b = {}
  const c = {}

  const ttest = spy((d, r, ...args) => {
    t.is(d, desc)
    t.is(r, run)
    t.eq(args.length, 3)
    t.is(args[0], a)
    t.is(args[1], b)
    t.is(args[2], c)
    return run(...args)
  })

  const hook = spy(z => {
    z.test = ttest
  })

  const run = spy()

  const z = createHarness({}, hook)

  z.test(desc, run, a, b, c)

  await z.report(blackHole)

  t.eq(hook.callCount, 1, 'hook has been called')
  t.eq(ttest.callCount, 1, 'test decorator has been called')
})

test('use case: macro', async t => {
  const a = {}
  const b = {}
  const c = {}

  const withMacro = {
    test: t => {
      const { test } = t
      t.test = function zora_spec_fn(desc, run, ...args) {
        return test(desc, t => run(t, ...args))
      }
    },
  }

  const run2 = spy((z, ...rest) => {
    t.ok(isFunction(z.test) && isFunction(z.ok), 'first arg is a test context')
    t.test('nested run has been passed extra test args', t => {
      t.eq(rest.length, 2)
      t.is(rest[0], 'foo')
      t.is(rest[1], 42)
    })
  })

  const run = spy((z, ...rest) => {
    t.ok(isFunction(z.test) && isFunction(z.ok), 'first arg is a test context')
    t.test('run has been passed extra test args', t => {
      t.eq(rest.length, 3)
      t.is(rest[0], a)
      t.is(rest[1], b)
      t.is(rest[2], c)
    })
    z.test('', run2, 'foo', 42) // <- run sub test
  })

  const z = createHarness({}, withMacro) // <- create harness

  z.test('', run, a, b, c)

  await z.report(blackHole)

  t.eq(run.callCount, 1, 'run has been called')
  t.eq(run2.callCount, 1, 'run2 has been called')
})

describe('t.test(...)', () => {
  test("t.test('', t => {})", t => {
    const run = spy((...args) => {
      t.eq(args.length, 1)
      const [z] = args
      t.ok(isTestContext(z))
    })
    const z = createHarness()
    t.eq(run.callCount, 0)
    t.test('', run)
    t.eq(run.callCount, 1)
  })

  test("t.test('', async t => {})", async t => {
    const runAsync = spy(async (...args) => {
      t.eq(args.length, 1)
      const [z] = args
      t.ok(isTestContext(z))
    })
    const z = createHarness()
    t.eq(runAsync.callCount, 0)
    t.test('', runAsync)
    t.eq(runAsync.callCount, 1)
    await z.report(blackHole)
  })

  test("t.test('', plugin, run)", async t => {
    let zz
    const run = spy(async (...args) => {
      t.eq(args.length, 1)
      const [z] = args
      t.ok(isTestContext(z))
      t.is(z, zz, 'spec function is called with the same context as plugins')
    })
    const plugin = {
      test: spy((z, opts) => {
        zz = z
        t.ok(isTestContext(z), 'plugins are called with the test context')
      }),
    }
    const z = createHarness()
    z.test('', plugin, run) // <- <- <-
    t.eq(plugin.test.callCount, 1, 'plugin test hook has been run')
  })

  test("t.test('', [...plugins], run)", async t => {
    let zz
    const run = spy(async (...args) => {
      t.eq(args.length, 1, 'spec function is called with one argument')
      const [z] = args
      t.ok(isTestContext(z), 'spec function is called with test context')
      t.is(z, zz, 'spec function is called with the same context as plugins')
    })
    const plugins = [
      {
        test: spy((z, opts) => {
          zz = z
          t.ok(isTestContext(z), 'plugins are called with the test context')
        }),
      },
      {
        test: spy((z, opts) => {
          t.ok(zz)
          t.is(z, zz, 'plugins are called with the same test context')
        }),
      },
    ]
    const z = createHarness()
    z.test('', plugins, run) // <- <- <-
    plugins.forEach((plugin, i) => {
      t.eq(plugin.test.callCount, 1, `plugin #${i} test hook has been run`)
    })
  })
})

// describe('plugin', () => {
//   t.test('plugin.test', async t => {
//     const z = createHarness({ })
//   })
// })