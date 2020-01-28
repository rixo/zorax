import createDefaultHarness from './zorax.defaults'

export { createHarness, createHarnessFactory } from './plug'

export const harness = createDefaultHarness()

export const { test, group, describe, plug } = harness
