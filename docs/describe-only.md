# zorax/describe-only

## Rules

- no top level assertions
- no assertions in describe
- describe can only be used at top level or directly (and synchronously) inside another describe
- tests at top level or directly inside a describe are "main tests"
- other tests are "sub tests"
- main tests can be only'd / grepped
- sub tests cannot be (safely) only'd

~~~js
import { test, describe } from 'zorax'

test('main test at root level', t => {
  t.test('sub test', ...)
})

describe('describe-only', () => {
  test('main test nested in describe', t => {
    t.test('nested sub test', ...)
  })

  describe('nested describe', ...)
})

// test('xxx', t => )

harness.filter('nested')
harness.filter({
  describe: 'nested',
  test: [
    '@e2e',
    // or
    t => t.flags.e2e,
  ],
})

t.test('', ['e2e'], t => {})

~~~

## Only

~~~js
describe('', () => {
  test.only()
})
~~~
