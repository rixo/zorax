import {
  describe,
  isHarness,
  isHarnessFactory,
  isTestContext,
  defaultZoraxAutoStart,
} from './util'

import * as zorax from '../lib/zorax'

const test = describe('zorax')

test('zorax', t => {
  t.ok(isHarnessFactory(zorax.createHarness), 'has createHarness')
  t.ok(isTestContext(zorax), 'is a test context (has assertions)')
})

test("exports * from 'zora'", t => {
  t.ok(zorax.AssertPrototype, 'AssertPrototype')
  t.ok(zorax.createHarness, 'createHarness')
  t.ok(zorax.deepEqual, 'deepEqual')
  t.ok(zorax.doesNotThrow, 'doesNotThrow')
  t.ok(zorax.eq, 'eq')
  t.ok(zorax.equal, 'equal')
  t.ok(zorax.equals, 'equals')
  t.ok(zorax.fail, 'fail')
  t.ok(zorax.falsy, 'falsy')
  t.ok(zorax.is, 'is')
  t.ok(zorax.isNot, 'isNot')
  t.ok(zorax.mochaTapLike, 'mochaTapLike')
  t.ok(zorax.notDeepEqual, 'notDeepEqual')
  t.ok(zorax.notEq, 'notEq')
  t.ok(zorax.notEqual, 'notEqual')
  t.ok(zorax.notEquals, 'notEquals')
  t.ok(zorax.notOk, 'notOk')
  t.ok(zorax.notSame, 'notSame')
  t.ok(zorax.ok, 'ok')
  t.ok(zorax.only, 'only')
  t.ok(zorax.same, 'same')
  t.ok(zorax.skip, 'skip')
  t.ok(zorax.tapeTapLike, 'tapeTapLike')
  t.ok(zorax.test, 'test')
  t.ok(zorax.throws, 'throws')
  t.ok(zorax.truthy, 'truthy')
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
    t.eq(defaultZoraxAutoStart, true)
  })

  test('has default reporter', t => t.skip('how to test this?'))
})
