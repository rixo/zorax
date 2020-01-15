import {
  blackHole,
  describe,
  isFunction,
  isHarness,
  isHarnessFactory,
  isTestContext,
  spy,
} from './util'

import * as zorax from '../lib/zorax'

const test = describe('zorax')

test("exports * from 'zora'", t => {
  t.ok(isHarnessFactory(zorax.createHarness), 'has createHarness')
  t.ok(zorax.test, 'is a harness')
  t.ok(zorax.ok, 'is a test context (assertions)')
})

test('exports default harness', t => {
  t.ok(isHarness(zorax.harness))
})

describe('default harness', () => {
  const { harness } = zorax

  test('has auto start plugin', t => {
    t.ok(typeof harness.auto, 'function')
  })

  test('has auto start enabled', t => {
    t.eq(harness.auto(), true)
  })
})
