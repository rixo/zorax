import { harness as zoraxDefaultHarness } from '../lib/zorax'

export const noop = () => {}

export const isFunction = x => typeof x === 'function'

export const isAssertions = o =>
  (o && isFunction(o.test) && isFunction(o.ok)) || false

export const isTestContext = isAssertions

export const isHarness = o => o && isFunction(o.report) && isAssertions(o)

export const isHarnessFactory = fn => isFunction(fn) && isHarness(fn())

const MUTE_SUB_TESTS = true

// disable zorax auto start
export const defaultZoraxAutoStart = zoraxDefaultHarness.auto()
zoraxDefaultHarness.auto(false)

export const blackHole = !MUTE_SUB_TESTS
  ? undefined
  : async stream => {
      for await (const message of stream) {
        switch (message.type) {
          case 'BAIL_OUT':
            // eslint-disable-next-line no-console
            console.error(message.data)
            continue
        }
      }
    }

export const spy = (fn = noop) => {
  const calls = []

  const spied = function zora_spec_fn(...args) {
    calls.push(args)
    return fn.apply(this, args)
  }

  Object.defineProperty(spied, 'callCount', {
    get() {
      return calls.length
    },
  })

  spied.calls = calls

  spied.calledWith = (...targetArgs) => t =>
    calls.length > 0 &&
    calls.some(args => {
      return targetArgs.every((a, i) => t.is(args[i], a, `argument ${i}`))
    })

  spied.hasBeenCalled = (n = null) =>
    function(t) {
      // let assertResult
      // if (n === null) {
      //   assertResult = {
      //     pass: calls.length > 0,
      //     actual: calls.length,
      //     expected: 0,
      //     description: `spy has not been called`,
      //     operator: 'notEqual',
      //   }
      // } else {
      //   assertResult = {
      //     pass: n === calls.length,
      //     actual: calls.length,
      //     expected: n,
      //     description: `spy has been called ${n === 1 ? 'once' : n + ' times'}`,
      //     operator: 'equal',
      //   }
      // }
      // t.collect(assertResult)
      // return assertResult
      return n === null
        ? t.ok(calls.length > 0, 'spy has been called')
        : t.equal(calls.length, n, `spy has been called ${n} times`)
    }

  return spied
}

spy.through = fn =>
  spy(x => {
    fn && fn(x)
    return x
  })

spy.returning = x => spy(() => x)

spy.async = (fn = noop) => spy(async (...args) => fn(...args))
