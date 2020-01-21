/**
 * zorax/macro
 */

export const legacy = () => ({
  test: t => {
    const { test } = t

    t.test = (...args) => {
      const providedTitle =
        typeof args[0] === 'string' || args[0] == null
          ? args.shift()
          : undefined
      const meta = Array.isArray(args[0]) ? args.shift() : []
      const [run, ...data] = args
      const title = run.title
        ? run.title(providedTitle, ...data)
        : providedTitle

      return test(title, meta, function zora_spec_fn(t) {
        return run(t, ...data)
      })
    }
  },
})

export default () => ({
  name: 'zorax.macro',

  test: t => {
    const { test } = t

    t.test = (...args) => {
      const providedTitle =
        typeof args[0] === 'string' || !args[0] ? args.shift() : undefined

      const [run, ...data] = args

      const title = run.title
        ? typeof run.title === 'string'
          ? run.title
          : run.title(providedTitle, ...data)
        : providedTitle

      const zora_spec_fn = t => run(t, ...data)

      return test(title, zora_spec_fn)
    }
  },
})
