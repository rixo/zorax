# `zorax.plug`

> Plugin system for Zora

## Usage

```js
import { createHarness } from 'zorax/lib/plug'

const options = { defaultFooMsg = 'should be foo' }

const plugins = [{
  name: 'foo',

  description: 'adds a foo assertion',

  test(t, harness) {
    const { options: defaultFooMsg } = harness

    t.foo = (actual, msg = defaultFooMsg) =>
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
import { createHarnessFactory } from 'zorax/lib/plug'

const defaultPlugins = [...]

const defaultOptions = {...}

export const createHarness = createHarnessFactory(
  defaultOptions,
  defaultPlugins,
)
~~~

## Plugins

A plugin is a plain object with a `name`, and optional hooks.

### Example

~~~js
const myPlugin = {
  name: 'my plugin',

  description: 'optional description',

  // --- hooks --
  //
  // - in the order they are called
  //
  // - t is the target (can be test context, proxy or harness)
  // - z is the proxy (can be proxy or harness)
  // - h is the root harness (can be the same as t and/or z)
  //
  test(t, z, h) => {},
  harness(z, h) => {},
  init(h) => {},
  decorateTest(t, z, h) => {},
  decorateHarness(z, h) => {},
  decorateInit(h) => {},
}
~~~

### Hooks

- test
- harness
- init
- decorateTest
- decorateHarness
- decorateInit

### Lifecycle

Plugins are passed the different context objects that are created during the tests lifecycle (harness, proxy, test context), and they are free to augment or modify them by directly mutating the object (e.g. adding properties, wrapping methods, etc.).

There is an additional "decorate phase" where plugins are not allowed to change existing references anymore (e.g. by wrapping a method). This phase is intended for adding decorators to methods themselves (e.g. add `test.only`, we need to be sure that the test function reference won't change).

### Hooks order

Given plugins `[pg1, pg2]`, hooks are called in the following order:

~~~
# mutate phase
pg1.test -> pg1.harness -> pg1.init ->
pg2.test -> pg2.harness -> pg2.init ->

# decorate phase
pg1.decorateTest -> pg1.decorateHarness -> pg1.decorateInit ->
pg2.decorateTest -> pg2.decorateHarness -> pg2.decorateInit
~~~

### Type of targets

Not all types of test _contexts_ go through all hooks.

- the root **test harness** goes through all hooks: test, harness, init

- **harness proxies** (returned by `plug`) go through: test, harness

- and **test contexts** (created by `test`) go through: test

### Arguments

Hooks of the different _stages_ are called with the following arguments:

- `test` hooks are called with `(target, proxy, harness)`

- `harness` hooks are called with `(target, harness)`

- `init` hooks are called with `(harness)` (which is also the target in this case)

### Notes

- a plugin with a init stage (i.e. `init` or `decorateInit` hooks) can't be added with `plug`; it can only be added at harness creation

- `zorax.plug` attaches a harness' options object and plugins array to the harness as `harness.options` and `harness.plugins`

### Recipes

#### Access harness options

~~~js
{
  test(t, { options: { ... }}) {},
  harness(z, { options: { ... }}) {},
  init(h) {
    const { options: { ... } } = h
  },
}
~~~

#### Skip decorating harness & proxies in test hook

~~~js
{
  test(t, z, h) {
    if (t === z) return
    if (t === h) return
    // do your things
  }
}
~~~
