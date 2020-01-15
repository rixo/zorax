import { mochaTapLike, tapeTapLike } from 'zora'
import { describe, spy } from './util'

import { createHarness, createHarnessFactory } from '../lib/zorax'
import withDefaultReporter from '../lib/default-reporter'

const spyReporter = () => {
  const messages = []
  return spy(async stream => {
    for await (const message of stream) {
      messages.push(message)
    }
  })
}

const test = describe('default-reporter')

test('is a function', t => {
  t.ok(typeof withDefaultReporter === 'function')
})

test('default reporter is used when none is provided', async t => {
  const reporter = spyReporter()
  const z = createHarness([withDefaultReporter(reporter)])
  z.test('', () => {})
  t.eq(reporter.callCount, 0)
  await z.report()
  t.eq(reporter.callCount, 1, 'default reporter has been called in report')
})

test('default indent vs no indent', t => {
  const before = opts => {
    const noIndentReporter = spyReporter()
    const indentReporter = spyReporter()
    const createHarness = createHarnessFactory([
      withDefaultReporter(noIndentReporter, indentReporter),
    ])
    const z = createHarness(opts)
    return { noIndentReporter, indentReporter, z }
  }

  t.test('no indent', async t => {
    const { noIndentReporter: nir, indentReporter: ir, z } = before({
      indent: false,
    })
    t.eq(nir.callCount, 0, 'no indent reporter is not called before report')
    t.eq(ir.callCount, 0, 'no indent reporter is not called before report')
    await z.report()
    t.eq(nir.callCount, 1, 'no indent reporter is called in report')
    t.eq(ir.callCount, 0, 'no indent reporter is not called in report')
  })

  t.test('indent', async t => {
    const { noIndentReporter: nir, indentReporter: ir, z } = before({
      indent: true,
    })
    t.eq(nir.callCount, 0, 'no indent reporter is not called before report')
    t.eq(ir.callCount, 0, 'no indent reporter is not called before report')
    await z.report()
    t.eq(nir.callCount, 0, 'no indent reporter is called in report')
    t.eq(ir.callCount, 1, 'no indent reporter is not called in report')
  })
})

test('can be overridden by createHarness reporter option', async t => {
  const defaultReporter = spyReporter()
  const reporter = spyReporter()
  const createHarness = createHarnessFactory([
    withDefaultReporter(defaultReporter),
  ])
  const z = createHarness({ reporter })
  await z.report()
  t.eq(defaultReporter.callCount, 0, 'default reporter is not called in report')
  t.eq(reporter.callCount, 1, 'options reporter is called in report')
})

test('can be overridden by argument of report', async t => {
  const defaultReporter = spyReporter()
  const reporter = spyReporter()
  const z = createHarness([withDefaultReporter(defaultReporter)])
  await z.report(reporter)
  t.eq(defaultReporter.callCount, 0, 'default reporter is not called in report')
  t.eq(reporter.callCount, 1, 'options reporter is called in report')
})

describe('withDefaultReporter(): when no default is provided', () => {
  test('the default indent reporter is mochaTapLike', async t => {
    const report = spy.async(reporter => {
      t.is(reporter, mochaTapLike)
    })
    const spyReport = {
      harness: t => {
        t.report = report
      },
    }
    const z = createHarness({ indent: true }, [
      spyReport,
      withDefaultReporter(),
    ])
    await z.report()
    t.eq(report.callCount, 1, 'spy report has been called')
  })

  test('the default indent reporter is mochaTapLike', async t => {
    const report = spy.async(reporter => {
      t.is(reporter, tapeTapLike)
    })
    const spyReport = {
      harness: t => {
        t.report = report
      },
    }
    const z = createHarness({ indent: false }, [
      spyReport,
      withDefaultReporter(),
    ])
    await z.report()
    t.eq(report.callCount, 1, 'spy report has been called')
  })
})
