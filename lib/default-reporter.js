import { mochaTapLike, tapeTapLike } from 'zora'

export default (
  defaultNoIndentReporter,
  defaultIndentReporter = defaultNoIndentReporter
) => ({
  harness: (t, { reporter: optionsReporter, indent = false }) => {
    const report = t.report.bind(t)

    const defaultReporter = optionsReporter
      ? optionsReporter
      : indent
      ? defaultIndentReporter || mochaTapLike
      : defaultNoIndentReporter || tapeTapLike

    t.report = (reporter = defaultReporter, ...args) =>
      report(reporter, ...args)
  },
})
