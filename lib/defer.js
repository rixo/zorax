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
  name: 'zorax.defer',

  harness: (...args) => {
    const [h, { plugins }] = args
    const mainTest = h.test
    const mainSkip = h.skip

    const tests = []

    let reporting = false
    let locked = false

    const pushTest = spec => {
      tests.push(spec)
    }

    const runTestInCtx = ({ test, skip }) => spec => {
      const { args, resolve, reject, skip: skipped } = spec
      const run = skipped ? skip : test
      run(...args)
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

    const runTestIn = runHooks.reduce((run, hook) => hook(run, h), runTestInCtx)

    // h.defer.runner(t)
    //   => (spec => { /* run */ })
    //
    // Allows a plugin to run specs through the entire run pipeline, not just
    // what's before them.
    //
    // defer     A             B
    //
    //          if (...) <--- filter <---|
    //            |                      |
    //           then -------------------|
    //            |                 ^
    //  run <--- else    h.defer.runner(t)
    //
    h.defer = {
      runner: runTestIn,
    }

    const flush = () => {
      reporting = true
      const runSpec = runTestIn(h)
      for (const spec of tests) {
        runSpec(spec)
      }
      reporting = false
    }

    const deferTest = (args, tester = mainTest, extra) => {
      if (locked) {
        throw new Error('Cannot add test after reporting has started')
      }
      // guard: is passthrough during reporting
      if (reporting) {
        return tester(...args)
      }
      const deferred = Deferred()
      deferred.args = args
      addTest(deferred)
      Object.assign(deferred, extra)
      return deferred.promise
    }

    h.test = (...args) => deferTest(args)

    h.skip = (...args) => deferTest(args, mainSkip, { skip: true })

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
