const logError = err => {
  console.error((err && err.stack) || err)
}

export default ({
  auto: defaultAuto = true,
  onReportError = logError,
} = {}) => ({
  harness: (t, { auto = defaultAuto }) => {
    const report = t.report.bind(t)

    let autoStart = auto

    t.auto = (enable = autoStart) => {
      autoStart = enable
      return autoStart
    }

    t.report = (...args) => {
      autoStart = false
      return report(...args)
    }

    const maybeStart = () => {
      if (autoStart) {
        t.report().catch(onReportError)
      }
    }

    setTimeout(maybeStart)
  },
})
