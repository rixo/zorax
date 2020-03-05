import { hasName, FatalError } from './_util'
import { ZORAX_DEFER, ZORAX_GROUP, ZORAX_ONLY as name } from './names'
import { TITLE_ONLY } from './defer.only.const'

const removeNonOnlySubs = (() => {
  const hasOnly = sub => sub.only

  const removeNonOnlySubsFilter = sub =>
    Array.isArray(sub) ? removeNonOnlySubs(sub) : hasOnly(sub)

  const ONLY_SUBS_FILTERED = Symbol('ONLY_SUBS_FILTERED')

  const removeNonOnlySubs = spec => {
    if (spec[ONLY_SUBS_FILTERED]) {
      return spec[1].length > 0
    }

    const filteredSubs = spec[1].filter(removeNonOnlySubsFilter)

    spec[ONLY_SUBS_FILTERED] = true
    Object.freeze(filteredSubs)

    spec[1] = filteredSubs

    return filteredSubs.length > 0
  }

  return removeNonOnlySubs
})()

const wrapRun = (run, args, callback) => {
  if (run.callback) {
    return run.callback(callback, ...args)
  } else {
    const result = run(...args)
    callback()
    return result
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

  const makeOnly = (run, h) => (title, ...args) => {
    if (running) {
      throw new FatalError('defer.only: only can only be called synchronously')
    }
    // NOTE late resolution of options.only to enable on the fly change
    if (!h.options.only) {
      throw new FatalError(
        'defer.only: only is only authorized when passing the only flag'
      )
    }
    only++
    return wrapRun(run, [title || TITLE_ONLY, ...args], () => {
      only--
    })
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
          if (spec.only === false) {
            spec.skip = true
            return false
          }

          // prevent groups that are emptied by only to appear non empty
          if (Array.isArray(spec)) {
            // NOTE mutating spec because not sure what prop (e.g. .skip,
            // .resolve) it might have
            const empty = !removeNonOnlySubs(spec)
            if (empty) {
              return false
            }
          }

          return runTest(spec)
        }
      },
    },

    test(t) {
      t.only = () => {
        throw new FatalError(
          'defer.only: only is only available for root tests'
        )
      }
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
