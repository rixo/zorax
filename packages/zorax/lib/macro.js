/**
 * zorax/macro
 */
import { ZORAX_MACRO as name } from './names.js'

const wrap = tester => {
  return (...args) => {
    const providedTitle =
      typeof args[0] === 'string' || !args[0] ? args.shift() : undefined

    const [run, ...data] = args

    // case: t.skip('no spec function!')
    if (args.length < 1) {
      return tester(providedTitle)
    }

    const title = run.title
      ? typeof run.title === 'string'
        ? run.title
        : run.title(providedTitle, ...data)
      : providedTitle

    const zora_spec_fn = t => run(t, ...data)

    return tester(title, zora_spec_fn)
  }
}

export default () => ({
  name,

  test: t => {
    const { test, skip, only } = t

    t.test = wrap(test)

    t.skip = wrap(skip)

    t.only = wrap(only)
  },
})
