const createReducer = doublables => (args, arg) => {
  if (arg.slice(0, 1) === '-') {
    const z = arg.slice(-1)
    const y = arg.slice(-2, -1)
    if (y === z && doublables[y]) {
      const rest = arg.slice(1, -2)
      if (rest.length > 0) {
        args.push(arg.slice(0, -2))
      }
      args.push('--' + doublables[y])
    } else {
      args.push(arg)
    }
  } else {
    args.push(arg)
  }
  return args
}

export const parseDoubleShorts = doublables => {
  const reducer = createReducer(doublables)
  return argv => argv.reduce(reducer, [])
}
