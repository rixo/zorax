import { reporter } from 'zora-node-reporter'

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

export default createHarnessFactory([
  withReporter(reporter()),
  withAuto({ auto: true }),
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
