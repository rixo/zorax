import { describe, test } from '@@'
import {
  blackHole as bh,
  isFunction,
  isHarness,
  isHarnessFactory,
  isTestContext,
  spy,
} from '@@/util'
import { createHarness as createZoraHarness } from 'zora'

import { createHarnessFactory, createHarness } from '@/plug'

const noop = () => {}

const spyPlug = ({
  test,
  harness,
  init,
  decorate,
  decorateHarness,
  decorateInit,
} = {}) => ({
  test: test === false ? undefined : spy(test === true ? noop : test),
  harness: harness && spy(harness === true ? noop : harness),
  init: init && spy(init === true ? noop : init),
  decorate: decorate && spy(decorate === true ? noop : decorate),
  decorateHarness:
    decorateHarness && spy(decorateHarness === true ? noop : decorateHarness),
  decorateInit:
    decorateInit && spy(decorateInit === true ? noop : decorateInit),
})

spyPlug.reset = (...plugins) => {
  for (const pg of plugins.flat()) {
    Object.values(pg)
      .filter(Boolean)
      .map(fn => fn.calls)
      .forEach(calls => {
        calls.splice(0, calls.length)
      })
  }
}

const filtersOutFalsy = (t, init) => {
  const foo = {}
  const bar = {}
  const plugins = [false, foo, null, undefined, '', bar]
  const z = init(plugins)
  t.ok(isHarness(z))
  t.eq(z.plugins, [foo, bar])
}

filtersOutFalsy.title = pre => pre + 'filters out falsy plugins'

describe(__filename)

test("import { createHarnessFactory } from 'zorax/lib/plug'", t => {
  t.ok(isFunction(createHarnessFactory), 'createHarnessFactory is a function')
})

describe('createHarnessFactory', () => {
  test("import { createHarness } from 'zorax/lib/plug'", t => {
    t.ok(isFunction(createHarness), 'createHarness is a function')
    t.ok(isFunction(createHarness.plug), 'createHarness.plug is a function')
  })

  test('createHarnessFactory()', t => {
    const createZ = createHarnessFactory()
    t.ok(isHarnessFactory(createZ), 'returns a harness factory')
  })

  test('createHarnessFactory(createHarness, options, plugins)', t => {
    const createHarness = spy(createZoraHarness)
    const options = { foo: 'bar' }
    const plugins = [{}, {}]
    const createZ = createHarnessFactory(createHarness, options, plugins)
    t.ok(isHarnessFactory(createZ))
    const z = createZ()
    t.ok(isHarness(z))
    t.eq(z.options, options)
    t.eq(z.plugins, plugins)
  })

  test('createHarnessFactory(createHarness, options)', t => {
    const createHarness = spy(createZoraHarness)
    const options = { foo: 'bar' }
    const createZ = createHarnessFactory(createHarness, options)
    t.ok(isHarnessFactory(createZ))
    const z = createZ()
    t.ok(isHarness(z))
    t.eq(z.options, options)
    t.eq(z.plugins, [])
  })

  test('createHarnessFactory(createHarness, plugins)', t => {
    const createHarness = spy(createZoraHarness)
    const plugins = [{}, {}]
    const createZ = createHarnessFactory(createHarness, plugins)
    t.ok(isHarnessFactory(createZ))
    const z = createZ()
    t.ok(isHarness(z))
    t.eq(z.options, {})
    t.eq(z.plugins, plugins)
  })

  test('createHarnessFactory(options, plugins)', t => {
    const options = { foo: 'bar' }
    const plugins = [{}, {}]
    const createZ = createHarnessFactory(options, plugins)
    t.ok(isHarnessFactory(createZ))
    const z = createZ()
    t.ok(isHarness(z))
    t.eq(z.options, options)
    t.eq(z.plugins, plugins)
  })

  test('createHarnessFactory(options)', t => {
    const options = { foo: 'bar' }
    const createZ = createHarnessFactory(options)
    t.ok(isHarnessFactory(createZ))
    const z = createZ()
    t.ok(isHarness(z))
    t.eq(z.options, options)
    t.eq(z.plugins, [])
  })

  test('createHarnessFactory(plugins)', t => {
    const plugins = [{}, {}]
    const createZ = createHarnessFactory(plugins)
    t.ok(isHarnessFactory(createZ))
    const z = createZ()
    t.ok(isHarness(z))
    t.eq(z.options, {})
    t.eq(z.plugins, plugins)
  })

  test(filtersOutFalsy, plugins => createHarnessFactory(plugins)())
})

describe('createHarness', () => {
  test('createHarness()', t => {
    const z = createHarness()
    t.ok(isHarness(z), 'returns a test harness')
    t.ok(isFunction(z.plug), 'harness.plug is a function')
    t.eq(z.options, {})
    t.eq(z.plugins, [])
  })

  test('createHarness(options, [...plugins])', t => {
    const options = {}
    const plugins = [{}, {}]
    const z = createHarness(options, plugins)
    t.ok(isHarness(z), 'returns a test harness')
    t.ok(isFunction(z.plug), 'harness.plug is a function')
    t.eq(z.options, options)
    t.eq(z.plugins, plugins)
  })

  test('createHarness(options)', t => {
    const options = {}
    const z = createHarness(options)
    t.ok(isHarness(z), 'returns a test harness')
    t.ok(isFunction(z.plug), 'harness.plug is a function')
    t.eq(z.options, options)
    t.eq(z.plugins, [])
  })

  test('createHarness([...plugins])', t => {
    const plugins = [{}, {}]
    const z = createHarness(plugins)
    t.ok(isHarness(z), 'returns a test harness')
    t.ok(isFunction(z.plug), 'harness.plug is a function')
    t.eq(z.options, {})
    t.eq(z.plugins, plugins)
  })

  test('createHarness([...plugins], {...config})', t => {
    const plugins = [{}, {}]
    const options = { auto: false }
    const z = createHarness(options, plugins)
    t.ok(isHarness(z), 'returns a test harness')
    t.ok(isFunction(z.plug), 'harness.plug is a function')
    t.eq(z.options, options)
    t.eq(z.plugins, plugins)
  })

  test(filtersOutFalsy, plugins => createHarness(plugins))
})

test('harness.options: attaches options to the harness', t => {
  const opts = {}
  const z = createHarness(opts, [{}])
  t.ok(z.options)
  t.eq(z.options, opts)
})

test('harness.plugins: attaches plugins to the harness', t => {
  const plugins = [{}, {}, {}]
  const z = createHarness(plugins)
  t.eq(z.plugins, plugins, 'harness.plugins eq plugins')
})

test('t.plugins: attaches plugins to plug proxy', t => {
  const plugins = [{ name: 'a' }, { name: 'b' }]
  const z = createHarness(plugins)
  const plugins2 = [{ name: 'c' }]
  const zz = z.plug(...plugins2)
  t.eq(z.plugins, plugins)
  t.eq(zz.plugins, [...plugins, ...plugins2])
})

describe('harness.report(...)', () => {
  const pass = z => z.ok(true)
  const fail = z => z.fail()

  const reporting = async (t, pass, assert) => {
    const z = createHarness()
    const run = spy(assert)
    z.test('main', run)
    await z.report(bh)
    t.eq(run.callCount, 1, 'run has been called')
    if (pass) {
      t.ok(z.pass, 'passing test passes')
    } else {
      t.notOk(z.pass, 'failing test fails')
    }
  }

  reporting.title = (what = 'test', pass) =>
    `reports ${pass ? 'passing' : 'failing'} ${what}`.trim()

  test(reporting, true, pass)
  test(reporting, false, fail)

  const sub = (t, next, pass, assert) =>
    next(t, pass, z => {
      z.test('sub', z => {
        z.test('sub sub', assert)
      })
    })

  sub.title = (what = 'sub test', next, ...args) =>
    reporting.title(what, ...args)

  test(sub, reporting, true, pass)
  test(sub, reporting, false, fail)
})

describe('harness.plug', () => {
  test('is a function', t => {
    const z = createHarness()
    t.ok(isFunction(z.plug))
  })

  test('returns a zorax proxy', t => {
    const z = createHarness()
    const p = z.plug()
    t.falsy(p.report)
    t.ok(isTestContext(p))
  })
})

describe('a zorax proxy', () => {
  test('is a test context', t => {
    const zz = createHarness().plug()
    t.ok(isTestContext(zz))
  })

  test('does not have a report method (i.e. is not a harness)', t => {
    const zz = createHarness().plug()
    t.falsy(zz.report)
  })
})

test('harness reports tests from child proxies', async t => {
  const plugin = {}

  const harness = createHarness([plugin])
  const proxy1 = harness.plug({})
  const proxy2 = harness.plug().plug({})

  Object.entries({ harness, proxy1, proxy2 }).forEach(([name, z]) => {
    z.ok(true, `${name} top level assertion: pass`)
    z.ok(false, `${name} top level assertion: fail`)

    z.test(`${name} main: fail`, z => {
      z.ok(true)
      z.test(`${name} sub: pass`, z => {
        z.skip(`${name} subsub skip`)
        z.ok(true)
        z.test(`${name} subsub: pass`, z => {
          z.ok(true)
        })
      })
      z.skip(`${name} sub skip`)
      z.test(`${name} sub: fail`, z => {
        z.ok(false)
        z.test(`${name} subsub: fail`, z => {
          z.ok(false)
          z.ok(false)
        })
      })
    })

    z.skip(`${name} main skip`)

    z.test(`${name} main: pass`, z => {
      z.ok(true)
      z.ok(true)
    })
  })

  await harness.report(bh)

  t.eq(harness.count, 3 * 13)
  t.eq(harness.successCount, 3 * 6)
  t.eq(harness.skipCount, 3 * 3)
  t.eq(harness.failureCount, 3 * 4)
})

describe('plug', () => {
  test('is exposed on harness', t => {
    const z = createHarness()
    t.ok(isFunction(z.plug))
  })

  test('is exposed on proxies', t => {
    const z = createHarness()
    const zz = z.plug()
    t.ok(isFunction(zz.plug))
  })

  test('throws when adding harness plugin in test context', t => {
    const z = createHarness()
    t.throws(() => z.plug({ init: noop }), /\binit plugin\b/i)
    t.throws(() => z.plug({ decorateInit: noop }), /\binit plugin\b/i)
  })
})

describe('harness.plug(plugin)', () => {
  test('filters out falsy plugins', async t => {
    const foo = {}
    const bar = {}
    const plugins = [false, foo, null, undefined, '', bar]
    let done = false
    createHarness()
      .plug(...plugins)
      .run(z => {
        t.ok(isTestContext(z))
        t.eq(z.plugins, [foo, bar])
        done = true
      })
    t.ok(done)
  })

  test('returns a proxy with a plug method', t => {
    const plugin = { name: 'foo' }
    const z = createHarness().plug(plugin)
    t.ok(isFunction(z.plug), 'harness.plug().plug is a function')

    t.test('that returns a proxy with a plug method', t => {
      const plugin = { name: 'bar' }
      const zz = z.plug(plugin)
      t.ok(isFunction(zz.plug), 'harness.plug().plug().plug is a function')
    })
  })
})

describe('hooks order', () => {
  // -> pg1.test -> pg1.harness -> pg1.init
  // -> pg2.test -> pg2.harness -> pg2.init
  // -> pg1.decorate -> pg1.decorateHarness -> pg1.decorateInit
  // -> pg2.decorate -> pg2.decorateHarness -> pg2.decorateInit

  const hooksOrder = harness => async (t, createTestHarness) => {
    const pg1 = spyPlug({
      test() {
        harness && t.eq(pg1.harness.callCount, 0)
        harness && t.eq(pg1.init.callCount, 0)
        t.eq(pg2.test.callCount, 0)
        harness && t.eq(pg2.harness.callCount, 0)
        harness && t.eq(pg2.init.callCount, 0)
        t.eq(pg1.decorate.callCount, 0)
        harness && t.eq(pg1.decorateHarness.callCount, 0)
        harness && t.eq(pg1.decorateInit.callCount, 0)
        t.eq(pg2.decorate.callCount, 0)
        harness && t.eq(pg2.decorateHarness.callCount, 0)
        harness && t.eq(pg2.decorateInit.callCount, 0)
      },
      decorate() {
        harness && t.eq(pg1.decorateHarness.callCount, 0)
        harness && t.eq(pg1.decorateInit.callCount, 0)
        t.eq(pg2.decorate.callCount, 0)
        harness && t.eq(pg2.decorateHarness.callCount, 0)
        harness && t.eq(pg2.decorateInit.callCount, 0)
      },
      ...(harness && {
        harness() {
          t.eq(pg1.init.callCount, 0)
          t.eq(pg2.test.callCount, 0)
          t.eq(pg2.harness.callCount, 0)
          t.eq(pg2.init.callCount, 0)
          t.eq(pg1.decorate.callCount, 0)
          t.eq(pg1.decorateHarness.callCount, 0)
          t.eq(pg1.decorateInit.callCount, 0)
          t.eq(pg2.decorate.callCount, 0)
          t.eq(pg2.decorateHarness.callCount, 0)
          t.eq(pg2.decorateInit.callCount, 0)
        },
        init() {
          t.eq(pg2.test.callCount, 0)
          t.eq(pg2.harness.callCount, 0)
          t.eq(pg2.init.callCount, 0)
          t.eq(pg1.decorate.callCount, 0)
          t.eq(pg1.decorateHarness.callCount, 0)
          t.eq(pg1.decorateInit.callCount, 0)
          t.eq(pg2.decorate.callCount, 0)
          t.eq(pg2.decorateHarness.callCount, 0)
          t.eq(pg2.decorateInit.callCount, 0)
        },
        decorateHarness() {
          t.eq(pg1.decorateInit.callCount, 0)
          t.eq(pg2.decorate.callCount, 0)
          t.eq(pg2.decorateHarness.callCount, 0)
          t.eq(pg2.decorateInit.callCount, 0)
        },
        decorateInit() {
          t.eq(pg2.decorate.callCount, 0)
          t.eq(pg2.decorateHarness.callCount, 0)
          t.eq(pg2.decorateInit.callCount, 0)
        },
      }),
    })
    const pg2 = spyPlug({
      test() {
        harness && t.eq(pg2.harness.callCount, 0)
        harness && t.eq(pg2.init.callCount, 0)
        t.eq(pg1.decorate.callCount, 0)
        harness && t.eq(pg1.decorateHarness.callCount, 0)
        harness && t.eq(pg1.decorateInit.callCount, 0)
        t.eq(pg2.decorate.callCount, 0)
        harness && t.eq(pg2.decorateHarness.callCount, 0)
        harness && t.eq(pg2.decorateInit.callCount, 0)
      },
      decorate() {
        harness && t.eq(pg2.decorateHarness.callCount, 0)
        harness && t.eq(pg2.decorateInit.callCount, 0)
      },
      ...(harness && {
        harness() {
          t.eq(pg2.init.callCount, 0)
          t.eq(pg1.decorate.callCount, 0)
          t.eq(pg1.decorateHarness.callCount, 0)
          t.eq(pg1.decorateInit.callCount, 0)
          t.eq(pg2.decorate.callCount, 0)
          t.eq(pg2.decorateHarness.callCount, 0)
          t.eq(pg2.decorateInit.callCount, 0)
        },
        init() {
          t.eq(pg1.decorate.callCount, 0)
          t.eq(pg1.decorateHarness.callCount, 0)
          t.eq(pg1.decorateInit.callCount, 0)
          t.eq(pg2.decorate.callCount, 0)
          t.eq(pg2.decorateHarness.callCount, 0)
          t.eq(pg2.decorateInit.callCount, 0)
        },
        decorateHarness() {
          t.eq(pg2.decorateInit.callCount, 0)
        },
        decorateInit() {},
      }),
    })

    const z = createTestHarness(pg1, pg2)

    await z.report(bh)

    t.eq(pg1.test.callCount, 1, 'pg1.test, 1')
    t.eq(pg1.decorate.callCount, 1, 'pg1.decorate, 1')
    t.eq(pg2.test.callCount, 1, 'pg2.test, 1')
    t.eq(pg2.decorate.callCount, 1, 'pg2.decorate, 1')

    if (harness) {
      t.eq(pg1.harness.callCount, 1, `pg1.harness, 1`)
      t.eq(pg1.init.callCount, 1, `pg1.init, 1`)
      t.eq(pg1.decorateHarness.callCount, 1, `pg1.decorateHarness, 1`)
      t.eq(pg1.decorateInit.callCount, 1, `pg1.decorateInit, 1`)
      t.eq(pg2.harness.callCount, 1, `pg2.harness, 1`)
      t.eq(pg2.init.callCount, 1, `pg2.init, 1`)
      t.eq(pg2.decorateHarness.callCount, 1, `pg2.decorateHarness, 1`)
      t.eq(pg2.decorateInit.callCount, 1, `pg2.decorateInit, 1`)
    }
  }

  const harnessHooksOrder = hooksOrder(true)

  const testHooksOrder = hooksOrder(false)

  test('createHarness([pg1, pg2])', harnessHooksOrder, (...plugins) =>
    createHarness(plugins)
  )

  test('createHarness().plug(pg1, pg2)', testHooksOrder, (...plugins) =>
    createHarness().run(z => z.plug(...plugins))
  )

  test(
    'createHarness().plug(pg1, pg2).test(...)',
    testHooksOrder,
    (...plugins) =>
      createHarness().run(z => {
        const zz = z.plug(...plugins)
        spyPlug.reset(plugins)
        zz.test('', noop)
      }),
    1
  )
})

describe('hooks arguments', () => {
  test('harness plugin hooks are passed (harness, harness)', t => {
    const plugin = spyPlug({
      decorate: true,
      harness: true,
      decorateHarness: true,
    })
    const z = createHarness([plugin])
    t.eq(plugin.test.callCount, 1)
    t.eq(plugin.harness.callCount, 1)
    t.eq(plugin.decorate.callCount, 1)
    t.eq(plugin.decorateHarness.callCount, 1)
    z.id = Symbol('z')
    t.eq(plugin.test.calls[0], [z, z])
    t.eq(plugin.harness.calls[0], [z, z])
    t.eq(plugin.decorate.calls[0], [z, z])
    t.eq(plugin.decorateHarness.calls[0], [z, z])
  })

  test('proxy plugin hooks are passed (proxy, harness)', t => {
    const plugin = spyPlug({
      decorate: true,
      harness: true,
      decorateHarness: true,
    })
    const z = createHarness([plugin])
    t.eq(plugin.test.callCount, 1)
    t.eq(plugin.harness.callCount, 1)
    t.eq(plugin.decorate.callCount, 1)
    t.eq(plugin.decorateHarness.callCount, 1)
    z.id = Symbol('z')
    t.eq(plugin.test.calls[0], [z, z])
    t.eq(plugin.harness.calls[0], [z, z])
    t.eq(plugin.decorate.calls[0], [z, z])
    t.eq(plugin.decorateHarness.calls[0], [z, z])
  })

  test('test plugin hooks are passed (t, proxy, harness)', t => {
    const plugin = spyPlug({ test: true, decorate: true })
    const z = createHarness()
    const zz = z.plug(plugin)
    let complete = false
    zz.test('', zt => {
      spyPlug.reset(plugin)
      t.eq(plugin.test.callCount, 0)
      t.eq(plugin.decorate.callCount, 0)
      zt.test('', ztt => {
        t.eq(plugin.test.callCount, 1)
        t.eq(plugin.decorate.callCount, 1)
        ztt.id = 'ctx'
        zz.id = 'proxy'
        z.id = 'harness'
        t.eq(plugin.test.calls[0], [ztt, zz, z])
        t.eq(plugin.decorate.calls[0], [ztt, zz, z])
        complete = true
      })
    })
    t.ok(complete)
  })
})

test('decorate hooks do not overwrite test method', t => {
  t.test('in harness', t => {
    const foo = { id: 'foo' }
    const plugin = {
      test: z => {
        z.test = foo
      },
      decorate: spy(z => {
        t.is(z.test, foo)
      }),
    }
    const z = createHarness([plugin])
    t.eq(plugin.decorate.callCount, 1)
    t.is(z.test, foo)
  })

  t.test('in nested test context', t => {
    const foo = { id: 'foo' }
    const plugin = {
      test: z => {
        z.test.foo = foo
      },
      decorate: spy(z => {
        t.is(z.test.foo, foo)
      }),
    }
    const z = createHarness([plugin])
    let hasRun = false
    z.test('main', z => {
      z.test('sub', z => {
        z.test('sub sub', z => {
          t.is(z.test.foo, foo)
          hasRun = true
        })
      })
    })
    t.ok(hasRun)
    t.is(z.test.foo, foo)
  })
})

test('decorateHarness hook does not overwrite test', t => {
  const foo = { id: 'foo' }
  const plugin = {
    test: z => {
      z.test = foo
    },
    decorateHarness: spy(z => {
      t.is(z.test, foo)
    }),
  }
  const z = createHarness([plugin])
  t.eq(plugin.decorateHarness.callCount, 1)
  t.is(z.test, foo)
})
