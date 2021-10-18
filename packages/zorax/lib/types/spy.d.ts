type CallArgs = [...args: any[]]

type CallReturn = any

type Call = [args: CallArgs, result: CallReturn]

type CallContext = {
  with(args: any[], returnValue?: any): CallContext,
  returned(...returnValues: any[]): CallContext,
}

type PositionalCallContext = CallContext & {
  wasCalledWith(args: any[]): PositionalCallContext,
}

type Spy<T extends Function> = T & {
  calls: Call[],
  args: CallArgs[],
  returns: CallReturn[],
  fn: T,

  hasBeenCalled(n: number, msg?: string): CallContext,
  hasBeenCalled(...calls: Call[]): CallContext,

  wasCalled(msg: string): CallContext,
  wasCalled(n?: number, args?: CallArgs, result?: CallReturn): CallContext,

  wasNotCalled(): void,

  hasBeenCalled(n: number): void,
  hasBeenCalled(callArgs: CallArgs[]): void,

  last: PositionalCallContext,
  just: PositionalCallContext,

  nextCall(): Promise<void>,
  nextCallAfter(op: () => void): Promise<void>,
  nextCallAfter(op: () => Promise<void>): Promise<void>,
}

export type SpyContext = {
  spy<T extends Function>(fn?: T): Spy<T>,
}
