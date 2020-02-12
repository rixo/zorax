import { noop, inspect } from './_util'

const times = n => `${n} ${n === 1 ? 'time' : 'times'}`

const passed = { pass: true }

const failed = {
  pass: false,
  with: () => failed,
  returned: () => failed,
}

const fastFormat = value =>
  inspect(value, {
    depth: 1,
    maxArrayLength: 3,
    breakLength: Infinity,
  })

const formatArgs = value => `(${value.map(fastFormat).join(', ')})`

const createSpyFactory = t => (fn = noop) => {
  const calls = []
  const _args = []
  const returns = []

  const spied = function zora_spec_fn(...args) {
    const result = fn.apply(this, args)
    const call = [args, result]
    spied[calls.length] = call
    calls.push(call)
    _args.push(args)
    returns.push(result)
    return result
  }

  // useful for debug
  spied.fn = fn

  Object.assign(spied, { calls, args: _args, returns })

  const beenCalledWith = (args, api = passed) => {
    const { pass } = t.eq(
      _args,
      args,
      `should have been called with ${args.map(formatArgs).join(' then ')}`
    )
    return pass ? api : failed
  }

  const hasReturned = (results, api = passed) => {
    const { pass } = t.eq(
      returns,
      results,
      `should have returned ${results.map(fastFormat).join(' then ')}`
    )
    return pass ? api : failed
  }

  spied.hasBeenCalled = (...args) => {
    if (Array.isArray(args[0])) {
      t.eq(calls, args, `should be called with ${formatArgs(args)}`)
    } else {
      const [n, msg = `should be called ${times(n)}`] = args
      t.eq(calls.length, n, msg)
    }
    const api = {
      with: (...args) => beenCalledWith(args, api),
      returned: (...results) => hasReturned(results, api),
    }
    return api
  }

  const calledWith = (i, args, api = passed) => {
    const { pass } = t.eq(
      _args[i],
      args,
      `should be called at #${i} with ${formatArgs(args)}`
    )
    return pass ? api : failed
  }

  const returned = (i, result, api = passed) => {
    const { pass } = t.eq(
      returns[i],
      result,
      `call #${i} should return ${fastFormat(result)}`
    )
    return pass ? api : failed
  }

  let cur = 0

  spied.wasCalled = (...params) => {
    const [index, args, result] = params
    const hasResult = params.length > 2
    const n = calls.length
    let i = index
    let r = { pass: true }
    if (i == null) {
      i = cur++
      const msg =
        n > i
          ? `was called ${times(cur)} before expected`
          : `should have been called ${times(i + 1)}`
      r = t.eq(n, i + 1, msg)
    } else {
      r = t.ok(n > i, `should be called at least ${times(i + 1)}`)
    }
    if (r.pass && args) {
      r = calledWith(i, args)
    }
    if (r.pass && hasResult) {
      r = returned(i, result)
    }
    if (!r.pass) {
      return failed
    }
    const api = {
      with: (...args) => calledWith(i, args, api),
      returned: result => returned(i, result, api),
    }
    return api
  }

  spied.wasCalledWith = (...args) => spied.wasCalled().with(...args)

  spied.returned = result => spied.wasCalled().returned(result)

  // === modifiers ===

  // --- .just. ---

  spied.just = {
    wasCalled: (...args) => {
      if (args.length > 0) {
        throw new Error('just.wasCalled is only allowed with zero arguments')
      }
      cur = calls.length - 1
      return spied.wasCalled()
    },
    wasCalledWith: (...args) => spied.just.wasCalled().with(...args),
    returned: (...args) => spied.just.wasCalled().returned(...args),
  }

  // --- quantifier: spy.o.o.x ---

  const X = i => ({
    wasCalledWith: (...args) => spied.wasCalled(i).with(...args),
    returned: result => spied.wasCalled(i).returned(result),
  })

  spied.x = X(0)

  Object.defineProperty(spied, 'o', {
    get() {
      let i = 1
      const o = {
        get o() {
          i++
          return o
        },
        get x() {
          return X(i)
        },
      }
      return o
    },
  })

  // --- .first ---

  spied.first = X(0)

  // --- .last ---

  spied.last = {
    wasCalledWith: (...args) => spied.wasCalled(calls.length - 1).with(...args),
    returned: (...args) => spied.wasCalled(calls.length - 1).returned(...args),
  }

  return spied
}

const spiesTrap = (t, o) => prop => {
  o[prop] = (...args) => (o[prop] = t.spy(...args))
}

const createSpiesFactory = t => (...names) => {
  const spies = {}
  const trap = spiesTrap(t, spies)
  if (names.length > 0) {
    names.forEach(trap)
    return spies
  }
  return new Proxy(spies, {
    get(target, prop) {
      if (!target.hasOwnProperty(prop)) {
        trap(prop)
      }
      return target[prop]
    },
  })
}

export default () => ({
  name: 'zorax.spy',
  test(t) {
    t.spy = createSpyFactory(t)
    t.spies = createSpiesFactory(t)
  },
})
