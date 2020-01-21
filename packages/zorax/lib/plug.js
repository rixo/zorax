import { createHarness as createZoraHarness } from 'zora'

const noop = () => {}

// const getHooks = (...props) => plugins =>
//   plugins.flatMap(plugin => props.map(prop => plugin[prop])).filter(Boolean)
//
// const getHarnessHooks = (() => {
//   const getMutators = getHooks('test', 'harness')
//   const getDecorators = getHooks('decorate', 'decorateHarness')
//   return plugins => [...getMutators(plugins), ...getDecorators(plugins)]
// })()

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

// const createProxy = harness => ({
//   test: (...args) => harness.test(...args),
//   // only: (...args) => harness.only(...args),
//   // skip: (...args) => harness.skip(...args),
// })

const deleteHarnessSpecifiers = {
  report: {},
  pass: {},
  error: {},
  length: {},
  count: {},
  successCount: {},
  skipCount: {},
  failureCount: {},
}

const createProxy = t => Object.create(t, deleteHarnessSpecifiers)

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

  wrapTestMethod(ctx, plugins, proxy)

  return proxy
}

const wrapTestMethod = (ctx, plugins, target) => {
  const hooks = getTestHooks(plugins)

  const withHooks = t => {
    t.plugins = plugins
    wrapTestMethod(ctx, plugins, t)
    hooks.forEach(hook => hook(t, ctx))
    return t
  }

  const { test } = target

  target.test = (desc, run, ...rest) => {
    const zora_spec_fn = (t, ...rest) => run(withHooks(t), ...rest)
    return test(desc, zora_spec_fn, ...rest)
  }

  target.plug = (...newPlugins) =>
    createPlug(ctx, plugins, target, ...newPlugins)

  // TODO test
  target.run = fn => {
    fn(target)
    return target
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
