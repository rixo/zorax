import { hasName } from './_util'
import {
  ZORAX_DEFER,
  ZORAX_GROUP,
  ZORAX_MACRO,
  ZORAX_ONLY as name,
} from './names'

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
  // must be before zorax.macro, if zorax.macro is present
  const macroIndex = plugins.findIndex(hasName(ZORAX_MACRO))
  if (index < macroIndex) {
    throw new Error(`${ZORAX_MACRO} must be before ${name}`)
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
          // prevent groups that are emptied by only to appear non empty
          if (Array.isArray(spec)) {
            const [title, subs] = spec
            const isOnly = sub => sub.only
            const filtered = subs.filter(sub =>
              Array.isArray(sub) ? sub.filter(isOnly) : isOnly(sub)
            )
            runTest([title, filtered])
            return
          }
          if (spec.only === false) {
            return
          }
          runTest(spec)
        }
      },
    },

    harness: h => {
      const { test, report } = h

      validateDeps(h)

      h.only = (...args) => {
        if (running) {
          throw new Error('only can only be called synchronously')
        }
        // NOTE late resolution of options.only to enable on the fly change
        if (!h.options.only) {
          throw new Error('only is only authorized when passing the only flag')
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
