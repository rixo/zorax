import { test, describe } from '../index.js'

import Parser, { parseCommandSpec } from '../../lib/watch/interactive.js'

test('Parser(commands)', t => {
  const parser = Parser(['--flag'])

  const setOptions = t.spy()
  const { handle } = parser.handler({ setOptions })

  t.isFunction(handle)

  handle('--flag')

  setOptions.wasCalledWith({ flag: true }, true)
})

describe('parseCommandSpec', () => {
  const macro = (t, input, expected) => {
    const actual = parseCommandSpec(input)
    t.eq(actual, {
      shortOpt: undefined,
      longOpt: undefined,
      short: undefined,
      long: undefined,
      ...expected,
    })
  }

  macro.title = (title, input) => title || input

  const bool = (t, input, expected) =>
    macro(t, input, {
      arg: false,
      ...expected,
    })

  bool.title = macro.title

  const single = (t, input, expected) =>
    macro(t, input, {
      arg: true,
      multiple: false,
      optional: false,
      ...expected,
    })

  single.title = macro.title

  const multiple = (t, input, expected) =>
    macro(t, input, {
      arg: true,
      multiple: true,
      optional: false,
      ...expected,
    })

  multiple.title = macro.title

  const optional = (t, input, expected) =>
    macro(t, input, {
      arg: true,
      multiple: false,
      optional: true,
      ...expected,
    })

  optional.title = macro.title

  const optionalMultiple = (t, input, expected) =>
    macro(t, input, {
      arg: true,
      multiple: true,
      optional: true,
      ...expected,
    })

  optionalMultiple.title = macro.title

  describe('bool', () => {
    test(bool, '-f', {
      shortOpt: '-f',
      short: 'f',
    })

    test(bool, '--foo', {
      longOpt: '--foo',
      long: 'foo',
    })

    test(bool, '-f, --foo', {
      shortOpt: '-f',
      short: 'f',
      longOpt: '--foo',
      long: 'foo',
    })

    test('white spaces', bool, ' -f ,  --foo ', {
      shortOpt: '-f',
      short: 'f',
      longOpt: '--foo',
      long: 'foo',
    })
  })

  describe('single', () => {
    test(single, '-f <val>', {
      shortOpt: '-f',
      short: 'f',
    })

    test(single, '--foo <val>', {
      longOpt: '--foo',
      long: 'foo',
    })

    test(single, '-f, --foo <val>', {
      shortOpt: '-f',
      short: 'f',
      longOpt: '--foo',
      long: 'foo',
    })

    test('white spaces', single, ' -f ,  --foo  <val> ', {
      shortOpt: '-f',
      short: 'f',
      longOpt: '--foo',
      long: 'foo',
    })
  })

  describe('multiple', () => {
    test(multiple, '-f <val...>', {
      shortOpt: '-f',
      short: 'f',
    })

    test(multiple, '--foo <val...>', {
      longOpt: '--foo',
      long: 'foo',
    })

    test(multiple, '-f, --foo <val...>', {
      shortOpt: '-f',
      short: 'f',
      longOpt: '--foo',
      long: 'foo',
    })

    test('white spaces', multiple, ' -f ,  --foo  <val...> ', {
      shortOpt: '-f',
      short: 'f',
      longOpt: '--foo',
      long: 'foo',
    })
  })

  describe('optional multiple', () => {
    test(optionalMultiple, '-f [val...]', {
      shortOpt: '-f',
      short: 'f',
    })

    test(optionalMultiple, '--foo [val...]', {
      longOpt: '--foo',
      long: 'foo',
    })

    test(optionalMultiple, '-f, --foo [val...]', {
      shortOpt: '-f',
      short: 'f',
      longOpt: '--foo',
      long: 'foo',
    })

    test('white spaces', optionalMultiple, ' -f ,  --foo  [val...] ', {
      shortOpt: '-f',
      short: 'f',
      longOpt: '--foo',
      long: 'foo',
    })
  })
})

describe('default import: interactiveParser', () => {
  const macro = (
    t,
    commands,
    specs = [],
    { initialOptions = { fooBar: 'FB' }, ...config } = {}
  ) => {
    const parser = Parser(commands, config)

    const setOptions = t.spy()

    const options = { ...initialOptions }

    const logValue = t.spy()

    const { handle } = parser.handler({
      setOptions,
      options,
      initialOptions,
      logValue,
    })

    if (typeof specs === 'function') {
      specs(t, { handle, setOptions, initialOptions, logValue })
      return
    }

    for (const [cmd, opts, run = true] of specs) {
      const result = handle(cmd)
      t.is(result, true, `${cmd}: should have been handled`)
      setOptions.wasCalled(`${cmd}: setOptions`).with(opts, run)
      const last = setOptions.args.length - 1
      if (last < 0) continue
      t.eq(
        Object.keys(setOptions.args[last][0]),
        Object.keys(opts),
        'setOptions was called with expected keys'
      )
    }
  }

  const ask = (t, commands, specs, config) =>
    macro(
      t,
      commands,
      (t, { handle, logValue, setOptions }) => {
        for (const [cmd, value] of Object.entries(specs)) {
          handle(cmd)
          logValue.wasCalled(`${cmd}: logValue`).with(value)
        }
        setOptions.hasBeenCalled(0)
      },
      config
    )

  ask.title = macro.title = (title, [cmd0]) => title || cmd0

  describe('boolean: -x, --foo', () => {
    test(
      'simple long',
      macro, //
      ['--foo'],
      [['--foo', { foo: true }]]
    )

    test(
      'handle returns false when there is no match',
      macro, //
      ['--foo'],
      (t, { handle, setOptions }) => {
        const result = handle('--bar')
        t.is(result, false)
        setOptions.hasBeenCalled(0)
      }
    )

    test(
      'camel case',
      macro, //
      ['--foo-bar'],
      [['fooBar', { fooBar: true }]]
    )

    test(
      'short',
      macro, //
      ['-f, --foo-bar'],
      [
        ['-f', { fooBar: true }],
        ['f', { fooBar: true }],
      ]
    )

    test(
      'option: opt',
      macro, //
      [['--foo', { opt: 'fooBar' }]],
      [['--foo', { fooBar: true }]]
    )

    test(
      'short only',
      macro, //
      [['-f', { opt: 'foo' }]],
      [['-f', { foo: true }]]
    )

    test(
      'shortcut',
      macro, //
      ['-f, --foo-bar'],
      [['f', { fooBar: true }]]
    )

    test(
      'ask?',
      ask, //
      ['-f, --foo-bar'],
      { '-f?': 'FB', '--foo-bar?': 'FB', 'f?': 'FB', 'fooBar?': 'FB' }
    )

    test(
      'set',
      macro, //
      ['-f, --foo-bar'],
      [
        ['-f', { fooBar: true }],
        ['--foo-bar', { fooBar: true }],
        ['f', { fooBar: true }],
        ['fooBar', { fooBar: true }],
      ]
    )

    test(
      'unset!',
      macro, //
      ['-f, --foo-bar'],
      [
        ['-f!', { fooBar: false }],
        ['--foo-bar!', { fooBar: false }],
        ['--no-f', { fooBar: false }],
        ['--no-foo-bar', { fooBar: false }],
        ['f!', { fooBar: false }],
        ['fooBar!', { fooBar: false }],
      ]
    )

    test(
      'reset!!',
      macro, //
      ['-f, --foo-bar'],
      [
        ['-f!!', { fooBar: 'FB' }],
        ['--foo-bar!!', { fooBar: 'FB' }],
        ['f!!', { fooBar: 'FB' }],
        ['fooBar!!', { fooBar: 'FB' }],
      ]
    )
  })

  describe('multiple: -x, --foo <values...>', () => {
    test(
      'no args: error',
      macro, //
      ['-f, --foo-bar <values...>'],
      (t, { handle }) => {
        const aliases = ['-f', '--foo-bar', 'f', 'fooBar']
        for (const alias of aliases) {
          t.throws(() => handle(alias), 'fooBar: value required', alias)
        }
      }
    )

    test(
      'ask?',
      ask, //
      ['-f, --foo-bar <values...>'],
      {
        '-f?': 'FB',
        '--foo-bar?': 'FB',
        'f?': 'FB',
        'fooBar?': 'FB',
      }
    )

    test(
      'push',
      macro, //
      ['-f, --foo-bar <values...>'],
      [
        ['-f 42', { fooBar: ['FB', '42'] }],
        ['--foo-bar 42', { fooBar: ['FB', '42'] }],
        ['f 42', { fooBar: ['FB', '42'] }],
        ['fooBar 42', { fooBar: ['FB', '42'] }],
      ]
    )

    test(
      'rm!',
      macro, //
      ['-f, --foo-bar <values...>'],
      [
        ['-f!', { fooBar: undefined }],
        ['--foo-bar!', { fooBar: undefined }],
        ['f!', { fooBar: undefined }],
        ['fooBar!', { fooBar: undefined }],
      ]
    )

    test(
      'reset!!',
      macro, //
      ['-f, --foo-bar <values...>'],
      [
        ['-f!!', { fooBar: 'FB' }],
        ['--foo-bar!!', { fooBar: 'FB' }],
        ['f!!', { fooBar: 'FB' }],
        ['fooBar!!', { fooBar: 'FB' }],
      ]
    )

    test(
      'rm! push',
      macro, //
      ['-f, --foo-bar <values...>'],
      [
        ['-f! 42', { fooBar: ['42'] }],
        ['--foo-bar! 42', { fooBar: ['42'] }],
        ['f! 42', { fooBar: ['42'] }],
        ['fooBar! 42', { fooBar: ['42'] }],
      ]
    )

    test(
      'reset!! push',
      macro, //
      ['-f, --foo-bar <values...>'],
      [
        ['-f!! 43', { fooBar: ['FB', '43'] }],
        ['--foo-bar!! 43', { fooBar: ['FB', '43'] }],
        ['f!! 43', { fooBar: ['FB', '43'] }],
        ['fooBar!! 43', { fooBar: ['FB', '43'] }],
      ]
    )

    test(
      'pop',
      macro, //
      ['-f, --foo-bar <values...>'],
      [
        ['f--', { fooBar: [1, 2] }],
        ['fooBar--', { fooBar: [1, 2] }],
      ],
      { initialOptions: { fooBar: [1, 2, 3] } }
    )

    test(
      'pop last',
      macro, //
      ['-f, --foo-bar <values...>'],
      [
        ['f--', { fooBar: undefined }],
        ['fooBar--', { fooBar: undefined }],
      ],
      { initialOptions: { fooBar: [] } }
    )
  })

  describe('single: -x, --foo <values>', () => {
    test(
      'ask?',
      ask, //
      ['-f, --foo-bar <value>'],
      {
        '-f?': 'FB',
        '--foo-bar?': 'FB',
        'f?': 'FB',
        'fooBar?': 'FB',
      }
    )

    test(
      'no args: error',
      macro, //
      ['-f, --foo-bar <values...>'],
      (t, { handle }) => {
        const aliases = ['-f', '--foo-bar', 'f', 'fooBar']
        for (const alias of aliases) {
          t.throws(() => handle(alias), 'fooBar: value required', alias)
        }
      }
    )

    test(
      'set',
      macro, //
      ['-f, --foo-bar <value>'],
      [
        ['-f 42', { fooBar: '42' }],
        ['--foo-bar 42', { fooBar: '42' }],
        ['f 42', { fooBar: '42' }],
        ['fooBar 42', { fooBar: '42' }],
      ]
    )

    test(
      'rm!',
      macro, //
      ['-f, --foo-bar <value>'],
      [
        ['-f!', { fooBar: undefined }],
        ['--foo-bar!', { fooBar: undefined }],
        ['f!', { fooBar: undefined }],
        ['fooBar!', { fooBar: undefined }],
      ]
    )

    test(
      'reset!!',
      macro, //
      ['-f, --foo-bar <value>'],
      [
        ['-f!!', { fooBar: 'FB' }],
        ['--foo-bar!!', { fooBar: 'FB' }],
        ['f!!', { fooBar: 'FB' }],
        ['fooBar!!', { fooBar: 'FB' }],
      ]
    )

    test(
      'rm! set',
      macro, //
      ['-f, --foo-bar <value>'],
      [
        ['-f! 42', { fooBar: '42' }],
        ['--foo-bar! 42', { fooBar: '42' }],
        ['f! 42', { fooBar: '42' }],
        ['fooBar! 42', { fooBar: '42' }],
      ]
    )

    test(
      'reset!! set',
      macro, //
      ['-f, --foo-bar <value>'],
      [
        ['-f!! 43', { fooBar: '43' }],
        ['--foo-bar!! 43', { fooBar: '43' }],
        ['f!! 43', { fooBar: '43' }],
        ['fooBar!! 43', { fooBar: '43' }],
      ]
    )
  })

  describe('optional multiple: -x, --foo [values...]', () => {
    test(
      'ask?',
      ask, //
      ['-f, --foo-bar [values...]'],
      {
        '-f?': 'FB',
        '--foo-bar?': 'FB',
        'f?': 'FB',
        'fooBar?': 'FB',
      }
    )

    test(
      'no args: set []',
      macro, //
      ['-f, --foo-bar [values...]'],
      [
        ['-f', { fooBar: [] }],
        ['--foo-bar', { fooBar: [] }],
        ['f', { fooBar: [] }],
        ['fooBar', { fooBar: [] }],
      ]
    )

    test(
      'push',
      macro, //
      ['-f, --foo-bar [values...]'],
      [
        ['-f 42', { fooBar: ['FB', '42'] }],
        ['--foo-bar 42', { fooBar: ['FB', '42'] }],
        ['f 42', { fooBar: ['FB', '42'] }],
        ['fooBar 42', { fooBar: ['FB', '42'] }],
      ]
    )

    test(
      'rm!',
      macro, //
      ['-f, --foo-bar [values...]'],
      [
        ['-f!', { fooBar: undefined }],
        ['--foo-bar!', { fooBar: undefined }],
        ['f!', { fooBar: undefined }],
        ['fooBar!', { fooBar: undefined }],
      ]
    )

    test(
      'reset!!',
      macro, //
      ['-f, --foo-bar [values...]'],
      [
        ['-f!!', { fooBar: 'FB' }],
        ['--foo-bar!!', { fooBar: 'FB' }],
        ['f!!', { fooBar: 'FB' }],
        ['fooBar!!', { fooBar: 'FB' }],
      ]
    )

    test(
      'rm! push',
      macro, //
      ['-f, --foo-bar [values...]'],
      [
        ['-f! 42', { fooBar: ['42'] }],
        ['--foo-bar! 42', { fooBar: ['42'] }],
        ['f! 42', { fooBar: ['42'] }],
        ['fooBar! 42', { fooBar: ['42'] }],
      ]
    )

    test(
      'reset!! push',
      macro, //
      ['-f, --foo-bar [values...]'],
      [
        ['-f!! 43', { fooBar: ['FB', '43'] }],
        ['--foo-bar!! 43', { fooBar: ['FB', '43'] }],
        ['f!! 43', { fooBar: ['FB', '43'] }],
        ['fooBar!! 43', { fooBar: ['FB', '43'] }],
      ]
    )

    test(
      'pop',
      macro, //
      ['-f, --foo-bar [values...]'],
      [
        ['f--', { fooBar: [1, 2] }],
        ['fooBar--', { fooBar: [1, 2] }],
      ],
      { initialOptions: { fooBar: [1, 2, 3] } }
    )

    test(
      'pop last',
      macro, //
      ['-f, --foo-bar [values...]'],
      [
        ['f--', { fooBar: undefined }],
        ['fooBar--', { fooBar: undefined }],
      ],
      { initialOptions: { fooBar: [] } }
    )
  })

  describe('-x, --foo [value]', () => {
    test(
      'ask?',
      ask, //
      ['-f, --foo-bar [value]'],
      {
        '-f?': 'FB',
        '--foo-bar?': 'FB',
        'f?': 'FB',
        'fooBar?': 'FB',
      }
    )

    test(
      'no args: set true',
      macro, //
      ['-f, --foo-bar [value]'],
      [
        ['-f', { fooBar: true }],
        ['--foo-bar', { fooBar: true }],
        ['f', { fooBar: true }],
        ['fooBar', { fooBar: true }],
      ]
    )

    test(
      'set',
      macro, //
      ['-f, --foo-bar [value]'],
      [
        ['-f 42', { fooBar: '42' }],
        ['--foo-bar 42', { fooBar: '42' }],
        ['f 42', { fooBar: '42' }],
        ['fooBar 42', { fooBar: '42' }],
      ]
    )

    test(
      'rm!',
      macro, //
      ['-f, --foo-bar [value]'],
      [
        ['-f!', { fooBar: undefined }],
        ['--foo-bar!', { fooBar: undefined }],
        ['f!', { fooBar: undefined }],
        ['fooBar!', { fooBar: undefined }],
      ]
    )

    test(
      'reset!!',
      macro, //
      ['-f, --foo-bar [value]'],
      [
        ['-f!!', { fooBar: 'FB' }],
        ['--foo-bar!!', { fooBar: 'FB' }],
        ['f!!', { fooBar: 'FB' }],
        ['fooBar!!', { fooBar: 'FB' }],
      ]
    )

    test(
      'rm! set',
      macro, //
      ['-f, --foo-bar [value]'],
      [
        ['-f! 42', { fooBar: '42' }],
        ['--foo-bar! 42', { fooBar: '42' }],
        ['f! 42', { fooBar: '42' }],
        ['fooBar! 42', { fooBar: '42' }],
      ]
    )

    test(
      'reset!! set',
      macro, //
      ['-f, --foo-bar [value]'],
      [
        ['-f!! 43', { fooBar: '43' }],
        ['--foo-bar!! 43', { fooBar: '43' }],
        ['f!! 43', { fooBar: '43' }],
        ['fooBar!! 43', { fooBar: '43' }],
      ]
    )
  })
})
