import findUp from 'find-up'
import * as fs from 'fs'
import * as path from 'path'
import resolve from 'resolve'

import { readConfig } from '../util.cjs'

import Log from './log.js'
import { mergeInputs } from './find/find.js'
import { rcFile, defaultConfig } from './defaults.js'
import { UserError, filterDumpOptions, parseEnv } from './util/index.js'
import * as fsp from './util/fsp.js'
import program from './program/command.js'

import { pkg } from './zoar.cjs'

const userPkgFile = findUp.sync('package.json')
const userPkg = userPkgFile && JSON.parse(fs.readFileSync(userPkgFile, 'utf8'))
const isModule = userPkg && userPkg.type === 'module'

const resolveTsm = basedir => {
  try {
    return !!resolve.sync('tsm', {
      basedir,
      packageFilter: pkg => ({ ...pkg, main: pkg.main || pkg.bin }),
    })
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') {
      Log.error('Unexpected error trying to resolve tsm', err)
    }
    return false
  }
}

const parseArgs = (files, { ignore, watch, cwd = process.cwd() }) => ({
  cwd,
  files,
  watch,
  ignore,
})

const parseConfig = async ({ cwd, config: configFile }) => {
  const rcPath = configFile
    ? path.resolve(cwd, configFile)
    : await findUp(rcFile)
  return readConfig(rcPath)
}

const merge = (...sources) => {
  const result = { ...sources.shift() }
  for (const source of sources) {
    if (!source) continue
    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined || result[key] === undefined) {
        result[key] = value
      }
    }
  }
  return result
}

const mapCliOptions = ({ W, watch, ...options }) => ({
  ...options,
  watch: watch || W || false,
})

const parseInput = async (
  files,
  cliOptions,
  extraOptions,
  skipDefaults = false
) => {
  const options = mapCliOptions(cliOptions)
  const { cwd } = options
  const args = parseArgs(files, options)
  if (skipDefaults) {
    return {
      options: { ...program.defaults, ...options },
      input: mergeInputs(extraOptions, args),
    }
  }
  const rc = await parseConfig(options)
  const defaults = merge(
    program.defaults,
    { cwd, ...defaultConfig },
    extraOptions,
    rc
  )
  return {
    options: merge(defaults, options),
    input: mergeInputs(defaults, args),
  }
}

const isPipedIn = async () => {
  try {
    const stats = await fsp.fstat(0)
    return stats.isFIFO()
  } catch (err) {
    // crash with this error in some cases, on Windows
    // https://github.com/nodejs/node/issues/19831
    if (err && err.code === 'EISDIR') {
      return false
    }
    throw err
  }
}

const action = (extra, extraOptions) => async (files, cliOptions) => {
  if (!cliOptions.cwd) {
    const cwd = process.cwd()
    cliOptions = { cwd, ...cliOptions }
  }
  const pipedIn = await isPipedIn()
  const { input, options } = await parseInput(
    files,
    cliOptions,
    extraOptions,
    pipedIn
  )
  if (options.only == null) {
    options.only = !!options.watch
  }
  if (options.tsm == null) {
    options.tsm = resolveTsm(options.cwd)
  }
  const { init, watch, dump: dumpArg, options: opts } = options
  let result = null
  const dump = dumpArg || (opts && 'options')
  if (dump && (dump === true || dump === 'options' || dump === 'input')) {
    const target = dump === 'options' ? filterDumpOptions(options) : input
    Log.inspect(target)
  } else if (pipedIn) {
    const { pipeAction } = await import('./pipe.js')
    result = await pipeAction(input, options)
  } else if (init) {
    const { init } = await import('./init.js')
    return init(options)
  } else if (watch) {
    const { watchAction } = await import('./watch.js')
    return watchAction(input, options, extra)
  } else {
    const { actionRunner } = await import('./action.js')
    const runAction = actionRunner({
      input,
      options,
      footer: false,
      // if child process exits before returning result, exit with same code as
      // child process
      exit: true,
    })
    result = await runAction()
  }
  if (result && !result.pass) {
    process.exit(1)
  }
}

const multiple = (value, previous = []) => [...previous, value]

const parseEnvArg = (input, previous = {}) => {
  if (!input) {
    throw new Error(`Invalid --env: ${input} (expected: NAME=value)`)
  }
  const [name, value] = parseEnv(input)
  return { ...previous, [name]: value }
}

const enumMap = (option, spec) => {
  const values = spec.split('|')
  return value => {
    const valid = values.includes(value)
    if (!valid) {
      Log.error(
        `Invalid value received for option ${option}: ${value}. (accepts ${spec})`
      )
      process.exit(254)
    }
    return value
  }
}

program
  .name('zoar')
  .description('Run zorax tests')
  .version(pkg.version)
  // targets
  .arguments('[files...]')

const addZoarOptions = program =>
  program
    .option(
      '-i, --ignore <glob>',
      'ignore pattern, can be repeated',
      ['**/node_modules', '**/.git', '**/*.bak'],
      multiple
    )
    // behaviour / ~commands
    .option('-w', 'enable watch mode')
    .option(
      '-ww, --watch [glob]',
      'enable watch mode and/or add watch pattern, can be repeated',
      multiple
    )
    .option('--no-interactive', 'disable interactive cli (during watch)')
    .option('-l, --ls', 'output list of test files instead of running them')
    .option('-p, --print', 'output test titles instead of running them')
    .option('--no-print-compact', "don't use compact formatting for print")
    .option(
      '--pipe <cmd...>',
      'pipe output to other command(s)\nNOTE: --pipe takes precedence over ' +
        'more specific flags (like --pipe.ls)',
      multiple
    )
    // useful for .rc
    .option(
      '--pipe.run <cmd...>',
      'pipe run output to other command(s)',
      multiple
    )
    .option(
      '--pipe.ls <cmd...>',
      'pipe ls output to other command(s)',
      multiple
    )
    .option(
      '--pipe.print <cmd...>',
      'pipe print output to other command(s)',
      multiple
    )
    .option(
      '--pipe.print <cmd...>',
      'pipe print output to other command(s)',
      multiple
    )
    // pipes: only useful in interactive
    .option('--no-pipes', 'skip pipes (only useful in watch interactive cli)')
    // filters
    .option('-f, --filter <pattern>', 'filter test files', multiple)
    .option(
      '-g, --grep <pattern>',
      'filter main tests by title, can be repeated',
      multiple
    )
    // env
    .option('-e, --env <assignment>', 'set env variable KEY=VALUE', parseEnvArg)
    // config
    .option('-c, --config <file>', 'speficy location of zoar config file')
    // reporter
    .option('--json', 'raw JSON reporter')
    .option('--tap', 'outputs TAP')
    .option('--indent', 'indent TAP output', true)
    .option('--no-indent', "don't indent TAP output")
    // init
    .option('--init', 'create .zoarrc.js file')
    .option('--force', 'force overwritting of existing .zoarrc.js by --init')
    // debugging
    .option('--only', 'enable only mode (default: true if watch mode)')
    .option('--no-only', 'disable only mode')
    .option('--inspect', 'pass --inspect flag to node')
    .option('--ib, --inspect-brk', 'pass --inspect-brk to node')
    .option('-m, --map', 'enable node source map support')
    .option('--no-map', 'disable node source map support')
    // advanced
    .option('-z, --zorax <file>', 'use custom zorax harness')
    .option('--module', 'use Node native ESM modules for test files', isModule)
    .option('--esm', 'enable esm support for test files', !isModule)
    .option('--no-esm', 'disable esm support for test files')
    .option(
      '--tsm',
      'enable tsm loader (default: true if tsm package can be resolved)'
    )
    // .option('--no-tsm', 'disable tsm support and skip auto detection')
    .option('--watch-debounce <delay>', 'watch debounce delay', 20)
    .option(
      '--no-persist-history',
      'prevent writing history to ~/.zoar_repl_history'
    )
    .option(
      '--exit [code]',
      'exit the test process after after tests completion',
      '0'
    )
    // very advanced
    // .option('--cwd', 'force another working directory')
    .option(
      '--watch-filenames',
      'allow filenames as watch targets (beware of unintentionnal glob ' +
        'expansion in shell!)',
      false
    )
    // diagnostic
    .option(
      '--dump [what=config]',
      'dump config or slice of state for debug (what: input|options|watch)',
      enumMap('--dump', 'input|options|watch')
    )
    .option('--opts, --options', 'dump options for debug')

export const run = async (extra = {}, extraOptions = {}) => {
  try {
    const { alias, cli: extraCliOptions } = extra

    if (extraCliOptions) {
      for (const spec of extraCliOptions) {
        program.option(...spec)
      }
    }

    addZoarOptions(program)

    // alias
    const trim = x => x.trim()
    const args = [...process.argv]
    if (alias) {
      for (const [spec, aliased] of Object.entries(alias)) {
        const alternatives = spec.split(',').map(trim)
        for (const alt of alternatives) {
          let pos
          while ((pos = args.indexOf(alt)) !== -1) {
            args.splice(pos, 1, ...aliased.split(/\s+/g).map(trim))
          }
        }
      }
    }

    // run!
    await program.action(action(extra, extraOptions)).parseAsync(args)
  } catch (err) {
    if (UserError.test(err)) {
      Log.error(err.message)
      process.exit(255)
    } else {
      Log.error((err && err.stack) || err)
      process.exit(254)
    }
  }
}
