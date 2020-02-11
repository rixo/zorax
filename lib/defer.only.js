import { hasName } from './_util'
import { ZORAX_DEFER, ZORAX_GROUP, ZORAX_ONLY as name } from './names'

// fatal errors cause a bailout instead of reporting failure with zorax.catch
class FatalError extends Error {
  constructor(...args) {
    super(...args)
    this.fatal = true
  }
}

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

  let only = 0

  const makeOnly = (run, h) => (...args) => {
    if (running) {
      throw new FatalError('defer.only: only can only be called synchronously')
    }
    // NOTE late resolution of options.only to enable on the fly change
    if (!h.options.only) {
      throw new FatalError(
        'defer.only: only is only authorized when passing the only flag'
      )
    }
    // hasOnly = true
    only++
    const result = run(...args)
    only--
    return result
  }

  return {
    name,

    defer: {
      add: _add => spec => {
        _add(spec)

        spec.only = !spec.skip && only > 0

        if (spec.only) hasOnly = true
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

    test(t) {
      const _only = () => {
        throw new FatalError(
          'defer.only: only is only available for root tests'
        )
      }
      t.only = _only
    },

    harness(t, h) {
      validateDeps(t)
      const { test } = t
      t.only = makeOnly(test, h)
    },

    decorateHarness(t, h) {
      const { group } = t
      if (group) {
        t.group.only = makeOnly(group, h)
      }
    },

    init(h) {
      const { report } = h
      h.report = async (...args) => {
        running = true
        const result = await report.call(h, ...args)
        running = false
        return result
      }
    },
  }
}
