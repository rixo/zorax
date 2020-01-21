import { createHarness as createZoraHarness } from 'zora'
import { describe, test } from 'zorax'

import { spy } from './util'

import { createHarness, createHarnessFactory } from '@/lib/plug'
import withAuto from '@/lib/auto'

describe(__filename)

const eachBool = callback => [true, false].forEach(callback)

// disable zora auto start
createZoraHarness()

describe('withAuto', () => {
  describe('withAuto({ auto: bool })', () => {
    test('withAuto({ auto: true })', t => {
      const defaultAuto = true
      const z = createHarness([withAuto({ auto: defaultAuto })])
      t.eq(z.auto(), true, 'sets default auto start to true')
      z.auto(false)
    })

    test('withAuto({ auto: false })', t => {
      const defaultAuto = false
      const z = createHarness([withAuto({ auto: defaultAuto })])
      t.eq(z.auto(), false, 'sets default auto start to false')
      z.auto(false)
    })
  })

  test('adds .auto(bool) to harness', t => {
    const defaultAuto = true
    const z = createHarness([withAuto({ auto: defaultAuto })])
    z.report = spy.async()
    t.eq(typeof z.auto, 'function')
    t.eq(z.auto(), defaultAuto, '')
    t.eq(z.auto(false), false)
    z.auto(false)
  })
})

describe('.auto', () => {
  test('.auto()', t => {
    const defaultAuto = true
    const z = createHarness([withAuto({ auto: defaultAuto })])
    t.eq(z.auto(), defaultAuto, 'returns the current auto value')
    z.auto(false)
  })

  eachBool(bool => {
    test(`.auto(${bool})`, t => {
      const defaultAuto = !bool
      const z = createHarness([withAuto({ auto: defaultAuto })])
      t.eq(z.auto(bool), bool, `changes auto start to ${bool}`)
      z.auto(false)
    })
  })
})

describe('auto option', () => {
  eachBool(bool => {
    test(`createHarness({ auto: ${bool} })`, t => {
      const z = createHarness({ auto: bool }, [withAuto()])
      t.eq(z.auto(), bool)
      z.auto(false)
    })

    test(`createHarnessFactory({ auto: ${bool} })`, t => {
      const createHarness = createHarnessFactory({ auto: bool })
      const z = createHarness([withAuto()])
      t.eq(z.auto(), bool)
      z.auto(false)
    })
  })
})

test('auto starts on next tick', async t => {
  const z = createHarness([withAuto()])
  z.auto(true)
  z.report = spy.async()
  const run = spy()
  z.test('', run)
  t.eq(run.callCount, 1)
  t.eq(z.report.callCount, 0)
  await new Promise(resolve => setTimeout(resolve))
  t.eq(z.report.callCount, 1)
})

test('calling harness.report() disable auto start', t => {
  const report = spy.async()
  const spyHarness = {
    harness: z => {
      z.report = report
    },
  }
  const z = createHarness([spyHarness, withAuto()])
  z.auto(true)
  t.eq(report.callCount, 0)
  z.report()
  t.eq(report.callCount, 1)
})
