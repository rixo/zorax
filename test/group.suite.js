/**
 * Common test suite for group plugins.
 */

import { describe, test } from '@@'
import { arrayReporter } from '@@/util'

export default ({ createGroupHarness }) => {
  const macro = async (t, run, expectedDescriptions) => {
    const z = createGroupHarness()

    await run(z)

    const { reporter, messages } = arrayReporter()

    await z.report(reporter)

    t.eq(
      messages.map(x => [x.offset, x.data.description, x.data.pass]),
      expectedDescriptions.map(([offset, desc, pass = true]) => [
        offset,
        desc,
        pass,
      ])
    )
  }

  test(
    'in normal tests',
    macro,
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

  test(
    'in nested group',
    macro,
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

  test(
    'in passing top level group',
    macro,
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

  test(
    'in failing top level group',
    macro,
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

  test(
    'kitchen sink',
    macro,
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

  test(
    'no test is created for empty groups',
    macro,
    // NOTE this test should probably be synchronzied with await
    z => {
      // z.group('empty', () => {})
      z.group('empty with empty subs', () => {
        z.group('empty sub', () => {})
      })
      z.group('g1', () => {
        z.group('g1 empty', () => {})
        z.group('g2', () => {
          z.group('g2 empty', () => {})
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

  test(
    'no handler groups',
    macro,
    z => {
      z.group('top')
      z.group('a', () => {
        z.test('a > main', z => {
          z.ok(true, 'a > main > ok')
        })
      })
      z.group('b', () => {
        z.test('b > main', z => {
          z.ok(true, 'b > main > ok')
        })
      })
    },
    [
      [3, 'a > main > ok'],
      [2, 'a > main'],
      [1, 'a'],
      [3, 'b > main > ok'],
      [2, 'b > main'],
      [1, 'b'],
      [0, 'top'],
    ]
  )

  test(
    'no desc groups',
    macro,
    z => {
      z.group(() => {
        z.test('main', z => {
          z.test('main > sub', z => {
            z.eq(42, 42, 'main > sub > eq')
          })
        })

        z.group('sub group', () => {
          z.test('sub group > main', z => {
            z.ok(true, 'sub group > main > ok')
          })
        })
      })
    },
    [
      [2, 'main > sub > eq'],
      [1, 'main > sub'],
      [0, 'main'],
      [2, 'sub group > main > ok'],
      [1, 'sub group > main'],
      [0, 'sub group'],
    ]
  )

  describe("group('foo') with no handlers", () => {
    test("is only allowed at top level (can't be nested)", t => {
      const z = createGroupHarness()

      let done = false

      t.doesNotThrow(() => {
        z.group('top')
      })

      z.group('top 2', () => {
        t.throws(() => {
          z.group('nested')
        }, /\bcan't be nested|top level\b/)
        done = true
      })

      t.ok(done, 'test completed')
    })
  })
}
