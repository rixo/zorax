const logError = err => {
  // eslint-disable-next-line no-console
  console.error((err && err.stack) || err)
}

export default ({
  auto: defaultAuto = true,
  onReportError = logError,
} = {}) => ({
  name: 'zorax.auto',

  harness: (t, { auto = defaultAuto }) => {
    const report = t.report

    let autoStart = auto

    t.auto = (enable = autoStart) => {
      autoStart = enable
      return autoStart
    }

    t.report = (...args) => {
      autoStart = false
      return report.apply(t, args)
    }

    const maybeStart = () => {
      if (autoStart) {
        t.report().catch(onReportError)
      }
    }

    setTimeout(maybeStart)
  },
})
