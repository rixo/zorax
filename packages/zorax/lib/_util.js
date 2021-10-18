export const isFunction = x => typeof x === 'function'

export const hasName = name => ({ name: x }) => x === name

export const noop = () => {}

export { inspect } from 'util'

export const Deferred = () => {
  let resolve, reject
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })
  return { promise, resolve, reject }
}

// fatal errors cause a bailout instead of reporting failure with zorax.catch
export class FatalError extends Error {
  constructor(...args) {
    super(...args)
    this.fatal = true
  }
}
