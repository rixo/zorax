import { plug as _plug } from 'zorax'
import aliases from 'zorax/lib/alias'

const isFunction = {
  name: 'isFunction',
  test(t) {
    t.isFunction = (x, msg = 'should be a function') =>
      t.ok(typeof x === 'function', msg)
  },
}

const resolveRejects = {
  name: 'resolve/rejects',
  description: 'add assertions: resolves, & rejects',
  test(t) {
    t.resolves = (fn, msg = 'should not be rejected') => {
      let pass = false
      let actual
      return Promise.resolve()
        .then(fn)
        .then(() => {
          pass = true
        })
        .catch(err => {
          pass = false
          actual = err
        })
        .finally(() => {
          t.collect({
            pass,
            expected: 'no promise rejection',
            actual,
            operator: 'doesNotThrow',
            description: msg || 'should not throw',
          })
        })
    }
  },
}

export const { test, describe, plug } = _plug(
  //
  isFunction,
  resolveRejects,
  aliases({
    resolves: 'doesNotReject',
  })
)
