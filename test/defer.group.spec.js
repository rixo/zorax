import { describe, test } from '@@'

import { createHarness } from '@zorax/plug'
import withDefer from '@/defer'
import withGroup from '@/defer.group'

import suite from './group.suite'

const createGroupHarness = () => createHarness([withDefer(), withGroup()])

describe('requires zorax.defer', () => {
  test('throws if zorax.defer is missing', t => {
    t.throws(() => {
      createHarness([withGroup()])
    }, /zorax\.defer/)
  })

  test('throws if zorax.defer is after zorax.defer.group', t => {
    t.throws(() => {
      createHarness([withGroup(), withDefer()])
    }, /zorax\.defer/)
  })
})

suite({ createGroupHarness })
