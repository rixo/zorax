import { describe, test } from 'zorax'
import { createHarness as createZoraHarness } from 'zora'

import {
  blackHole as bh,
  isFunction,
  isHarness,
  isHarnessFactory,
  isTestContext,
  spy,
} from './util'

import { createHarnessFactory, createHarness } from 'zorax/lib/plug'

const noop = () => {}

const spyPlug = ({ test, harness, decorate, decorateHarness } = {}) => ({
  test: test !== false ? spy(test) : undefined,
  // harness: harness !== false ? spy(harness) : undefined,
  harness: harness && spy(harness === true ? spy() : harness),
  decorate: decorate && spy(decorate === true ? spy() : decorate),
  decorateHarness:
    decorateHarness && spy(decorateHarness === true ? spy() : decorateHarness),
})

const spies = () =>
  new Proxy(
    {},
    {
      get(target, prop) {
        if (!target.hasOwnProperty(prop)) {
          target[prop] = (...args) => (target[prop] = spy(...args))
        }
        return target[prop]
      },
    }
  )

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

test('t.plugins: attaches plugins to wrapped contexts', t => {
  const plugins = [{}, {}, {}]
  const z = createHarness()
  let zt
  z.test('', z => {
    z.plug(...plugins).test('', z => {
      zt = z
    })
  })
  t.eq(z.plugins, [])
  t.eq(zt && zt.plugins, plugins)
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

  test('is exposed on test contexts', t => {
    const z = createHarness()
    let hasRun = false
    z.test('', z => {
      t.ok(isFunction(z.plug))
      hasRun = true
    })
    t.ok(hasRun)
  })

  test('throws when adding harness plugin in test context', t => {
    const z = createHarness()
    t.throws(() => z.plug({ harness: noop }), /harness plugin/)
    t.throws(() => z.plug({ decorateHarness: noop }), /harness plugin/)
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
      .test('', z => {
        t.ok(isTestContext(z))
        t.eq(z.plugins, [foo, bar])
        done = true
      })
    t.ok(done)
  })

  test('wrapped contexts have a plug method', t => {
    const plugin = {}
    const run = spies()

    const z = createHarness().plug(plugin)

    t.ok(isFunction(z.plug), 'harness.plug is a function')

    z.test(
      'main',
      run.main(z => {
        t.ok(isFunction(z.plug), "main test's t.plug is a function")

        z.test(
          'sub',
          run.sub(z => {
            t.ok(isFunction(z.plug), "sub test's t.plug is a function")

            z.test(
              'sub sub',
              run.subsub(z => {
                t.ok(isFunction(z.plug), "sub sub test's t.plug is a function")
              })
            )
          })
        )
      })
    )

    t.eq(run.main.callCount, 1, 'main test runs')
    t.eq(run.sub.callCount, 1, 'sub test runs')
    t.eq(run.subsub.callCount, 1, 'sub sub test runs')
  })
})

test('child contexts are passed their own proxy', t => {
  const p = Array.from({ length: 10 }).map((_, i) => ({ name: 'plugin ' + i }))
  const z = createHarness([p[0], p[1]])
  const s = spies()

  t.eq(z.plugins, p.slice(0, 2))

  z.test(
    'main',
    s.main(z => {
      t.eq(z.plugins, p.slice(0, 2))

      z.plug(p[2], p[3]).test(
        'sub',
        s.sub(z => {
          t.eq(z.plugins, p.slice(0, 4))

          z.plug(p[4], p[5]).test(
            'sub sub',
            s.subsub(z => {
              t.eq(z.plugins, p.slice(0, 6))
            })
          )
        })
      )
    })
  )

  t.eq(s.main.callCount, 1, 'main test runs')
  t.eq(s.sub.callCount, 1, 'sub test runs')
  t.eq(s.subsub.callCount, 1, 'sub sub test runs')
})

describe('hook order', () => {
  // -> pg1.test -> pg1.harness
  // -> pg2.test -> pg2.harness
  // -> pg1.decorate -> pg1.decorateHarness
  // -> pg2.decorate -> pg2.decorateHarness

  const hooksOrder = harness => async (t, createTestHarness) => {
    const pg1 = spyPlug({
      test() {
        harness && t.eq(pg1.harness.callCount, 0)
        t.eq(pg2.test.callCount, 0)
        harness && t.eq(pg2.harness.callCount, 0)
        t.eq(pg1.decorate.callCount, 0)
        harness && t.eq(pg1.decorateHarness.callCount, 0)
        t.eq(pg2.decorate.callCount, 0)
        harness && t.eq(pg2.decorateHarness.callCount, 0)
      },
      decorate() {
        harness && t.eq(pg1.decorateHarness.callCount, 0)
        t.eq(pg2.decorate.callCount, 0)
        harness && t.eq(pg2.decorateHarness.callCount, 0)
      },
      ...(harness && {
        harness() {
          t.eq(pg2.test.callCount, 0)
          t.eq(pg2.harness.callCount, 0)
          t.eq(pg1.decorate.callCount, 0)
          t.eq(pg1.decorateHarness.callCount, 0)
          t.eq(pg2.decorate.callCount, 0)
          t.eq(pg2.decorateHarness.callCount, 0)
        },
        decorateHarness() {
          t.eq(pg2.decorate.callCount, 0)
          t.eq(pg2.decorateHarness.callCount, 0)
        },
      }),
    })
    const pg2 = spyPlug({
      test() {
        harness && t.eq(pg2.harness.callCount, 0)
        t.eq(pg1.decorate.callCount, 0)
        harness && t.eq(pg1.decorateHarness.callCount, 0)
        t.eq(pg2.decorate.callCount, 0)
        harness && t.eq(pg2.decorateHarness.callCount, 0)
      },
      decorate() {
        harness && t.eq(pg2.decorateHarness.callCount, 0)
      },
      ...(harness && {
        harness() {
          t.eq(pg1.decorate.callCount, 0)
          harness && t.eq(pg1.decorateHarness.callCount, 0)
          t.eq(pg2.decorate.callCount, 0)
          harness && t.eq(pg2.decorateHarness.callCount, 0)
        },
        decorateHarness() {},
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
      t.eq(pg1.decorateHarness.callCount, 1, `pg1.decorateHarness, 1`)
      t.eq(pg2.harness.callCount, 1, `pg2.harness, 1`)
      t.eq(pg2.decorateHarness.callCount, 1, `pg2.decorateHarness, 1`)
    }
  }

  const harnessHooksOrder = hooksOrder(true)

  const testHooksOrder = hooksOrder(false)

  test('createHarness([pg1, pg2])', harnessHooksOrder, (...plugins) =>
    createHarness(plugins)
  )

  test('createHarness().plug(pg1, pg2)', testHooksOrder, (...plugins) =>
    createHarness().run(z => z.plug(...plugins).test('', noop))
  )

  test('t.plug(pg1, pg2)', testHooksOrder, (...plugins) =>
    createHarness().run(z => {
      z.test('', t => {
        t.plug(...plugins).test('', noop)
      })
    })
  )
})

describe('harness plugin hooks', () => {
  test('are passed (harness, harness)', t => {
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
    t.eq(plugin.test.calls[0], [z, z])
    t.eq(plugin.harness.calls[0], [z, z])
    t.eq(plugin.decorate.calls[0], [z, z])
    t.eq(plugin.decorateHarness.calls[0], [z, z])
  })
})

describe('test plugin hooks', () => {
  test('are passed (t, harness)', t => {
    const plugin = spyPlug({ decorate: true })
    const z = createHarness()
    let complete = false
    z.test('', zt => {
      const zz = zt.plug(plugin)
      t.eq(plugin.test.callCount, 0)
      t.eq(plugin.decorate.callCount, 0)
      zz.test('', ztt => {
        t.eq(plugin.test.callCount, 1)
        t.eq(plugin.decorate.callCount, 1)
        t.eq(plugin.test.calls[0], [ztt, z])
        t.eq(plugin.decorate.calls[0], [ztt, z])
        complete = true
      })
    })
    t.ok(complete)
  })
})

test('decorate hook does not overwrite test', t => {
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
