import { plug as _plug } from 'zorax'

const isFunction = {
  name: 'isFunction',
  test(t) {
    t.isFunction = (x, msg = 'should be a function') =>
      t.ok(typeof x === 'function', msg)
  },
}

export const { test, describe, plug } = _plug(isFunction)
