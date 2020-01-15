
~~~js
import { createHarnessFactory } from 'zorax'
import withDefaultReporter from 'zorax/lib/default-reporter'

const createHarness = createHarnessFactory([
  withDefaultReporter(fancyReporter),
])

const h = createHarness([
  withDefaultReporter(fancyReporter),
])

// depending on { indent } option
withDefaultReporter(
  noIndentReporter,
  indentReporter = noIndentReporter
)
~~~
