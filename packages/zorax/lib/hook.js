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

const noAsyncErrorMsg =
  'Plugin hooks for harness or test must not return. Please mutate the context object.'

const enforceNoReturn = result => {
  if (result) {
    throw new Error(noAsyncErrorMsg)
  }
  return result
}

const applyHookFactory = (t, opts) => hook => enforceNoReturn(hook(t, opts))

function hookableTestPrototype(...testArgs) {
  const [desc, plugins, run, ...rest] = parseTestArgs(testArgs)

  const me = this

  const doRun = function zora_spec_fn(t, ...rest) {
    addHooks(me.opts, me.plugins, t)
    return run(t, ...rest)
  }

  const hooks = [...this.plugins, ...plugins].map(getTestHook).filter(Boolean)

  const wrappedRun =
    hooks.length > 0
      ? t => {
          // NOTE we need to wrap the ctx _before_ passing it to the first
          // plugin hook, so that the plugin can use the hook signature
          addHooks(me.opts, me.plugins, t)

          const applyHook = applyHookFactory(t, this.opts)
          hooks.forEach(applyHook)

          return run(t)
        }
      : doRun

  return this.test(desc, wrappedRun, ...rest)
}

const createHookTest = (opts, plugins, t) =>
  hookableTestPrototype.bind({ test: t.test, opts, plugins })

const addHooks = (opts, plugins, o) => {
  o.test = createHookTest(opts, plugins, o)
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
    addHooks(opts, plugins, harness)

    // apply harness hooks
    //
    // NOTE test hook is applied _before_ harness hook, because a harness is a
    // test context _and also_ a harness. It makes it easier for plugin to
    // override test context behavior at harness level.
    //
    if (plugins.length > 0) {
      plugins
        .flatMap(pg => [pg.test, pg.harness])
        .filter(Boolean)
        .forEach(applyHookFactory(harness, opts))
    }

    return harness
  }
}

export const createHarness = createHarnessFactory()
