import { createHarness } from '@/plug'
import withGroup from '@/group'

import suite from './group.suite'

const createGroupHarness = () => createHarness([withGroup()])

suite({ createGroupHarness })
