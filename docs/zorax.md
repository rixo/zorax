# zorax

> Extensible zora

- extensible zora
- collection of functionalities for zora
- unopinionated
  - no defaults
  - lightweight (no dragging in of a watching lib, that's zoar...)
  - composable

~~~js
import withOnly from 'zorax/lib/only'
import withDescribe from 'zorax/lib/describe'

const options = { runOnly: false }
~~~

Plugins can be applied to individual tests:

~~~js
import { test } from 'zorax'

test('', [withMacro, withSpy], t => {
  t.ok(t.spy)

  // the plugins will be recursively applied to all child tests
  t.test('', t => {
    t.ok(t.spy)
  })
})
~~~

Or to individual test harnesses:

~~~js
import { createHarness } from 'zorax'

export const { test, describe } = createHarness(
  options,
  withOnly,
  withDescribe,
)
~~~

Or to test harness factories:

~~~js
import { createHarnessFactory } from 'zorax'

const createCustomHarness = createHarnessFactory(
  withOnly,
  withDescribe,
)
~~~


## Plugins

* zorax
  - autostart
  - default-reporter
  - hook => zorax/plug
  - describe
  - describe-only
  - macro
  - only
  - pass
  - spy


## Plugin

~~~js
{
  options: opts => opts,
  factory: (createHarness, opts) => createHarness, // MAYBE
  harness: (t, opts) => void,
  test: (t, opts) => void,
  macro: async (t, ...data) => void,
  flag: ['e2e', 'zorax'], // or "tag"?
}
~~~

## Breaking changes

API discrepancies with zora.

### Does not accept options as a test argument

~~~js
import * as zora from 'zora'
import * as zorax from 'zorax'

// zora: test(desc, spec, options)
//
zora.test('', t => {}, { runOnly: false })

// zorax: test(desc, spec)
//
zorax.test('', t => {}) // no third arg
~~~

### No top level assertions

=> _zorax-describe_?
