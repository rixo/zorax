import { Assert } from 'zora'
import { SpyContext } from './spy'

export type TestContext = Assert & SpyContext

type SimpleTestHandler = (t: TestContext) => void | Promise<void>

// === macro ===

import './macro'

import { MacroHandler } from './macro'

export type TestHandler = SimpleTestHandler | MacroHandler

// === group ===

export { group, describe } from './group'

// === zorax ===

export function test(name: string, handler: TestHandler): Promise<void>

export declare namespace test {
  const skip: typeof test
  const only: typeof test
}
