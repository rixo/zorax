import createDefaultHarness from './zorax.defaults'

export const harness = createDefaultHarness()

// export const createHarness = (...args) => {
//   harness.auto(false)
//   return createDefaultHarness(...args)
// }
//

export const { test, group, describe, plug } = harness
