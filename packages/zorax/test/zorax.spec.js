import { test, describe } from '@@'

import { blackHole, isHarness } from '@@/util'

import { harness } from '@/zorax'
import createDefaultHarness from '@/zorax.defaults'

const isFunction = x => typeof x === 'function'

describe(__filename)

test('exports default harness', t => {
  t.ok(isHarness(harness))
})

test('default harness', t => {
  const harness = createDefaultHarness({
    reporter: blackHole,
  })

  t.test('has auto start plugin', t => {
    t.ok(isFunction(harness.auto))
  })

  t.test('has auto start enabled', t => {
    t.eq(harness.auto(), true)
  })

  t.test('has default reporter', t => {
    t.skip('how to test this?')
  })

  t.test('has describe', t => {
    t.ok(isFunction(harness.describe))
  })

  t.test('has only', t => {
    t.ok(isFunction(harness.test.only))
  })

  t.test('has pass', t => {
    t.ok(isFunction(harness.pass))
  })

  t.test('has todo', t => {
    t.ok(isFunction(harness.test.todo))
  })
})
