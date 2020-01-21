import { ZORAX_DEFER, ZORAX_GROUP, hasName } from './_util'

const name = 'zorax.only.defer'

const validateDeps = ({ plugins }) => {
  // require zorax.defer
  const deferIndex = plugins.findIndex(hasName(ZORAX_DEFER))
  if (deferIndex === -1) {
    throw new Error(`${name} requires ${ZORAX_DEFER}`)
  }
  // must be after zorax.defer
  const index = plugins.findIndex(hasName(name))
  if (index < deferIndex) {
    throw new Error(`${name} must be after ${ZORAX_DEFER}`)
  }
  // must be after zorax.group, if zorax.group is present
  const groupIndex = plugins.findIndex(hasName(ZORAX_GROUP))
  if (index < groupIndex) {
    throw new Error(`${name} must be after ${ZORAX_GROUP}`)
  }
}

export default () => {
  let hasOnly = false
  let running = false

  let only = false

  return {
    name,

    defer: {
      add: _add => spec => {
        spec.only = only
        _add(spec)
      },

      run: prev => t => {
        const runTest = prev(t)
        if (!hasOnly) {
          return runTest
        }
        return spec => {
          if (spec.only === false) {
            return
          }
          runTest(spec)
        }
      },
    },

    // NOTE it is needed to decorate test context, for plug proxies
    test: t => {
      const { test } = t
      t.only = (...args) => {
        if (running) {
          throw new Error('only can only be called synchronously')
        }
        hasOnly = true
        only = true
        const result = test(...args)
        only = false
        return result
      }
    },

    harness: h => {
      const { test, report } = h

      validateDeps(h)

      h.only = (...args) => {
        if (running) {
          throw new Error('only can only be called synchronously')
        }
        hasOnly = true
        only = true
        const result = test(...args)
        only = false
        return result
      }

      h.report = async (...args) => {
        running = true
        const result = await report.call(h, ...args)
        running = false
        return result
      }
    },
  }
}
