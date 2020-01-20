/**
 * Zorax alias
 */

const applyAliases = (aliases, t) => {
  Object.entries(aliases).forEach(([from, _to]) => {
    const tos = Array.isArray(_to) ? _to : [_to]
    tos.forEach(to => {
      t[to] = t[from]
    })
  })
}

const aliaser = aliases => aliases && (t => applyAliases(aliases, t))

export default ({ test, harness }) => ({
  name: 'zorax.alias',
  decorate: aliaser(test),
  decorateHarness: aliaser(harness),
})
