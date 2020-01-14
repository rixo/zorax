import * as zora from 'zora'

const pipe = (...fns) => x0 => fns.reduce((x, f) => f(x), x0)

const parseTestArgs = ([desc, a, ...rest]) => {
  if (Array.isArray(a)) {
    return [desc, a, ...rest]
  } else if (typeof a !== 'function') {
    return [desc, [a], ...rest]
  } else {
    return [desc, [], a, ...rest]
  }
}

const applyHook = (opts, t, key = 'test') => hook => {
  const handler = hook[key]
  if (!handler) {
    return
  }
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

export const createHarnessFactory = (factoryOpts = {}, defaultPlugins = []) => {
  if (Array.isArray(factoryOpts)) {
    defaultPlugins = factoryOpts
    factoryOpts = {}
  }
  let {
    createHarness = zora.createHarness,
    plugins: factoryPlugins = defaultPlugins,
    ...defaultOptions
  } = factoryOpts

  return (options = {}, harnessPlugins = []) => {
    if (Array.isArray(options)) {
      harnessPlugins = options
      options = {}
    }

    let opts = { ...defaultOptions, ...options }

    const { plugins: optsPlugins } = opts

    const plugins = [factoryPlugins, optsPlugins, harnessPlugins]
      .filter(Boolean)
      .flat()

    opts = pipe(...plugins.map(x => x.options).filter(Boolean))(opts)

    const harness = createHarness(opts)

    addHooks({ opts, hooks: plugins }, harness)

    if (plugins.length > 0) {
      plugins.forEach(applyHook(opts, harness, 'harness'))
      plugins.forEach(applyHook(opts, harness))
    }

    return harness
  }
}

export const createHarness = createHarnessFactory()
