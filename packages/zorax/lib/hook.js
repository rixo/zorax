import * as zora from 'zora'

const pipe = (...fns) => x0 => fns.reduce((x, f) => f(x), x0)

const getter = prop => x => x[prop]

const getOptionsHook = getter('options')

const getHarnessHook = getter('harness')

const getTestHook = getter('test')

const parseTestArgs = ([desc, a, ...rest]) => {
  if (Array.isArray(a)) {
    return [desc, a, ...rest]
  } else if (typeof a !== 'function') {
    return [desc, [a], ...rest]
  } else {
    return [desc, [], a, ...rest]
  }
}

const applyHookFactory = (opts, t) => hook => {
  const result = hook(t, opts)
  if (result) {
    throw new Error(
      'Decorators must not return. Please mutate the context object.'
    )
  }
}

function hookableTestPrototype(...testArgs) {
  const [desc, plugins, run, ...rest] = parseTestArgs(testArgs)

  const doRun = (t, ...rest) => run(addHooks(this.args, t), ...rest)

  const hooks = [...this.plugins, ...plugins].map(getTestHook).filter(Boolean)

  const wrapped =
    hooks.length > 0
      ? (t, ...args) => {
          hooks.forEach(applyHookFactory(this.opts, t))
          return doRun(t, ...args)
        }
      : doRun

  return this.test(desc, wrapped, ...rest)
}

const createHookTest = (args, t) =>
  hookableTestPrototype.bind({ test: t.test, args, ...args })

const addHooks = (args, o) => {
  o.test = createHookTest(args, o)
  return o
}

export const createHarnessFactory = (factoryOpts = {}, defaultPlugins = []) => {
  if (Array.isArray(factoryOpts)) {
    defaultPlugins = factoryOpts
    factoryOpts = {}
  }
  const {
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

    opts = pipe(...plugins.map(getOptionsHook).filter(Boolean))(opts)

    const harness = createHarness(opts)

    // wrap harness.test to recursively apply plugin.test
    //
    // WARNING this must be done _before_ applying plugins, because plugins
    // need to see unaltered incoming arguments... said otherwise, they need
    // to be the outermost layer of the pipeline
    //
    addHooks({ opts, plugins }, harness)

    // apply harness hooks
    if (plugins.length > 0) {
      const applyHook = applyHookFactory(opts, harness)
      // plugin.harness
      plugins
        .map(getHarnessHook)
        .filter(Boolean)
        .forEach(applyHook)
      // plugin.test
      plugins
        .map(getTestHook)
        .filter(Boolean)
        .forEach(applyHook)
    }

    return harness
  }
}

export const createHarness = createHarnessFactory()
