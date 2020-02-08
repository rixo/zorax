# ZoraX

> Zora, eXtended!

## Examples

### Use default harness

~~~js
import { test, describe } from 'zorax'

describe('zorax', () => {
  test('is an opinionated testing library', t => {
    const macro = (t, expected) => {
      t.ok(true, expected, 'should be true')
    }
    t.test(macro, true)
    t.test(macro, false)
  })
})
~~~

### Plug in default harness

~~~js
// test/index.js

// plug in default harness (use returned proxy for your tests)
import { plug } from 'zorax'

// it's the default zorax harness, so it already has auto, defer, etc.
export const { test, describe, plug } = plug({
  name: 't.test.only',
  decorateTest(t) {
    t.test.only = t.only
    t.test.skip = t.skip
  },
})
~~~

### Or compose one from scratch

~~~js
// test/index.js
import { createHarness } from '@zorax/plug'
import auto from '@zorax/auto'

// it's the default zorax harness, so it already has auto, defer, etc.
export const { test, describe, plug } = createHarness(
  // config (as usual)
  {},
  // plugins
  [
    auto({ auto: false }),
    {
      name: 't.test.only',
      decorateTest(t) {
        t.test.only = t.only
        t.test.skip = t.skip
      },
    }
  ]
)
~~~

Use it, with (for example) a symlink from `test/node_modules/@@` to `test`:

~~~js
import { describe, test } from '@@'

describe('test', () => {
  test('go go go', t => { ... })
})
~~~

Or further customize it for local (module) tests:

~~~js
import { plug } from '@@'

const { test, describe } = plug()

### Auto

~~~js
import { createHarness } from 'zorax/plug'
import withAuto from 'zorax/auto'

const harness = createHarness([withAuto()], { auto: true })

harness.auto()
~~~
