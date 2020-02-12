import { ZORAX_DEFER as name } from './names.js'

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
  name,

  init: (h, { plugins }) => {
    const mainTest = h.test
    const mainSkip = h.skip

    let tests = []

    let running = false
    let reporting = false

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

    const _addTest = addHooks.reduce((push, hook) => hook(push, h), pushTest)

    const runTestIn = runHooks.reduce((run, hook) => hook(run, h), runTestInCtx)

    const addTest = (args, extra) => {
      const deferred = Deferred()
      deferred.args = args
      _addTest(deferred)
      Object.assign(deferred, extra)
      return deferred.promise
    }

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
      running = true
      const runSpec = runTestIn({ test: mainTest, skip: mainSkip })
      const currentTests = tests
      tests = []
      for (const spec of currentTests) {
        runSpec(spec)
      }
      running = false
    }

    const deferTest = (args, tester = mainTest, extra) => {
      // guard: is passthrough during reporting
      if (running) {
        return tester(...args)
      }
      // guard: can't add top level test during reporting
      if (reporting) {
        throw new Error('Cannot add test after reporting has started')
      }
      addTest(args, extra)
    }

    h.test = (...args) => deferTest(args)

    h.skip = (...args) => deferTest(args, mainSkip, { skip: true })

    const _report = h.report
    h.report = async (...args) => {
      reporting = true
      flush()
      const result = await _report.apply(h, args)
      reporting = false
      return result
    }
  },
})
