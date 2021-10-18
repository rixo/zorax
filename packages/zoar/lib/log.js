import { inspect } from 'util'

const Log = Object.create(console)

const noop = () => {}

// NOTE values must remain contiguous, because we apply log level this way:
//
//     Log.setLevel(Log.LOG + verbose)
//
Log.ERROR = 1
Log.WARN = 2
Log.LOG = 3
Log.INFO = 4
Log.DEBUG = 5

const levelMethods = {
  [Log.ERROR]: 'error',
  [Log.WARN]: 'warn',
  [Log.LOG]: 'log',
  [Log.INFO]: 'info',
  [Log.DEBUG]: 'debug',
}

Log.setLevel = level => {
  Object.entries(levelMethods).forEach(([lvl, method]) => {
    if (level < lvl) {
      Log[method] = noop
    } else {
      delete Log[method]
    }
  })
}

Log.isEnabled = level => Log[levelMethods[level]] !== noop

Log.isVerbose = () => Log.isEnabled(Log.INFO)

Log.setLevel(Log.LOG)

Log.inspect = (...args) => {
  const x = args.pop()
  Log.log(
    ...args,
    inspect(x, { depth: Infinity, colors: process.stdout.isTTY })
  )
}

export default Log
