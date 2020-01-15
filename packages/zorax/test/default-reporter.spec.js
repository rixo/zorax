import { describe, spy, blackHole } from './util'

import { createHarness } from '../lib/zorax'
import withDefaultReporter from '../lib/default-reporter'

const test = describe('default-reporter')

test('is a function', t => {
  t.ok(typeof withDefaultReporter === 'function')
})
