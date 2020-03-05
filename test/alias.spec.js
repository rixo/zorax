import { test } from '@@'
import { isHarness } from '@@/util'

import { createHarness } from '@zorax/plug'
import withAlias from '@/alias'

test('does not break createHarness', t => {
  const z = createHarness([withAlias({})])
  t.ok(isHarness(z))
})

test('withAlias({ from: to | [...tos] })', t => {
  const foo = {}
  const bar = {}
  const baz = {}
  const buz = {}
  const plugin = {
    test: z => {
      z.foo = foo
      z.baz = baz
      z.buz = buz
    },
    harness: h => {
      h.bar = bar
    },
  }

  const z = createHarness([
    withAlias(
      {
        foo: ['foot', 'foob'],
        baz: 'zap',
        nonExistant: 'pif',
        buz: 'test.buzz',
      },
      {
        foo: 'fooh',
        bar: ['barb', 'babar', 'test.baar'],
      }
    ),
    plugin,
  ])

  t.ok(isHarness(z))

  // sanity
  t.is(z.foo, foo)
  t.is(z.bar, bar)

  {
    let hasRun = false
    z.test('', z => {
      t.is(z.foo, foo)
      t.is(z.bar, undefined)
      hasRun = true
    })
    t.ok(hasRun)
  }

  t.test('aliases are copied to the harness', t => {
    t.test('test context aliases', t => {
      t.is(z.foot, foo, 'test alias multi (1)')
      t.is(z.foob, foo, 'test alias multi (2)')
      t.is(z.zap, baz, 'test alias single')
      t.is(z.pif, undefined, 'non existant target')
      t.is(z.test.buzz, buz, 'dotted notation')
    })
    t.test('harness specific aliases', t => {
      t.is(z.fooh, foo, 'harness specific single')
      t.is(z.barb, bar, 'harness specific multiple')
      t.is(z.babar, bar, 'harness specific multiple')
      t.is(z.pif, undefined, 'non existant target')
      t.is(z.test.baar, bar, 'dotted notation')
    })
  })

  t.test('aliases are copied to all test context', t => {
    let hasRun = false
    z.test('main', z => {
      z.test('sub', z => {
        z.test('sub sub', () => {
          t.is(z.foot, foo, 'test alias multi (1)')
          t.is(z.foob, foo, 'test alias multi (2)')
          t.is(z.zap, baz, 'test alias single')
          t.is(z.pif, undefined, 'non existant target')
          t.is(z.test.buzz, buz, 'dotted notation')
          hasRun = true
        })
      })
    })
    t.ok(hasRun)
  })
})
