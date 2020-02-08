import { createHarnessFactory } from './plug'
import withAuto from './auto'
import withMacro from './macro'
import withDefer from './defer'
import withGroup from './defer.group'
import withOnly from './defer.only'
import withReporter from './reporter'
import withPass from './pass'
import withTodo from './todo'
import withSpy from './spy'
import withAliases from './alias'
import withCatch from './catch'

export default createHarnessFactory([
  withReporter(),
  withAuto({ auto: true }),
  withCatch(),

  withMacro(),

  withDefer(),
  withGroup(),
  withOnly(),

  withPass(),
  withTodo(),

  withSpy(),

  withAliases({
    group: 'describe',
    only: 'test.only',
    skip: 'test.skip',
  }),
])
