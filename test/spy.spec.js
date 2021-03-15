import { test, describe } from '@@'
import { spy, arrayReporter } from '@@/util'

import { createHarness } from '@zorax/plug'
import withSpy, { ordinal } from '@/spy'

describe('withSpy', () => {
  test('is a function', t => {
    t.isFunction(withSpy)
  })
})

test('t.spy is a function', t => {
  const z = createHarness([withSpy()])
  t.isFunction(z.spy, 'z.spy')
})

describe('t.spy()', () => {
  const z = createHarness([withSpy()])

  test('returns a function', t => {
    const run = z.spy()
    t.isFunction(run, 'z.spy() returns a function')
  })

  test('calls.length', t => {
    const run = z.spy()
    t.eq(run.calls.length, 0)
    run()
    t.eq(run.calls.length, 1)
  })

  describe('handler', () => {
    test('is hasBeenCalled', t => {
      const handler = spy()
      const run = z.spy(handler)
      t.eq(handler.calls.length, 0)
      run()
      t.eq(handler.calls.length, 1)
    })

    test('spy returns result from handler', t => {
      const o = {}
      const handler = () => o
      const run = z.spy(handler)
      const result = run()
      t.is(result, o)
    })
  })
})

describe('a spy', () => {
  const a = { name: 'a' }
  const b = { name: 'b' }
  const returns = [a, b]

  const zora_spec_fn = async (t, run, pass, expectedMessages) => {
    const z = createHarness([withSpy()])
    let i = 0
    const spy = z.spy(() => returns[i++])
    const args = [spy, t]
    if (typeof run === 'function') {
      spy('foo', 42, null)
      spy('bar')
      run(...args)
    } else {
      const { before, between, after } = run
      if (before) before(...args)
      spy('foo', 42, null)
      if (between) between(...args)
      spy('bar')
      if (after) after(...args)
    }
    // await z.report(blackHole)
    const { reporter, messages } = arrayReporter()
    await z.report(reporter)
    // await z.report() // DEBUG DEBUG DEBUG restore blackHole
    t.eq(z.pass, pass, pass ? 'should pass' : 'should fail')
    if (expectedMessages) {
      const actual = messages.filter(isFailure).map(msg => msg.data.description)
      t.eq(actual, expectedMessages)
    }
  }

  const pass = (t, handler, expectedMessages) =>
    zora_spec_fn(t, handler, true, expectedMessages)

  const isFailure = msg => msg.type === 'ASSERTION' && !msg.data.pass

  const fail = async (t, handler, expectedMessages) =>
    zora_spec_fn(t, handler, false, expectedMessages)

  const emptyRe = /^(?:.*=>\s*)?[{}\s]*$/
  const commentRe = /^\s*\/\//

  const parseFn = fn =>
    String(fn)
      .split('\n')
      .filter(line => !emptyRe.test(line) && !commentRe.test(line))
      .map(line => line.trim())
      .join(' ; ')

  pass.title = fail.title = (title, fn) =>
    title ||
    (typeof fn === 'function'
      ? parseFn(fn)
      : ['before', 'between', 'after']
          .map(hook => fn[hook] && `${hook}: ${parseFn(fn[hook])}`)
          .filter(Boolean)
          .join(' ; '))

  describe('spy.calls', () => {
    test(pass, (spy, z) => {
      z.eq(spy.calls, [
        [['foo', 42, null], a],
        [['bar'], b],
      ])
    })
  })

  describe('spy.args', () => {
    test(pass, (spy, z) => {
      z.eq(spy.args, [['foo', 42, null], ['bar']])
    })
  })

  describe('spy.returns', () => {
    test(pass, (spy, z) => {
      z.eq(spy.returns, [a, b])
    })
  })

  describe('spy.fn', () => {
    test('is the spied function', pass, (spy, z) => {
      z.eq(String(spy.fn), '() => returns[i++]')
    })
  })

  describe('spy[0]', () => {
    test(pass, (spy, t) => {
      t.eq(spy[0], [['foo', 42, null], a])
    })
    test(pass, (spy, t) => {
      t.eq(spy[0][0], ['foo', 42, null])
    })
    test(pass, (spy, t) => {
      t.eq(spy[0][1], a)
    })
  })

  describe('spy.hasBeenCalled', () => {
    describe('spy.hasBeenCalled(n)', () => {
      test(pass, spy => {
        spy.hasBeenCalled(2)
      })

      test(
        fail,
        spy => {
          spy.hasBeenCalled(0)
        },
        ['should be called 0 times']
      )

      describe('hasBeenCalled(n).with([...args0], ...)', () => {
        test(pass, spy => {
          spy.hasBeenCalled(2).with(['foo', 42, null], ['bar'])
        })

        test(
          fail,
          spy => {
            spy.hasBeenCalled(2).with(['foo', 42], ['bar'])
          },
          ["should have been called with ('foo', 42) then ('bar')"]
        )
      })

      describe('hasBeenCalled(n).returned(result0, ...)', () => {
        test(pass, spy => {
          spy.hasBeenCalled(2).returned(a, b)
        })

        test(
          fail,
          spy => {
            spy.hasBeenCalled(2).returned('foo', 'bar')
          },
          ["should have returned 'foo' then 'bar'"]
        )
      })
    })

    describe('spy.hasBeenCalled([[...in], out], ...)', () => {
      test(pass, spy => {
        spy.hasBeenCalled([['foo', 42, null], a], [['bar'], b])
      })
    })
  })

  describe('ordinal', () => {
    const isCorrectOrdinal = (t, i, expected) => {
      t.eq(ordinal(i), expected)
    }

    isCorrectOrdinal.title = (_, i, expected) => expected

    test(isCorrectOrdinal, 0, '1st')
    test(isCorrectOrdinal, 1, '2nd')
    test(isCorrectOrdinal, 2, '3rd')
    test(isCorrectOrdinal, 3, '4th')
    test(isCorrectOrdinal, 5, '6th')
  })

  describe('spy.wasCalled', () => {
    describe('spy.wasCalled(i)', () => {
      test(pass, (spy, t) => {
        const api = spy.wasCalled(0)
        t.ok(api, 'should return an api object')
        spy.wasCalled(1)
      })
      test(
        fail,
        spy => {
          spy.wasCalled(2)
        },
        ['should be called at least 3 times']
      )
    })

    describe('spy.wasCalled(i, args)', () => {
      test(pass, spy => {
        spy.wasCalled(0, ['foo', 42, null])
      })
      test(pass, spy => {
        spy.wasCalled(1, ['bar'])
      })
      test(
        fail,
        spy => {
          spy.wasCalled(0, ['bar'])
        },
        ["should be called 1st with ('bar')"]
      )
      test(
        fail,
        spy => {
          spy.wasCalled(2, 'bar')
        },
        ['should be called at least 3 times']
      )
    })

    describe('spy.wasCalled(i, args, result)', () => {
      test(pass, spy => {
        spy.wasCalled(0, ['foo', 42, null], a)
      })
      test(pass, spy => {
        spy.wasCalled(1, ['bar'], b)
      })
      test(
        fail,
        spy => {
          spy.wasCalled(1, ['bar'], undefined)
        },
        ['2nd call should return undefined']
      )
      test(
        fail,
        spy => {
          spy.wasCalled(1, ['bar'], true)
        },
        ['2nd call should return true']
      )
    })

    describe('spy.wasCalled(i).with(...args)', () => {
      test(pass, spy => {
        spy.wasCalled(0).with('foo', 42, null)
      })
      test(pass, spy => {
        spy.wasCalled(1).with('bar')
      })
      test(
        fail,
        spy => {
          spy.wasCalled(0).with('bar')
        },
        ["should be called 1st with ('bar')"]
      )
      test(
        fail,
        spy => {
          spy.wasCalled(2).with('bar')
        },
        ['should be called at least 3 times']
      )
    })

    describe('spy.wasCalled(i).returned(result)', () => {
      test(pass, spy => {
        spy.wasCalled(0).returned(a)
      })
      test(pass, spy => {
        spy.wasCalled(1).returned(b)
      })
      test(
        fail,
        spy => {
          spy.wasCalled(1).returned(undefined)
        },
        ['2nd call should return undefined']
      )
      test(
        fail,
        spy => {
          spy.wasCalled(1).returned(true)
        },
        ['2nd call should return true']
      )
    })

    describe('spy.wasCalled(i).with(...args).returned(result)', () => {
      test(pass, spy => {
        // prettier-ignore
        spy.wasCalled(0).with('foo', 42, null).returned(a)
      })
      test(pass, spy => {
        // prettier-ignore
        spy.wasCalled(1).with('bar').returned(b)
      })
      test(
        fail,
        spy => {
          // prettier-ignore
          spy.wasCalled(1).with('bar').returned(a)
        },
        ["2nd call should return { name: 'a' }"]
      )
      test(
        fail,
        spy => {
          // prettier-ignore
          spy.wasCalled(2).with('bar').returned(b)
        },
        ['should be called at least 3 times']
      )
    })

    describe('spy.wasCalled(i).returned(result).with(...args)', () => {
      test(pass, spy => {
        // prettier-ignore
        spy.wasCalled(0).returned(a).with('foo', 42, null)
      })
      test(
        fail,
        spy => {
          // prettier-ignore
          spy.wasCalled(0).returned(a).with('bar')
        },
        ["should be called 1st with ('bar')"]
      )
    })

    describe('prettier friendly API', () => {
      describe('modifier: spy.last.', () => {
        test(pass, spy => {
          spy.last.wasCalledWith('bar').returned(b)
        })
        test(pass, spy => {
          spy.last.wasCalledWith('bar').returned(b)
        })
        test(pass, spy => {
          spy.last.returned(b).with('bar')
        })
      })

      describe('modifier: spy.first.', () => {
        test(pass, spy => {
          spy.first.wasCalledWith('foo', 42, null).returned(a)
        })
        test(pass, spy => {
          spy.first.returned(a).with('foo', 42, null)
        })
      })

      describe('quantifier: spy.o.o.x.', () => {
        describe('.wasCalledWith(...args)', () => {
          test(pass, spy => {
            spy.x.wasCalledWith('foo', 42, null).returned(a)
          })
          test(pass, spy => {
            spy.o.x.wasCalledWith('bar').returned(b)
          })
          test(pass, spy => {
            spy('hi')
            spy.o.o.x.wasCalledWith('hi').returned()
          })
          test("doesn't conflict with itself (mixup state)", pass, spy => {
            spy('hi')
            spy.x.wasCalledWith('foo', 42, null).returned(a)
            spy.o.x.wasCalledWith('bar').returned(b)
            spy.o.o.x.wasCalledWith('hi').returned()
          })
        })

        describe('.returned(result)', () => {
          test(pass, spy => {
            spy.x.returned(a).with('foo', 42, null)
          })
          test(pass, spy => {
            spy.o.x.returned(b).with('bar')
          })
          test(pass, spy => {
            spy('hi')
            spy.o.o.x.returned().with('hi')
          })
          test("doesn't conflict with itself (mixup state)", pass, spy => {
            spy('hi')
            spy.x.returned(a).with('foo', 42, null)
            spy.o.x.returned(b).with('bar')
            spy.o.o.x.returned().with('hi')
          })
        })
      })
    })
  })

  describe('assert along API', () => {
    describe('spy.wasCalled().with(...args).returned(result)', () => {
      test(
        'fails when called before any invocation',
        fail,
        {
          before: spy => {
            // prettier-ignore
            spy.wasCalled()
          },
        },
        ['should have been called 1 time']
      )

      describe('fails when wasCalled is called multiple times without new invocation', () => {
        test(
          'between',
          fail,
          {
            between: spy => {
              spy.wasCalled()
              spy.wasCalled()
            },
          },
          ['should have been called 2 times']
        )
        test('after', fail, {
          after: spy => {
            spy.wasCalled()
            spy.wasCalled()
          },
        })
        test(
          'multiple failures',
          fail,
          {
            between: spy => {
              spy.wasCalled()
              spy.wasCalled()
              spy.wasCalled()
            },
          },
          ['should have been called 2 times', 'should have been called 3 times']
        )
        test('but assertions can be called multiple times', pass, {
          between: spy => {
            // prettier-ignore
            spy.wasCalled().with('foo', 42, null).with('foo', 42, null)
          },
        })
      })

      test(
        'wasCalled(msg): failed call',
        fail,
        {
          before: spy => {
            // prettier-ignore
            spy.wasCalled('alice').with('foo', 42, null).returned(b)
          },
        },
        ['spy:alice should have been called 1 time']
      )

      test(
        'wasCalled(msg): failed arguments',
        fail,
        {
          between: spy => {
            // prettier-ignore
            spy.wasCalled('alice').with('bar')
          },
        },
        ["spy:alice should be called 1st with ('bar')"]
      )

      test(
        'wasCalled(msg): failed return value',
        fail,
        {
          between: spy => {
            // prettier-ignore
            spy.wasCalled('alice').with('foo', 42, null).returned(b)
          },
        },
        ["spy:alice 1st call should return { name: 'b' }"]
      )

      test(pass, {
        between: spy => {
          // prettier-ignore
          spy.wasCalled()
          // .with('foo', 42, null).returned(b)
        },
      })
      test(pass, {
        between: spy => {
          // prettier-ignore
          spy.wasCalled().with('foo', 42, null)
        },
        after: spy => {
          spy.wasCalled().with('bar')
        },
      })
      test(pass, {
        between: spy => {
          // prettier-ignore
          spy.wasCalled().returned(a)
        },
        after: spy => {
          spy.wasCalled().returned(b)
        },
      })
      test(pass, {
        between: spy => {
          // prettier-ignore
          spy.wasCalled().with('foo', 42, null).returned(a)
        },
        after: spy => {
          // prettier-ignore
          spy.wasCalled().with('bar').returned(b)
        },
      })

      test(
        'fails when a previous invocation has not been consumed',
        fail,
        {
          after: spy => {
            // prettier-ignore
            spy.wasCalled().with('bar').returned(b)
          },
        },
        ['was called 1 time before expected']
      )

      test(
        'fails when the next invocation is asserted prematurely',
        fail,
        {
          between: spy => {
            // prettier-ignore
            spy.wasCalled().with('foo', 42, null).returned(a)
            // prettier-ignore
            spy.wasCalled().with('bar').returned(b)
          },
        },
        ['should have been called 2 times']
      )
    })

    describe('spy.wasNotCalled()', () => {
      test(pass, {
        before: spy => {
          spy.wasNotCalled()
        },
        between: spy => {
          spy.wasCalled()
          spy.wasNotCalled()
        },
        after: spy => {
          spy.wasCalled()
          spy.wasNotCalled()
        },
      })
      test(fail, {
        between: spy => {
          spy.wasNotCalled()
        },
      })
    })

    describe('spy.returned(result)', () => {
      test('reverse form', pass, {
        between: spy => {
          spy.returned(a)
        },
        after: spy => {
          spy.returned(b)
        },
      })
      test('returns chaining api', pass, {
        between: spy => {
          spy.returned(a).with('foo', 42, null)
        },
        after: spy => {
          spy.returned(b).with('bar')
        },
      })
    })

    describe('spy.wasCalledWith()', () => {
      test(pass, {
        between: spy => {
          spy.wasCalledWith('foo', 42, null)
        },
        after: spy => {
          spy.wasCalledWith('bar')
        },
      })
      test('returns chaining api', pass, {
        between: spy => {
          spy.wasCalledWith('foo', 42, null).returned(a)
        },
        after: spy => {
          spy.wasCalledWith('bar').returned(b)
        },
      })
    })

    describe('spy.wasCalledWith()', () => {
      test(pass, {
        between: spy => {
          spy.wasCalledWith('foo', 42, null)
        },
        after: spy => {
          spy.wasCalledWith('bar')
        },
      })
      test('returns chaining api', pass, {
        between: spy => {
          spy.wasCalledWith('foo', 42, null).returned(a)
        },
        after: spy => {
          spy.wasCalledWith('bar').returned(b)
        },
      })
    })

    describe('modifier: spy.just.', () => {
      test('fails without .just.', fail, spy => {
        spy('hello')
        spy.wasCalledWith('hello').returned(undefined)
      })
      test(pass, spy => {
        spy('hello')
        // prettier-ignore
        spy.just.wasCalled().with('hello').returned(undefined)
      })
      test(pass, (spy, t) => {
        spy('hello')
        // prettier-ignore
        t.throws(() => {
          spy.just.wasCalled(1)
        }, /arguments/)
      })
      test(pass, spy => {
        spy('hello')
        spy.just.wasCalledWith('hello').returned(undefined)
      })
      test(pass, spy => {
        spy('hello')
        spy.just.returned(undefined).with('hello')
      })
    })
  })

  describe('method spy', () => {
    test('prototype spy', async t => {
      const z = createHarness([withSpy()])

      class X {
        name = 'foo'
        who() {
          return this.name
        }
      }

      const spy = (X.prototype.who = z.spy(X.prototype.who))

      const x = new X()

      t.eq(spy.calls.length, 0)
      const result = x.who(123)
      t.eq(result, 'foo')
      t.eq(spy.calls, [[[123], 'foo']])
    })

    test('instance spy', t => {
      const z = createHarness([withSpy()])

      class X {
        name = 'foo'
        who() {
          return this.name
        }
      }

      const x = new X()

      const spy = (x.who = z.spy(x.who))

      t.eq(spy.calls.length, 0)
      const result = x.who(123)
      t.eq(result, 'foo')
      t.eq(spy.calls, [[[123], 'foo']])
    })
  })

  describe('spies', () => {
    test('auto', t => {
      const z = createHarness([withSpy()])

      const spies = z.spies()

      const foo = spies.foo(x => x + 'foo')
      const bar = spies.bar()

      t.isFunction(spies.foo)
      t.isFunction(spies.bar)

      t.eq(spies.foo.calls, [])
      foo('in')
      t.eq(spies.foo.calls, [[['in'], 'infoo']])

      t.eq(spies.bar.calls, [])
      bar('bin')
      t.eq(spies.bar.calls, [[['bin'], undefined]])
    })

    test('specified', t => {
      const z = createHarness([withSpy()])

      const spies = z.spies('foo', 'bar')

      const foo = spies.foo(x => x + 'foo')
      const bar = spies.bar()

      t.isFunction(spies.foo)
      t.isFunction(spies.bar)

      t.eq(spies.foo.calls, [])
      foo('in')
      t.eq(spies.foo.calls, [[['in'], 'infoo']])

      t.eq(spies.bar.calls, [])
      bar('bin')
      t.eq(spies.bar.calls, [[['bin'], undefined]])
    })
  })

  describe('await next call', () => {
    test('spy.nextCall()', async t => {
      let index = 0
      const spy = t.spy(() => index++)

      {
        let resolved = false
        let result = null
        const nextCall = spy.nextCall().then(() => {
          resolved = true
        })
        t.notOk(resolved, 'is not resolved before call')
        t.eq(result, null)
        setTimeout(() => {
          result = spy()
        })
        await nextCall
        t.ok(resolved, 'is resolved after call')
        t.eq(result, 0, 'spied function returns before next call resolves')
      }

      {
        let resolved = false
        let result = null
        const nextCall = spy.nextCall().then(() => {
          resolved = true
        })
        t.notOk(resolved, 'is not resolved before second call')
        t.eq(result, null)
        setTimeout(() => {
          result = spy()
        })
        await nextCall
        t.ok(resolved, 'is resolved after second call')
        t.eq(result, 1, 'spied function returns before next call 2 resolves')
      }
    })

    test('spy.nextCallAfter(op)', async t => {
      let index = 0
      const spy = t.spy(() => index++)

      {
        let result = null
        await spy.nextCallAfter(() => {
          result = spy()
        })
        t.eq(result, 0, 'spied function returns before next call resolves')
      }

      {
        let result = null
        await spy.nextCallAfter(() => {
          result = spy()
        })
        t.eq(
          result,
          1,
          'spied function returns before subsequent next call resolves'
        )
      }
    })

    test('spy.nextCallAfter(async op)', async t => {
      let index = 0
      const spy = t.spy(() => index++)

      {
        let result = null
        await spy.nextCallAfter(async () => {
          await new Promise(resolve =>
            setTimeout(() => {
              result = spy()
              resolve()
            })
          )
        })
        t.eq(result, 0, 'spied function returns before next call resolves')
      }

      {
        let result = null
        await spy.nextCallAfter(async () => {
          await new Promise(resolve =>
            setTimeout(() => {
              result = spy()
              resolve()
            })
          )
        })
        t.eq(
          result,
          1,
          'spied function returns before subsequent next call resolves'
        )
      }
    })
  })
})
