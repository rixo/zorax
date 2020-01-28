const specFnRegexp = /zora_spec_fn/

const zoraInternal = /zora\/dist\/bundle/

const filterStackLine = l =>
  (l && !zoraInternal.test(l) && !l.startsWith('Error')) || specFnRegexp.test(l)

const getAssertionLocation = err => {
  const stack = (err.stack || '')
    .split('\n')
    .map(l => l.trim())
    .filter(filterStackLine)
  const userLandIndex = stack.findIndex(l => specFnRegexp.test(l))
  const stackline =
    userLandIndex >= 1 ? stack[userLandIndex - 1] : stack[0] || 'N/A'
  return stackline.replace(/^at|^@/, '')
}

const wrapSpec = spec =>
  async function zora_spec_fn(t, ...specRest) {
    try {
      return await spec(t, ...specRest)
    } catch (error) {
      const at = getAssertionLocation(error)
      t.collect({
        pass: false,
        actual: error,
        expected: 'no thrown error',
        description: 'test should not throw',
        operator: 'doesNotThrow',
        get at() {
          return at
        },
        set at(value) {},
      })
    }
  }

export default () => ({
  name: 'zorax.catch',
  test: t => {
    const { test } = t
    t.test = async (title, spec, ..._) => test(title, wrapSpec(spec), ..._)
  },
})
