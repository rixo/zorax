import type { TestContext } from './zorax'

export type MacroHandler<T extends TestContext = TestContext, D extends Array<any> = any[]> =
  (t: T, ...data: D) => void | Promise<void>

declare module './zorax' {
  // --- with provided title ---

  export function test<
    T1 extends TestContext = TestContext,
    T2 extends TestContext = TestContext,
    T3 extends TestContext = TestContext,
    T4 extends TestContext = TestContext,
    T5 extends TestContext = TestContext,
    D extends Array<any> = any[]
  >(
    name: string,
    macro1: MacroHandler<T1>,
    macro2: MacroHandler<T1 & T2>,
    macro3: MacroHandler<T1 & T2 & T3>,
    macro4: MacroHandler<T1 & T2 & T3 & T4>,
    macro5: MacroHandler<T1 & T2 & T3 & T4 & T5>,
    ...data: D
  ): Promise<void>

  export function test<
    T1 extends TestContext = TestContext,
    T2 extends TestContext = TestContext,
    T3 extends TestContext = TestContext,
    T4 extends TestContext = TestContext,
    D extends Array<any> = any[]
  >(
    name: string,
    macro1: MacroHandler<T1>,
    macro2: MacroHandler<T1 & T2>,
    macro3: MacroHandler<T1 & T2 & T3>,
    macro4: MacroHandler<T1 & T2 & T3 & T4>,
    ...data: D
  ): Promise<void>

  export function test<
    T1 extends TestContext = TestContext,
    T2 extends TestContext = TestContext,
    T3 extends TestContext = TestContext,
    D extends Array<any> = any[]
  >(
    name: string,
    macro1: MacroHandler<T1>,
    macro2: MacroHandler<T1 & T2>,
    macro3: MacroHandler<T1 & T2 & T3>,
    ...data: D
  ): Promise<void>

  export function test<
    T1 extends TestContext = TestContext,
    T2 extends TestContext = TestContext,
    D extends Array<any> = any[]
  >(
    name: string,
    macro1: MacroHandler<T1>,
    macro2: MacroHandler<T1 & T2>,
    ...data: D
  ): Promise<void>

  export function test(
    name: string,
    handler: MacroHandler,
    ...data: any[]
  ): Promise<void>

  // --- with no provided title (i.e. auto title) ---

  export function test<
    T1 extends TestContext = TestContext,
    T2 extends TestContext = TestContext,
    T3 extends TestContext = TestContext,
    T4 extends TestContext = TestContext,
    T5 extends TestContext = TestContext,
    D extends Array<any> = any[]
  >(
    macro1: MacroHandler<T1>,
    macro2: MacroHandler<T1 & T2>,
    macro3: MacroHandler<T1 & T2 & T3>,
    macro4: MacroHandler<T1 & T2 & T3 & T4>,
    macro5: MacroHandler<T1 & T2 & T3 & T4 & T5>,
    ...data: D
  ): Promise<void>


  export function test<
    T1 extends TestContext = TestContext,
    T2 extends TestContext = TestContext,
    T3 extends TestContext = TestContext,
    T4 extends TestContext = TestContext,
    D extends Array<any> = any[]
  >(
    macro1: MacroHandler<T1>,
    macro2: MacroHandler<T1 & T2>,
    macro3: MacroHandler<T1 & T2 & T3>,
    macro4: MacroHandler<T1 & T2 & T3 & T4>,
    ...data: D
  ): Promise<void>


  export function test<
    T1 extends TestContext = TestContext,
    T2 extends TestContext = TestContext,
    T3 extends TestContext = TestContext,
    D extends Array<any> = any[]
  >(
    macro1: MacroHandler<T1>,
    macro2: MacroHandler<T1 & T2>,
    macro3: MacroHandler<T1 & T2 & T3>,
    ...data: D
  ): Promise<void>

  export function test<
    T1 extends TestContext = TestContext,
    T2 extends TestContext = TestContext,
    D extends Array<any> = any[]
  >(
    macro1: MacroHandler<T1>,
    macro2: MacroHandler<T1 & T2>,
    ...data: D
  ): Promise<void>

  export function test<
    T1 extends TestContext = TestContext,
    D extends Array<any> = any[]
  >(
    macro1: MacroHandler<T1>,
    ...data: D
  ): Promise<void>

  // --- generic form ---

  export function test(
    name?: string,
    ...macroOrData: (MacroHandler | any)[]
  ): Promise<void>
}
