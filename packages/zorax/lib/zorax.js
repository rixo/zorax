import withAuto from './auto'
import { createHarness } from './hook'

export {
  AssertPrototype,
  // createHarness,
  deepEqual,
  doesNotThrow,
  eq,
  equal,
  equals,
  fail,
  falsy,
  is,
  isNot,
  mochaTapLike,
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
  tapeTapLike,
  test,
  throws,
  truthy,
} from 'zora'

export { createHarness, createHarnessFactory } from './hook'

export const harness = createHarness([withAuto({ auto: true })])
