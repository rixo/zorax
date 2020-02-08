import { test, describe } from '@@'
import * as zora from 'zora'

import { spy, blackHole } from './util'

describe(__filename)

test('extra test arguments are not passed down to test handler', async t => {
  const z = zora.createHarness()

  const a = {}
  const b = {}
  const c = {}

  const run = spy((...args) => {
    t.eq(args.length, 1)
  })

  z.test('', run, a, b, c)

  await z.report(blackHole)

  t.eq(run.callCount, 1, 'run has been called')
})
