/**
 * Zorax alias
 */

const applyAlias = (from, t) => to => {
  const path = to.split('.')
  const key = path.pop()
  const target = path.reduce((cursor, step) => cursor[step], t)
  target[key] = t[from]
}

const forEach = (run, source) => {
  Array.isArray(source) ? source.forEach(run) : run(source)
}

const applyAliases = (aliases, t) => {
  Object.entries(aliases).forEach(([from, to]) => {
    forEach(applyAlias(from, t), to)
  })
}

const aliaser = aliases => aliases && (t => applyAliases(aliases, t))

export default (test, harness) => ({
  name: 'zorax.alias',
  decorate: aliaser(test),
  decorateHarness: aliaser(harness),
})
