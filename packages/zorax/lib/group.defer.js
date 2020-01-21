import { ZORAX_DEFER, ZORAX_GROUP as name, isFunction, hasName } from './_util'

const enforceNoAsync = result => {
  if (result && isFunction(result.then) && isFunction(result.catch)) {
    throw new Error('group / describe / it handlers cannot be async')
  }
}

export default () => ({
  name,

  harness: ({ plugins }) => {
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
  },

  defer: {
    add: (_add, harness) => {
      let stack = []
      let cursor = null

      const add = spec => {
        if (cursor) {
          cursor.push(spec)
        } else {
          _add(spec)
        }
      }

      const updateCursor = () => {
        cursor = stack[stack.length - 1]
      }

      const push = title => {
        const tests = []
        add([title, tests])
        stack.push(tests)
        updateCursor()
      }

      const pop = () => {
        stack.pop()
        updateCursor()
      }

      const reset = () => {
        stack = []
        cursor = null
      }

      harness.group = (title, handler) => {
        if (handler) {
          push(title)
          enforceNoAsync(handler())
          pop()
        } else {
          reset()
          push(title)
        }
      }

      return add
    },

    run: (prev, h) => t => {
      const runSpec = prev(t)
      return spec => {
        if (Array.isArray(spec)) {
          const [title, subTests] = spec
          const handler = tt => {
            subTests.forEach(h.defer.runner(tt))
          }
          runSpec({ args: [title, handler] })
        } else {
          runSpec(spec)
        }
      }
    },
  },
})
