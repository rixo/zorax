import { isFunction, hasName } from './_util'
import { ZORAX_DEFER, ZORAX_GROUP as name } from './names'

// reentry means passing tests that are unfolded "from the middle" of the run
// pipeline through the entire pipeline; no reentry just pass to downstream
// plugins
//
// reentry is the theoretically correct behaviour, I think... but no reentry is
// more efficient for defer.only; hard choice!
//
const REENTRY = false

const enforceNoAsync = result => {
  if (result && isFunction(result.then) && isFunction(result.catch)) {
    throw new Error('group / describe / it handlers cannot be async')
  }
}

const isEmpty = tests =>
  tests.every(item => {
    if (Array.isArray(item)) {
      return isEmpty(item[1])
    } else {
      return false
    }
  })

const validateDependencies = ({ plugins }) => {
  // require defer
  const deferIndex = plugins.findIndex(hasName(ZORAX_DEFER))
  if (deferIndex === -1) {
    throw new Error(`${name} requires ${ZORAX_DEFER}`)
  }
  // must be after defer
  const index = plugins.findIndex(hasName(name))
  if (index < deferIndex) {
    throw new Error(`${name} must be after ${ZORAX_DEFER}`)
  }
}

export default () => ({
  name,

  harness: validateDependencies,

  defer: {
    add: (_add, harness) => {
      const stack = []
      let cursor = null
      let skipping = 0

      const add = spec => {
        spec.skip = skipping > 0
        if (cursor) {
          cursor.push(spec)
        } else {
          _add(spec)
        }
      }

      const updateCursor = () => {
        cursor = stack[stack.length - 1]
      }

      const push = (title, resolve) => {
        const tests = []
        tests.resolve = resolve
        add([title, tests])
        stack.push(tests)
        updateCursor()
      }

      const pop = () => {
        const item = stack.pop()
        if (item && item.resolve) {
          item.resolve()
        }
        updateCursor()
      }

      const reset = () => {
        while (stack.length > 0) {
          pop()
        }
      }

      let deep = 0

      const group = (callback, title, handler) => {
        if (handler) {
          deep++
          push(title, callback)
          enforceNoAsync(handler())
          pop()
          deep--
        } else {
          if (deep > 0) {
            throw new Error(
              "group('') with no handler is only allowed at top level"
            )
          }
          reset()
          push(title, callback)
        }
      }

      const skip = (callback, ...args) => {
        skipping++
        return group(() => {
          if (callback) callback()
          skipping--
        }, ...args)
      }

      harness.group = (title, handler) => group(null, title, handler)

      harness.group.callback = group

      harness.group.skip = (title, handler) => skip(null, title, handler)

      harness.group.skip.callback = skip

      return add
    },

    run: (prev, h) => {
      const makeRunWithGroup = t => {
        const runSpec = prev(t)

        return spec => {
          if (!Array.isArray(spec)) {
            return runSpec(spec)
          }

          const [title, subTests] = spec

          // guard: no sub tests -> do not create an empty t.test
          if (isEmpty(subTests)) return false

          const handler = tt => {
            const runner = REENTRY ? h.defer.runner : makeRunWithGroup
            subTests.forEach(runner(tt))
          }

          return runSpec({ args: [title, handler], skip: spec.skip })
        }
      }
      return makeRunWithGroup
    },
  },
})
