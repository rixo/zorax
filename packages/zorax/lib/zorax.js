import * as zora from 'zora'

export * from 'zora'

const parseTestArgs = ([desc, a, ...rest]) => {
  if (Array.isArray(a)) {
    return [desc, a, ...rest]
  } else if (typeof a !== 'function') {
    return [desc, [a], ...rest]
  } else {
    return [desc, [], a, ...rest]
  }
}

const applyHook = (opts, t) => hook => {
  const handler = hook.test || hook
  const result = handler(t, opts)
  if (result) {
    throw new Error(
      'Decorators must not return. Please mutate the context object.'
    )
  }
}

function testPrototype(...testArgs) {
  const [desc, hooks, run, ...rest] = parseTestArgs(testArgs)

  const doRun = (t, ...rest) => run(addHooks(this.args, t), ...rest)

  const allHooks = [...this.hooks, ...hooks]

  const wrapped =
    allHooks.length > 0
      ? (t, ...args) => {
          allHooks.forEach(applyHook(this.opts, t))
          return doRun(t, ...args)
        }
      : doRun

  return this.test(desc, wrapped, ...rest)
}

const createHookTest = (args, t) =>
  testPrototype.bind({ test: t.test, args, ...args })

const addHooks = (args, o) => {
  o.test = createHookTest(args, o)
  return o
}

export const createHarnessFactory = ({
  createHarness = zora.createHarness,
  plugins: factoryHooks = [],
} = {}) => (opts = {}, harnessHooks = []) => {
  if (Array.isArray(opts)) {
    harnessHooks = opts
    opts = {}
  }

  const harness = createHarness(opts)

  const hooks = [factoryHooks, opts.plugins, harnessHooks]
    .filter(Boolean)
    .flat()

  addHooks({ opts, hooks }, harness)

  if (hooks.length > 0) {
    hooks.forEach(applyHook(opts, harness))
  }

  return harness
}

export const createHarness = createHarnessFactory()