import { createHarness } from './hook'
import withAuto from './auto'
import withMacro from './macro'

export { createHarness, createHarnessFactory } from './hook'

export const harness = createHarness([withMacro(), withAuto({ auto: true })])

export { AssertPrototype, mochaTapLike, tapeTapLike } from 'zora'

export const {
  deepEqual,
  doesNotThrow,
  eq,
  equal,
  equals,
  fail,
  falsy,
  is,
  isNot,
  notDeepEqual,
  notEq,
  notEqual,
  notEquals,
  notOk,
  notSame,
  ok,
  only,
  same,
  skip,
  test,
  throws,
  truthy,
} = harness
