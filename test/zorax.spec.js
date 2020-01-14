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
