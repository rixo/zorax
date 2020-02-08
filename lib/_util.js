export const isFunction = x => typeof x === 'function'

export const hasName = name => ({ name: x }) => x === name

export const noop = () => {}

export { inspect } from 'util'
