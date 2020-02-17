import { hasName, FatalError } from './_util'
import { ZORAX_DEFER, ZORAX_DEFER_PRINT as name } from './names'

// https://stackoverflow.com/a/41407246/1387519
const bold = '\x1b[1m'
const reset = '\x1b[0m'
const cyan = '\x1b[36m'
const magenta = '\x1b[35m'
// const blue = '\x1b[34m'

const write = console.log.bind(console)

const printer = handler => ({
  compact: initialCompact = false,
  indent: customIndent,
} = {}) => {
  let maxEmpties
  let indentString = customIndent

  const setCompact = _compact => {
    initialCompact = _compact
    maxEmpties = initialCompact ? 0 : 1
    if (!customIndent) {
      indentString = initialCompact ? '  ' : '    '
    }
  }

  setCompact(initialCompact)

  let lastEmpties = 0

  const _log = (_indent, color, prefix, ...args) => {
    const indent = indentString.repeat(_indent)
    const value = args.join(' ')
    const empty = value === ''
    if (empty) {
      if (lastEmpties < maxEmpties) {
        lastEmpties++
        return write()
      }
      return
    }
    lastEmpties = 0
    const formatted = indent + value
    return color
      ? write(`%s${color}%s\x1b[0m`, indent + prefix + ' ', value)
      : write(formatted)
  }

  let testCount = 0
  let groupCount = 0

  const logTest = (offset, title, isGroup) => {
    if (isGroup) {
      groupCount++
    } else {
      testCount++
    }
    return _log(
      offset,
      isGroup ? bold + magenta : cyan,
      isGroup ? '>' : '.',
      title
    )
  }

  let enabled = false

  const isEnabled = () => enabled

  const props = handler({ isEnabled, logTest })

  return {
    init(h) {
      const {
        report,
        options: { printCompact: compact = initialCompact },
      } = h

      setCompact(compact)

      h.print = arg => {
        if (arg) {
          enabled = true
          if (arg.hasOwnProperty('compact')) {
            setCompact(arg.compact)
          }
        } else {
          enabled = false
        }
      }

      const plural = x => (x === 1 ? '' : 's')

      h.report = async (...args) => {
        if (enabled) {
          write(
            `\n${bold + cyan + testCount} test${plural(testCount)} ${reset}` +
              `${magenta}(${groupCount} group${plural(groupCount)})${reset}\n`
          )
          testCount = groupCount = 0
          return { skip: true }
        }
        return report(...args)
      }
    },

    ...props,
  }
}

const validateDeps = ({ plugins }) => {
  // require zorax.defer
  const deferIndex = plugins.findIndex(hasName(ZORAX_DEFER))
  if (deferIndex === -1) {
    throw new FatalError(`${name} requires ${ZORAX_DEFER}`)
  }
  // must be before zorax.defer
  const index = plugins.findIndex(hasName(name))
  if (index > deferIndex) {
    throw new FatalError(`${name} must be before ${ZORAX_DEFER}`)
  }
}

export default printer(({ isEnabled, logTest }) => ({
  name: 'zorax.defer.print',

  description: "print tests' title instead of running them",

  init: validateDeps,

  defer: {
    run: prev => t => {
      const runSpec = prev(t)
      if (!isEnabled()) {
        return runSpec
      }
      return spec => {
        const offset = t.offset
        const title = spec.args && spec.args[0]
        const isGroup = spec.group === true

        logTest(offset, title, isGroup)

        return isGroup ? runSpec(spec) : runSpec({ ...spec, skip: true })
      }
    },
  },
}))
