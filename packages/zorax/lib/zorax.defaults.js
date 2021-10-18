import { createHarnessFactory } from '@zorax/plug'

import withAliases from './alias'
import withAuto from './auto'
import withCatch from './catch'
import withDefer from './defer'
import withFilter from './filter'
import withGroup from './defer.group'
import withMacro from './macro'
import withOnly from './defer.only'
import withPrint from './defer.print'
import withPass from './pass'
import withReporter from './reporter'
import withSpy from './spy'
import withTodo from './todo'

export default createHarnessFactory([
  withReporter(),

  withAuto({ auto: true }),

  withCatch(),

  withPrint(),

  withDefer(),
  withGroup(),
  withOnly(),

  withPass(),
  withTodo(),
  withSpy(),

  withFilter(),

  withMacro(),

  withAliases({
    group: 'describe',
    only: 'test.only',
    skip: 'test.skip',
  }),
])
