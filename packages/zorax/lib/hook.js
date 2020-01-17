import * as zora from 'zora'

const pipe = (...fns) => x0 => fns.reduce((x, f) => f(x), x0)

const getter = prop => x => x[prop]

const getOptionsHook = getter('options')

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

const applyHook = (t, opts) => hook => enforceNoReturn(hook(t, opts))

const specWrapper = ({ opts, plugins, hooks, run }) =>
  function zora_spec_fn(t) {
    // NOTE we need to wrap the ctx _before_ passing it to the first
    // plugin hook, so that the plugin can use the hook signature
    decorateTestFn(opts, plugins, t)

    if (hooks.length) {
      hooks.forEach(applyHook(t, opts))
    }

    return run(t)
  }

function pluggableTestPrototype(...testArgs) {
  const [desc, testPlugins, run, ...rest] = parseTestArgs(testArgs)
  const { opts, parentPlugins, test } = this

  const plugins = [...parentPlugins, ...testPlugins]

  const hooks = plugins.map(getTestHook).filter(Boolean)

  const withPlugins = specWrapper({
    opts,
    plugins,
    hooks,
    run,
  })

  return test(desc, withPlugins, ...rest)
}

const decorateTestFn = (opts, parentPlugins, t) => {
  t.test = pluggableTestPrototype.bind({ test: t.test, opts, parentPlugins })
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

    const reduceOptions = pipe(...plugins.map(getOptionsHook).filter(Boolean))

    opts = reduceOptions(opts)

    const harness = createHarness(opts)

    // wrap harness.test to recursively apply plugin.test
    //
    // WARNING this must be done _before_ applying plugins, because plugins
    // need to see unaltered incoming arguments... said otherwise, they need
    // to be the outermost layer of the pipeline
    //
    decorateTestFn(opts, plugins, harness)

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
        .forEach(applyHook(harness, opts))
    }

    return harness
  }
}

export const createHarness = createHarnessFactory()
