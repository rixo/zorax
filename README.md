# ZoraX

> Zora, extended

Zorax is a lightweight testing library built over [Zora](https://github.com/lorenzofox3/zora) with some added features and tooling that I like.

Zorax's fundamental piece is `@zorax/plug`, that adds a plugin system over Zora.

Zorax itself is entirely built out of plugins. You can use it as a whole, or recompose some of its plugins with you owns to build your own harness to your liking.

## Install

~~~bash
npm install --save-dev zorax
# or
yarn add --save-dev zorax
~~~

## Features / plugins

- [zorax.plug](./docs/plug.md) makes Zora extensible with a plugin system

- [zorax.auto](./docs/auto.md) makes the "test is the program" paradigm easy for custom harnesses

- [zorax.reporter](./docs/reporter.md) configurable & default harness reporters; defaults to [`zora-node-reporter`](https://github.com/lorenzofox3/zora-reporters/tree/master/node) in TTY, and tap / indent otherwise

- [zorax.catch](./docs/catch.md) reports unexpected exceptions as test failures instead of bailing out

- [zorax.defer](./docs/defer.md) defers the run of top level tests

  - [zorax.defer.only](./docs/defer.only.md) automatic `only` support for top level tests

  - [zorax.defer.group](./docs/defer.group.md) dumbed down sub tests that allows grouping of top level tests (so you can have both grouping and auto `only`!)

  - [zorax.defer.print](./docs/defer.print.md) print test titles instead of running them

- [zorax.macro](./docs/macro.md) reuse test logic with macro pattern &ndash; stolen directly from AVA :rocket:

- [zorax.filter](./docs/filter.md) filter (top level) tests by title

- [zorax.alias](./docs/alias.md) configurable aliases for test context (e.g. `t.test.skip -> t.skip`)

- [zorax.spy](./docs/spy.md) minimalist test spy with builtin assertions

<!-- - [zorax.pass](./docs/pass.md) -->

- [zorax.todo](./docs/todo.md) mark tests as TODO (TODO)

## Examples

Highlights from the Zorax universe...

### Plug

[`zorax.plug`](./docs/plug.md) is the backbone of Zorax. It implements a simple yet powerful plugin system over Zora. All other parts of Zorax rely on it.

~~~js
// zorax.plug creates plugin aware harnesses
import { createHarness } from 'zorax/lib/plug'

// use with stock plugins
import spy from 'zorax/lib/spy'
import auto from 'zorax/lib/auto'

// or write your owns
const withPass = {
  name: 'pass',
  description: 'adds pass assertion',
  test(t) {
    t.pass = (msg = 'pass was called') => t.ok(true, msg)
  }
}

// usual Zora options, or implemented by plugins (must be an object)
const options = { auto: false }

// plugins (must be an array)
const plugins = [auto(), pass, spy()]

const harness = createHarness(options, plugins)

// export for your tests to use
export const { test } = harness

// or further extend locally (you'd do that in another test file normally)
{
  const { test } = harness.plug(myPlugin()) // no need to be an array this time
}

// a plugin is a plain object, and has access to a handful of hooks
function myPlugin() { // a factory (we're being fancy)
  return {
    name: 'myPlugin',

    // certainly the most useful hook: called with all newly created test
    // contexts. let's you add assertions or features... be creative!
    test(t) {
      const { test } = t
      t.test = (desc, ...args) => {
        console.time(desc)
        const result = test(desc, ...args)
        console.timeEnd(desc)
        return result
      }
    },

    // called with all "sub harness" created by plug
    harness(t) {},

    // called only once with the original harness instance
    init(h) {},
  }
}
~~~

See the docs of [`zorax.plug`](./docs/plug.md) for the full plugin API (might be a work in progress the first few times you hit this link...).

### Defer / group / only

`zorax.defer` registers top level tests (that is, calls to the `harness.test` method) but defers running them until `harness.report` is called.

This allows `zorax.defer.only` to know if one of the tests has called `only` and automatically skip other tests if it's the case.

This only works for top level tests though, since we can't know about the sub tests before we've run the parents.

`zorax.defer.group` lets you group top level tests synchronously, thus allowing to benefit both from semantic grouping, and auto only.

~~~js
import { test, describe } from 'zorax'

// group (aliased as describe)
describe('defer / group / only', () => {
  // the handler function is called synchronously

  // NOTE we're using the root `test` func, describe provides no test context
  test('a test that will be skipped', t => { ... })

  test.only('only this test will run', t => { ... })

  describe.only('... and all those in this group, too!', () => {
    test('a test that will run', t => { ... })

    test.skip('test can still be skipped', t => { ... })

    describe.skip('... as well as groups', () => { ... })

    // WARNING describe must always be called synchronously -- that is, at top
    // level, or directly inside another describe -- this will crash:
    test('bad boy', t => {
      describe("NOPE! we're not synchronous anymore here!", () => { ... })
    })
  })
})
~~~

### Macro

Directly [stolen from AVA](https://github.com/avajs/ava/blob/master/docs/01-writing-tests.md#reusing-test-logic-through-macros) :rocket:.

- extra arguments to the `test` function are passed to the macro, as well as the test context

- macros can provide a computed title

~~~js
import { test, describe } from 'zorax'

describe('zorax.macro', () => {
  const macro = (t, actual, expected) => {
    t.eq(eval(actual), expected)
  }

  macro.title = (title = '', actual, expected) =>
    title || `${actual} = ${expected}`

  test(macro, '1 + 1', 2)
  test(macro, '1 + 2', 3)

  // not tampering with / wrapping the test function for your dynamic tests
  // makes your life easier
  test.skip(macro, '1 + foo', '???')
})
~~~

### Spy

An essentialist test spy, for the no-bullshit testing library. With built-in Zora assertions!

~~~js
import { test, describe } from 'zorax'

describe('zorax.spy', () => {
  test('mi6', t => {
    const spy = t.spy(x => x + 2)

    spy.hasBeenCalled(0)

    spy('foo')
    spy('bar', 'baz')

    spy.hasBeenCalled(2)
    spy.wasCalled(0, ['foo'], 'foo2')
    spy.wasCalled(1, ['bar', 'baz'], 'bar2')
  })

  test('"assert along" API', t => {
    const spy = t.spy(x => x + 2)

    spy('foo', 'bar')

    // also asserts that spy was called only once (i.e. not called before)
    spy.wasCalledWith('foo', 'bar').returned('foo2')

    spy(3)

    spy.wasCalledWith(3).returned(5)

    spy(4)
    spy('4')

    // fail! the call to spy(4) was unexpected; wasCalledWith needs to be called
    // once (and only once) after each call
    spy.wasCalledWith('4').returned('42')

    // or reset!
    spy(5)
    spy(6)
    // pass
    spy.just.wasCalledWith(6).returned(8)
  })
})
~~~

### Auto

With an autorun harness, you can easily implement the "test is the program" paradigm:

~~~js
import { test } from 'zorax'

test('ok', t => {
  debugger
  t.ok(true, 'all good')
})
~~~

Run it:

~~~bash
node -r esm ok.spec.js
~~~

Debug it with no further ado: :heart:

~~~bash
node -r esm --inspect-brk ok.spec.js
~~~

Auto can be disabled, to let you or your test runner take control for more advanced use cases. Vroom.

~~~js
// NOTE harness is the default zorax harness (the one providing `test` etc)
import { harness } from 'zorax'

harness.auto(false)

// imaginary helper (returns Promise)
afterRegister()
  .then(() => {
    harness.report()
  })
  .catch(err => {
    console.error(err)
  })
~~~

## Usage

General instructions for usage of Zorax.

Detailed instructions for each feature are found (will be, when complete...) in the docs for the [relevant plugin](#features--plugins).

The plugin system and plugins anatomy are described in [`zorax.plug`'s docs](./docs/plug.md).

### Use the default harness

You can do that for an extra fast start.

~~~js
import { test, describe } from 'zorax'

describe('zorax', () => {
  test.only('is an opinionated testing library', t => {
    const macro = (t, expected) => {
      t.ok(true, expected, 'should be true')
    }
    t.test(macro, true)
    t.test(macro, false)
  })
})
~~~

... but it is not really recommended.

It's better to import the root test functions from a file you control. It'll save you some rewire when you'll inevitably need to customize your test harness.

~~~js
// --- mytest.spec.js ---

import { test, describe } from './index.js' // for example (I suggest @@ ^^)

// awesome tests and all...
~~~

`index.js` (again, for example) can start as simple as this:

~~~js
// --- test/index.js ---

// resist `export *`! it's not worth the tiny effort it would save now
export { test, describe, plug } from 'zorax'
~~~

Re-exporting from `zorax` gives you a central test harness that you control. You can later extend upon it, by adding plugins to Zorax's default harness, or composing a whole harness of your own with `zorax.plug`.

### Plug in default harness

All `zorax.plug` harnesses, including Zorax's default one, have a `plug` function to further extend a subset of your tests with new plugins.

The `plug` function returns a "harness proxy". It's the same as the real root harness, except that it has no reporting capability (i.e. no `report` method, no `pass` prop, etc.). And also, it has the extra plugins!

You can export the `plug` of your custom harness, to let tests further customize locally according to their specific needs.

~~~js
// --- test/index.js ---

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

Yet you still benefit from being attached to the central harness, making for easy central reporting:

~~~json
  "test": "node -r esm test/*.spec.js",
~~~

... and, still, local reporting, since your test is its own program!

~~~bash
node -r esm test/foo.spec.js
~~~

### Or compose one from scratch

~~~js
// test/index.js
import { createHarness } from 'zorax/lib/plug'
import auto from 'zorax/lib/auto'

// it's the default zorax harness, so it already has auto, defer, etc.
export const { test, describe, plug } = createHarness(
  // config (as usual)
  { ... },
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
