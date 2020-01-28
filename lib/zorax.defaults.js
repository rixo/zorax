import { createHarnessFactory } from './plug'
import withAuto from './auto'
import withMacro from './macro'
import withDefer from './defer'
import withGroup from './group.defer'
import withOnly from './only.defer'
import withReporter from './reporter'
import withPass from './pass'
import withTodo from './todo'
import withAliases from './alias'
import withCatch from './catch'

export default createHarnessFactory([
  withReporter(),
  withAuto({ auto: true }),
  withCatch(),
  withDefer(),
  withGroup(),
  withOnly(),
  withMacro(),
  withPass(),
  withTodo(),
  withAliases({
    group: 'describe',
    only: 'test.only',
    skip: 'test.skip',
  }),
])
