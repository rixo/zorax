# Zoar

> Very opinionated test runner for Zorax

- does not marry your tests to the test runner

- advanced support for [Zorax](https://github.com/rixo/zorax)

- interactive watch CLI

- advanced pipeability

- TODO support for raw Zora (go nag in issues if you want it)

## Main functionalities

- **find** test files by glob

- **run** tests files (by requiring them)

- **watch** & rerun

## Support features

- print test files

- filter test files by simple patterns (case-insensitive partial match on basename)

- print test titles (with `zorax.print`)

- filter tests by title (with `zorax.filter`)

- output result in fancy synthetic reporter ([zora-node-reporter](https://github.com/lorenzofox3/zora-reporters/tree/master/node)) or  TAP automatically, according to TTY / piped stdout (with `zorax`)

- easily pipe output during watch (so you can use all those fancy TAP tools while working on your tests!)

- easily pass `--inspect` and `--inspect-brk` flags to the node process running the tests

## Philosohpy

- the test is a program
  - auto start

- comfortable defaults
  - esm support
  - only true in watch mode & auto only
  - zora-node-reporter in TTY; indented tap when output is piped

- consistent API
  - composable features and repeating patterns make for a predictable, easy to learn, remember & use API

## Highlights

- supports ES modules by default (via [esm](https://github.com/standard-things/esm#readme))

- supports source maps in node (via [source-map-support](https://github.com/evanw/node-source-map-support))

- fully pipable, in and out to embrace Zora's embrace of UNIX philosophy

- hand crafted API and shortcuts

- friendly interactive CLI in watch mode: essentially, lets you rerun tests (press enter) & change command line options at runtime (e.g. print test titles, add filter, see remaining tests, add filter, back to run tests -- with filters)

- as opposed to Zora (testing library), Zoar (test runner) sets the process exit code according to the tests result (non zero for failing tests)

- Zora's only mode (or Zorax's auto only) is automatically sets to true during watch mode (because watch is only used in dev context), and can be enabled with a command line option `--only`

### Example

~~~bash
# see all options
zoar --help

# create a template .zoarrc.js file with default values
zoar --init

# run with all defaults (from config files and/or factory)
# by default: runs: **/*.spec.js, ignores: **/.git, **/node_modules
zoar

# run and watch
# by default: watch everything under the current directory (except ignores)
zoar --watch

# run a specific file
zoar test/foo.spec.js

# watch & run a specific file on change
zoar test/foo.spec.js --watch

# run multiple files
# NOTE quotes are required to avoid expansion of globs by your shell
zoar 'test/**/*.spec.js' '!test/**/*.skip.spec.js' 'src/main.test.js'

# pass --inspect or --inspect-brk flags to the node process running the tests
zoar --inspect
zoar --inspect-brk

# watch with an extra watch target (in addition to those configured in .rc)
zoar --watch '../my-other-lib/**/*.js'
# shortcut
zoar -ww '../my-other-lib/**/*.js'

# print test files instead of running them
zoar --ls

# print test titles instead of running them
zoar --print

# filter test files by simple pattern (case insensitive, partial match)
zoar --filter foo bar

# filter tests by title with simple pattern
zoar --grep foo bar

# can be combined
zoar --ls --filter foo
zoar --watch --print --grep bar

# output tap
zoar --tap
# tap output is indented by default, disable indent
zoar --tap --no-indent
# output raw Zora JSON
zoar --json

# list of test files can be piped into zoar
# NOTE no quotes this time, we rely on the shell's glob expansion!
ls test/**/*.spec.js | zoar

# zoar automatically fallback to tap output when its output is piped
zoar # uses zora-node-reporter by default
zoar | cat # outputs tap
zoar | npx tap-mocha-reporter nyan # outputs cat

# fun fact: zoar can be piped into itself
zoar --ls | zoar
# ... even in watch mode! (this works thanks to zoar ls/watch mini protocol: an
# empty line indicates the end of a batch of files in watch mode)
zoar --ls --watch | zoar

# zoar also supports internal piping, for easy watch & pipe
zoar --watch --pipe 'tap-mocha-reporter nyan'
zoar --watch --ls --pipe 'grep foo | cat > /tmp/my-test-files'
~~~

## Usage

### Install

~~~bash
npm install --dev zoar zorax
~~~

**Note** Zorax is not strictly required for Zoar. It can also run Zora tests or anything if requiring the test files is enough. But Zoar is really designed as a complement of Zorax, and it lacks many feature when used without it. (You can however build a Zoar compatible harness to your own liking from Zorax's plugins.)

### Create some test file

See [Zorax](https://github.com/rixo/zorax) for complete documentation.

~~~js
import { test, describe } from 'zorax'

describe('zoar', () => {
  test.only('pass', t => {
    t.pass('yay')
  })
  test('fail', t => {
    t.fail('hoh')
  })
  test.only('spy', t => {
    const spy = t.spy(() => 42)
    spy('foo')
    spy.wasCalledWith('foo').returned(42) // <- this is an assertion
  })
})
~~~

### Config

Zoar search in the current directory and up if it can find a `.zoarrc.js` file. If it finds one, then it takes its content as default value for its options.

An example `.zoarrc.js` file can be created in the current directory by running:

~~~bash
zoar --init
~~~

The config file looks like this:

~~~js
module.export = {
  // test files to run
  files: 'test/**/*.spec.js',
  // files to watch (in watch mode)
  watch: '**/*.js',
  // patterns to ignore (both in files and watch)
  ignore: ['**/node_modules', '**/.git'],
}
~~~

All the command arguments (`zoar --help`) are available as config option, in their camel case notation:

~~~js
module.exports = {
  watchDebounce: 100,
  map: true,
  esm: true,
  printCompact: false,
}
~~~

### Globbing and config inheritance

- If files (i.e. positional arguments) are provided on the command line, then they _replace_ any files configured in `.rc` file or factory defaults. Likewise, files in `.rc` file replace factory defaults.

- Ignore patterns configured in `.rc` _replace_ factory defaults; but ignore patterns passed on the command line _are added_ to those in the `.rc` file.

- Likewise, watch patterns configured in `.rc` _replace_ factory defaults; but those passed on the command line _are added_ to the ones in the `.rc` file.

- Glob patterns (whether in files, watch or ignore) in the `.rc` file are relative to the file's parent directory, while glob patterns passed on the command line are relative to the current working directory -- even when both sources are mixed.

- For all other options, values from the command line override (i.e. replace) those in the `.rc` file, that override factory defaults.

**Warning** You should always quote glob patterns from the command line to prevent your shell from expanding them (Zoar would receive a list of files instead of the glob, and the globs resolution would vary widely across systems).

### Exit codes

~~~bash
zoar passing.spec.js
echo $?
> 0

zoar failing.spec.js
echo $?
> 1
~~~

### Debugging Zoar (config and options)

When working on your project configuration or a specific command, you can dump some intermediary values to see/verify how options from your various sources (factory defaults, .rc file, command line -- and even interactive watch cli) have been merged:

~~~bash
zoar --dump # defaults to zoar --dump=config
zoar --dump=config

zoar --dump=options
zoar --options # alias for zoar --dump=options
zoar --opts # even shorter

zoar --dump=watch # watch targets
~~~

### Debugging your test

~~~bash
# pass inspect flags to the node process that runs the tests
zoar --inspect
zoar --inspect-brk
~~~

### ES modules support

via [esm](https://github.com/standard-things/esm#readme)

~~~bash
zoar

# disable
zoar --no-esm
~~~

### Node source map support

via [source-map-support](https://github.com/evanw/node-source-map-support)

~~~bash
# enable source map support
zoar --map
~~~

### Pipes

~~~bash
# zoar accepts test files through stdin
ls **/*.spec.js | zoar

# find tests files, then run them
zoar --print | zoar

# find tests files, and run them on each change
#
# => print watch writes an empty line as separator between runs
# => when reading from stdin (pipe), zoar takes empty lines as run command
#
zoar --print --watch | zoar

# piping out automatically disable TTY reporter
zoar | less
~~~

#### `--pipe`

Pipes are great to work with tap streams... but how do you fit them in your watch script? With `zoar`, you can use `--pipe`!

~~~bash
zoar --pipe 'npx tap-mocha-reporter nyan'

# same as:
zoar | npx tap-mocha-reporter nyan
# except that you can:
zoar --watch --pipe 'npx tap-mocha-reporter nyan'

# can be repeated
zoar --pipe 'tap-notify' --pipe 'tap-mocha-reporter nyan'

# disable pipes (useful in interactive cli)
zoar --no-pipes
~~~

Commands are executed with [npm-run](https://github.com/timoxley/npm-run), so locally installed packages are available in the PATH:

~~~bash
npm install --dev tap-mocha-reporter
zoar --pipe 'tap-mocha-reporter nyan'
~~~

Commands are executed with the `shell` option of [`spawn`](https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options), so you can have can have pipes in your pipes (and other shell things):

~~~bash
# yo, dawg!
zoar --pipe 'cat | tap-mocha-reporter nyan'
~~~

#### In `.zoarrc.js`:

The `--pipe` option is nice when you're writing a one-off command by hand, but in your config file, you'll probably not want to pipe to the same commands the output of the different tasks (i.e. run, ls or print).

In config file (or interactive cli), you can use specialized pipe options for each task.

~~~js
module.exports = {
  'pipe.run': 'cat | npx tap-mocha-reporter nyan',
  // or, more portable:
  'pipe.run': ['cat', 'npx tap-mocha-reporter nyan'],
  'pipe.ls': 'grep foo',
  'pipe.print': 'grep bar',
}
~~~

**Note** If present, the `--pipe` option will always take precedence other the specialized options.

#### Interactive CLI

When run with `--watch` flag, the `--pipe` option gets converted to the corresponding specialized option.

For example:

~~~bash
zoar --watch --pipe cat         # { watch: true, 'pipe.run': ['cat'] }
zoar --watch --pipe cat --ls    # { watch: true, 'pipe.ls': ['cat'] }
zoar --watch --pipe cat --print # { watch: true, 'pipe.print': ['cat'] }
~~~

This way, you don't end up piping the list of your test files or their titles into a tap reporter...

Similarly, when used in the interactive CLI, the `--pipe` option gets automatically converted to the corresponding specialized option.
