import type { TestContext } from './zorax'

export type MacroHandler = (t: TestContext, ...data: any[]) => void | Promise<void>

declare module './zorax' {
  // --- with provided title ---

  export function test(
    name: string,
    macro1: MacroHandler,
    macro2: MacroHandler,
    macro3: MacroHandler,
    macro5: MacroHandler,
    ...data: any[]
  ): Promise<void>

  export function test(
    name: string,
    macro1: MacroHandler,
    macro2: MacroHandler,
    macro3: MacroHandler,
    macro4: MacroHandler,
    ...data: any[]
  ): Promise<void>

  export function test(
    name: string,
    macro1: MacroHandler,
    macro2: MacroHandler,
    macro3: MacroHandler,
    ...data: any[]
  ): Promise<void>

  export function test(
    name: string,
    macro1: MacroHandler,
    macro2: MacroHandler,
    ...data: any[]
  ): Promise<void>

  export function test(
    name: string,
    handler: MacroHandler,
    ...data: any[]
  ): Promise<void>

  // --- with no provided title (i.e. auto title) ---

  export function test(
    macro1: MacroHandler,
    macro2: MacroHandler,
    macro3: MacroHandler,
    macro4: MacroHandler,
    macro5: MacroHandler,
    ...data: any[]
  ): Promise<void>


  export function test(
    macro1: MacroHandler,
    macro2: MacroHandler,
    macro3: MacroHandler,
    macro4: MacroHandler,
    ...data: any[]
  ): Promise<void>


  export function test(
    macro1: MacroHandler,
    macro2: MacroHandler,
    macro3: MacroHandler,
    ...data: any[]
  ): Promise<void>

  export function test(
    macro1: MacroHandler,
    macro2: MacroHandler,
    ...data: any[]
  ): Promise<void>

  export function test(
    handler: MacroHandler,
    ...data: any[]
  ): Promise<void>

  // --- generic form ---

  export function test(
    name?: string,
    ...macroOrData: (MacroHandler | any)[]
  ): Promise<void>
}
