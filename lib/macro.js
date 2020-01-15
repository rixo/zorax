/**
 * zorax/macro
 */

export default () => ({
  test: t => {
    const { test } = t

    t.test = (...args) => {
      const providedTitle =
        typeof args[0] === 'string' ? args.shift() : undefined
      const meta = Array.isArray(args[0]) ? args.shift() : []
      const [run, ...data] = args
      const title = run.title
        ? run.title(providedTitle, ...data)
        : providedTitle

      return test(title, meta, t => run(t, ...data))
    }
  },
})
