import createNextHarness from './zorax.defaults'

export { createHarness, createHarnessFactory } from './plug'

// export const harness = createDefaultHarness()
export const harness = createNextHarness()

export const { test, group, describe, plug } = harness

// setTimeout(() => {
//   harness.report(reporter())
//   // harness.report()
// })

// export { AssertPrototype, mochaTapLike, tapeTapLike } from 'zora'
//
// export const {
//   deepEqual,
//   doesNotThrow,
//   eq,
//   equal,
//   equals,
//   fail,
//   falsy,
//   is,
//   isNot,
//   notDeepEqual,
//   notEq,
//   notEqual,
//   notEquals,
//   notOk,
//   notSame,
//   ok,
//   only,
//   same,
//   skip,
//   test,
//   throws,
//   truthy,
// } = harness
