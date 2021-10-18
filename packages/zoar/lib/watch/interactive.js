import { UserError } from '../util.js'

const ucFirst = string => string.slice(0, 1).toUpperCase() + string.slice(1)

const defaultArray = x => (x ? (Array.isArray(x) ? x : [x]) : [])

const not = value => x => x !== value

const includes = targets => x => targets.includes(x)

const lastCharNot = (...chars) => x => {
  const last = x.slice(-1)
  return !chars.includes(last)
}

const isShort = x => (x[0] === '-' && x[1] !== '-') || x.length === 1

const notShort = x => !isShort(x)

export const camelCaseAndNeg = (flag, { neg = true, camel = true } = {}) =>
  [
    flag,
    neg && flag.replace(/^--/, '--no-'),
    camel && camelCase(flag),
    camel && neg && 'no' + camelCase(flag, true),
  ].filter(Boolean)

const commandNegs = (shortOpt, longOpt, long, alias) =>
  [
    longOpt && longOpt.replace(/^--/, '--no-'),
    shortOpt && shortOpt.replace(/^-/, '--no-'),
    long && 'no' + ucFirst(long),
    ...alias.map(alias => alias + '!'),
  ].filter(Boolean)

const camelCase = (string, first = false) => {
  const parts = string.split('-').filter(Boolean)
  if (!first) {
    const i = parts.shift()
    return i + parts.map(ucFirst).join('')
  }
  return parts.map(ucFirst).join('')
}

const boolHandler = ({
  shortOpt,
  longOpt,
  short,
  long,
  options: { alias: extraAlias = [], opt = long, run: customRun } = {},
}) => {
  const alias = [short, long, shortOpt, longOpt]
    .filter(Boolean)
    .concat(extraAlias)
  const negs = commandNegs(shortOpt, longOpt, long, alias)
  const resets = alias.map(alias => alias + '!!')
  const asks = alias.map(alias => alias + '?')

  alias.push(...negs, ...resets, ...asks)

  const run = (api, cmd) => {
    const { setOptions, initialOptions, options, logValue } = api
    // case: ask?
    if (asks.includes(cmd)) {
      logValue(options[opt] || false)
      return
    }
    const value = resets.includes(cmd) // case: reset!!
      ? initialOptions[opt]
      : negs && negs.includes(cmd) // case: neg!
      ? false
      : true
    if (customRun) {
      return customRun(api, cmd, value)
    }
    setOptions({ [opt]: value })
  }

  return { cmd: longOpt || shortOpt, alias, run }
}

const filterHandler = ({
  shortOpt,
  longOpt,
  short,
  long,
  multiple,
  optional,
  options: {
    alias: extraAliases = [],
    opt = long,
    monoArg = false,
    name = long || short,
    attributeName,
    run,
  } = {},
}) => ({
  test: includes(
    [shortOpt, longOpt, short, long]
      .filter(Boolean)
      .concat(extraAliases)
      .flatMap(x => [x, x + '?', x + '!', x + '!!'])
      .concat(
        // no multiple has no pop
        multiple
          ? [
              short && `${short}--`,
              long && `${long}--`,
              opt && `${opt}--`,
            ].filter(Boolean)
          : []
      )
  ),

  alias: [shortOpt, longOpt, short, long].filter(Boolean), // for autocomplete

  run: (...runArgs) => {
    const [
      { setOptions, options, initialOptions, logValue },
      cmd,
      args,
    ] = runArgs

    const attr = attributeName
      ? typeof attributeName === 'function'
        ? attributeName(options)
        : attributeName
      : opt

    // case: ask?
    const ask = cmd.slice(-1) === '?'
    if (ask) {
      logValue(options[attr])
      return
    }

    if (run) {
      return run(...runArgs)
    }

    const getValue = () => {
      // case: rm!
      const reset = cmd.slice(-2) === '!!'
      const rm = !reset && cmd.slice(-1) === '!'

      // case: solo (no multiple)
      if (!multiple) {
        // case: empty (ask)
        if (args.length === 0) {
          if (rm) return undefined
          if (reset) return initialOptions[attr]
          if (optional) return true
          throw new UserError(`${name}: value required`)
        }
        return args.join(' ')
      }

      const pop = cmd.slice(-2) === '--'

      // case: empty (ask)
      if (args.length === 0) {
        if (rm) return undefined
        if (reset) return initialOptions[attr]
        if (pop) {
          const items = defaultArray(options[attr]).slice(0, -1)
          return items.length > 0 ? items : undefined
        }
        // case: multiple optional returns [] when called with no args
        if (optional) return []
        throw new UserError(`${name}: value required`)
      }

      let items = rm
        ? []
        : reset
        ? defaultArray(initialOptions[attr])
        : defaultArray(options[attr])

      // case: pop--
      if (pop) {
        items = items.slice(0, -1)
      }

      // option: single arg (slurp whole line at once)
      if (monoArg) {
        const arg = args.join(' ')
        return [...items, arg]
      }

      for (const arg of args) {
        const mod = arg.slice(-1)
        if (mod === '!') {
          const pattern = arg.slice(0, -1)
          items = items.filter(not(pattern))
        } else {
          if (!items.includes(arg)) {
            items.push(arg)
          }
        }
      }

      return items
    }

    const value = getValue()

    setOptions({ [attr]: value })
  },
})

const parseHandlerReg = /^\s*(?:-([^-][^\s,]*))?\s*(?:,?\s*(?:--(\S+)))?(?:\s*(\[|<)\s*(?:(\w+))(\.{3})?\s*(\]|>))?\s*$/

export const parseCommandSpec = cmd => {
  const match = parseHandlerReg.exec(cmd)
  if (!match) return null
  const [, short, long, open, arg, ellipsis, close] = match
  if (
    (open || close) &&
    !((open === '[' && close === ']') || (open === '<' && close === '>'))
  ) {
    throw new Error('Malformed command spec: ' + cmd)
  }
  const camel = long && camelCase(long)
  const result = {
    arg: !!arg,
    shortOpt: short && '-' + short,
    longOpt: long && '--' + long,
    short,
    long: camel,
  }
  if (result.arg) {
    result.optional = open === '['
    result.multiple = ellipsis === '...'
  }
  return result
}

const parseCmdHandler = cmd => {
  let options = {}
  if (Array.isArray(cmd)) {
    ;[cmd, options] = cmd
  }

  if (typeof cmd !== 'string') return cmd

  const match = parseCommandSpec(cmd)

  if (!match) return cmd

  const { arg, ...parsed } = match

  if (arg) {
    return filterHandler({
      ...parsed,
      options: {
        opt: parsed.long || parsed.short,
        ...options,
      },
    })
  }

  return boolHandler({
    ...parsed,
    options: {
      opt: parsed.long || parsed.short,
      ...options,
    },
  })
}

const reduceSwitchMap = (map, props) => {
  for (const prop of props) {
    if (!map[prop]) {
      map[prop] = []
    }
    for (const p of props) {
      if (p !== prop && !map[prop].includes(p)) {
        map[prop].push(p)
      }
    }
  }
  return map
}

const handlerMatches = (cmd, args, handler) =>
  handler.test
    ? handler.test(cmd, args)
    : handler.cmd === cmd ||
      (handler.alias && handler.alias.includes(cmd)) ||
      (handler.negs && handler.negs.includes(cmd))

const runHandler = (cmd, args, handler, _api) => {
  if (handler.run) {
    handler.run(_api, cmd, args)
  }
}

export default (specs, { switches = [], hooks: inputHooks = [] } = {}) => {
  const parser = {}

  const handlers = specs.map(parseCmdHandler)

  const completions = handlers
    .flatMap(({ alias }) => alias || [])
    .filter(lastCharNot('!', '?'))
    .filter(notShort)

  const switchMap = switches.reduce(reduceSwitchMap, {})

  const handler = _api => {
    const { setOptions: _setOptions, options, logValue } = _api

    let hooks = {}

    let autoRun = true

    const getHooks = opt => {
      if (!hooks[opt]) {
        hooks[opt] = []
      }
      return hooks[opt]
    }

    const addHook = (opt, handler) => {
      if (Array.isArray(opt)) {
        // .on(['a', 'b'], opt => (values, options) => {})
        opt.forEach(o => addHook(o, handler(o, api)))
      } else {
        // .on('a', (values, options) => {})
        getHooks(opt).push(handler)
      }
    }

    const reset = () => {
      hooks = {}
      for (const [opt, hook] of inputHooks) {
        addHook(opt, hook)
      }
    }

    const setAutoRun = auto => {
      autoRun = auto
    }

    const getAutoRun = () => autoRun

    const setOptions = (opts, andRun = 'auto') => {
      opts = { ...opts }
      for (const [opt, value] of Object.entries(opts)) {
        opts[opt] = value
        // pop off antagonists (members of same switch)
        if (value && switchMap[opt]) {
          for (const antagonist of switchMap[opt]) {
            opts[antagonist] = false
          }
        }
      }
      // on:
      for (const [opt, value] of Object.entries(opts)) {
        const handlers = hooks[opt]
        if (handlers && options[opt] !== value) {
          for (const handler of handlers) {
            opts = handler(opts, options) || opts
          }
        }
      }
      if (andRun === 'auto') {
        if (autoRun) {
          _setOptions(opts, true)
        } else {
          _setOptions(opts, false)
          for (const [k, v] of Object.entries(opts)) {
            logValue(k + ':', v)
          }
        }
      } else {
        _setOptions(opts, andRun)
      }
    }

    const api = { ..._api, setOptions }

    const handle = line => {
      line = line.trim()
      const args = line.split(' ')
      const cmd = args.shift()
      return handlers.some(handler => {
        if (handlerMatches(cmd, args, handler)) {
          runHandler(cmd, args, handler, api)
          return true
        }
      })
    }

    // to be able to run alias
    api.handle = handle

    reset()

    return { handle, setOptions, reset, setAutoRun, getAutoRun }
  }

  return Object.assign(parser, { completions, handler })
}
