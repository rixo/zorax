/**
 * zorax/defer
 */
const Deferred = () => {
  let resolve, reject
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })
  return { promise, resolve, reject }
}

export default () => ({
  name: 'defer',

  harness: (...args) => {
    const [h, { plugins }] = args
    const mainTest = h.test

    const tests = []

    let reporting = false
    let locked = false

    const pushTest = spec => {
      tests.push(spec)
    }

    const runTestInCtx = ({ test }) => spec => {
      const { args, resolve, reject } = spec
      test(...args)
        .then(resolve)
        .catch(err => {
          reject(err)
          throw err
        })
    }

    const deferPlugins = plugins.map(pg => pg.defer).filter(Boolean)

    const addHooks = deferPlugins.map(defer => defer.add).filter(Boolean)

    const runHooks = deferPlugins.map(defer => defer.run).filter(Boolean)

    const addTest = addHooks.reduce((push, hook) => hook(push, h), pushTest)

    const runTest = runHooks.reduce((run, hook) => hook(run, h), runTestInCtx)

    const flush = () => {
      reporting = true
      tests.forEach(runTest(h))
      reporting = false
    }

    h.test = (...args) => {
      if (locked) {
        throw new Error('Cannot add test after reporting has started')
      }
      // guard: is passthrough during reporting
      if (reporting) {
        return mainTest(...args)
      }
      const deferred = Deferred()
      deferred.args = args
      addTest(deferred)
      return deferred.promise
    }

    const _report = h.report
    h.report = async (...args) => {
      flush()
      locked = true
      const result = await _report.apply(h, args)
      locked = false
      return result
    }
  },
})
