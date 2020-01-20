import { test, describe } from 'zorax'

import { createHarness } from '@/lib/plug'
import withDefer from '@/lib/defer'
import withGroup from '@/lib/group.defer'

describe(__filename)

const yep = () => true

const isAssertionMessage = ({ type }) => type === 'ASSERTION'

const isBailOut = ({ type }) => type === 'BAIL_OUT'

const arrayReporter = ({ filter = yep, error = isBailOut } = {}) => {
  const messages = []
  const reporter = async stream => {
    for await (const msg of stream) {
      if (filter(msg)) {
        messages.push(msg)
      } else if (error(msg)) {
        // eslint-disable-next-line no-console
        console.error(msg.data)
      }
    }
  }
  return Object.assign(reporter, { reporter, messages })
}

const createHarnessWithGroup = () => createHarness([withDefer(), withGroup()])

test('ok', t => {
  t.pass()
})

test('', t => {
  createHarnessWithGroup()
  t.pass()
})

describe('collected assertions', () => {
  const testAssertions = (
    desc,
    run,
    expectedDescriptions,
    { test: _test = test } = {}
  ) => {
    return _test(desc, async t => {
      const z = createHarnessWithGroup()

      await run(z)

      const { reporter, messages } = arrayReporter({
        filter: isAssertionMessage,
      })

      await z.report(reporter)

      // console.log(messages)
      // console.log(
      //   messages.map(x => [x.offset, x.data.description, x.data.pass])
      // )
      // // process.exit()

      t.eq(
        messages.map(x => [x.offset, x.data.description, x.data.pass]),
        expectedDescriptions
      )
    })
  }

  testAssertions.only = (...args) =>
    testAssertions(...args, { test: test.only })

  testAssertions(
    'in normal tests',
    // NOTE this test should probably be synchronzied with await
    z => {
      z.test('top level test', z => {
        z.ok(true)
        z.test('passing sub', z => {
          z.ok(true)
        })
        z.test('sub test', z => {
          z.ok(false, 'oops')
        })
      })
    },
    [
      [1, 'should be truthy', true],
      [2, 'should be truthy', true],
      [1, 'passing sub', true],
      [2, 'oops', false],
      [1, 'sub test', false],
      [0, 'top level test', false],
    ]
  )

  testAssertions(
    'in nested group',
    // NOTE this test should probably be synchronzied with await
    z => {
      z.group('g1', () => {
        z.group('g2', () => {
          z.test('t1', z => {
            z.ok(true)
          })
        })
      })
    },
    [
      [3, 'should be truthy', true],
      [2, 't1', true],
      [1, 'g2', true],
      [0, 'g1', true],
    ]
  )

  testAssertions(
    'in passing top level group',
    z => {
      z.group('top level group', () => {
        z.test('test 1', z => {
          z.ok(true, 'ok 1')
        })
      })
    },
    [
      [2, 'ok 1', true],
      [1, 'test 1', true],
      [0, 'top level group', true],
    ]
  )

  testAssertions(
    'in failing top level group',
    z => {
      z.group('top level group', () => {
        z.test('test 1', z => {
          z.ok(false, 'ok 1')
        })
      })
    },
    [
      [2, 'ok 1', false],
      [1, 'test 1', false],
      [0, 'top level group', false],
    ]
  )

  testAssertions(
    'kitchen sink',
    // NOTE this test should probably be synchronzied with await
    z => {
      z.test('top level test', z => {
        z.ok(true, 'topok')
        z.test('passing sub', z => {
          z.ok(true, 'subok')
        })
        z.test('failing sub', z => {
          z.ok(false, 'oops')
        })
      })

      z.test('second', () => {})

      z.group('bim', () => {
        z.test('third', () => {})
        z.test('fourth', z => {
          z.ok(true, 'ok 4th')
        })
      })

      z.group('other group', () => {
        z.group('nested group', () => {
          z.test('zz', z => {
            z.ok(false, 'zz: oops')
            z.ok(true, 'zz: doh!')
          })
        })
      })
    },
    [
      [1, 'topok', true],
      [2, 'subok', true],
      [1, 'passing sub', true],
      [2, 'oops', false],
      [1, 'failing sub', false],
      [0, 'top level test', false],
      [0, 'second', true],
      [1, 'third', true],
      [2, 'ok 4th', true],
      [1, 'fourth', true],
      [0, 'bim', true],
      [3, 'zz: oops', false],
      [3, 'zz: doh!', true],
      [2, 'zz', false],
      [1, 'nested group', false],
      [0, 'other group', false],
    ]
  )

  // testAssertions(
  //   'group nested in sub test',
  //   z => {
  //     z.test('top lvl tst', z => {
  //       z.it('craacks', z => {
  //         z.ok(true)
  //       })
  //     })
  //   },
  //   [
  //     [1, 'should be truthy', true],
  //     [0, 'top lvl tst', true],
  //   ]
  // )
})
