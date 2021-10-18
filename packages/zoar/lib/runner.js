import 'trace'
import 'clarify'

import relative from 'require-relative'
import * as path from 'path'
import sourceMapSupport from 'source-map-support'

import { importModule } from '../util.cjs'
import Log from './log.js'
import { UserError } from './util.js'
import { runTestsCjs } from './runner.cjs'

const resolveOptionalRelative = (...args) => {
  try {
    return relative.resolve(...args)
  } catch (err) {
    return null
  }
}

const resolveReporter = async ({ json, tap, indent }) => {
  if (json) {
    const { logReporter } = await import('./reporter-log')
    return logReporter()
  }

  const isTTY =
    typeof process !== 'undefined' && process.stdout && process.stdout.isTTY
  if (isTTY && !tap) {
    const { reporter } = await import('zora-node-reporter')
    return reporter()
  }

  if (indent) {
    const { indentedTapReporter } = await import('zora-tap-reporter')
    return indentedTapReporter()
  } else {
    const { tapReporter } = await import('zora-tap-reporter')
    return tapReporter()
  }
}

const setupZorax = (harness, path, { only, grep, print, ...options }) => {
  if (!harness) return

  harness.auto(false)

  harness.options.only = !!only

  if (grep && grep.length) {
    if (harness.filter) {
      harness.filter(grep)
    } else {
      throw new UserError(
        '--grep option not supported by your harness (missing filter method)'
      )
    }
  }

  if (print) {
    if (harness.print) {
      const { printCompact: compact } = options
      harness.print({ compact })
    } else {
      throw new UserError(
        '--print option not supported by your harness (missing print method)'
      )
    }
  }

  if (harness.group) {
    harness.group(path)
  }
}

const resolveZoraxHarness = (options, req) => _path => {
  if (options.zorax) {
    const parts = options.zorax.split('::')
    const name = parts.pop()
    const file = parts.join('::')
    const absolutePath = path.resolve(options.cwd, file)
    return req(absolutePath, name)
  } else {
    const zorax = resolveOptionalRelative('zorax', _path)
    if (!zorax) return
    return req(zorax, 'harness')
  }
}

const runFiles = async (files, options = {}) => {
  const { cwd, only, map } = options

  if (only) {
    // for zora?
    process.env.ONLY = true
  }

  const runTestsEsm = async () => {
    if (map) {
      sourceMapSupport.install()
    }
    const _resolveZoraxHarness = resolveZoraxHarness(
      options,
      async (file, name) => (await import(file))[name || 'default']
    )
    const harness = await _resolveZoraxHarness(cwd)
    if (!options.zorax) options.zorax = harness
    setupZorax(harness, cwd, options)
    return Promise.all(
      files.map(async path => {
        const { default: customHarness } = await importModule(path)
        return customHarness || harness
      })
    )
  }

  const runTests = options.module
    ? runTestsEsm
    : runTestsCjs({ options, files, resolveZoraxHarness, setupZorax })

  const harnesses = [...new Set(await runTests())].filter(Boolean)

  const reporter = await resolveReporter(options)

  const results = await Promise.all(
    harnesses.map(async harness => {
      await harness.report(reporter)
      const {
        pass,
        count,
        failureCount,
        length,
        skipCount,
        successCount,
      } = harness
      return {
        pass,
        count,
        failureCount,
        length,
        skipCount,
        successCount,
      }
    })
  )

  const summary = results.reduce(
    (summary, current) => ({
      pass: summary.pass && current.pass,
      count: summary.count + current.count,
      failureCount: summary.failureCount + current.failureCount,
      length: summary.length + current.length,
      skipCount: summary.skipCount + current.skipCount,
      successCount: summary.successCount + current.successCount,
    }),
    {
      pass: true,
      count: 0,
      failureCount: 0,
      length: 0,
      skipCount: 0,
      successCount: 0,
    }
  )

  summary.results = results

  return summary
}

process.on('message', m => {
  switch (m.type) {
    case 'start': {
      const { files, options } = m

      global.ZOAR_OPTIONS = options

      runFiles(files, options)
        .then(({ pass }) => {
          if (options.exit) {
            process.exit(pass ? 0 : options.exit === true ? 1 : options.exit)
          }
        })
        .catch(err => {
          if (UserError.test(err)) {
            Log.error(err.message)
            process.exit(-1)
          } else {
            Log.error((err && err.stack) || err)
            process.exit(-2)
          }
        })

      return
    }

    default:
      throw new Error('Invalid message type: ' + m.type)
  }
})

process.send('ready')
