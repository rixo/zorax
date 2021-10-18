import * as path from 'path'
import * as readline from 'readline'

import { UserError, filterDumpOptions, parseEnv } from './util.js'
import * as fsp from './util/fsp.js'
import Log from './log.js'
import interactiveParser from './watch/interactive.js'

const historyFile =
  process.env.HOME && path.resolve(process.env.HOME, '.zoar_repl_history')

const ucFirst = string => string.slice(0, 1).toUpperCase() + string.slice(1)

const defaultArray = x => (x ? (Array.isArray(x) ? x : [x]) : [])

const camelCase = (string, first = false) => {
  const parts = string.split('-').filter(Boolean)
  if (!first) {
    const i = parts.shift()
    return i + parts.map(ucFirst).join('')
  }
  return parts.map(ucFirst).join('')
}

const saveHistory = rl => {
  if (!historyFile) return
  const contents = rl.history.join('\n')
  return fsp.writeFile(historyFile, contents, 'utf8').catch(() => {
    Log.warn(`failed to save command history to ${historyFile}`)
  })
}

const loadHistory = rl => {
  if (!historyFile) return
  if (!rl.historySize) return
  return fsp
    .readFile(historyFile, 'utf8')
    .then(contents => {
      rl.history = [...rl.history, ...contents.split('\n')].slice(
        0,
        rl.historySize
      )
    })
    .catch(() => {})
}

const camelCaseAndNeg = (flag, { neg = true, camel = true } = {}) =>
  [
    flag,
    neg && flag.replace(/^--/, '--no-'),
    camel && camelCase(flag),
    camel && neg && 'no' + camelCase(flag, true),
  ].filter(Boolean)

const commands = ({ alias = {}, cli: extraOptions = [] }) => [
  '--json',
  '--tap',
  '--indent',

  ['--inspect-brk', { alias: 'ib' }],
  '--inspect',

  '-p, --print',
  '--print-compact',

  '-l, --ls',

  '-f, --filter <globs...>',
  '-g, --grep <patterns...>',

  [
    '-e, --env <setters...>',
    {
      monoArg: true,
      run: ({ options, setOptions, logValue }, cmd, args) => {
        const newEnv = Object.fromEntries(args.map(parseEnv).filter(Boolean))
        const env = { ...options.env, ...newEnv }
        setOptions({ env })
        logValue(newEnv)
      },
    },
  ],

  ['-r, --run [command]'],

  [
    '--pipe <command...>',
    {
      alias: '|',
      monoArg: true,
      attributeName: ({ ls, print }) =>
        ls ? 'pipe.ls' : print ? 'pipe.print' : 'pipe.run',
    },
  ],
  ['--print-pipe <command...>', { monoArg: true }],
  ['--pipes', { alias: 'pp' }],

  ...extraOptions.map(x => x[0]),

  ...aliasParsers(alias),

  {
    test: cmd => cmd[0] === '+' || cmd[0] === '-',
    run: ({ options, setOptions }, cmd, args) => {
      const value = [cmd, ...args].join(' ').trim()
      const neg = value.slice(-1) === '!'
      let grep = defaultArray(options.grep)
      if (neg) {
        const pattern = value.slice(0, -1)
        grep = grep.filter(x => x !== pattern)
      } else {
        const pattern = value.slice(1)
        grep = grep.filter(x => x !== '+' + pattern && x !== '-' + pattern)
        if (!grep.includes(value)) {
          grep.push(value)
        }
      }
      setOptions({ grep }, true)
    },
  },
]

const completionAliases = {
  rs: 'restart',
  opts: 'options',

  ib: '--inspect-brk',
  'ib!': '--no-inspect-brk',
  b: '--inspect-brk',
  'b!': '--no-inspect-brk',

  pc: '--print-compact',
  'pc!': '--no-print-compact',

  wd: '--watch-debounce',

  pp: '--pipes',
  'pp!': '--pipes!',

  e: '--env',
}

const helpText = `Commands:
  [Enter], rs, restart  rerun
  [Escape], r, run      reset current script to run, and run

  h, help, ?            show help
  [^D], q, quit, exit   exit
`

// move 'pipe' to pipe.ls, pipe.print or pipe.run
const specializePipe = options => {
  const { ls, print, pipe } = options
  if (!pipe) return options
  const mode = ls ? 'ls' : print ? 'print' : 'run'
  delete options.pipe
  options['pipe.' + mode] = pipe
}

const aliasParsers = (aliases = {}) => {
  return Object.entries(aliases).map(([cmd, spec]) => [
    cmd,
    {
      run: ({ handle }, cmd, value) => {
        let aliased = spec
        if (value === false) {
          aliased += '=0'
        }
        return handle(aliased)
      },
    },
  ])
}

export default _api => {
  const { initialOptions, run, options, dump, dumpInput, extra } = _api

  const log = Log.log
  const logError = Log.error
  const logValue = Log.inspect

  specializePipe(initialOptions)
  specializePipe(options)

  const parser = interactiveParser(commands(extra), {
    switches: [
      ['run', 'print', 'ls'],
      ['json', 'tap'],
      ['inspect', 'inspect-brk'],
    ],
    // kept for reference
    // hooks: [
    //   [['run', 'ls', 'print'], (opt, { setOptions }) => {}],
    // ],
  })

  const completions = [
    ...new Set(
      [
        ...parser.completions,

        'restart',

        camelCaseAndNeg('--watch-debounce'),

        'argv',
        'options',
        'watch',

        'quit',
        'exit',
      ].flat()
    ),
  ]
    // remove cmd!
    .filter(x => x.slice(-1) !== '!')

  const {
    handle,
    setOptions,
    reset,
    setAutoRun,
    getAutoRun: isAuto,
  } = parser.handler({
    ..._api,
    log,
    logError,
    logValue,
  })

  const setAuto = auto => {
    setAutoRun(auto)
    if (auto) {
      rl.setPrompt('> ')
    } else {
      rl.setPrompt(':')
      rl.line = ''
    }
  }

  const completer = partial => {
    const alias = completionAliases[partial]
    if (alias) {
      rl.line = ''
      return [[alias], '']
    }
    let suggestions = completions.filter(x => x.startsWith(partial))
    if (!partial.startsWith('-')) {
      suggestions = suggestions.filter(x => !x.startsWith('-'))
    }
    return [suggestions, partial]
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    completer,
  })

  if (options.persistHistory) {
    loadHistory(rl)
  }

  let prompt = false

  {
    const { prompt: up } = rl
    rl.prompt = (...args) => {
      prompt = true
      return up.apply(rl, args)
    }
  }

  const escape = () => {
    prompt = false
    reset()
    setAuto(false)
    setOptions(initialOptions, true)
  }

  const exit = (code = 0, msg = '') => {
    // NOTE msg is intentionnaly an empty line if none provided to ensure
    // next user's shell prompt be print on a new line
    log(msg)

    if (options.persistHistory) {
      Promise.resolve(saveHistory(rl)).finally(() => {
        process.exit(code)
      })
    } else {
      process.exit(code)
    }
  }

  const help = () => {
    prompt = false
    log(helpText)
  }

  const processLine = line => {
    prompt = false

    line = line.trim()
    const args = line.split(' ')
    const cmd = args.shift()

    // guard: handled by interactive parser
    if (handle(line)) return

    switch (cmd) {
      case '':
      case 'rs':
      case 'restart':
        setAuto(true)
        run()
        break

      case '!!':
        escape()
        break

      case 'x':
      case 'clear':
        rl.output.write('\u001B[2J\u001B[0;0f')
        break

      case 'q':
      case 'quit':
      case 'exit':
        exit(0)
        break

      case 'watchDebounce':
      case '--watch-debounce': {
        const [value] = args
        if (value != null) {
          options.watchDebounce = parseInt(value)
        }
        log(options.watchDebounce)
        break
      }

      case 'w':
      case 'watch':
        dump()
        break

      case 'input':
        dumpInput()
        break

      case 'options':
      case 'opts':
      case 'o':
        Log.inspect(filterDumpOptions(options))
        break

      case 'argv':
        Log.inspect(process.argv.slice(2))
        break

      case '?':
      case 'h':
      case 'help':
        help()
        break

      default:
        logError(`unknown: ${cmd}`)
    }
  }

  process.stdin.on('keypress', (chunk, key) => {
    if (key.name === 'escape') {
      escape()
      return
    }
    if (key && key.name === 'd' && key.ctrl) {
      exit(0, '^D')
      return
    }
    if (key.name === 'return') {
      return
    }
    if (rl.line === ':') {
      setAuto(false)
      prompt = false
    }
    if (!prompt) {
      const preserveCursor = true
      rl.prompt(preserveCursor)
    }
  })

  rl.on('SIGINT', () => {
    if (rl.line) {
      log('^C')
      setAuto(true)
      rl.line = ''
      rl.prompt()
    } else if (!isAuto()) {
      setAuto(true)
      rl.prompt()
    } else {
      exit(0, '^C')
    }
  })

  rl.on('line', line => {
    try {
      processLine(line)
    } catch (err) {
      if (UserError.test(err)) {
        logError(err.message)
      } else {
        throw err
      }
    }
  })
}
