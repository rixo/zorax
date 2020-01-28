import { test } from 'zorax'

import { arrayReporter, isFunction, spy } from './util'

import { createHarness } from '@/lib/plug'
import withCatch from '@/lib/catch'

test('withCatch', t => {
  t.test('is a function', t => {
    t.ok(isFunction(withCatch))
  })
  t.test('returns zorax.catch plugin', t => {
    const plugin = withCatch()
    t.eq(plugin.name, 'zorax.catch')
  })
})

test('without catch plugin', async t => {
  const harness = createHarness()

  const run = spy(() => {
    throw new Error('oops')
  })

  harness.test('crash', run)

  harness.test('another', () => {})

  const { reporter, messages } = arrayReporter({ filter: () => true })

  await harness.report(reporter)

  t.eq(run.callCount, 1)

  t.falsy(harness.pass, 'test fails on exception')

  t.eq(
    messages.filter(({ type }) => type === 'BAIL_OUT').length,
    1,
    'bails out'
  )

  t.eq(
    messages.filter(({ type }) => type === 'ASSERTIONS').length,
    0,
    'has no assertions'
  )
})

test('with catch plugin', async t => {
  const harness = createHarness([withCatch()])

  const run = spy(() => {
    t.ok(true)
    throw new Error('oops')
  })

  harness.test('crash', run)

  harness.test('another', () => {})

  const { reporter, messages } = arrayReporter({ filter: () => true })

  await harness.report(reporter)

  t.eq(run.callCount, 1)

  t.falsy(harness.pass, 'test fails on exception')

  t.eq(
    messages.filter(({ type }) => type === 'BAIL_OUT').length,
    0,
    'does not bail out'
  )

  t.eq(
    messages
      .filter(({ type }) => type === 'ASSERTION')
      .map(({ type, data: { description } }) => [type, description]),
    [
      ['ASSERTION', 'test should not throw'],
      ['ASSERTION', 'crash'],
      ['ASSERTION', 'another'],
    ],
    'has assertions'
  )
})
