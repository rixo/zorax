# `zorax.spy`

> Lean & slick function spy for the no-bullshit testing library.

Zora is fast. Zora gives you the essential tools you need, yet keeps its API postcard sized. You learn it in 1h. You've mastered it in 2. The rest of your resources remains available for the hard task of writing good tests.

This helper aims to provide the same for your test spy.

- **to the point**: track calls, arguments (in), and return values (out)

- **open**: exposes calls, inputs and outputs as arrays, so you can use your available assert library for custom scenarios

- **practical**: assert on calls, with input arguments, and returned values, for terse & expressive test code (yes, **semantic** too!)

- **easy**: 2-functions fully functional basic assertion API (`hasBeenCalled` / `wasCalled` -- maybe 4, depends on how you count...)

- **frugal**: just the right minimal amount of sugar

- **free bonus!** smooth "assert along" (stateful) API

- **free bonus!** prettier friendly aliases

## Usage

~~~js
import { createHarness } from 'zorax'
import withSpy from 'zorax/spy'

const { test } = createHarness([withSpy()])

test('assertions', t => {
  const spy = t.spy(() => 'bar')
  spy.hasBeenCalled(0)
  spy('foo')
  spy.hasBeenCalled(1)
  spy.wasCalled(0, ['foo'], 'bar')
})

test('assert along', t => {
  const spy = t.spy(() => 'bar')
  spy('foo')
  spy.wasCalledWith('foo').returned('bar')
})

test('custom assertions', t => {
  const spy = t.spy(() => 'bar')
  t.eq(spy.calls.length, 0)
  spy('foo')
  t.eq(spy.calls.length, [['foo'], 'bar'])
  t.eq(spy.args, ['foo'])
  t.eq(spy.returns, 'bar')
  // std style
  t.eq(spy.calls[0][1], 'bar')
})
~~~

## API

### Spy

~~~ts
t.spy: (handler?: Function) => Function
~~~

Create a spy:

~~~js
// simple spy
const spy = t.spy()

// spy with handler
const spy = t.spy(x => x + x)
~~~

### Exposed properties: `calls`, `args`, `returns`

Arguments are encoded as an array of values (e.g. `['foo', 'bar']`).

A return value is encoded as a single value (e.g. `42`).

A call is encoded as an array (a tuple?) of the form `[[...in], out]` (e.g. `[['foo'], 42]`).

~~~js
const spy = t.spy(() => 42)

spy('foo')

t.eq(spy.calls, [
  [['foo'], 42], // [[...in], out]
])

t.eq(spy.args, ['foo'])

t.eq(spy.returns, [42])
~~~

### Assertions: `hasBeenCalled`, `wasCalled`

#### Global

~~~js
// assert number of calls
spy.hasBeenCalled(1)

spy.hasBeenCalled(1).with(['foo'], ['bar']).returned(42, 43)

spy.hasBeenCalled(
  [['foo'], 42], // [[...in], out],
  [['bar'], 43], // [[...in], out],
)
~~~

### About a specific call

~~~js
// assert, for call at index, args and return value (compact)
spy.wasCalled(0, ['foo'], 42)

// same, more natural
spy.wasCalled(0).with('foo').returned(42)

// skip asserting args
spy.wasCalled(0).returned(42)

// ... or return value
spy.wasCalled(0).with('foo')
~~~

### Stateful assertions: "assert along"

A lean syntax to let you track calls as they happen.

`spy.wasCalled()` with no arguments asserts that the spy was invoked once and only once since the last call to `wasCalled()` with no arguments, or the spy creation, and optionally asserts arguments and/or return value.

~~~js
const spy = t.spy(() => 'world')

// NOTE this one you wouldn't need in real life, it's just for demo
spy.wasCalled() // fails: expected invocation has not happened

spy('hello')
spy.wasCalled().with('hello').returned('world')

spy('alo')
spy.wasCalled().with('alo').returned('world')

spy.wasCalled() // fails: pass only once per spy invocation
~~~

The verbose alternative (they run exactly the same assertions):

~~~js
// verbose alternative:
const spy = t.spy(() => 'world')

spy.hasBeenCalled(1) // fails: expected invocation has not happened

spy('hello')
spy.hasBeenCalled(1) // this is the assert wasCalled() gives you for free
spy.wasCalled(0).with('hello').returned('world')

spy('alo')
spy.hasBeenCalled(2)
spy.wasCalled(1).with('alo').returned('world')

spy.wasCalled(2) // fails: pass only once per spy invocation
~~~

As with the classic API, you can assert about only args or return value:

~~~js
spy.wasCalled().with('foo')

// in real code this one would fail because wasCalled() has been consumed above
spy.returned(42)

// you can also do that, if you want
spy.returned(42).with('foo')
~~~

#### `.just.` modifier

Note that the stateful API tracks calls from the spy creation, and must "see" (i.e. be called) once after every spy invocation, or it fails.

This can be bypassed with the `.just.` modifier, that sets the stateful cursor to the last invocation of the spy function.

~~~js
const spy = t.spy(() => 42)

spy('foo')
spy('bar')

spy.wasCalled().with('bar') // fails: unexpected 'foo' call

spy.just.wasCalled().with('bar') // pass
~~~

### Prettier friendly syntax

Just a handful of aliases to make your assertions a tad more expressive (and keeps Prettier from formatting your assertion like a pipe, without having to pepper your test code with `// prettier-ignore` comments...)!

#### Classic api: `.first.`, `.last.`, `.o.o.x.`

~~~js
// alias: spy.wasCalled(0).with('foo').returned(42)
spy.first.wasCalledWith('foo').returned(42)
spy.first.returned(42).with('foo')

// alias: spy.wasCalled(spy.calls.length - 1).with('foo').returned(42)
spy.last.wasCalledWith('foo').returned(42)
spy.last.returned(42).with('foo')

// arbitrary: 2nd call
spy('bar')
// alias: spy.wasCalled(1).with(42).returned('bar')
spy.o.x.wasCalledWith('bar').returned(42)

// arbitrary: 3rd call
spy(null)
// alias: spy.wasCalled(2).with(null).returned('bar')
spy.o.o.x.wasCalledWith(null).returned(42)
~~~

#### Assert along API: `wasCalledWith`

~~~js
const spy = t.spy(() => 'world')

spy('hello')
// alias for: spy.wasCalled().with('hello').returned('world')
spy.wasCalledWith('hello').returned('world')

spy('alo')
spy.wasCalledWith('alo').returned('world') // kept on 1 line by Prettier
~~~

### Helper: `t.spies`

Useful when you need many spies, but especially when you want to wrap a callback "in place". This allows for testing code that is more analog to its prod counterpart, making it easier to reason about the test.

~~~js
const spies = t.spies()

const callWith = (arg, fn) => fn(arg)

const foo = spies.foo(() => 42)
const bar = spies.bar(() => 'bar')

foo('oof')
foo('rab')

t.eq(spies.foo.calls, [[['oof'], 42]])
t.eq(spies.bar.calls, [[['rab'], 'bar']])

// in place wrapping
fs.exists('/tmp', spies.exists())
// ... do things ...
spies.exists.wasCalledWith(true).returned(undefined)

// wrapping of a test context (happens a lot in testing tools dev!)
const spies = t.spies()
z.test('test under test', spies.main(z => {
  z.test('sub', spies.sub(z => {
    z.test('subsub', spies.subsub(z => { ... }))
  }))
}))

// alternatives without spies can be hard to parse...
const subsub = t.spy(spies.subsub(z => { ... }))
const sub = t.spy(spies.sub(z => {
    z.test('subsub', subsub)
  }))
const main = t.spy(z => {
  z.test('sub', sub)
})
z.test('test under test', main)
~~~

By default, `spies` uses an ES `Proxy`, allowing it to discover spy names as they are requested. If you need to run in a environment that doesn't support `Proxy`, you can pass the prop names at creation time to avoid them:

~~~js
const spies = t.spies('foo', 'bar', 'baz')

const foo = spies.foo(() => 42)
foo('what?')
foo.wasCalledWith('foo').returned(42)

const crash = spies.crash() // this one not available (not a function error)
~~~
