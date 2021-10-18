import { harness } from 'zorax'

const withIsFunction = {
  test: t => {
    t.isFunction = (actual, msg = 'should be a function') => {
      t.ok(typeof actual === 'function', msg)
    }
  },
}

export const { test, describe } = harness.plug(withIsFunction)
