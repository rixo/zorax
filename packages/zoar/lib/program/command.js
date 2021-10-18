import commander from 'commander'

import { parseDoubleShorts } from './double-short-options.js'

const program = new commander.Command()
  .storeOptionsAsProperties(false)
  .passCommandToAction(false)

const { parse, opts, helpInformation } = program

const parseDoubles = parseDoubleShorts({
  w: 'watch',
})

const pruneDefaultConfig = prog => {
  const defaults = {}
  prog.options
    .filter(o => o.defaultValue !== undefined)
    .forEach(o => {
      defaults[o.attributeName()] = o.defaultValue
      o._defaultValue = o.defaultValue
      delete o.defaultValue
    })
  return defaults
}

const restoreDefaults = prog =>
  prog.options.forEach(o => {
    o.defaultValue = o._defaultValue
  })

program.parse = argv => {
  // clear defaults during parsing to allow overriding from .rc
  //
  // https://github.com/tj/commander.js/blob/d5186ba4b9b64a72cd685fccbb9ec5d0ec0c430d/index.js#L590
  program.defaults = program._optionValues
  program._optionValues = {}
  pruneDefaultConfig(program)

  // parse double shorts -ww
  const args = parseDoubles(argv)

  return parse.call(program, args)
}

program.helpInformation = (...args) => {
  restoreDefaults(program)
  return helpInformation.apply(program, args)
}

program.opts = (...args) => {
  const defaults = Object.fromEntries(
    program.options.map(o => [o.attributeName(), o.defaultValue])
  )
  const options = opts.apply(program, args)
  return { ...defaults, ...options }
}

export default program
