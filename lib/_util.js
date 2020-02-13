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
