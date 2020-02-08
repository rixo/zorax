# `@zorax/plug`

> Plugin system for Zora

## Usage

```js
import { createHarness } from '@zorax/plug'

const options = { defaultFooMsg = 'should be foo' }

const plugins = [{
  name: 'foo',

  description: 'adds a foo assertion',

  test(t, harness) {
    const { options: defaultFooMsg } = harness

    t.foo = (actual, msg = 'should be foo') =>
      t.eq(actual, 'foo', msg)
  }
}]

const harness = createHarness(options, plugins)

harness.test('foo', t => {
  t.foo('foo')
})

harness.report()
```

### `createHarnessFactory`

~~~js
import { createHarnessFactory } from '@zorax/plug'

const defaultPlugins = [...]

const defaultOptions = {...}

export const createHarness = createHarnessFactory(
  defaultOptions,
  defaultPlugins,
)
~~~
