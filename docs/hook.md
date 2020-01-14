# zorax/hook

## test

~~~js
t.test(desc, meta, spec, ...data)

// basic
t.test('', t => {})

// async
t.test('', async t => {})

// flags (for filter)
t.test('', ['e2e'])

// macro
t.test('', async (t, ...data) => {}, ...data)

// multiple macros
t.test('', [macroA, macroB], ...data)

// plugins
t.test('', { test: (t, opts) => void }, spec)

t.test(
  '', // desc
  [
    (t, ...data) => {}, // macro
    { test: (t, opts) => void, macro: (t, ...data) => {} }, // plugin
    'e2e', // flag
  ],
  spec, // spec function
  ...data, // macro data
)
~~~

## createHarness

~~~js
// createHarness(options, ...plugins)
createHarness({ plugins, ...options })
createHarness(options, [...plugins])
createHarness([...plugins])
~~~

## createHarnessFactory

~~~js
createHarnessFactory({ plugins, ...defaultOptions })
createHarnessFactory([...plugins])
~~~

## Plugins

~~~js
{
  factory: (createHarness, opts) => createHarness, // MAYBE
  options: opts => opts,
  harness: (t, opts) => void,
  test: (t, opts) => void,
  macro: async (t, ...data) => void,
  flag: ['e2e', 'zorax'], // or "tag"?
}

// tag plugin
const tag = (...tags) => {
  tag: (t, opts) => {
    for (const tag of tags) {
      t.tags.add(tag)
    }
  }
}
~~~
