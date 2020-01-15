import * as zoar from 'zoar'

import { harness as zoraxDefaultHarness } from '../lib/zorax'

export const noop = () => {}

export const isFunction = x => typeof x === 'function'

export const isTestContext = o => o && isFunction(o.test) && isFunction(o.ok)

export const isHarness = o => o && isFunction(o.report)

export const isHarnessFactory = fn => isFunction(fn) && isHarness(fn())

const MUTE_SUB_TESTS = true

// disable zorax auto start
export const defaultZoraxAutoStart = zoraxDefaultHarness.auto()
zoraxDefaultHarness.auto(false)

export const blackHole = !MUTE_SUB_TESTS
  ? undefined
  : async stream => {
      // eslint-disable-next-line no-unused-vars
      for await (const message of stream) {
      }
    }

const Prefix = () => {
  let prefixes = []
  let currentPrefix = ''

  const update = () => {
    if (prefixes.length > 0) {
      currentPrefix = [...prefixes, ''].join(' > ')
    } else {
      currentPrefix = ''
    }
  }

  const push = prefix => {
    prefixes.push(prefix)
    update()
  }

  const pop = () => {
    prefixes.pop()
    update()
  }

  const reset = prefix => {
    if (prefix) {
      prefixes = [prefix]
    } else {
      prefixes = []
    }
  }

  const toString = () => currentPrefix

  return { push, pop, reset, toString }
}

const prefixes = Prefix()

const test = (desc, ...args) => zoar.test(`${prefixes}${desc}`, ...args)

const only = (desc, ...args) => zoar.only(`${prefixes}${desc}`, ...args)

export { skip } from 'zoar'

export const describe = (prefix, run) => {
  prefixes.push(prefix)
  if (run) {
    run()
    prefixes.pop()
  } else {
    prefixes.reset(prefix)
  }
  test.only = only
  return test
}

export const spy = (fn = noop) => {
  const calls = []

  const wrapped = function zora_spec_fn(...args) {
    calls.push(args)
    return fn.apply(this, args)
  }

  Object.defineProperty(wrapped, 'callCount', {
    get() {
      return calls.length
    },
  })

  wrapped.calls = calls

  wrapped.calledWith = (...targetArgs) => t =>
    calls.length > 0 &&
    calls.some(args => {
      return targetArgs.every((a, i) => t.is(args[i], a, `argument ${i}`))
    })

  wrapped.hasBeenCalled = (n = null) =>
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

  return wrapped
}

spy.through = fn =>
  spy(x => {
    fn && fn(x)
    return x
  })

spy.returning = x => spy(() => x)

spy.async = (fn = noop) => spy(async (...args) => fn(...args))
