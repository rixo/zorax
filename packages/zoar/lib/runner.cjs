/**
 * CommonJS test runner.
 */
const runTestsCjs = ({
  options,
  files,
  resolveZoraxHarness,
  setupZorax,
}) => async () => {
  const { map } = options

  if (map) {
    require('source-map-support').install()
  }

  if (options.esm) {
    const esm = require('esm')
    const impørt = esm(module, { cache: false })

    {
      const chain = require('stack-chain')
      const { sep } = require('path')

      // Error.stackTraceLimit = 100

      const esmFile = ['', 'esm', 'esm.js'].join(sep)

      chain.filter.attach((error, frames) =>
        frames.filter(callSite => {
          if (!callSite) return false
          const name = callSite.getFileName()
          if (!name) return false
          return (
            name.includes(sep) &&
            !name.startsWith('internal') &&
            !name.endsWith(esmFile)
          )
        })
      )
    }

    const _resolveZoraxHarness = resolveZoraxHarness(
      options,
      async (file, name) => (await impørt(file))[name || 'default']
    )

    return Promise.all(
      files.map(async path => {
        const harness = await _resolveZoraxHarness(path)
        setupZorax(harness, path, options)
        const { default: customHarness } = await impørt(path)
        return customHarness || harness
      })
    )
  } else {
    const _resolveZoraxHarness = resolveZoraxHarness(options, (file, name) => {
      const m = require(file)
      if (!name) return m
      return m[name]
    })
    return files.map(path => {
      const harness = _resolveZoraxHarness(path)
      setupZorax(harness, path, options)
      require(path)
      return harness
    })
  }
}

module.exports = { runTestsCjs }
