import { createHarness } from '@zorax/plug'
import withGroup from '@/group'

import suite from './group.suite'

const createGroupHarness = () => createHarness([withGroup()])

suite({ createGroupHarness })
