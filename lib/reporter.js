import { mochaTapLike, tapeTapLike } from 'zora'

export default (
  defaultNoIndentReporter,
  defaultIndentReporter = defaultNoIndentReporter
) => ({
  name: 'zorax.reporter',

  harness: (t, { options: { reporter: optionsReporter, indent = false } }) => {
    const report = t.report

    const defaultReporter = optionsReporter
      ? optionsReporter
      : indent
      ? defaultIndentReporter || mochaTapLike
      : defaultNoIndentReporter || tapeTapLike

    t.report = (reporter = defaultReporter, ...args) =>
      report.call(t, reporter, ...args)
  },
})
