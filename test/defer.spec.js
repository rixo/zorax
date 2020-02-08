import { describe, test } from '@@'

import { createHarness } from '@/lib/plug'
import withDefer from '@/lib/defer'

import { arrayReporter, blackHole as bh, isHarness, spy } from './util'

describe(__filename)

test('defers passing test', async t => {
  const z = createHarness([withDefer()])

  t.ok(isHarness(z))

  const run = spy(t => {
    t.ok(true, 'passes')
  })

  z.test('', run)

  t.eq(run.callCount, 0)

  await z.report(bh)

  t.eq(run.callCount, 1)
  t.ok(z.pass)
})

test('defers failing test', async t => {
  const z = createHarness([withDefer()])

  t.ok(isHarness(z))

  const run = spy(t => {
    t.fail()
  })
  const run2 = spy(t => {
    t.ok(true, 'pass')
  })

  z.test('', run)
  z.test('', run2)

  t.eq(run.callCount, 0)
  t.eq(run2.callCount, 0)

  await z.report(bh)

  t.notOk(z.pass)

  t.eq(run.callCount, 1)
  t.eq(run2.callCount, 1)
})

test('defers skipped test', async t => {
  const z = createHarness([withDefer()])

  t.ok(isHarness(z))

  const run = spy(t => {
    t.ok(true, 'passes')
  })

  z.skip('skip!', run)

  t.eq(run.callCount, 0)

  const { reporter, messages } = arrayReporter()

  await z.report(reporter)

  t.eq(run.callCount, 0)
  t.ok(z.pass)
  t.eq(
    messages.map(x => [x.offset, x.data.description, x.data.pass]),
    [[0, 'skip!', true]]
  )
})

test('defers sub tests', async t => {
  const z = createHarness([withDefer()])

  t.ok(isHarness(z))

  const runSubSub = spy(t => {
    t.ok(true, 'passes')
  })
  const runSub = spy(t => {
    t.ok(true, 'passes')
    t.test('sub sub', runSubSub)
  })
  const runMain = spy(t => {
    t.ok(true, 'passes')
    t.test('sub', runSub)
  })

  z.test('main', runMain)

  t.eq(runMain.callCount, 0)
  t.eq(runSub.callCount, 0)
  t.eq(runSubSub.callCount, 0)

  await z.report(bh)

  t.ok(z.pass)

  t.eq(runMain.callCount, 1)
  t.eq(runSub.callCount, 1)
  t.eq(runSubSub.callCount, 1)
})

describe('hook: defer.add', () => {
  test('calls add hooks left to right, returned push functions right to left', async t => {
    let push1
    let push2

    const p1 = {
      defer: {
        add: spy(
          push =>
            (push1 = spy(spec => {
              t.eq(push2.callCount, 1, 'p1 push called after p2 push')
              push(spec)
            }))
        ),
      },
    }

    const p2 = {
      defer: {
        add: spy(push => {
          t.eq(p1.defer.add.callCount, 1, 'p1 add called before p2 push')
          t.is(push, push1, 'p2 add is called with p1 push')
          return (push2 = spy(spec => {
            t.eq(push1.callCount, 0, 'p2 push called before p1 push')
            push(spec)
          }))
        }),
      },
    }

    const z = createHarness([withDefer(), p1, p2])

    t.eq(p1.defer.add.callCount, 1)
    t.eq(p2.defer.add.callCount, 1)

    t.eq(push1.callCount, 0)
    t.eq(push2.callCount, 0)

    z.test('main 1', () => {})

    t.eq(push1.callCount, 1)
    t.eq(push2.callCount, 1)

    await z.report(bh)

    t.test('init hooks are only called once', t => {
      t.eq(p1.defer.add.callCount, 1)
      t.eq(p2.defer.add.callCount, 1)
    })
  })

  test('later add hooks can skip calling previous push', async t => {
    let push2

    const p1 = {
      defer: {
        add: spy(() => () => {
          t.fail('p1 push should not be called')
        }),
      },
    }

    const p2 = {
      defer: {
        add: spy(
          () =>
            (push2 = spy(() => {
              // NOTE does not call push
            }))
        ),
      },
    }

    const z = createHarness([withDefer(), p1, p2])

    t.eq(p1.defer.add.callCount, 1)
    t.eq(p2.defer.add.callCount, 1)
    t.eq(push2.callCount, 0)

    z.test('main 1', () => {})

    t.eq(push2.callCount, 1)
  })

  test('is called with previous add and harness', t => {
    let h1, h2
    let add1

    const p1 = {
      defer: {
        add: spy((_add, harness) => {
          h1 = harness
          return (add1 = spy(_add))
        }),
      },
    }

    const p2 = {
      defer: {
        add: spy((_add, harness) => {
          t.is(_add, add1)
          h2 = harness
          return _add
        }),
      },
    }

    const z = createHarness([withDefer(), p1, p2])

    t.is(h1, z)
    t.is(h2, z)
  })
})

describe('hook: defer.run', () => {
  test('calls hooks init left to right, returned run functions right to left', async t => {
    let run1
    let run2

    const p1 = {
      defer: {
        run: spy(run => {
          t.eq(p2.defer.run.callCount, 0, 'p1 defer.run is called before p2')
          return (run1 = spy((...args) => {
            t.eq(run2.callCount, 1, 'p1 run is called by p2')
            return run(...args)
          }))
        }),
      },
    }

    const p2 = {
      defer: {
        run: spy(run => {
          t.is(run, run1)
          return (run2 = spy(run))
        }),
      },
    }

    const z = createHarness([withDefer(), p1, p2])

    t.eq(p1.defer.run.callCount, 1)
    t.eq(p2.defer.run.callCount, 1)

    t.eq(run1.callCount, 0)
    t.eq(run2.callCount, 0)

    z.test('main 1', () => {})

    t.eq(run1.callCount, 0)
    t.eq(run2.callCount, 0)

    await z.report(bh)

    t.eq(run1.callCount, 1, 'p1 run is called in report')
    t.eq(run2.callCount, 1, 'p2 run is called in report')

    t.test('init hooks are only called once', t => {
      t.eq(p1.defer.run.callCount, 1)
      t.eq(p2.defer.run.callCount, 1)
    })
  })

  test('is called with previous run and harness', t => {
    let h1, h2
    let run1

    const p1 = {
      defer: {
        run: spy((_run, harness) => {
          h1 = harness
          return (run1 = spy(_run))
        }),
      },
    }

    const p2 = {
      defer: {
        run: spy((_run, harness) => {
          t.is(_run, run1)
          h2 = harness
          return _run
        }),
      },
    }

    const z = createHarness([withDefer(), p1, p2])

    t.is(h1, z)
    t.is(h2, z)
  })
})
