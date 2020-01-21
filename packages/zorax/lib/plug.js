import { createHarness as createZoraHarness } from 'zora'

const noop = () => {}

const getHarnessMutators = pg => [pg.test, pg.harness]

const getHarnessDecorators = pg => [pg.decorate, pg.decorateHarness]

const getTestMutators = pg => pg.test

const getTestDecorators = pg => pg.decorate

const getHarnessHooks = plugins =>
  [
    ...plugins.flatMap(getHarnessMutators),
    ...plugins.flatMap(getHarnessDecorators),
  ].filter(Boolean)

const getTestHooks = plugins =>
  [...plugins.map(getTestMutators), ...plugins.map(getTestDecorators)].filter(
    Boolean
  )

// NOTE prop: {} makes it undefined
const proxySpecifiers = {
  report: {},
  pass: { writable: true }, // zora.pass wants to rewrite this
  error: {},
  length: {},
  count: {},
  successCount: {},
  skipCount: {},
  failureCount: {},
}

const createProxy = t => Object.create(t, proxySpecifiers)

const createPlug = (ctx, parentPlugins, target, ...newPluginsInput) => {
  const newPlugins = newPluginsInput.filter(Boolean)

  newPlugins.forEach(pg => {
    if (pg.harness || pg.decorateHarness) {
      throw new Error(
        `Cannot apply harness plugin "${pg.name}" to test context`
      )
    }
  })

  const proxy = createProxy(target)

  const plugins = [...parentPlugins, ...newPlugins]

  wrapTestMethod(ctx, plugins, proxy, true)

  return proxy
}

const wrapTestMethod = (harness, plugins, target, applyHooks) => {
  const hooks = getTestHooks(plugins)

  const withHooks = t => {
    t.plugins = plugins
    wrapTestMethod(harness, plugins, t)
    hooks.forEach(hook => hook(t, harness))
    return t
  }

  const { test } = target

  target.test = (desc, run, ...rest) => {
    const zora_spec_fn = (t, ...rest) => run(withHooks(t), ...rest)
    return test(desc, zora_spec_fn, ...rest)
  }

  target.plug = (...newPlugins) =>
    createPlug(harness, plugins, target, ...newPlugins)

  // TODO test
  target.run = fn => {
    fn(target)
    return target
  }

  // NOTE apply hooks _after_ replacing test!
  if (applyHooks) {
    hooks.forEach(hook => hook(target, harness))
  }
}

const parseCreateHarnessFactoryArgs = args => {
  if (args.length === 0) {
    return args
  }

  let createHarness
  let options
  let plugins

  const [a, b, c] = args

  if (typeof a === 'function') {
    createHarness = a
    if (Array.isArray(b)) {
      plugins = b
    } else {
      options = b
      plugins = c
    }
  } else {
    if (Array.isArray(a)) {
      plugins = a
    } else {
      options = a
      plugins = b
    }
  }

  return [createHarness, options, plugins]
}

export const createHarnessFactory = (...args) => {
  const [
    createHarness = createZoraHarness,
    factoryOptions = {},
    factoryPlugins = [],
  ] = parseCreateHarnessFactoryArgs(args)

  const createZoraxHarness = (
    harnessOptions = {},
    harnessPlugins = [],
    ...args
  ) => {
    if (Array.isArray(harnessOptions)) {
      harnessPlugins = harnessOptions
      harnessOptions = {}
    }

    const options = { ...factoryOptions, ...harnessOptions }

    const harness = createHarness(options, ...args)

    const plugins = [...factoryPlugins, ...harnessPlugins].filter(Boolean)

    harness.options = options
    harness.plugins = plugins

    const hooks = getHarnessHooks(plugins)

    wrapTestMethod(harness, plugins, harness)

    hooks.forEach(hook => hook(harness, harness))

    return harness
  }

  return createZoraxHarness
}

export const createHarness = createHarnessFactory(createZoraHarness)

createHarness.plug = noop
