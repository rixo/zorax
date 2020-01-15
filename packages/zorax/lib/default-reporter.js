export default defaultReporter => {
  harness: t => {
    const report = t.report.bind(t)

    t.report = (reporter = defaultReporter, ...args) =>
      report(reporter, ...args)
  }
}
