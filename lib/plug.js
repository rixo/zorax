import { createHarness as createZoraHarness } from 'zora'

const noop = () => {}

const getHarnessMutators = pg => [pg.test, pg.harness, pg.init]

const getHarnessDecorators = pg => [
  pg.decorate,
  pg.decorateHarness,
  pg.decorateInit,
]

const getProxyMutators = pg => [pg.test, pg.harness]

const getProxyDecorators = pg => [pg.decorate, pg.decorateHarness]

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

const getProxyHooks = plugins =>
  [
    ...plugins.flatMap(getProxyMutators),
    ...plugins.flatMap(getProxyDecorators),
  ].filter(Boolean)

const wrapTestMethod = (harness, proxy, withHooks, target) => {
  const { test } = target

  target.test = (desc, run, ...rest) => {
    // just a friendly sanity check: end of pipeline respects expected signature
    if (
      // undefined title is actually more or less allowed
      (typeof desc !== 'undefined' && typeof desc !== 'string') ||
      typeof run !== 'function'
    ) {
      throw new Error('plugins pipeline in disarray')
    }

    const zora_spec_fn = (t, ...rest) => run(withHooks(t), ...rest)

    return test(desc, zora_spec_fn, ...rest)
  }
}

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

const augmentProxy = (harness, target, plugins, getHooks) => {
  target.plugins = plugins

  target.plug = (...newPlugins) => plug(harness, plugins, target, newPlugins)

  target.run = fn => {
    fn(target)
    return target
  }

  const testHooks = getTestHooks(plugins)

  const withTestHooks = t => {
    wrapTestMethod(harness, target, withTestHooks, t)
    testHooks.forEach(hook => hook(t, target, harness))
    return t
  }

  wrapTestMethod(harness, target, withTestHooks, target)

  // NOTE apply hooks _after_ replacing test!
  const hooks = getHooks(plugins)
  hooks.forEach(hook => hook(target, harness))
}

const createProxy = t => Object.create(t, proxySpecifiers)

const plug = (harness, parentPlugins, target, newPluginsInput) => {
  const newPlugins = newPluginsInput.flat().filter(Boolean)

  newPlugins.forEach(pg => {
    if (pg.init || pg.decorateInit) {
      throw new Error(
        'Init plugin can only be added at harness creation (not plugged): ' +
          pg.name
      )
    }
  })

  const proxy = createProxy(target)

  const plugins = [...parentPlugins, ...newPlugins]

  augmentProxy(harness, proxy, plugins, getProxyHooks)

  return proxy
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

// createHarnessFactory(options)
// createHarnessFactory(plugins)
// createHarnessFactory(options, plugins)
// createHarnessFactory(createHarness, options)
// createHarnessFactory(createHarness, plugins)
// createHarnessFactory(createHarness, options, plugins)
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

    harness.options = options

    const plugins = [...factoryPlugins, ...harnessPlugins].filter(Boolean)

    augmentProxy(harness, harness, plugins, getHarnessHooks)

    return harness
  }

  return createZoraxHarness
}

export const createHarness = createHarnessFactory(createZoraHarness)

createHarness.plug = noop
