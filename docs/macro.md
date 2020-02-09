# `zorax/macro`

~~~js
t.test(desc, spec)
t.test(desc, macro, ...data)
t.test(desc, macro, macro, ...data)
t.test(macro, ...data)
t.test(macro, macro, ...data)
t.test(desc, [...plugins], macro)

t.test(desc, meta, spec)
t.test(desc, meta, macro, ...data)
t.test(desc, [plugin, macro], macro, ...data)
t.test(desc, macro, macro, ...data)

const foobar = (t, input, expected) => {
  t.eq(input + input, expected)
}

t.test('foo', foobar, 'foo', 'foobar')
t.test('bar', foobar, 'bar', 'barbar')

const add = (t, input, expected) => {
  t.eq(eval(input), expected)
}

add.title = (providedTitle = '', input, expected) =>
  `${providedTitle} ${input} = ${expected}`.trim()

t.test(add, '1 + 1', 2)
t.test(add, '1 + 2', 3)
~~~

### Title

~~~js
macro.title = (providedTitle = '', input, expected) =>
  `${providedTitle} ${input} = ${expected}`.trim()
~~~

### Recipe: Chaining macros

Zorax has no special support for chaining macros, but you can do it naturally by writing your macro as a middleware.

~~~js
const macroA = (t, next, ...data) => next(t, ...data)

const macroB = (t, input, expected) => {...}

macroB.title = (providedTitle = '', input) => `${providedTitle} ${input}`.trim()

// IMPORTANT title will only be searched in first macro function
//
// That means you need to "proxy" title to the next function, if you want title
// to be handled further down the line.
//
macroA.title = (providedTitle, next, ...data) => next.title(providedTitle, ...data)

t.test(macroA, macroB, input, expected)
~~~
